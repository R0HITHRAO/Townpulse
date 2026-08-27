"""
TownPulse Review Schemas
=========================
Pydantic schemas for review submission, responses, and ratings aggregation.
"""

from datetime import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field


class ReviewUserSummary(BaseModel):
    """Minimal user details for review attribution."""
    id: uuid.UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class ReviewCreate(BaseModel):
    """Schema for submitting a new review."""
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    comment: str | None = Field(None, max_length=2000, description="Citizen feedback comment")


class ReviewResponse(BaseModel):
    """Schema returned when reading a review."""
    id: uuid.UUID
    listing_id: uuid.UUID
    user_id: uuid.UUID
    rating: int
    comment: str | None = None
    created_at: datetime
    user: ReviewUserSummary | None = None

    model_config = ConfigDict(from_attributes=True)


class ReviewListResponse(BaseModel):
    """Paginated or listed reviews."""
    total: int
    average_rating: float
    items: list[ReviewResponse]
