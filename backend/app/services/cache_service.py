"""
TownPulse Redis Caching Service
=================================
Provides caching helpers for hot queries like categories, popular listings, and analytics.
"""

import json
from typing import Any, cast

from app.core.logging import get_logger
from app.core.rate_limiter import get_redis_client

logger = get_logger(__name__)


class CacheService:
    """Service for managing Redis cache operations."""

    @staticmethod
    def get(key: str) -> Any | None:
        """
        Get and deserialize JSON data from Redis cache.

        Args:
            key: Cache key.

        Returns:
            Deserialized Python object, or None on cache miss or error.
        """
        try:
            client = get_redis_client()
            # Cast: redis-py's stubs type a bare `Redis` command as
            # `Awaitable[Any] | Any`; this client is synchronous.
            val = cast("str | None", client.get(key))
            if val:
                return json.loads(val)
        except Exception as e:
            logger.warning("Cache get failed", key=key, error=str(e))
        return None

    @staticmethod
    def set(key: str, value: Any, ttl_seconds: int = 300) -> bool:
        """
        Serialize and store object in Redis cache with TTL.

        Args:
            key: Cache key.
            value: JSON-serializable Python object.
            ttl_seconds: Expiration in seconds (default 5 min).

        Returns:
            True if cached successfully.
        """
        try:
            client = get_redis_client()
            serialized = json.dumps(value, default=str)
            client.setex(key, ttl_seconds, serialized)
            return True
        except Exception as e:
            logger.warning("Cache set failed", key=key, error=str(e))
            return False

    @staticmethod
    def delete(key: str) -> bool:
        """Delete key from cache."""
        try:
            client = get_redis_client()
            client.delete(key)
            return True
        except Exception as e:
            logger.warning("Cache delete failed", key=key, error=str(e))
            return False

    @staticmethod
    def delete_pattern(pattern: str) -> int:
        """
        Delete all keys matching pattern (e.g., 'listings:*').

        Returns:
            Count of deleted keys.
        """
        try:
            client = get_redis_client()
            # Cast for the same reason as `get()` above — synchronous client.
            keys = cast("list[str]", client.keys(pattern))
            if keys:
                return int(cast("int", client.delete(*keys)))
        except Exception as e:
            logger.warning("Cache delete_pattern failed", pattern=pattern, error=str(e))
        return 0
