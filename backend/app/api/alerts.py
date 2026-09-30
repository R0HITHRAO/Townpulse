"""
TownPulse Emergency Alert Endpoints
===================================
API endpoints for geo-fenced emergency broadcasts, their admin lifecycle, and
the two-way resident check-ins that turn a broadcast into a live situation
picture for the local administration.

Targeting precedence (mirrors the model): radius around a centroid, else
district name, else town-wide. Every admin action writes to the audit trail and
kicks off a push fan-out.
"""

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request, status
from geoalchemy2 import Geography
from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID
from sqlalchemy import case, cast, func, or_
from sqlalchemy.orm import Query as SAQuery
from sqlalchemy.orm import Session

from app.core.dependencies import AdminUser, DbSession, OptionalUser
from app.models.alert import EmergencyAlert
from app.models.alert_checkin import AlertCheckIn, CheckInStatus
from app.models.audit_log import AuditAction
from app.schemas.alert import (
    AlertCheckInCreate,
    AlertCheckInOut,
    EmergencyAlertCreate,
    EmergencyAlertResponse,
    EmergencyAlertUpdate,
)
from app.services.audit_service import AuditService
from app.services.push_service import fan_out_alert, haversine_metres

router = APIRouter(tags=["Emergency Alerts"])

_SEVERITY_ORDER = case(
    (EmergencyAlert.severity == "critical", 0),
    (EmergencyAlert.severity == "warning", 1),
    else_=2,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _set_location(alert: EmergencyAlert) -> None:
    """Recompute the PostGIS point whenever the centroid changes."""
    if alert.lat is not None and alert.lng is not None:
        alert.location = f"SRID=4326;POINT({alert.lng} {alert.lat})"
    else:
        alert.location = None


def _visible(query: SAQuery[EmergencyAlert], now: datetime) -> SAQuery[EmergencyAlert]:
    """Active, unexpired, and already-published alerts only."""
    return query.filter(
        EmergencyAlert.is_active.is_(True),
        or_(
            EmergencyAlert.expires_at.is_(None),
            EmergencyAlert.expires_at > now,
        ),
        or_(
            EmergencyAlert.publish_at.is_(None),
            EmergencyAlert.publish_at <= now,
        ),
    )


def _to_out(
    alert: EmergencyAlert,
    viewer_lat: float | None = None,
    viewer_lng: float | None = None,
    my_status: str | None = None,
) -> dict[str, Any]:
    """Flatten an alert for the response schema, incl. distance to the viewer."""
    distance: float | None = None
    if (
        viewer_lat is not None
        and viewer_lng is not None
        and alert.lat is not None
        and alert.lng is not None
    ):
        distance = haversine_metres(
            viewer_lat,
            viewer_lng,
            float(alert.lat),
            float(alert.lng),
        )

    return {
        "id": alert.id,
        "title": alert.title,
        "message": alert.message,
        "severity": alert.severity,
        "is_active": alert.is_active,
        "link_url": alert.link_url,
        "created_at": alert.created_at,
        "expires_at": alert.expires_at,
        "lat": float(alert.lat) if alert.lat is not None else None,
        "lng": float(alert.lng) if alert.lng is not None else None,
        "district": alert.district,
        "radius_meters": float(alert.radius_meters) if alert.radius_meters else None,
        "source": alert.source,
        "publish_at": alert.publish_at,
        "push_delivered": alert.push_delivered or 0,
        "sms_queued": alert.sms_queued or 0,
        "distance_meters": round(distance, 0) if distance is not None else None,
        "my_status": my_status,
    }


@router.get(
    "/alerts/active",
    response_model=list[EmergencyAlertResponse],
    summary="Active alerts visible from a location",
)
def get_active_alerts(
    db: DbSession,
    user: OptionalUser,
    lat: float | None = Query(None, ge=-90.0, le=90.0),
    lng: float | None = Query(None, ge=-180.0, le=180.0),
    radius: float | None = Query(None, ge=100.0, le=100_000.0),
) -> list[EmergencyAlertResponse]:
    """
    Retrieve active emergency alerts, geo-filtered when a position is given.

    Without coordinates this returns every active alert (backward compatible).
    With coordinates, a geo-fenced alert is kept only when the viewer is inside
    its radius; town-wide alerts are always kept — one ward's flood warning must
    never be pushed to, or billed as an SMS to, the whole platform.
    """
    now = _utcnow()
    query = _visible(db.query(EmergencyAlert), now)

    if lat is not None and lng is not None:
        # SQLAlchemy's `cast()` (not `func.cast`) — the latter builds the
        # PostgreSQL cast() function and cannot compile the geography type.
        point = cast(
            ST_SetSRID(ST_MakePoint(lng, lat), 4326),
            Geography(geometry_type="POINT", srid=4326),
        )
        query = query.filter(
            or_(
                # Town-wide alert (no geo fence at all).
                EmergencyAlert.location.is_(None),
                EmergencyAlert.district.isnot(None),
                ST_DWithin(EmergencyAlert.location, point, radius or 10_000.0),
            )
        )

    alerts = (
        query.order_by(_SEVERITY_ORDER, EmergencyAlert.created_at.desc())
        .limit(100)
        .all()
    )

    my_statuses: dict[uuid.UUID, str] = {}
    if user is not None and alerts:
        rows = (
            db.query(AlertCheckIn)
            .filter(
                AlertCheckIn.user_id == user.id,
                AlertCheckIn.alert_id.in_([a.id for a in alerts]),
            )
            .all()
        )
        my_statuses = {row.alert_id: row.status for row in rows}

    return [
        EmergencyAlertResponse(
            **_to_out(
                alert,
                viewer_lat=lat,
                viewer_lng=lng,
                my_status=my_statuses.get(alert.id),
            )
        )
        for alert in alerts
    ]


def _require_alert(db: Session, alert_id: uuid.UUID) -> EmergencyAlert:
    """Load an alert or 404 — shared by every admin route below."""
    alert = db.get(EmergencyAlert, alert_id)
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency alert not found.",
        )
    return alert


