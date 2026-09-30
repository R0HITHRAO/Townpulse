"""
TownPulse Emergency Alert Model
=================================
Municipal emergency and public broadcast announcements (weather, flood, power outages, disaster relief).
"""

import uuid
from datetime import datetime
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class EmergencyAlert(Base):
    """
    Emergency alerts broadcast to residents, optionally geo-fenced to a
    radius or district so one ward's flood warning is not pushed town-wide.

    Severities: 'info' | 'warning' | 'critical'
    Targeting precedence: lat/lng + radius_meters, else district, else global.
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
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )
    link_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ─── Geo Targeting ────────────────────────────────────────────────────────
    # A flood warning for one ward must not be shown to — or billed as an SMS
    # to — the whole platform. Targeting reuses the same PostGIS geography
    # machinery as listing search. Precedence: radius, then district, then all.
    lat: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    lng: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    district: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)

    # NULL location == platform-wide alert.
    # Mapped[Any] rather than a bare `Column(...)` so writes of WKT strings
    # (see `_set_location`) type-check; geoalchemy2 has no precise Python type
    # for this attribute.
    location: Mapped[Any] = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=True,
    )
    # Radius around (lat, lng) in metres.
    radius_meters: Mapped[float | None] = mapped_column(
        Numeric(10, 1),
        nullable=True,
        default=10000.0,
    )

    # ─── Provenance & Scheduling ──────────────────────────────────────────────
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Issuing authority shown in the UI ("District Emergency Office").
    source: Mapped[str | None] = mapped_column(String(160), nullable=True)
    # Future-dated alerts stay hidden until publish time (scheduled warnings).
    publish_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ─── Fan-out Accounting ───────────────────────────────────────────────────
    push_delivered: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    sms_queued: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    # ─── Timestamps ───────────────────────────────────────────────────────────
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
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    @property
    def is_geo_fenced(self) -> bool:
        """True when this alert applies only to a bounded area."""
        return self.location is not None

    def __repr__(self) -> str:
        return f"<EmergencyAlert id={self.id} title={self.title} severity={self.severity} active={self.is_active}>"
