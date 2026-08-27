"""
TownPulse Health and Metrics API Endpoints
============================================
Provides health probes and system metrics for monitoring and Docker readiness.
"""

from typing import Any

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.core.rate_limiter import get_redis_client
from app.schemas.common import HealthResponse

router = APIRouter(tags=["System"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System health check",
)
def health_check() -> HealthResponse:
    """
    Performs live connectivity checks against PostgreSQL and Redis.
    Used by Docker healthchecks and Kubernetes liveness/readiness probes.
    """
    db_ok = False
    redis_ok = False

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    try:
        client = get_redis_client()
        client.ping()
        redis_ok = True
    except Exception:
        redis_ok = False

    overall_status = "ok" if (db_ok and redis_ok) else "degraded"

    return HealthResponse(
        status=overall_status,
        database=db_ok,
        redis=redis_ok,
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
    )


@router.get(
    "/metrics",
    summary="System performance metrics",
)
def get_metrics() -> dict[str, Any]:
    """Returns basic service telemetry metrics."""
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "metrics_enabled": settings.METRICS_ENABLED,
    }
