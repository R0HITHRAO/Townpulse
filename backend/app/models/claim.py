"""
TownPulse Claim Model
=======================
Represents a business owner's request to claim a listing.
Claims go through admin review before approval.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ClaimStatus(str, enum.Enum):
    """Status of a listing claim request."""

    pending = "pending"    # Waiting for admin review
    approved = "approved"  # Admin approved — listing ownership transferred
    rejected = "rejected"  # Admin rejected — listing remains unowned


class Claim(Base):
    """
    A claim request by a business owner for a listing.

    Workflow:
    1. Business owner submits claim with optional proof (business registration, etc.)
    2. Admin reviews the claim and proof
    3. Admin approves → listing.owner_user_id updated; user.role → business_owner
    4. Admin rejects → listing remains unowned; user notified
    """

    __tablename__ = "claims"

    # ─── Primary Key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # ─── Foreign Keys ─────────────────────────────────────────────────────────
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ─── Claim Details ────────────────────────────────────────────────────────
    status: Mapped[ClaimStatus] = mapped_column(
        Enum(ClaimStatus, name="claim_status"),
        default=ClaimStatus.pending,
        nullable=False,
    )

    # URL to uploaded proof document (business registration, utility bill, etc.)
    proof_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Optional message from the claimant
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Admin's rejection reason (if rejected)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ─── Timestamps ───────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    listing: Mapped["Listing"] = relationship(  # type: ignore[name-defined]
        "Listing",
        back_populates="claims",
    )
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User",
        back_populates="claims",
    )

    def __repr__(self) -> str:
        return f"<Claim id={self.id} listing={self.listing_id} status={self.status}>"
