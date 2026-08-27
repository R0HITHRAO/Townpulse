"""
TownPulse Structured Logging
================================
Provides JSON-structured logging with request ID support using structlog.
Logs are formatted for easy parsing by log aggregation tools.
"""

import logging
import sys
import uuid
from contextvars import ContextVar
from typing import Any

import structlog

from app.core.config import settings

# ─── Request ID Context Variable ─────────────────────────────────────────────

# Stores the current request ID for correlation across log entries
request_id_var: ContextVar[str] = ContextVar("request_id", default="")


def get_request_id() -> str:
    """Get the current request ID from context, or generate a new one."""
    rid = request_id_var.get()
    if not rid:
        rid = str(uuid.uuid4())
        request_id_var.set(rid)
    return rid


def set_request_id(request_id: str) -> None:
    """Set the request ID in context."""
    request_id_var.set(request_id)


# ─── Logging Configuration ───────────────────────────────────────────────────


def configure_logging() -> None:
    """
    Configure structlog with JSON formatting for production and
    human-readable formatting for development.
    """
    # Shared processors for all environments
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_logger_name,
    ]

    if settings.is_production:
        # Production: JSON output for log aggregation tools (Datadog, Loki, etc.)
        structlog.configure(
            processors=shared_processors
            + [
                structlog.processors.dict_tracebacks,
                structlog.processors.JSONRenderer(),
            ],
            wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )
    else:
        # Development: colorized, human-readable output
        structlog.configure(
            processors=shared_processors
            + [
                structlog.dev.ConsoleRenderer(colors=True),
            ],
            wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=False,
        )

    # Also configure standard logging to use structlog
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.DEBUG if settings.DEBUG else logging.INFO,
    )


def get_logger(name: str = __name__) -> structlog.BoundLogger:
    """
    Get a structlog logger instance.

    Args:
        name: Logger name (typically __name__).

    Returns:
        Bound structlog logger.

    Example:
        logger = get_logger(__name__)
        logger.info("User registered", user_id=str(user.id), email=user.email)
    """
    return structlog.get_logger(name)