# ─── Admin lifecycle ──────────────────────────────────────────────────────────


@router.post(
    "/admin/alerts",
    response_model=EmergencyAlertResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an emergency alert (admin)",
)
def create_emergency_alert(
    alert_in: EmergencyAlertCreate,
    background: BackgroundTasks,
    admin_user: AdminUser,
    request: Request,
    db: DbSession,
) -> EmergencyAlertResponse:
    """
    Create a broadcast, fence it to a place, audit it, and fan it out.

    The fan-out runs after the response so publishing a city-wide alert is not
    blocked on (or rolled back by) slow push endpoints.
    """
    alert = EmergencyAlert(
        title=alert_in.title,
        message=alert_in.message,
        severity=alert_in.severity,
        is_active=alert_in.is_active,
        link_url=alert_in.link_url,
        expires_at=alert_in.expires_at,
        lat=alert_in.lat,
        lng=alert_in.lng,
        district=alert_in.district,
        radius_meters=alert_in.radius_meters,
        source=alert_in.source,
        publish_at=alert_in.publish_at,
        created_by_id=admin_user.id,
    )
    _set_location(alert)
    db.add(alert)
    db.commit()
    db.refresh(alert)

    AuditService.record(
        db,
        actor=admin_user,
        action=AuditAction.ALERT_CREATE,
        entity_type="alert",
        entity_id=alert.id,
        summary=f"Created alert '{alert.title}' ({alert.severity})",
        after=AuditService.snapshot(alert),
        request=request,
    )

    if alert.is_active and (alert.publish_at is None or alert.publish_at <= _utcnow()):
        background.add_task(fan_out_alert, alert.id)

    return EmergencyAlertResponse(**_to_out(alert))


