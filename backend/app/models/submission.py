"""
TownPulse Submission Model
============================
Public submissions of new listings, stored as JSONB until admin approval.
Allows unverified users to suggest new listings without creating them directly.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class SubmissionStatus(str, enum.Enum):
    """Status of a public listing submission."""

    pending = "pending"    # Waiting for admin review
    approved = "approved"  # Admin approved — listing created
    rejected = "rejected"  # Admin rejected


class Submission(Base):
    """
    A public submission of a new listing.

    Submissions are stored as JSONB and go through admin approval
    before becoming a real Listing. This prevents spam and ensures
    data quality without blocking legitimate contributions.
    """

    __tablename__ = "submissions"

    # ─── Primary Key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # ─── Submission Data ──────────────────────────────────────────────────────
    # Flexible JSONB field stores all submitted listing data
    # Schema matches the Listing model fields
    data_json: Mapped[dict] = mapped_column(JSONB, nullable=False)

    status: Mapped[SubmissionStatus] = mapped_column(
        Enum(SubmissionStatus, name="submission_status"),
        default=SubmissionStatus.pending,
        nullable=False,
    )

    # Optional rejection reason from admin
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ─── Submitter ────────────────────────────────────────────────────────────
    # Can be null for anonymous submissions
    submitted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

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
    submitted_by: Mapped["User | None"] = relationship(  # type: ignore[name-defined]
        "User",
        foreign_keys=[submitted_by_user_id],
    )

    def __repr__(self) -> str:
        name = self.data_json.get("name", "?") if self.data_json else "?"
        return f"<Submission id={self.id} name={name} status={self.status}>"
