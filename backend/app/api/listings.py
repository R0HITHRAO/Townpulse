"""
TownPulse Listings API Endpoints
==================================
Routes for discovering, searching, creating, editing, and claiming listings.
"""

import math
import uuid

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.core.dependencies import CurrentUser, DbSession
from app.models.audit_log import AuditAction
from app.models.category import Category
from app.models.listing import Listing
from app.models.user import User, UserRole
from app.schemas.claim import ClaimCreate, ClaimOut
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.freshness import (
    ConfirmOut,
    FreshnessBadgeOut,
    ReverifyConfirmIn,
    ReverifyConfirmOut,
    ReverifyRequestOut,
    StaleReportIn,
    StaleReportOut,
)
from app.schemas.listing import (
    CategoryOut,
    ListingCreate,
    ListingOut,
    ListingReport,
    ListingSearch,
    ListingUpdate,
)
from app.services.analytics_service import EventType, track
from app.services.audit_service import AuditService
from app.services.cache_service import CacheService
from app.services.claim_service import ClaimService
from app.services.freshness_service import FreshnessService
from app.services.listing_service import ListingService

router = APIRouter(tags=["Listings"])


# ─── Categories ───────────────────────────────────────────────────────────────


@router.get(
    "/categories",
    response_model=list[CategoryOut],
    summary="List all listing categories",
)
def get_categories(db: DbSession) -> list[CategoryOut]:
    """Retrieve all categories with cached acceleration."""
    cached = CacheService.get("categories:all")
    if cached:
        return [CategoryOut(**c) for c in cached]

    categories = db.query(Category).order_by(Category.name.asc()).all()
    result = [CategoryOut.model_validate(c) for c in categories]
    CacheService.set(
        "categories:all",
        [c.model_dump() for c in result],
        ttl_seconds=3600,
    )
    return result  # type: ignore[return-value]


# ─── Search & Discovery ───────────────────────────────────────────────────────


