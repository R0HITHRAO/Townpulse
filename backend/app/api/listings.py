"""
TownPulse Listings API Endpoints
==================================
Routes for discovering, searching, creating, editing, and claiming listings.
"""

import math
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import CurrentUser, DbSession
from app.models.category import Category
from app.models.listing import Listing
from app.models.user import UserRole
from app.schemas.claim import ClaimCreate, ClaimOut
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.listing import (
    CategoryOut,
    ListingCreate,
    ListingOut,
    ListingReport,
    ListingSearch,
    ListingUpdate,
)
from app.services.cache_service import CacheService
from app.services.claim_service import ClaimService
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
    lng: float | None = Query(None, ge=-180.0, le=180.0, description="Center longitude"),
    radius: float | None = Query(10000.0, description="Search radius in meters"),
    verified_only: bool = Query(False, description="Verified listings only"),
    sort_by: str = Query("created_at", description="Sort by: created_at | name | distance"),
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
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )
    items, total = ListingService.search_listings(db, params)
    total_pages = math.ceil(total / per_page) if total > 0 else 1

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
        owner_id=current_user.id if current_user.role == UserRole.business_owner else None,
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
    listing = ListingService.get_by_id(db, listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

    # Permission check: must be admin or the verified owner
    is_owner = listing.owner_user_id == current_user.id
    is_admin = current_user.role == UserRole.admin
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this listing.",
        )

    updated = ListingService.update_listing(db, listing, data)
    CacheService.delete_pattern("listings:*")
    return updated  # type: ignore[return-value]


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
    listing = ListingService.get_by_id(db, listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

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
    listing = ListingService.get_by_id(db, listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )
    return MessageResponse(
        message="Thank you. Your report has been submitted to moderators."
    )
