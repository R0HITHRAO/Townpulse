"""
TownPulse Push Subscription API Endpoints
=========================================
Register and retire browser Web Push subscriptions.

The public-key endpoint exists because the browser needs the VAPID
applicationServerKey *before* it can call `PushManager.subscribe()`, and that
key is a public value that must never require admin rights to read.
"""

import hashlib

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.dependencies import DbSession, OptionalUser
from app.schemas.common import MessageResponse
from app.schemas.push import PushSubscribeIn, PushSubscribeOut, PushUnsubscribeIn
from app.services.push_service import PushService

router = APIRouter(prefix="/push", tags=["Web Push"])


@router.get(
    "/public-key",
    summary="VAPID public key for PushManager.subscribe()",
)
def get_public_key() -> dict[str, str]:
    """
    Return the application server key.

    An empty string means push is not provisioned yet; the client skips
    subscription instead of failing — alerts still work in-app.
    """
    return {"public_key": settings.VAPID_PUBLIC_KEY}


@router.post(
    "/subscribe",
    response_model=PushSubscribeOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a push subscription",
)
def subscribe(
    payload: PushSubscribeIn,
    db: DbSession,
    user: OptionalUser,
) -> PushSubscribeOut:
    """
    Upsert the browser's endpoint.

    Geo fields matter: they are what lets a ward-level alert be delivered only
    to ward residents instead of paging the whole platform.
    """
    subscription = PushService.upsert(db, payload, user_id=user.id if user else None)
    return PushSubscribeOut(
        id=subscription.id,
        endpoint_hash=hashlib.sha256(payload.endpoint.encode()).hexdigest()[:16],
        critical_only=subscription.critical_only,
    )


@router.delete(
    "/unsubscribe",
    response_model=MessageResponse,
    summary="Remove a push subscription",
)
def unsubscribe(
    payload: PushUnsubscribeIn,
    db: DbSession,
) -> MessageResponse:
    """Retire an endpoint. Idempotent — deleting twice is not an error."""
    removed = PushService.remove(db, payload.endpoint)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )
    return MessageResponse(message="Unsubscribed.")