@router.get(
    "/listings",
    response_model=PaginatedResponse[ListingOut],
    summary="Search listings with filters and geospatial proximity",
)
def search_listings(
    db: DbSession,
    q: str | None = Query(None, description="Full-text search query"),
    category_id: int | None = Query(None, description="Filter by category"),
    lat: float | None = Query(None, ge=-90.0, le=90.0, description="Center latitude"),
    lng: float
    | None = Query(None, ge=-180.0, le=180.0, description="Center longitude"),
    radius: float | None = Query(10000.0, description="Search radius in meters"),
    verified_only: bool = Query(False, description="Verified listings only"),
    open_now: bool = Query(False, description="Only listings open at this instant"),
    min_lat: float | None = Query(None, ge=-90.0, le=90.0),
    max_lat: float | None = Query(None, ge=-90.0, le=90.0),
    min_lng: float | None = Query(None, ge=-180.0, le=180.0),
    max_lng: float | None = Query(None, ge=-180.0, le=180.0),
    sort_by: str = Query(
        "created_at",
        description="Sort by: created_at | name | distance | rating",
    ),
    sort_order: str = Query("desc", description="Sort order: asc | desc"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[ListingOut]:
    """Search listings using PostGIS radius queries and full-text keyword matching."""
    params = ListingSearch(
        q=q,
        category_id=category_id,
        lat=lat,
        lng=lng,
        radius_meters=radius,
        verified_only=verified_only,
        open_now=open_now,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lng=min_lng,
        max_lng=max_lng,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )
    items, total = ListingService.search_listings(db, params)
    total_pages = math.ceil(total / per_page) if total > 0 else 1

    # Demand signal: what people looked for and how much they found. Recorded
    # best-effort — a tracking hiccup must not fail a search.
    if q and q.strip():
        track(
            db,
            event_type=EventType.SEARCH_PERFORMED,
            payload={
                "query": q.strip()[:200],
                "result_count": total,
                "open_now": open_now,
                "has_geo": lat is not None and lng is not None,
            },
        )

    return PaginatedResponse(
        items=[ListingOut(**item) for item in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get(
    "/listings/{listing_id}",
    response_model=ListingOut,
    summary="Get listing details by ID",
)
def get_listing(
    listing_id: uuid.UUID,
    db: DbSession,
) -> ListingOut:
    """Retrieve full details for a single listing."""
    listing = ListingService.get_by_id(db, listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )
    return listing  # type: ignore[return-value]


# ─── Mutations ────────────────────────────────────────────────────────────────


@router.post(
    "/listings",
    response_model=ListingOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create or submit a new listing",
)
def create_listing(
    data: ListingCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> ListingOut:
    """Create a new listing (auto-verified if created by admin)."""
    is_admin = current_user.role == UserRole.admin
    listing = ListingService.create_listing(
        db,
        data,
        owner_id=current_user.id
        if current_user.role == UserRole.business_owner
        else None,
        auto_verify=is_admin,
    )
    # Invalidate cache
    CacheService.delete_pattern("listings:*")
    return listing  # type: ignore[return-value]


@router.put(
    "/listings/{listing_id}",
    response_model=ListingOut,
    summary="Update listing details",
)
def update_listing(
    listing_id: uuid.UUID,
    data: ListingUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> ListingOut:
    """Update listing details (permitted for owner or admin)."""
    # Ownership and the mutation both need the real ORM row. `get_by_id`
    # returns a serialised dict for the response, so reading `owner_user_id`
    # off it raised AttributeError and handing it to `update_listing` would
    # have setattr()'d onto a dict instead of the database row.
    listing = _require_listing(db, listing_id)

    # Permission check: must be admin or the verified owner
    is_owner = listing.owner_user_id == current_user.id
    is_admin = current_user.role == UserRole.admin
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this listing.",
        )

    ListingService.update_listing(db, listing, data)
    CacheService.delete_pattern("listings:*")
    # Re-read as a serialised payload for the response contract.
    return ListingOut.model_validate(ListingService.get_by_id(db, listing_id))


@router.delete(
    "/listings/{listing_id}",
    response_model=MessageResponse,
    summary="Delete a listing",
)
def delete_listing(
    listing_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    """Delete a listing (permitted for owner or admin)."""
    # Needs the ORM row: `delete_listing` calls db.delete(), which would fail
    # on the serialised dict that `get_by_id` returns.
    listing = _require_listing(db, listing_id)

    is_owner = listing.owner_user_id == current_user.id
    is_admin = current_user.role == UserRole.admin
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this listing.",
        )

    ListingService.delete_listing(db, listing)
    CacheService.delete_pattern("listings:*")
    return MessageResponse(message="Listing deleted successfully")


# ─── Claims & Reports ─────────────────────────────────────────────────────────


@router.post(
    "/listings/{listing_id}/claim",
    response_model=ClaimOut,
    status_code=status.HTTP_201_CREATED,
    summary="Claim ownership of a listing",
)
def claim_listing(
    listing_id: uuid.UUID,
    data: ClaimCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> ClaimOut:
    """Submit a business ownership claim with optional proof."""
    data.listing_id = listing_id
    claim = ClaimService.create_claim(db, current_user, data)
    return claim  # type: ignore[return-value]


@router.post(
    "/listings/{listing_id}/report",
    response_model=MessageResponse,
    summary="Report an inaccurate or closed listing",
)
def report_listing(
    listing_id: uuid.UUID,
    data: ListingReport,
    current_user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    """Report an inaccurate, fraudulent, or permanently closed listing."""
    _require_listing(db, listing_id)
    return MessageResponse(
        message="Thank you. Your report has been submitted to moderators."
    )


# ─── Freshness (trust decay) ──────────────────────────────────────────────────
# `_require_listing` / `_require_owner_or_admin` are also reused by the
# mutation endpoints above; they live here next to the other shared helpers.


def _require_listing(db: DbSession, listing_id: uuid.UUID) -> Listing:
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )
    return listing


def _require_owner_or_admin(listing: Listing, user: User) -> None:
    if user.role == UserRole.admin:
        return
    if listing.owner_user_id == user.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only the listing owner or an admin may do this.",
    )


@router.get(
    "/listings/{listing_id}/freshness",
    response_model=FreshnessBadgeOut,
    summary="Freshness / verification-expiry badge for a listing",
)
def get_listing_freshness(
    listing_id: uuid.UUID,
    db: DbSession,
) -> FreshnessBadgeOut:
    """
    Trust score and expiry state behind the verified badge.

    `state` is one of fresh | expiring | expired | needs_review | unverified.
    """
    listing = _require_listing(db, listing_id)
    badge = FreshnessService.badge(listing)
    return FreshnessBadgeOut(listing_id=listing_id, **badge)  # type: ignore[arg-type]


@router.post(
    "/listings/{listing_id}/confirm",
    response_model=ConfirmOut,
    summary="Confirm this place is still open",
)
def confirm_listing(
    listing_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> ConfirmOut:
    """
    One tap: "still open / the number works".

    De-duplicated per user per 24h, so tapping repeatedly cannot farm the score.
    """
    listing = _require_listing(db, listing_id)
    result = FreshnessService.confirm(db, listing, user_id=current_user.id)
    return ConfirmOut(**result)  # type: ignore[arg-type]


@router.post(
    "/listings/{listing_id}/report-stale",
    response_model=StaleReportOut,
    summary="Report a listing as closed or inaccurate",
)
def report_listing_stale(
    listing_id: uuid.UUID,
    payload: StaleReportIn,
    current_user: CurrentUser,
    db: DbSession,
) -> StaleReportOut:
    """
    One tap: closed / wrong number / moved.

    Three reports escalate the listing into the moderation queue — escalated,
    never hidden, because wrongly hiding a working shop costs more.
    """
    listing = _require_listing(db, listing_id)
    result = FreshnessService.report_stale(
        db,
        listing,
        user_id=current_user.id,
        reason=f"{payload.reason}: {payload.detail or ''}",
    )
    return StaleReportOut(**result)


@router.post(
    "/listings/{listing_id}/reverify/request",
    response_model=ReverifyRequestOut,
    summary="Ask for an SMS re-verification code (owner)",
)
async def request_listing_reverify(
    listing_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> ReverifyRequestOut:
    """
    Owner (or admin) requests a fresh verification code by SMS.

    Reuses the configured OTP provider, so municipalities that already send
    login OTPs get re-confirmation with no extra integration.
    """
    listing = _require_listing(db, listing_id)
    _require_owner_or_admin(listing, current_user)
    result = await FreshnessService.request_reverify_code(
        db,
        listing,
        user_id=current_user.id,
    )
    return ReverifyRequestOut(**result)  # type: ignore[arg-type]


@router.post(
    "/listings/{listing_id}/reverify/confirm",
    response_model=ReverifyConfirmOut,
    summary="Submit the SMS code and refresh verification (owner)",
)
def confirm_listing_reverify(
    listing_id: uuid.UUID,
    payload: ReverifyConfirmIn,
    current_user: CurrentUser,
    request: Request,
    db: DbSession,
) -> ReverifyConfirmOut:
    """Consume the code; on match, stamp a fresh 180-day verification window."""
    listing = _require_listing(db, listing_id)
    _require_owner_or_admin(listing, current_user)

    before = FreshnessService.badge(listing)
    verified = FreshnessService.confirm_reverify_code(
        db,
        listing,
        payload.code,
        user_id=current_user.id,
    )
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code.",
        )

    AuditService.record(
        db,
        actor=current_user,
        action=AuditAction.LISTING_REVERIFY,
        entity_type="listing",
        entity_id=listing.id,
        summary=f"Owner re-verified '{listing.name}'",
        before=before,
        after=FreshnessService.badge(listing),
        request=request,
    )

    badge = FreshnessService.badge(listing)
    return ReverifyConfirmOut(
        verified=True,
        badge=FreshnessBadgeOut(listing_id=listing_id, **badge),  # type: ignore[arg-type]
    )
