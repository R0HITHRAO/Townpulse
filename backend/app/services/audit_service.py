"""
TownPulse Audit Service
=======================
Writes and reads the append-only trail of privileged actions.

Design notes:
- `record()` never raises. An audit write failing (e.g. a bad JSON payload) must
  not roll back a legitimately completed moderation action; it is logged loudly
  instead. Availability of the trail is the stronger property here.
- Only JSON-safe primitives reach the JSONB columns, so a UUID/Decimal/Datetime
  in a snapshot never blows up the insert.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import Request
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.audit_log import AuditLog
from app.models.user import User

logger = get_logger(__name__)

# Truncate user-agent strings rather than reject rows over a column width.
USER_AGENT_MAX = 512


def to_json_safe(value: Any) -> Any:
    """Coerce a value into something psycopg2 can serialize into JSONB."""
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, (UUID, Decimal, date, datetime)):
        return str(value)
    if isinstance(value, dict):
        return {str(k): to_json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [to_json_safe(v) for v in value]
    return str(value)


class AuditService:
    """Append-only audit trail for administrative and moderation actions."""

    @staticmethod
    def snapshot(obj: Any, fields: list[str] | None = None) -> dict[str, Any]:
        """
        Capture the current column values of an ORM object as a JSON-safe dict.

        Args:
            obj: SQLAlchemy model instance.
            fields: Explicit column names; defaults to every mapped column.
        """
        if obj is None:
            return {}

        names = (
            fields
            if fields is not None
            else [attr.key for attr in inspect(obj).mapper.column_attrs]
        )

        captured: dict[str, Any] = {}
        for name in names:
            if name == "search_vector":  # large, unreadable, never useful
                continue
            captured[name] = to_json_safe(getattr(obj, name, None))
        return captured

    @staticmethod
    def record(
        db: Session,
        *,
        actor: User | None,
        action: str,
        entity_type: str,
        entity_id: Any | None = None,
        summary: str | None = None,
        before: dict[str, Any] | None = None,
        after: dict[str, Any] | None = None,
        request: Request | None = None,
        commit: bool = True,
    ) -> AuditLog | None:
        """
        Append one audit entry describing a privileged action.

        Args:
            db: Active database session.
            actor: Authenticated user performing the action (None = system).
            action: Verb from AuditAction constants.
            entity_type: Logical entity name, e.g. "listing".
            entity_id: Primary key of the affected row.
            summary: Human-readable one-liner for the moderation timeline.
            before: Snapshot of relevant fields prior to the change.
            after: Snapshot of relevant fields after the change.
            request: FastAPI request, used to capture IP and user agent.
            commit: Commit immediately (default True).

        Returns:
            The persisted AuditLog, or None if the write failed.
        """
        client_ip: str | None = None
        user_agent: str | None = None
        if request is not None:
            forwarded = request.headers.get("x-forwarded-for")
            if forwarded:
                # Left-most address is the client in the nginx -> uvicorn chain.
                client_ip = forwarded.split(",")[0].strip()
            elif request.client is not None:
                client_ip = request.client.host
            agent = request.headers.get("user-agent")
            user_agent = agent[:USER_AGENT_MAX] if agent else None

        try:
            entry = AuditLog(
                actor_id=actor.id if actor is not None else None,
                actor_role=actor.role.value
                if actor is not None and actor.role
                else None,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                summary=summary,
                before_json=to_json_safe(before) if before else None,
                after_json=to_json_safe(after) if after else None,
                ip_address=client_ip,
                user_agent=user_agent,
            )
            db.add(entry)
            if commit:
                db.commit()
            else:
                db.flush()
            logger.info(
                "Audit entry recorded",
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id),
                actor_id=str(actor.id) if actor else "system",
            )
            return entry
        except Exception as exc:  # never fail the audited action itself
            db.rollback()
            logger.error(
                "AUDIT WRITE FAILED - privileged action executed without a trail",
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id),
                actor_id=str(actor.id) if actor else "system",
                error=str(exc),
            )
            return None

    @staticmethod
    def list_events(
        db: Session,
        *,
        entity_type: str | None = None,
        entity_id: Any | None = None,
        actor_id: Any | None = None,
        action: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict[str, Any]:
        """
        Query the trail, newest first, with optional filters.

        Returns:
            Dict with `items` and `total` for dashboard pagination.
        """
        query = db.query(AuditLog)
        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        if entity_id:
            query = query.filter(AuditLog.entity_id == entity_id)
        if actor_id:
            query = query.filter(AuditLog.actor_id == actor_id)
        if action:
            query = query.filter(AuditLog.action == action)

        total = query.count()
        items = (
            query.order_by(AuditLog.created_at.desc())
            .offset(max(offset, 0))
            .limit(min(max(limit, 1), 500))
            .all()
        )
        return {"items": items, "total": total}

    @staticmethod
    def entity_history(db: Session, entity_type: str, entity_id: Any) -> list[AuditLog]:
        """Full chronological history for a single entity (oldest first)."""
        return (
            db.query(AuditLog)
            .filter(
                AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id
            )
            .order_by(AuditLog.created_at.asc())
            .all()
        )
