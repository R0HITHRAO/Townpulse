"""
TownPulse Analytics Model
===========================
Flexible event-sourced analytics for tracking user interactions.
Stores events as JSONB for schema flexibility.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
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

    # ─── Timestamp ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<Analytics id={self.id} event={self.event_type}>"
