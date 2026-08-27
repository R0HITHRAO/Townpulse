"""
TownPulse Claim Pydantic Schemas
==================================
Request and response schemas for listing claim workflows.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.claim import ClaimStatus
from app.schemas.user import UserOut


class ClaimCreate(BaseModel):
    """Schema for submitting a claim request for a listing."""

    listing_id: uuid.UUID
    proof_url: str | None = Field(
        None,
        description="URL to uploaded business verification document",
        examples=["https://townpulse.dev/uploads/proof_123.pdf"],
    )
    message: str | None = Field(
        None,
        max_length=1000,
        description="Optional message to the administrator explaining ownership",
        examples=["I am the owner of this clinic and manage its day-to-day operations."],
    )


class ClaimReview(BaseModel):
    """Schema for admin reviewing (approving or rejecting) a claim."""

    status: ClaimStatus = Field(
        ...,
        description="New claim status: approved | rejected",
    )
    rejection_reason: str | None = Field(
        None,
        max_length=500,
        description="Required if status is rejected",
    )


class ClaimOut(BaseModel):
    """Schema for claim response returned by API."""

    id: uuid.UUID
    listing_id: uuid.UUID
    user_id: uuid.UUID
    status: ClaimStatus
    proof_url: str | None = None
    message: str | None = None
    rejection_reason: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None
    user: UserOut | None = None

    model_config = {"from_attributes": True}
