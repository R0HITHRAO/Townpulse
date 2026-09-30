"""
TownPulse Analytics Service
===========================
Event ingestion and aggregation for the behavioural analytics pipeline.

The `analytics` table existed but nothing ever wrote to it, so the "listing
analytics" promised to business owners in ClaimModal never materialised. This
module is both ends of that pipe: a cheap, fail-open ingest path (a tracking
failure must never break the user action it is attached to), and the
read-side aggregations feeding the owner and admin dashboards.

Aggregation notes:
- Visitors are de-duplicated by `session_id`, not user id: browsing is
  anonymous, and counting only logged-in users would bias the numbers towards
  registered owners.
- Contact clicks are bucketed by `contact_method` from the JSONB payload, so
  "call vs WhatsApp vs website" is answerable without an extra table.
"""

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.analytics import Analytics
from app.models.listing import Listing

logger = get_logger(__name__)

# Bounds on the rolling dashboard window a caller may request.
MIN_WINDOW_DAYS = 1
MAX_WINDOW_DAYS = 365


class EventType:
    """Canonical event names. The client only ever sends these."""

    LISTING_VIEW = "listing_view"
    LISTING_CONTACT = "listing_contact_click"
    LISTING_DIRECTIONS = "listing_directions"
    LISTING_SHARE = "listing_share"
    LISTING_PRINT = "listing_print"
    LISTING_SAVE = "listing_save"
    LISTING_UNSAVE = "listing_unsave"
    LISTING_CONFIRM = "listing_confirm"
    SEARCH_PERFORMED = "search_performed"
    CATEGORY_VIEW = "category_view"
    MAP_VIEW = "map_view"
    ALERT_VIEW = "alert_view"
    ALERT_CLICK = "alert_click"
    SUBMIT_STARTED = "submit_started"
    CLAIM_STARTED = "claim_started"
    SIGNUP_SUCCESS = "signup_success"
    LOGIN_SUCCESS = "login_success"

    ALL = frozenset(
        {
            LISTING_VIEW,
            LISTING_CONTACT,
            LISTING_DIRECTIONS,
            LISTING_SHARE,
            LISTING_PRINT,
            LISTING_SAVE,
            LISTING_UNSAVE,
            LISTING_CONFIRM,
            SEARCH_PERFORMED,
            CATEGORY_VIEW,
            MAP_VIEW,
            ALERT_VIEW,
            ALERT_CLICK,
            SUBMIT_STARTED,
            CLAIM_STARTED,
            SIGNUP_SUCCESS,
            LOGIN_SUCCESS,
        }
    )

    # Events that mean "a resident reached the business" — the money metric.
    CONTACT = frozenset({LISTING_CONTACT, LISTING_DIRECTIONS})


class ContactMethod:
    """How the resident reached out. Restricted so aggregates stay clean."""

    CALL = "call"
    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"
    WEBSITE = "website"
    OTHER = "other"
    ALL = frozenset({CALL, WHATSAPP, SMS, EMAIL, WEBSITE, OTHER})


def clamp_window(days: int | None) -> int:
    """Keep a requested dashboard window inside sane bounds."""
    if not days:
        return 30
    return max(MIN_WINDOW_DAYS, min(int(days), MAX_WINDOW_DAYS))


def since(days: int) -> datetime:
    """UTC timestamp `days` days ago."""
    return datetime.now(timezone.utc) - timedelta(days=days)


def track(
    db: Session,
    *,
    event_type: str,
    listing_id: UUID | str | None = None,
    payload: dict[str, Any] | None = None,
    user_id: UUID | None = None,
    session_id: str | None = None,
    path: str | None = None,
    commit: bool = True,
) -> bool:
    """
    Record a single behavioural event.

    Deliberately fail-open: an unknown event type or a database error is logged
    and swallowed, so instrumentation can never degrade the action it observes.

    Returns:
        True if the event was persisted, False if it was dropped.
    """
    if event_type not in EventType.ALL:
        logger.debug("Dropping unknown event type", event_type=event_type)
        return False

    try:
        db.add(
            Analytics(
                event_type=event_type,
                payload_json=payload or None,
                user_id=user_id,
                listing_id=UUID(str(listing_id)) if listing_id else None,
                session_id=session_id[:64] if session_id else None,
                path=path[:512] if path else None,
            )
        )
        if commit:
            db.commit()
        return True
    except Exception as exc:
        db.rollback()
        logger.warning("Event ingest failed", event_type=event_type, error=str(exc))
        return False


