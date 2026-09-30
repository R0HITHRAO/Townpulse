"""
TownPulse Push Service
======================
Web Push transport for emergency alerts.

Three concerns live here:

1. Subscription lifecycle (upsert/remove) — browsers rotate endpoints, so an
   endpoint is the natural idempotency key.
2. Recipient selection — a geo-fenced ward warning must reach ward residents,
   not the whole platform; `critical_only` subscribers only get critical alerts
   because they are usually data-saver devices.
3. Delivery + retirement — endpoints die. After MAX_FAILURES hard failures the
   subscription is retired instead of burning quota on a dead endpoint forever.

Sending degrades to a logged no-op when pywebpush/VAPID are not configured, so
the alert flow itself never fails because push is missing.
"""

import hashlib
import json
import math
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import get_logger
from app.models.alert import EmergencyAlert
from app.models.push_subscription import PushSubscription
from app.schemas.push import PushSubscribeIn

logger = get_logger(__name__)

# Bounding-box slack when pre-filtering subscribers for a radius (metres).
_METRES_PER_DEGREE_LAT = 111_320.0


def endpoint_hash(endpoint: str) -> str:
    """Stable, non-reversible id for logs and support tickets."""
    return hashlib.sha256(endpoint.encode("utf-8")).hexdigest()[:16]