@router.put(
    "/admin/alerts/{alert_id}",
    response_model=EmergencyAlertResponse,
    summary="Update an emergency alert (admin)",
)
def update_emergency_alert(
    alert_id: uuid.UUID,
    data: EmergencyAlertUpdate,
    background: BackgroundTasks,
    admin_user: AdminUser,
    request: Request,
    db: DbSession,
) -> EmergencyAlertResponse:
    """
    Partially update an alert — re-fencing or re-activating included.

    Re-activating a previously deactivated alert re-triggers the fan-out,
    because the residents who need it were never told the first time.
    """
    alert = _require_alert(db, alert_id)
    tracked = [
        "title",
        "message",
        "severity",
        "is_active",
        "link_url",
        "expires_at",
        "lat",
        "lng",
        "district",
        "radius_meters",
        "source",
        "publish_at",
    ]
    before = AuditService.snapshot(alert, tracked)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(alert, key, value)
    _set_location(alert)
    db.commit()
    db.refresh(alert)

    AuditService.record(
        db,
        actor=admin_user,
        action=AuditAction.ALERT_UPDATE,
        entity_type="alert",
        entity_id=alert.id,
        summary=f"Updated alert '{alert.title}'",
        before=before,
        after=AuditService.snapshot(alert, tracked),
        request=request,
    )

    reactivated = alert.is_active and not before.get("is_active")
    if reactivated and (alert.publish_at is None or alert.publish_at <= _utcnow()):
        background.add_task(fan_out_alert, alert.id)

    return EmergencyAlertResponse(**_to_out(alert))


@router.delete(
    "/admin/alerts/{alert_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate an emergency alert (admin)",
)
def deactivate_emergency_alert(
    alert_id: uuid.UUID,
    admin_user: AdminUser,
    request: Request,
    db: DbSession,
) -> None:
    """Deactivate an alert (kept for the record — audit trails are append-only)."""
    alert = _require_alert(db, alert_id)
    before = AuditService.snapshot(alert, ["is_active", "expires_at"])

    alert.is_active = False
    db.commit()

    AuditService.record(
        db,
        actor=admin_user,
        action=AuditAction.ALERT_DEACTIVATE,
        entity_type="alert",
        entity_id=alert.id,
        summary=f"Deactivated alert '{alert.title}'",
        before=before,
        after=AuditService.snapshot(alert, ["is_active", "expires_at"]),
        request=request,
    )


# ─── Resident check-ins ───────────────────────────────────────────────────────


def _tally(db: Session, alert_id: uuid.UUID) -> tuple[int, int]:
    """(safe_count, needs_help_count) for an alert."""
    rows = (
        db.query(AlertCheckIn.status, func.count(AlertCheckIn.id))
        .filter(AlertCheckIn.alert_id == alert_id)
        .group_by(AlertCheckIn.status)
        .all()
    )
    # Rows are (status, count) pairs. `dict(rows)` is wrong here: SQLAlchemy
    # Row objects are not 2-tuples for dict() purposes, so the resulting dict
    # was keyed by Row rather than by status and both .get() calls below always
    # missed, reporting zero safe check-ins for every alert.
    counts: dict[Any, int] = {row[0]: int(row[1]) for row in rows}
    return (
        int(counts.get(CheckInStatus.SAFE, 0)),
        int(counts.get(CheckInStatus.NEEDS_HELP, 0)),
    )


