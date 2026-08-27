"""
TownPulse Emergency Alert Model
=================================
Municipal emergency and public broadcast announcements (weather, flood, power outages, disaster relief).
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class EmergencyAlert(Base):
    """
    Emergency alerts broadcast to all town users on the platform.
    Severities: 'info' | 'warning' | 'critical'
    """

    __tablename__ = "emergency_alerts"

    # ─── Primary Key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # ─── Content ──────────────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(
        String(20),
        default="warning",  # info | warning | critical
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    link_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ─── Timestamps ───────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<EmergencyAlert id={self.id} title={self.title} severity={self.severity} active={self.is_active}>"
