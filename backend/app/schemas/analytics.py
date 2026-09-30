"""
TownPulse Analytics Schemas
===========================
Ingest + summary contracts for the behavioural analytics pipeline.

Events are batched (one request per tap is a luxury on 3G) and anonymous:
`session_id` is generated client-side and carries no personal data.
"""

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class EventIn(BaseModel):
    """A single behavioural event."""

    event_type: str = Field(
        ...,
        max_length=100,
        examples=["listing_view"],
        description="Must be one of the canonical event types.",
    )
    listing_id: UUID | None = Field(None, description="Listing the event refers to.")
    payload: dict[str, Any] | None = Field(
        None,
        description="Event-specific data, e.g. {'query': 'physio'} or "
        "{'contact_method': 'whatsapp'}.",
    )
    path: str | None = Field(None, max_length=512, description="Client route.")


class EventBatchIn(BaseModel):
    """A batch of events plus the per-session context they share."""

    events: list[EventIn] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Up to 50 events per request.",
    )
    session_id: str | None = Field(
        None,
        max_length=64,
        description="Anonymous per-tab id used to de-duplicate visitors.",
    )
    path: str | None = Field(None, max_length=512)


class IngestResponse(BaseModel):
    """Ack for a fire-and-forget batch — dropped events are not an error."""

    accepted: int
    rejected: int


class DailyPoint(BaseModel):
    """One day of a dashboard series."""

    date: str
    views: int = 0
    contacts: int = 0
    directions: int = 0
    events: int = 0


class ListingAnalyticsOut(BaseModel):
    """Owner-facing summary for a single listing."""

    listing_id: str
    period_days: int
    views: int
    unique_visitors: int
    contact_clicks: int
    direction_clicks: int
    reached_business: int
    conversion_rate_percent: float
    contacts_by_method: dict[str, int]
    saves: int
    shares: int
    prints: int
    confirmations: int
    daily: list[DailyPoint]


class PlatformAnalyticsOut(BaseModel):
    """Admin-facing platform summary."""

    period_days: int
    total_events: int
    unique_visitors: int
    listing_views: int
    contact_clicks: int
    direction_clicks: int
    searches: int
    alerts_viewed: int
    events_by_type: dict[str, int]
    top_listings: list[dict[str, Any]]
    top_searches: list[dict[str, Any]]
    daily: list[DailyPoint]


EventName = Literal[
    "listing_view",
    "listing_contact_click",
    "listing_directions",
    "listing_share",
    "listing_print",
    "listing_save",
    "listing_unsave",
    "listing_confirm",
    "search_performed",
    "category_view",
    "map_view",
    "alert_view",
    "alert_click",
    "submit_started",
    "claim_started",
    "signup_success",
    "login_success",
]