def haversine_metres(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance — used for the exact radius check."""
    radius = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * radius * math.asin(math.sqrt(a))


class PushService:
    """Subscription CRUD plus alert fan-out."""

    @staticmethod
    def upsert(
        db: Session,
        payload: PushSubscribeIn,
        user_id: Any | None = None,
    ) -> PushSubscription:
        """
        Register (or refresh) a browser endpoint.

        Re-subscribing after a browser rotation must not create duplicates,
        hence the endpoint-keyed upsert.
        """
        subscription = (
            db.query(PushSubscription)
            .filter(PushSubscription.endpoint == payload.endpoint)
            .first()
        )
        if subscription is None:
            subscription = PushSubscription(endpoint=payload.endpoint)
            db.add(subscription)

        subscription.p256dh = payload.p256dh
        subscription.auth = payload.auth
        subscription.agency = payload.agency
        subscription.lat = payload.lat
        subscription.lng = payload.lng
        subscription.town = payload.town
        subscription.critical_only = payload.critical_only
        if user_id is not None:
            subscription.user_id = user_id
        subscription.failure_count = 0

        db.commit()
        db.refresh(subscription)
        return subscription

    @staticmethod
    def remove(db: Session, endpoint: str) -> bool:
        """Unsubscribe by endpoint (all the browser knows after a reset)."""
        deleted = (
            db.query(PushSubscription)
            .filter(PushSubscription.endpoint == endpoint)
            .delete()
        )
        db.commit()
        return bool(deleted)

    @staticmethod
    def recipients(db: Session, alert: EmergencyAlert) -> list[PushSubscription]:
        """
        Pick the subscriptions this alert should actually reach.

        Targeting precedence matches the alert model: radius around a centroid,
        else district/town name, else everyone. Within that, `critical_only`
        subscribers are excluded unless the alert is critical.
        """
        query = db.query(PushSubscription).filter(
            PushSubscription.failure_count < PushSubscription.MAX_FAILURES
        )
        if alert.severity != "critical":
            query = query.filter(PushSubscription.critical_only.is_(False))

        target_lat = float(alert.lat) if alert.lat is not None else None
        target_lng = float(alert.lng) if alert.lng is not None else None
        radius = float(alert.radius_meters) if alert.radius_meters is not None else None

        if target_lat is not None and target_lng is not None and radius:
            # Cheap bounding box first, exact haversine afterwards.
            lat_pad = radius / _METRES_PER_DEGREE_LAT
            lng_pad = radius / (
                _METRES_PER_DEGREE_LAT * max(0.01, math.cos(math.radians(target_lat)))
            )
            candidates = (
                query.filter(
                    PushSubscription.lat.isnot(None),
                    PushSubscription.lng.isnot(None),
                    PushSubscription.lat >= target_lat - lat_pad,
                    PushSubscription.lat <= target_lat + lat_pad,
                    PushSubscription.lng >= target_lng - lng_pad,
                    PushSubscription.lng <= target_lng + lng_pad,
                )
                .limit(5000)
                .all()
            )
            return [
                sub
                for sub in candidates
                if haversine_metres(
                    float(sub.lat), float(sub.lng), target_lat, target_lng
                )
                <= radius
            ]

        if alert.district:
            district = alert.district.strip().lower()
            return [
                sub
                for sub in (
                    query.filter(PushSubscription.town.ilike(alert.district))
                    .limit(5000)
                    .all()
                )
                if sub.town and sub.town.strip().lower() == district
            ]

        return query.limit(5000).all()

    @staticmethod
    def send(
        db: Session,
        alert: EmergencyAlert,
        subscriptions: list[PushSubscription],
    ) -> dict[str, Any]:
        """
        Deliver one alert payload to every selected subscription.

        Fail-soft by design: missing pywebpush or VAPID keys log a warning and
        return a structured "not configured" result instead of raising — the
        municipality can still publish alerts (the API and SMS paths already
        work) while push is being provisioned.
        """
        result: dict[str, Any] = {
            "delivered": 0,
            "failed": 0,
            "recipients": len(subscriptions),
        }
        if not subscriptions:
            return result

        try:
            from pywebpush import webpush
        except ImportError:
            logger.warning("Web Push not available", reason="pywebpush_not_installed")
            result["reason"] = "pywebpush_not_installed"
            return result

        if not settings.VAPID_PRIVATE_KEY:
            logger.warning("Web Push not available", reason="vapid_not_configured")
            result["reason"] = "vapid_not_configured"
            return result

        payload = json.dumps(
            {
                "id": str(alert.id),
                "title": alert.title,
                "body": alert.message,
                "severity": alert.severity,
                "link_url": alert.link_url,
                "url": f"/alerts#{alert.id}",
            },
            ensure_ascii=False,
        )

        now = datetime.now(timezone.utc)
        for subscription in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": subscription.endpoint,
                        "keys": {
                            "p256dh": subscription.p256dh,
                            "auth": subscription.auth,
                        },
                    },
                    data=payload,
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims={"sub": settings.VAPID_SUBJECT},
                    content_type="application/json",
                )
                result["delivered"] += 1
                subscription.failure_count = 0
                subscription.last_delivery_at = now
            except Exception as exc:
                result["failed"] += 1
                subscription.failure_count += 1
                status_code = getattr(
                    getattr(exc, "response", None), "status_code", None
                )
                if status_code in (404, 410):
                    # Endpoint is permanently gone — retire it immediately.
                    subscription.failure_count = PushSubscription.MAX_FAILURES
                logger.warning(
                    "Push delivery failed",
                    endpoint=endpoint_hash(subscription.endpoint),
                    status=status_code,
                    failures=subscription.failure_count,
                )

        alert.push_delivered = (alert.push_delivered or 0) + result["delivered"]
        db.commit()
        logger.info("Alert fan-out complete", alert_id=str(alert.id), **result)
        return result


def fan_out_alert(alert_id: Any) -> dict[str, Any]:
    """
    Deliver an alert from a fresh session — safe to call from FastAPI
    BackgroundTasks or a Celery worker, since neither shares the request's
    session. Records the broadcast in the audit trail.
    """
    from app.core.database import SessionLocal
    from app.models.audit_log import AuditAction
    from app.services.audit_service import AuditService

    db = SessionLocal()
    try:
        alert = db.get(EmergencyAlert, alert_id)
        if alert is None:
            return {"reason": "alert_not_found"}

        result = PushService.send(db, alert, PushService.recipients(db, alert))
        AuditService.record(
            db,
            actor=None,
            action=AuditAction.ALERT_BROADCAST,
            entity_type="alert",
            entity_id=alert.id,
            summary=f"Broadcast fan-out: {result}",
            after=result,
        )
        return result
    finally:
        db.close()
