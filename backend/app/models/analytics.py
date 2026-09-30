"""
TownPulse Analytics Model
===========================
Flexible event-sourced analytics for tracking user interactions.
Stores events as JSONB for schema flexibility.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class Analytics(Base):
    """
    Analytics events for tracking platform usage.

    Event types:
    - listing_view: User viewed a listing detail page
    - listing_search: User performed a search
    - listing_contact_click: User clicked call/email/website
    - claim_submitted: User submitted a claim
    - claim_approved: Admin approved a claim
    - otp_requested: OTP was requested
    - listing_reported: User reported a listing

    Payload is JSONB for flexible event-specific data.
    """

    __tablename__ = "analytics"

    # ─── Primary Key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # ─── Event Data ───────────────────────────────────────────────────────────
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Flexible JSONB payload — structure varies by event type
    payload_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Optional association to a user (null for anonymous events)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ─── Attribution ──────────────────────────────────────────────────────────
    # Promoted out of the payload so per-listing analytics ("how many people
    # tapped 'call' on my clinic this week?") is an indexed lookup instead of a
    # JSONB scan over the whole event history.
    listing_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    # Anonymous, per-session id for de-duplicated visitor counts (no fingerprint).
    session_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    # Client-side route the event came from, e.g. "/listings/12ab#call".
    path: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # ─── Timestamp ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        # "Events of this type in this window" — every aggregate query shape.
        Index("ix_analytics_type_created", "event_type", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Analytics id={self.id} event={self.event_type}>"
