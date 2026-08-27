"""
TownPulse Admin Service
=========================
Administrative logic for viewing platform statistics, managing submissions,
and retrieving moderation queues.
"""

from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.claim import Claim, ClaimStatus
from app.models.listing import Listing
from app.models.submission import Submission, SubmissionStatus
from app.models.user import User, UserRole


class AdminService:
    """Service providing moderation and analytics tools for administrators."""

    @staticmethod
    def get_analytics_summary(db: Session) -> dict[str, Any]:
        """
        Compute top-level analytics metrics for the admin dashboard.

        Returns:
            Dictionary with counts and ratios.
        """
        total_listings = db.query(Listing).count()
        verified_listings = (
            db.query(Listing).filter(Listing.verified.is_(True)).count()
        )
        unverified_listings = total_listings - verified_listings

        total_users = db.query(User).count()
        business_owners = (
            db.query(User).filter(User.role == UserRole.business_owner).count()
        )

        pending_claims = (
            db.query(Claim).filter(Claim.status == ClaimStatus.pending).count()
        )
        approved_claims = (
            db.query(Claim).filter(Claim.status == ClaimStatus.approved).count()
        )

        pending_submissions = (
            db.query(Submission)
            .filter(Submission.status == SubmissionStatus.pending)
            .count()
        )

        verification_rate = (
            (verified_listings / total_listings * 100) if total_listings > 0 else 0.0
        )

        return {
            "total_listings": total_listings,
            "verified_listings": verified_listings,
            "unverified_listings": unverified_listings,
            "verification_rate_percent": round(verification_rate, 1),
            "total_users": total_users,
            "business_owners": business_owners,
            "pending_claims": pending_claims,
            "approved_claims": approved_claims,
            "pending_submissions": pending_submissions,
        }

    @staticmethod
    def get_pending_listings(db: Session, limit: int = 50) -> list[Listing]:
        """Retrieve listings pending admin moderation."""
        return (
            db.query(Listing)
            .filter(Listing.status == "pending")
            .order_by(Listing.created_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def verify_listing(db: Session, listing_id: Any) -> Listing | None:
        """Mark a listing as verified by admin."""
        listing = db.query(Listing).filter(Listing.id == listing_id).first()
        if listing:
            listing.verified = True
            listing.status = "approved"
            db.commit()
            db.refresh(listing)
        return listing