def track_many(
    db: Session,
    events: list[dict[str, Any]],
    *,
    user_id: UUID | None = None,
    session_id: str | None = None,
    path: str | None = None,
    commit: bool = True,
) -> dict[str, int]:
    """
    Record a batch of events in one round trip.

    Batching matters: on a flaky 3G connection, one insert per tap would mean
    one extra request per tap.

    Args:
        db: Active session.
        events: Raw event dicts, each with `event_type` plus optional
            `listing_id`, `payload` and `path`.

    Returns:
        Counts of accepted and rejected events.
    """
    accepted = 0
    rejected = 0

    for event in events:
        if not isinstance(event, dict):
            rejected += 1
            continue

        event_type = event.get("event_type")
        if event_type not in EventType.ALL:
            rejected += 1
            continue

        raw_listing = event.get("listing_id")
        try:
            listing_uuid = UUID(str(raw_listing)) if raw_listing else None
        except (ValueError, AttributeError, TypeError):
            listing_uuid = None

        payload = event.get("payload")
        db.add(
            Analytics(
                event_type=event_type,
                payload_json=payload if isinstance(payload, dict) else None,
                user_id=user_id,
                listing_id=listing_uuid,
                session_id=(event.get("session_id") or session_id or "")[:64] or None,
                path=str(event.get("path") or path or "")[:512] or None,
            )
        )
        accepted += 1

    if commit and accepted:
        try:
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.warning("Batch event ingest failed", error=str(exc))
            return {"accepted": 0, "rejected": len(events)}

    return {"accepted": accepted, "rejected": rejected}


def listing_summary(db: Session, listing_id: UUID, *, days: int = 30) -> dict[str, Any]:
    """
    Aggregate the metrics a business owner cares about for one listing.

    This is the endpoint behind ClaimModal's "listing analytics" promise:
    views, how many people actually reached out, which channel they used,
    and a day-by-day series to plot.
    """
    window = clamp_window(days)
    start = since(window)
    base = [Analytics.listing_id == listing_id, Analytics.created_at >= start]

    # ─── Totals per event type ───────────────────────────────────────────────
    counts: dict[str, int] = {
        etype: int(count)
        for etype, count in (
            db.query(Analytics.event_type, func.count(Analytics.id))
            .filter(*base)
            .group_by(Analytics.event_type)
            .all()
        )
    }

    views = counts.get(EventType.LISTING_VIEW, 0)
    contacts = counts.get(EventType.LISTING_CONTACT, 0)
    directions = counts.get(EventType.LISTING_DIRECTIONS, 0)
    reached = contacts + directions

    # ─── Distinct anonymous visitors who saw it ──────────────────────────────
    unique_visitors = int(
        db.query(func.count(func.distinct(Analytics.session_id)))
        .filter(*base, Analytics.event_type == EventType.LISTING_VIEW)
        .scalar()
        or 0
    )

    # ─── Contact breakdown by channel ────────────────────────────────────────
    method = func.coalesce(
        Analytics.payload_json["contact_method"].astext,
        ContactMethod.OTHER,
    )
    by_method: dict[str, int] = {
        str(m): int(count)
        for m, count in (
            db.query(method, func.count(Analytics.id))
            .filter(*base, Analytics.event_type == EventType.LISTING_CONTACT)
            .group_by(method)
            .all()
        )
    }

    # ─── Day-by-day series (gap-filled — charts must not lie about dips) ─────
    day = func.date_trunc("day", Analytics.created_at)
    buckets: dict[str, dict[str, int]] = {}
    for bucket_day, etype, count in (
        db.query(day, Analytics.event_type, func.count(Analytics.id))
        .filter(*base)
        .group_by(day, Analytics.event_type)
        .all()
    ):
        if bucket_day is None:
            continue
        key = bucket_day.date().isoformat()
        bucket = buckets.setdefault(key, {"views": 0, "contacts": 0, "directions": 0})
        if etype == EventType.LISTING_VIEW:
            bucket["views"] += int(count)
        elif etype == EventType.LISTING_CONTACT:
            bucket["contacts"] += int(count)
        elif etype == EventType.LISTING_DIRECTIONS:
            bucket["directions"] += int(count)

    series: list[dict[str, Any]] = []
    cursor = start.date()
    today = datetime.now(timezone.utc).date()
    while cursor <= today:
        key = cursor.isoformat()
        series.append(
            {
                "date": key,
                **buckets.get(key, {"views": 0, "contacts": 0, "directions": 0}),
            }
        )
        cursor += timedelta(days=1)

    conversion = round((reached / views) * 100, 1) if views else 0.0

    return {
        "listing_id": str(listing_id),
        "period_days": window,
        "views": views,
        "unique_visitors": unique_visitors,
        "contact_clicks": contacts,
        "direction_clicks": directions,
        "reached_business": reached,
        "conversion_rate_percent": conversion,
        "contacts_by_method": by_method,
        "saves": counts.get(EventType.LISTING_SAVE, 0),
        "shares": counts.get(EventType.LISTING_SHARE, 0),
        "prints": counts.get(EventType.LISTING_PRINT, 0),
        "confirmations": counts.get(EventType.LISTING_CONFIRM, 0),
        "daily": series,
    }