@router.post(
    "/alerts/{alert_id}/check-in",
    response_model=AlertCheckInOut,
    status_code=status.HTTP_201_CREATED,
    summary="Check in: I'm safe / I need help",
)
def check_in(
    alert_id: uuid.UUID,
    payload: AlertCheckInCreate,
    db: DbSession,
    user: OptionalUser,
) -> AlertCheckInOut:
    """
    Record a resident's response to a live alert.

    Authenticated responses are de-duplicated by (alert, user) — they may
    change their answer, never spam it. Anonymous check-ins are allowed for
    `needs_help` (carrying a phone number) because during a disaster the person
    most likely to need help is also the one least likely to be signed in.
    """
    alert = db.get(EmergencyAlert, alert_id)
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency alert not found.",
        )

    if (
        user is None
        and payload.status == CheckInStatus.NEEDS_HELP
        and not payload.phone
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A callback number is required for an anonymous help request.",
        )

    if user is not None:
        checkin = (
            db.query(AlertCheckIn)
            .filter(
                AlertCheckIn.alert_id == alert_id,
                AlertCheckIn.user_id == user.id,
            )
            .first()
        )
        if checkin is None:
            checkin = AlertCheckIn(alert_id=alert_id, user_id=user.id)
            db.add(checkin)
        checkin.status = payload.status
        checkin.note = payload.note
        checkin.phone = payload.phone
        checkin.lat = payload.lat
        checkin.lng = payload.lng
        if payload.status == CheckInStatus.SAFE:
            checkin.resolved = True
            checkin.resolved_at = _utcnow()
        else:
            checkin.resolved = False
            checkin.resolved_at = None
    else:
        checkin = AlertCheckIn(
            alert_id=alert_id,
            user_id=None,
            status=payload.status,
            note=payload.note,
            phone=payload.phone,
            lat=payload.lat,
            lng=payload.lng,
            resolved=payload.status == CheckInStatus.SAFE,
            resolved_at=_utcnow() if payload.status == CheckInStatus.SAFE else None,
        )
        db.add(checkin)

    db.commit()
    db.refresh(checkin)

    safe_count, help_count = _tally(db, alert_id)
    return AlertCheckInOut(
        id=checkin.id,
        alert_id=alert_id,
        status=checkin.status,
        safe_count=safe_count,
        needs_help_count=help_count,
    )


@router.get(
    "/admin/alerts/{alert_id}/check-ins",
    summary="Check-in tally and open help cases (admin)",
)
def alert_checkin_summary(
    alert_id: uuid.UUID,
    admin_user: AdminUser,
    db: DbSession,
) -> dict[str, Any]:
    """Live situation picture: how many are safe, how many still need help."""
    _require_alert(db, alert_id)
    safe_count, help_count = _tally(db, alert_id)

    open_cases = (
        db.query(AlertCheckIn)
        .filter(
            AlertCheckIn.alert_id == alert_id,
            AlertCheckIn.status == CheckInStatus.NEEDS_HELP,
            AlertCheckIn.resolved.is_(False),
        )
        .order_by(AlertCheckIn.created_at.asc())
        .limit(200)
        .all()
    )

    return {
        "alert_id": alert_id,
        "safe_count": safe_count,
        "needs_help_count": help_count,
        "resolved_count": sum(1 for case in open_cases if case.resolved),
        "open_cases": [
            {
                "id": case.id,
                "note": case.note,
                "phone": case.phone,
                "lat": float(case.lat) if case.lat is not None else None,
                "lng": float(case.lng) if case.lng is not None else None,
                "created_at": case.created_at,
            }
            for case in open_cases
        ],
    }


@router.put(
    "/admin/alerts/check-ins/{checkin_id}/resolve",
    summary="Mark a needs-help case as resolved (admin)",
)
def resolve_checkin(
    checkin_id: uuid.UUID,
    admin_user: AdminUser,
    request: Request,
    db: DbSession,
) -> dict[str, Any]:
    """Close the loop on a needs-help case after help has actually arrived."""
    checkin = db.get(AlertCheckIn, checkin_id)
    if checkin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Check-in not found.",
        )

    checkin.resolved = True
    checkin.resolved_at = _utcnow()
    db.commit()

    AuditService.record(
        db,
        actor=admin_user,
        action="alert.checkin.resolve",
        entity_type="alert_checkin",
        entity_id=checkin.id,
        summary=f"Resolved check-in for alert {checkin.alert_id}",
        request=request,
    )
    return {"id": checkin.id, "resolved": True}
