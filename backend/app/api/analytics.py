"""
TownPulse Analytics API Endpoints
=================================
Two very different halves of one pipeline:

- Ingest (POST /analytics/events): anonymous, batched, fail-open. A tracking
  failure must never break the user action it decorates.
- Summaries (GET ...): owner-facing per-listing performance and the admin
  platform view, both served from indexed aggregates rather than N+1 scans.

The owner summary is what the ClaimModal "your listing is getting views"
dashboard has been promising without ever having a backend.
"""

import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import AdminUser, DbSession, OptionalUser
from app.models.listing import Listing
from app.models.user import UserRole
from app.schemas.analytics import (
    EventBatchIn,
    IngestResponse,
    ListingAnalyticsOut,
    PlatformAnalyticsOut,
)
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.post(
    "/events",
    response_model=IngestResponse,
    summary="Record a batch of behavioural events",
)
def ingest_events(
    batch: EventBatchIn,
    db: DbSession,
    user: OptionalUser,
) -> IngestResponse:
    """
    Accept up to 50 events per request.

    Unknown event types are counted as rejected rather than 422'd: an old
    cached client must keep working after a rename.
    """
    result = analytics_service.track_many(
        db,
        [event.model_dump() for event in batch.events],
        user_id=user.id if user else None,
        session_id=batch.session_id,
        path=batch.path,
    )
    return IngestResponse(**result)


@router.get(
    "/listings/{listing_id}",
    response_model=ListingAnalyticsOut,
    summary="Listing performance for its owner",
)
def listing_analytics(
    listing_id: uuid.UUID,
    db: DbSession,
    user: OptionalUser,
    days: int = Query(30, ge=1, le=365, description="Rolling window in days"),
) -> ListingAnalyticsOut:
    """Views, reach-outs by channel, and a daily series for one listing."""
    listing = db.get(Listing, listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to view listing analytics",
        )
    is_admin = user.role == UserRole.admin
    is_owner = listing.owner_user_id == user.id
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the listing owner or an admin can view its analytics",
        )

    summary = analytics_service.listing_summary(db, listing_id, days=days)
    return ListingAnalyticsOut(**summary)


@router.get(
    "/platform",
    response_model=PlatformAnalyticsOut,
    summary="Platform-wide engagement summary",
)
def platform_analytics(
    admin_user: AdminUser,
    db: DbSession,
    days: int = Query(30, ge=1, le=365),
) -> PlatformAnalyticsOut:
    """
    Admin view: what residents are doing, including zero-result searches —
    the demand signals that tell the municipality which listings are missing.
    """
    summary = analytics_service.platform_summary(db, days=days)
    return PlatformAnalyticsOut(**summary)
