"""
TownPulse Review Model
========================
User reviews and ratings for listings.
"""

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Review(Base):
    """
    A user review and rating for a listing.
    Ratings are integers 1-5.
    One review per user per listing (enforced by unique constraint).
    """

    __tablename__ = "reviews"
    __table_args__ = (
        # Rating must be between 1 and 5
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating"),
    )

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

    # ─── Review Content ───────────────────────────────────────────────────────
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ─── Timestamps ───────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    listing: Mapped["Listing"] = relationship(  # type: ignore[name-defined]
        "Listing",
        back_populates="reviews",
    )
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User",
        back_populates="reviews",
    )

    def __repr__(self) -> str:
        return f"<Review id={self.id} listing={self.listing_id} rating={self.rating}>"
