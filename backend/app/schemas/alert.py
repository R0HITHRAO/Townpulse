"""
TownPulse Emergency Alert Schemas
==================================
Pydantic schemas for emergency alerts and broadcast announcements.
"""

from datetime import datetime
from typing import Literal
import uuid
from pydantic import BaseModel, ConfigDict, Field


class EmergencyAlertCreate(BaseModel):
    """Schema for creating a town emergency broadcast alert."""
    title: str = Field(..., min_length=3, max_length=255)
    message: str = Field(..., min_length=5, max_length=5000)
    severity: Literal["info", "warning", "critical"] = "warning"
    is_active: bool = True
    link_url: str | None = None
    expires_at: datetime | None = None


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

    model_config = ConfigDict(from_attributes=True)