def platform_summary(db: Session, *, days: int = 30) -> dict[str, Any]:
    """
    Platform-wide health metrics for the admin dashboard.

    Complements the audit trail: the trail records *who changed what*, this
    records *what residents are actually doing* — including which searches
    return nothing (the demand signals for missing listings).
    """
    window = clamp_window(days)
    start = since(window)
    base = [Analytics.created_at >= start]

    total_events = int(db.query(func.count(Analytics.id)).filter(*base).scalar() or 0)

    by_type = {
        etype: int(count)
        for etype, count in (
            db.query(Analytics.event_type, func.count(Analytics.id))
            .filter(*base)
            .group_by(Analytics.event_type)
            .all()
        )
    }

    unique_visitors = int(
        db.query(func.count(func.distinct(Analytics.session_id))).filter(*base).scalar()
        or 0
    )

    # ─── Top listings by "a resident actually reached the business" ──────────
    top_listings: list[dict[str, Any]] = [
        {"listing_id": str(listing_id), "name": name, "reached": int(count)}
        for name, listing_id, count in (
            db.query(Listing.name, Analytics.listing_id, func.count(Analytics.id))
            .join(Listing, Listing.id == Analytics.listing_id)
            .filter(*base, Analytics.event_type.in_(tuple(EventType.CONTACT)))
            .group_by(Listing.name, Analytics.listing_id)
            .order_by(func.count(Analytics.id).desc())
            .limit(10)
            .all()
        )
    ]

    # ─── Most common searches, including zero-result demand signals ──────────
    query_text = func.coalesce(Analytics.payload_json["query"].astext, "")
    top_searches: list[dict[str, Any]] = [
        {"query": str(term), "count": int(count)}
        for term, count in (
            db.query(query_text, func.count(Analytics.id))
            .filter(
                *base,
                Analytics.event_type == EventType.SEARCH_PERFORMED,
                query_text != "",
            )
            .group_by(query_text)
            .order_by(func.count(Analytics.id).desc())
            .limit(10)
            .all()
        )
    ]

    # ─── Daily totals for the admin sparkline (gap-filled) ───────────────────
    day = func.date_trunc("day", Analytics.created_at)
    buckets = {
        bucket_day.date().isoformat(): int(count)
        for bucket_day, count in (
            db.query(day, func.count(Analytics.id)).filter(*base).group_by(day).all()
        )
        if bucket_day is not None
    }

    series: list[dict[str, Any]] = []
    cursor = start.date()
    today = datetime.now(timezone.utc).date()
    while cursor <= today:
        key = cursor.isoformat()
        series.append({"date": key, "events": buckets.get(key, 0)})
        cursor += timedelta(days=1)

    return {
        "period_days": window,
        "total_events": total_events,
        "unique_visitors": unique_visitors,
        "listing_views": by_type.get(EventType.LISTING_VIEW, 0),
        "contact_clicks": by_type.get(EventType.LISTING_CONTACT, 0),
        "direction_clicks": by_type.get(EventType.LISTING_DIRECTIONS, 0),
        "searches": by_type.get(EventType.SEARCH_PERFORMED, 0),
        "alerts_viewed": by_type.get(EventType.ALERT_VIEW, 0),
        "events_by_type": by_type,
        "top_listings": top_listings,
        "top_searches": top_searches,
        "daily": series,
    }
