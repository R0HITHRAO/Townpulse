"""
TownPulse Admin API Endpoints
================================
Routes for administration, moderation, claims review, and platform analytics.
All endpoints require admin role authorization.
"""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy.orm import joinedload

from app.core.dependencies import AdminUser, DbSession
from app.models.audit_log import AuditAction
from app.models.claim import Claim, ClaimStatus
from app.models.listing import Listing
from app.schemas.claim import ClaimOut, ClaimReview
from app.schemas.listing import ListingOut
from app.services.admin_service import AdminService
from app.services.audit_service import AuditService
from app.services.claim_service import ClaimService
from app.services.freshness_service import FreshnessService

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
    request: Request,
    db: DbSession,
) -> ListingOut:
    """Verify a listing and grant it a time-boxed verified badge."""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    before = FreshnessService.badge(listing) if listing else None

    verified = AdminService.verify_listing(db, listing_id)
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

    AuditService.record(
        db,
        actor=admin_user,
        action=AuditAction.LISTING_VERIFY,
        entity_type="listing",
        entity_id=listing_id,
        summary=f"Verified '{verified.name}'",
        before=before,
        after=FreshnessService.badge(verified),
        request=request,
    )
    return verified  # type: ignore[return-value]


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
    request: Request,
    db: DbSession,
) -> ClaimOut:
    """Approve claim, promote user to business_owner, and transfer listing ownership."""
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    before = {"status": claim.status.value if claim else None}

    review_data = ClaimReview(status=ClaimStatus.approved)
    reviewed = ClaimService.review_claim(db, claim_id, review_data)

    AuditService.record(
        db,
        actor=admin_user,
        action=AuditAction.CLAIM_APPROVE,
        entity_type="claim",
        entity_id=claim_id,
        summary=f"Approved claim for listing {reviewed.listing_id}",
        before=before,
        after={
            "status": "approved",
            "listing_id": str(reviewed.listing_id),
            "user_id": str(reviewed.user_id),
        },
        request=request,
    )
    return reviewed  # type: ignore[return-value]


@router.post(
    "/claims/{claim_id}/reject",
    response_model=ClaimOut,
    summary="Reject a business claim",
)
def reject_claim(
    claim_id: uuid.UUID,
    data: ClaimReview,
    admin_user: AdminUser,
    request: Request,
    db: DbSession,
) -> ClaimOut:
    """Reject claim with optional rejection explanation."""
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    before = {"status": claim.status.value if claim else None}

    data.status = ClaimStatus.rejected
    reviewed = ClaimService.review_claim(db, claim_id, data)

    AuditService.record(
        db,
        actor=admin_user,
        action=AuditAction.CLAIM_REJECT,
        entity_type="claim",
        entity_id=claim_id,
        summary=data.rejection_reason or "Rejected claim",
        before=before,
        after={"status": "rejected"},
        request=request,
    )
    return reviewed  # type: ignore[return-value]


# ─── Audit Trail ──────────────────────────────────────────────────────────────


@router.get(
    "/audit",
    summary="Browse the moderation audit trail",
)
def get_audit_log(
    admin_user: AdminUser,
    db: DbSession,
    entity_type: str | None = Query(None, description="e.g. listing | claim | alert"),
    entity_id: uuid.UUID | None = None,
    actor_id: uuid.UUID | None = None,
    action: str | None = Query(None, description="e.g. listing.verify"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict[str, Any]:
    """
    Append-only record of who changed what — the artefact municipal partners
    ask for during due diligence, and the README's "audit trails" promise.
    """
    return AuditService.list_events(
        db,
        entity_type=entity_type,
        entity_id=entity_id,
        actor_id=actor_id,
        action=action,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/audit/{entity_type}/{entity_id}",
    summary="Full change history for one entity",
)
def get_entity_history(
    entity_type: str,
    entity_id: uuid.UUID,
    admin_user: AdminUser,
    db: DbSession,
) -> list[dict[str, Any]]:
    """Chronological history for a single listing/claim/alert, oldest first."""
    entries = AuditService.entity_history(db, entity_type, entity_id)
    return [
        {
            "id": entry.id,
            "actor_id": entry.actor_id,
            "actor_role": entry.actor_role,
            "action": entry.action,
            "summary": entry.summary,
            "before": entry.before_json,
            "after": entry.after_json,
            "ip_address": entry.ip_address,
            "created_at": entry.created_at,
        }
        for entry in entries
    ]
