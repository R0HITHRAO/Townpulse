"""
TownPulse Common Pydantic Schemas
===================================
Generic schemas for pagination, health checks, responses, and error envelopes.
"""

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard envelope for paginated list endpoints."""

    items: list[T]
    total: int
    page: int
    per_page: int
    total_pages: int


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str
    detail: str | None = None


class ErrorResponse(BaseModel):
    """Standard error response format."""

    detail: str
    code: str | None = None


class HealthResponse(BaseModel):
    """System health check response."""

    status: str = "ok"
    database: bool = True
    redis: bool = True
    version: str = "0.1.0"
    environment: str = "development"
