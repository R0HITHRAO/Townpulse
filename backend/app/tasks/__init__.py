"""
TownPulse Background Tasks Package
====================================
Optional asynchronous background task workers using Celery.
"""

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Celery app placeholder — can be initialized when CELERY_BROKER_URL is configured
try:
    from celery import Celery

    celery_app = Celery(
        "townpulse",
        broker=settings.REDIS_URL,
        backend=settings.REDIS_URL,
    )
    celery_app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
    )
except ImportError:
    celery_app = None  # type: ignore[assignment]
