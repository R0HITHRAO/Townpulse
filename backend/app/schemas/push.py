"""
TownPulse Push Subscription Schemas
===================================
Web Push registration contracts (RFC 8030 / RFC 8291 transport material).

`auth` and `p256dh` are required to encrypt a payload for the browser, but
`auth` is a shared secret — so responses deliberately omit them.
"""

from uuid import UUID

from pydantic import BaseModel, Field


class PushSubscribeIn(BaseModel):
    """Registration payload produced by `PushManager.subscribe()`, minus keys
    the server must not echo back."""

    endpoint: str = Field(..., max_length=2000)
    p256dh: str = Field(..., max_length=255)
    auth: str = Field(..., max_length=255)
    agency: str | None = Field(
        None,
        max_length=120,
        description="Browser/OS string, for debugging vendor delivery issues.",
    )
    # Geo scoping so a ward-level alert is not pushed to the whole platform.
    lat: float | None = Field(None, ge=-90.0, le=90.0)
    lng: float | None = Field(None, ge=-180.0, le=180.0)
    town: str | None = Field(None, max_length=120)
    critical_only: bool = False


class PushSubscribeOut(BaseModel):
    """Acknowledgement — never includes transport secrets."""

    id: UUID
    endpoint_hash: str = Field(..., description="Short stable hash for support.")
    critical_only: bool = False

    model_config = {"from_attributes": True}


class PushUnsubscribeIn(BaseModel):
    """Removal by endpoint (the browser only reliably knows the endpoint)."""

    endpoint: str = Field(..., max_length=2000)
