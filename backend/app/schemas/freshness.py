"""
TownPulse Freshness Schemas
===========================
Contracts for the trust-decay UI: freshness badges, one-tap confirmations,
staleness reports, and the owner's SMS re-verification flow.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

FreshnessState = Literal["fresh", "expiring", "expired", "needs_review", "unverified"]


class FreshnessBadgeOut(BaseModel):
    """What the card/detail page renders next to the verified tick."""

    listing_id: uuid.UUID
    state: FreshnessState
    score: int = Field(..., ge=0, le=100, description="0 = do not trust, 100 = fresh.")
    verified: bool
    verified_at: datetime | None = None
    last_confirmed_at: datetime | None = None
    expires_at: datetime | None = None
    expires_in_days: int | None = None
    confirmation_count: int = 0
    staleness_reports: int = 0


class ConfirmOut(BaseModel):
    """Result of a one-tap "still open" confirmation."""

    counted: bool = Field(..., description="False when de-duplicated within 24h.")
    confirmation_count: int
    last_confirmed_at: datetime | None = None


class StaleReportIn(BaseModel):
    """One tap: closed / wrong number / moved."""

    reason: Literal[
        "permanently_closed",
        "wrong_number",
        "moved",
        "wrong_address",
        "other",
    ] = "other"
    detail: str | None = Field(None, max_length=500)


class StaleReportOut(BaseModel):
    """Escalation state after a staleness report."""

    staleness_reports: int
    needs_review: bool
    escalated: bool = Field(
        ...,
        description="True when this report pushed the listing into moderation.",
    )


class ReverifyRequestOut(BaseModel):
    """SMS dispatch status for an owner re-verification request."""

    sms_sent: bool
    phone_hint: str | None = Field(
        None,
        description="Last 4 digits of the number the code went to.",
    )
    expires_in_minutes: int = 0
    reason: str | None = None


class ReverifyConfirmIn(BaseModel):
    """The 6-digit code the owner received by SMS."""

    code: str = Field(..., min_length=4, max_length=8)


class ReverifyConfirmOut(BaseModel):
    """Result of submitting the re-verification code."""

    verified: bool
    badge: FreshnessBadgeOut | None = None
