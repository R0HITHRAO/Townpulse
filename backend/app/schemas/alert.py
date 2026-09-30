"""
TownPulse Emergency Alert Schemas
=================================
Pydantic schemas for emergency alerts, broadcast announcements and the
resident check-ins ("I'm safe" / "I need help") that make them two-way.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class EmergencyAlertCreate(BaseModel):
    """Schema for creating a town emergency broadcast alert."""

    title: str = Field(..., min_length=3, max_length=255)
    message: str = Field(..., min_length=5, max_length=5000)
    severity: Literal["info", "warning", "critical"] = "warning"
    is_active: bool = True
    link_url: str | None = None
    expires_at: datetime | None = None

    # ─── Geo-fencing ──────────────────────────────────────────────────────────
    # Precedence: lat/lng + radius_meters, else district, else town-wide.
    lat: float | None = Field(None, ge=-90.0, le=90.0)
    lng: float | None = Field(None, ge=-180.0, le=180.0)
    radius_meters: float | None = Field(
        None,
        ge=100.0,
        le=100_000.0,
        description="Radius around (lat, lng) this alert applies to.",
    )
    district: str | None = Field(
        None,
        max_length=120,
        description="Free-text ward/taluk name when there is no centroid.",
    )

    # Provenance shown to residents ("District Emergency Office").
    source: str | None = Field(None, max_length=160)
    # Future-dated warnings stay hidden until this instant.
    publish_at: datetime | None = None


class EmergencyAlertUpdate(BaseModel):
    """Partial update for an existing alert (admin PUT)."""

    title: str | None = Field(None, min_length=3, max_length=255)
    message: str | None = Field(None, min_length=5, max_length=5000)
    severity: Literal["info", "warning", "critical"] | None = None
    is_active: bool | None = None
    link_url: str | None = None
    expires_at: datetime | None = None
    lat: float | None = Field(None, ge=-90.0, le=90.0)
    lng: float | None = Field(None, ge=-180.0, le=180.0)
    radius_meters: float | None = Field(None, ge=100.0, le=100_000.0)
    district: str | None = Field(None, max_length=120)
    source: str | None = Field(None, max_length=160)
    publish_at: datetime | None = None


class EmergencyAlertResponse(BaseModel):
    """Schema for returning an emergency alert."""

    id: uuid.UUID
    title: str
    message: str
    severity: str
    is_active: bool
    link_url: str | None = None
    created_at: datetime
    expires_at: datetime | None = None

    # Geo-fencing / provenance — absent fields simply read as null.
    lat: float | None = None
    lng: float | None = None
    district: str | None = None
    radius_meters: float | None = None
    source: str | None = None
    publish_at: datetime | None = None
    push_delivered: int = 0
    sms_queued: int = 0
    # Populated when the request carried lat/lng (distance from the resident).
    distance_meters: float | None = None
    # Resident's own response to this alert, if any.
    my_status: str | None = None

    model_config = ConfigDict(from_attributes=True)


# ─── Check-ins ────────────────────────────────────────────────────────────────


class AlertCheckInCreate(BaseModel):
    """A resident's response to an active alert."""

    status: Literal["safe", "needs_help"]
    note: str | None = Field(None, max_length=1000, examples=["Insulin running out"])
    phone: str | None = Field(
        None,
        max_length=20,
        description="Callback number for anonymous needs-help requests.",
    )
    lat: float | None = Field(None, ge=-90.0, le=90.0)
    lng: float | None = Field(None, ge=-180.0, le=180.0)


class AlertCheckInOut(BaseModel):
    """Confirmation of a recorded check-in plus the alert's running tally."""

    id: uuid.UUID
    alert_id: uuid.UUID
    status: str
    safe_count: int
    needs_help_count: int

    model_config = ConfigDict(from_attributes=True)
