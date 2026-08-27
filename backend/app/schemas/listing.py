"""
TownPulse Listing Pydantic Schemas
====================================
Request and response schemas for listings, categories, and searches.
Includes geospatial search parameters and address formatting.
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ─── Category Schemas ─────────────────────────────────────────────────────────


class CategoryBase(BaseModel):
    """Base schema for categories."""

    name: str = Field(..., min_length=2, max_length=100, examples=["Clinic"])
    icon: str | None = Field(None, examples=["🏥"])
    description: str | None = Field(None, examples=["Medical and healthcare services"])


class CategoryCreate(CategoryBase):
    """Schema for creating a category."""

    pass


class CategoryOut(CategoryBase):
    """Schema for category returned in API responses."""

    id: int

    model_config = {"from_attributes": True}


# ─── Listing Schemas ──────────────────────────────────────────────────────────


class ListingBase(BaseModel):
    """Base schema for listing fields."""

    name: str = Field(..., min_length=2, max_length=255, examples=["Town Health Clinic"])
    description: str | None = Field(
        None,
        examples=["Primary care, emergency first aid, and vaccinations."],
    )
    address: str = Field(
        ...,
        min_length=5,
        examples=["123 Main St, Smalltown, ST 12345"],
    )
    category_id: int | None = Field(None, examples=[1])
    lat: float | None = Field(None, ge=-90.0, le=90.0, examples=[12.9716])
    lng: float | None = Field(None, ge=-180.0, le=180.0, examples=[77.5946])
    phone: str | None = Field(None, examples=["+1234567890"])
    email: str | None = Field(None, examples=["contact@townclinic.org"])
    website: str | None = Field(None, examples=["https://townclinic.org"])
    hours: dict[str, str] | None = Field(
        None,
        examples=[{"monday": "9am-5pm", "tuesday": "9am-5pm"}],
    )

    @field_validator("email", "phone", "website", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: Any) -> Any:
        if isinstance(v, str) and not v.strip():
            return None
        return v


class ListingCreate(ListingBase):
    """Schema for creating a new listing."""

    pass


class ListingUpdate(BaseModel):
    """Schema for updating an existing listing."""

    name: str | None = Field(None, min_length=2, max_length=255)
    description: str | None = None
    address: str | None = None
    category_id: int | None = None
    lat: float | None = Field(None, ge=-90.0, le=90.0)
    lng: float | None = Field(None, ge=-180.0, le=180.0)
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    hours: dict[str, str] | None = None

    @field_validator("email", "phone", "website", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: Any) -> Any:
        if isinstance(v, str) and not v.strip():
            return None
        return v


class ListingOut(ListingBase):
    """Schema for listing returned in API responses."""

    id: uuid.UUID
    verified: bool
    status: str
    owner_user_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
    category: CategoryOut | None = None
    distance_meters: float | None = None  # Populated on geospatial queries

    model_config = {"from_attributes": True}


# ─── Search & Query Schemas ───────────────────────────────────────────────────


class ListingSearch(BaseModel):
    """Query parameters for listing search."""

    q: str | None = Field(None, description="Full-text search query")
    category_id: int | None = Field(None, description="Filter by category ID")
    lat: float | None = Field(None, ge=-90.0, le=90.0, description="Center latitude")
    lng: float | None = Field(None, ge=-180.0, le=180.0, description="Center longitude")
    radius_meters: float | None = Field(
        10000.0,  # Default 10km radius
        ge=100.0,
        le=100000.0,  # Max 100km radius
        description="Search radius in meters",
    )
    verified_only: bool = Field(False, description="Filter only verified listings")
    sort_by: str = Field(
        "created_at",
        description="Sort by: created_at | name | distance",
    )
    sort_order: str = Field("desc", description="Sort order: asc | desc")
    page: int = Field(1, ge=1)
    per_page: int = Field(20, ge=1, le=100)


class ListingReport(BaseModel):
    """Schema for reporting an inaccurate or malicious listing."""

    reason: str = Field(..., min_length=10, max_length=1000, examples=["Listing is closed permanently"])
