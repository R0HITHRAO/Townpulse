"""
TownPulse Saved Place Schemas
=============================
Server-side bookmark contracts (the localStorage-only version lost saves on
cache clear and never left the device it was created on).
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SavedPlaceIn(BaseModel):
    """Save (or update the note on) a listing."""

    listing_id: uuid.UUID
    note: str | None = Field(None, max_length=500)


class SavedPlaceUpdate(BaseModel):
    """Patch the private note attached to a save."""

    note: str | None = Field(None, max_length=500)


class SavedPlaceOut(BaseModel):
    """A saved listing with just enough detail to render without N+1 calls."""

    id: uuid.UUID
    listing_id: uuid.UUID
    note: str | None = None
    created_at: datetime
    listing: dict[str, Any] | None = None

    model_config = {"from_attributes": True}
