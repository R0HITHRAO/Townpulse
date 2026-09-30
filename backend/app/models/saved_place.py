"""
TownPulse Saved Place Model
===========================
Server-side bookmark for a listing.

Previously "My Saved Places" lived only in localStorage, which meant saves were
trapped on one device and vanished on cache clear — painful for the low-end
Android handsets common in the target market. Server-side saves enable:

1. Cross-device continuity (phone -> shared family tablet).
2. Saved-place notifications ("the clinic you saved now has a phone number").
3. A popularity signal that improves ranking.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.listing import Listing


class SavedPlace(Base):
    """A user's saved (bookmarked) listing."""

    __tablename__ = "saved_places"
    __table_args__ = (
        # Saving the same listing twice is a no-op, not a duplicate row.
        UniqueConstraint("user_id", "listing_id", name="uq_saved_places_user_listing"),
    )

    # ─── Primary Key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # ─── Owner ────────────────────────────────────────────────────────────────
    # CASCADE: a saved place is meaningless without its owner.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ─── Target Listing ───────────────────────────────────────────────────────
    # CASCADE: deleting a listing removes it from everyone's saves.
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Optional private note ("the one near the bus stand").
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ─── Timestamp ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    listing: Mapped["Listing"] = relationship(  # type: ignore[name-defined]
        "Listing",
    )

    def __repr__(self) -> str:
        return f"<SavedPlace user={self.user_id} listing={self.listing_id}>"
