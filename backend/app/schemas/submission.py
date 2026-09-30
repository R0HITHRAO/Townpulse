"""
TownPulse Submission Schemas
============================
Public "suggest a listing" contracts.

The whole point of a submission (vs. creating a Listing directly) is that it
can be accepted from an anonymous resident and reviewed later — so the create
schema is deliberately permissive and the response never echoes internal state.
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class SubmissionCreate(BaseModel):
    """Payload a resident submits for admin review."""

    name: str = Field(..., min_length=2, max_length=255)
    description: str | None = Field(None, max_length=4000)
    address: str = Field(..., min_length=5, max_length=1000)
    category_id: int | None = None
    lat: float | None = Field(None, ge=-90.0, le=90.0)
    lng: float | None = Field(None, ge=-180.0, le=180.0)
    phone: str | None = Field(None, max_length=20)
    email: str | None = Field(None, max_length=255)
    website: str | None = Field(None, max_length=500)
    image_url: str | None = Field(None, max_length=500)
    hours: dict[str, str] | None = None
    # Free-text context from the submitter ("I am the owner").
    note: str | None = Field(None, max_length=1000)

    @field_validator("email", "phone", "website", "image_url", mode="before")
    @classmethod
    def empty_str_to_none(cls, value: Any) -> Any:
        if isinstance(value, str) and not value.strip():
            return None
        return value


class SubmissionOut(BaseModel):
    """A stored submission as shown in the admin queue."""

    id: uuid.UUID
    data_json: dict[str, Any]
    status: str
    rejection_reason: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None

    model_config = {"from_attributes": True}


class SubmissionReview(BaseModel):
    """Admin decision on a submission."""

    rejection_reason: str | None = Field(
        None,
        max_length=1000,
        description="Required context when rejecting.",
    )
