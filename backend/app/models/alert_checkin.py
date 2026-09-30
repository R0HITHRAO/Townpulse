"""
TownPulse Alert Check-In Model
==============================
"I'm safe" / "I need help" responses to a geo-fenced emergency alert.

A broadcast that cannot be answered is propaganda; one that can be answered
turns into a live situational picture for the local administration. The counts
of safe vs. needs_help per radius are what make this operationally useful
during a flood or cyclone.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class CheckInStatus:
    """Allowed check-in states."""

    SAFE = "safe"
    NEEDS_HELP = "needs_help"
    ALL = (SAFE, NEEDS_HELP)


class AlertCheckIn(Base):
    """A resident's response to an emergency alert."""

    __tablename__ = "alert_checkins"
    __table_args__ = (
        # One response per person per alert; they may change it, not spam it.
        UniqueConstraint("alert_id", "user_id", name="uq_alert_checkins_alert_user"),
    )

    # ─── Primary Key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # ─── Alert ────────────────────────────────────────────────────────────────
    alert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("emergency_alerts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ─── Resident ─────────────────────────────────────────────────────────────
    # Nullable: allows an anonymous check-in carrying contact details instead.
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ─── Response ─────────────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=CheckInStatus.SAFE,
    )
    # Optional free-text need ("insulin running out", "stuck on roof").
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Callback number for anonymous needs-help requests.
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Reported position (kept as plain numerics — accuracy matters more than
    # indexing here, and the client may only have a coarse cellular fix).
    lat: Mapped[float | None] = mapped_column(nullable=True)
    lng: Mapped[float | None] = mapped_column(nullable=True)

    # ─── Triage State ─────────────────────────────────────────────────────────
    # A needs_help row is an open case until an admin resolves it.
    resolved: Mapped[bool] = mapped_column(
        nullable=False,
        default=False,
        server_default="false",
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ─── Timestamp ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<AlertCheckIn alert={self.alert_id} status={self.status}>"
