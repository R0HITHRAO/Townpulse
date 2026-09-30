"""
TownPulse Push Subscription Model
=================================
Stores Web Push endpoint registrations so emergency alerts and saved-place
updates can be delivered without the tab being open.

The endpoint/p256dh/auth triple is the standard Web Push transport material
(RFC 8030 / RFC 8291). It is not a secret in the symmetric sense, but `auth`
is a shared secret for payload encryption, so it is never returned by any API.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class PushSubscription(Base):
    """A browser/OS push endpoint for a resident."""

    __tablename__ = "push_subscriptions"

    # ─── Primary Key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # ─── Owner ────────────────────────────────────────────────────────────────
    # Nullable + SET NULL: anonymous residents can opt into public emergency
    # broadcasts, which is the whole point during a disaster.
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ─── Web Push Transport Material ──────────────────────────────────────────
    endpoint: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    p256dh: Mapped[str] = mapped_column(String(255), nullable=False)
    auth: Mapped[str] = mapped_column(String(255), nullable=False)

    # Which browser/OS sent the registration (for debugging vendor issues).
    agency: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # ─── Geo & Preference Scoping ─────────────────────────────────────────────
    # Only alerts intersecting this point are delivered to this subscription.
    lat: Mapped[float | None] = mapped_column(nullable=True)
    lng: Mapped[float | None] = mapped_column(nullable=True)
    town: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # Deliver only critical alerts (used for battery/data-saver devices).
    critical_only: Mapped[bool] = mapped_column(
        nullable=False,
        default=False,
        server_default="false",
    )

    # ─── Delivery Health ──────────────────────────────────────────────────────
    # Endpoints go stale; after repeated 404/410s we retire the subscription
    # instead of burning SMS/push quota forever.
    failure_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    last_delivery_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ─── Retires ──────────────────────────────────────────────────────────────
    MAX_FAILURES = 3

    @property
    def is_broken(self) -> bool:
        """True once the endpoint has failed enough times to retire it."""
        return self.failure_count >= self.MAX_FAILURES

    def __repr__(self) -> str:
        return (
            f"<PushSubscription id={self.id} user={self.user_id} "
            f"failures={self.failure_count}>"
        )
