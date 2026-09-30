"""
TownPulse Audit Log Model
=========================
Immutable, append-only record of privileged actions performed on the platform
(listing verification, claim/submission decisions, alert broadcasting, deletes).

Unlike the `analytics` table — which is an anonymous, high-volume behavioural
event stream — every audit row represents an accountable decision and therefore
keeps the acting principal, the before/after state, and the request context.

This is what backs the "moderation with audit trails" promise in the README and
is the artefact municipal partners ask for during due diligence.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class AuditAction:
    """Canonical action verbs. Kept as constants to avoid typo-driven sprawl."""

    LISTING_VERIFY = "listing.verify"
    LISTING_UPDATE = "listing.update"
    LISTING_DELETE = "listing.delete"
    LISTING_REVERIFY = "listing.reverify_requested"
    SUBMISSION_APPROVE = "submission.approve"
    SUBMISSION_REJECT = "submission.reject"
    CLAIM_APPROVE = "claim.approve"
    CLAIM_REJECT = "claim.reject"
    REVIEW_DELETE = "review.delete"
    ALERT_CREATE = "alert.create"
    ALERT_UPDATE = "alert.update"
    ALERT_DEACTIVATE = "alert.deactivate"
    ALERT_BROADCAST = "alert.broadcast"
    USER_DEACTIVATE = "user.deactivate"


class AuditLog(Base):
    """A single auditable administrative action."""

    __tablename__ = "audit_logs"

    # ─── Primary Key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # ─── Actor ────────────────────────────────────────────────────────────────
    # SET NULL keeps history readable when an admin account is removed.
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Denormalised role so the trail stays accurate after a role change.
    actor_role: Mapped[str | None] = mapped_column(String(32), nullable=True)

    # ─── Action ───────────────────────────────────────────────────────────────
    action: Mapped[str] = mapped_column(String(80), nullable=False, index=True)

    # ─── Subject (polymorphic — deliberately not a FK) ────────────────────────
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    # Human-readable summary for the moderation timeline.
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ─── State Diff ───────────────────────────────────────────────────────────
    before_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    after_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ─── Request Context ──────────────────────────────────────────────────────
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # ─── Timestamp ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        # "Everything that happened to this listing" — the most common query.
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog actor={self.actor_id} action={self.action} "
            f"entity={self.entity_type}:{self.entity_id}>"
        )
