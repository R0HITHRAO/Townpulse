"""
TownPulse Claim Service
=========================
Handles business owner claim submissions and administrator reviews.
Approving a claim promotes the user to business_owner and sets listing ownership.
"""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.logging import get_logger
from app.models.claim import Claim, ClaimStatus
from app.models.listing import Listing
from app.models.user import User, UserRole
from app.schemas.claim import ClaimCreate, ClaimReview

logger = get_logger(__name__)


class ClaimService:
    """Service handling business claim workflows and verification."""

    @staticmethod
    def create_claim(
        db: Session,
        user: User,
        data: ClaimCreate,
    ) -> Claim:
        """
        Submit a claim for a listing.

        Args:
            db: Database session.
            user: The claimant user.
            data: Claim data with optional proof URL and message.

        Returns:
            Created Claim instance in pending status.
        """
        # Verify listing exists
        listing = db.query(Listing).filter(Listing.id == data.listing_id).first()
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found",
            )

        # Check if already owned
        if listing.owner_user_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This listing is already claimed and owned by another user.",
            )

        # Check for existing pending claim by this user
        existing = (
            db.query(Claim)
            .filter(
                Claim.listing_id == data.listing_id,
                Claim.user_id == user.id,
                Claim.status == ClaimStatus.pending,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already have a pending claim for this listing.",
            )

        claim = Claim(
            listing_id=data.listing_id,
            user_id=user.id,
            proof_url=data.proof_url,
            message=data.message,
            status=ClaimStatus.pending,
        )
        db.add(claim)
        db.commit()
        db.refresh(claim)
        logger.info(
            "Claim submitted",
            claim_id=str(claim.id),
            listing_id=str(data.listing_id),
            user_id=str(user.id),
        )
        return claim

    @staticmethod
    def review_claim(
        db: Session,
        claim_id: uuid.UUID,
        data: ClaimReview,
    ) -> Claim:
        """
        Admin review (approve or reject) of a pending claim.
        """
        claim = (
            db.query(Claim)
            .options(joinedload(Claim.listing), joinedload(Claim.user))
            .filter(Claim.id == claim_id)
            .first()
        )
        if not claim:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Claim not found",
            )

        if claim.status != ClaimStatus.pending:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Claim is already {claim.status.value}",
            )

        claim.status = data.status
        claim.rejection_reason = data.rejection_reason
        claim.reviewed_at = datetime.now(timezone.utc)

        if data.status == ClaimStatus.approved:
            # Transfer listing ownership
            claim.listing.owner_user_id = claim.user_id
            claim.listing.verified = True

            # Promote user to business_owner if they are a regular user
            if claim.user.role == UserRole.user:
                claim.user.role = UserRole.business_owner

        db.commit()
        db.refresh(claim)
        logger.info(
            "Claim reviewed",
            claim_id=str(claim_id),
            status=data.status.value,
        )
        return claim
