"""
TownPulse Admin API Endpoints
================================
Routes for administration, moderation, claims review, and platform analytics.
All endpoints require admin role authorization.
"""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import joinedload

from app.core.dependencies import AdminUser, DbSession
from app.models.claim import Claim, ClaimStatus
from app.models.listing import Listing
from app.models.submission import Submission, SubmissionStatus
from app.schemas.claim import ClaimOut, ClaimReview
from app.schemas.common import MessageResponse
from app.schemas.listing import ListingOut
from app.services.admin_service import AdminService
from app.services.claim_service import ClaimService

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Analytics ────────────────────────────────────────────────────────────────


@router.get(
    "/analytics",
    summary="Get platform analytics and KPI metrics",
)
def get_analytics(
    admin_user: AdminUser,
    db: DbSession,
) -> dict[str, Any]:
    """Retrieve top-level platform KPIs (listings, verification rate, users, claims)."""
    return AdminService.get_analytics_summary(db)


# ─── Listings Moderation ──────────────────────────────────────────────────────


@router.get(
    "/listings/pending",
    response_model=list[ListingOut],
    summary="List unverified listings pending approval",
)
def get_pending_listings(
    admin_user: AdminUser,
    db: DbSession,
) -> list[ListingOut]:
    """Retrieve pending listings waiting for verification."""
    return AdminService.get_pending_listings(db)  # type: ignore[return-value]


@router.post(
    "/listings/{listing_id}/verify",
    response_model=ListingOut,
    summary="Approve and verify a listing",
)
def verify_listing(
    listing_id: uuid.UUID,
    admin_user: AdminUser,
    db: DbSession,
) -> ListingOut:
    """Verify a listing and grant it the verified badge."""
    listing = AdminService.verify_listing(db, listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )
    return listing  # type: ignore[return-value]


# ─── Claims Moderation ────────────────────────────────────────────────────────


@router.get(
    "/claims/pending",
    response_model=list[ClaimOut],
    summary="List pending business claim requests",
)
def get_pending_claims(
    admin_user: AdminUser,
    db: DbSession,
) -> list[ClaimOut]:
    """Retrieve all pending claims awaiting administrator verification."""
    claims = (
        db.query(Claim)
        .options(joinedload(Claim.user))
        .filter(Claim.status == ClaimStatus.pending)
        .order_by(Claim.created_at.desc())
        .all()
    )
    return claims  # type: ignore[return-value]


@router.post(
    "/claims/{claim_id}/approve",
    response_model=ClaimOut,
    summary="Approve a business claim",
)
def approve_claim(
    claim_id: uuid.UUID,
    admin_user: AdminUser,
    db: DbSession,
) -> ClaimOut:
    """Approve claim, promote user to business_owner, and transfer listing ownership."""
    review_data = ClaimReview(status=ClaimStatus.approved)
    return ClaimService.review_claim(db, claim_id, review_data)  # type: ignore[return-value]


@router.post(
    "/claims/{claim_id}/reject",
    response_model=ClaimOut,
    summary="Reject a business claim",
)
def reject_claim(
    claim_id: uuid.UUID,
    data: ClaimReview,
    admin_user: AdminUser,
    db: DbSession,
) -> ClaimOut:
    """Reject claim with optional rejection explanation."""
    data.status = ClaimStatus.rejected
    return ClaimService.review_claim(db, claim_id, data)  # type: ignore[return-value]
