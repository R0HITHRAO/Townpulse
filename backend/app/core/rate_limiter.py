"""
TownPulse Rate Limiter Middleware
====================================
Redis-backed sliding window rate limiting middleware for FastAPI.
Applies per-IP and per-endpoint rate limits with configurable windows.
"""

import time
from collections.abc import Callable

import redis
from fastapi import HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# ─── Redis Connection ─────────────────────────────────────────────────────────

# Global Redis client for rate limiting
# decode_responses=True so keys and values are strings
_redis_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis:
    """
    Get or create the global Redis client.
    Uses a singleton pattern to reuse connections.
    """
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
        )
    return _redis_client


# ─── Rate Limiter Logic ───────────────────────────────────────────────────────


def check_rate_limit(
    key: str,
    max_requests: int,
    window_seconds: int,
) -> tuple[bool, int, int]:
    """
    Sliding window rate limiter using Redis.

    Args:
        key: Unique key for the rate limit bucket (e.g., "rate:ip:1.2.3.4").
        max_requests: Maximum allowed requests per window.
        window_seconds: Size of the time window in seconds.

    Returns:
        Tuple of (is_allowed, requests_remaining, retry_after_seconds).
    """
    client = get_redis_client()
    now = time.time()
    window_start = now - window_seconds

    pipe = client.pipeline()
    # Remove expired entries from the sorted set
    pipe.zremrangebyscore(key, "-inf", window_start)
    # Add current request timestamp
    pipe.zadd(key, {str(now): now})
    # Count requests in current window
    pipe.zcard(key)
    # Set expiry on the key
    pipe.expire(key, window_seconds)
    results = pipe.execute()

    request_count: int = results[2]
    remaining = max(0, max_requests - request_count)
    is_allowed = request_count <= max_requests

    # Calculate retry-after if limit exceeded
    if not is_allowed:
        oldest_score = client.zrange(key, 0, 0, withscores=True)
        if oldest_score:
            oldest_time = oldest_score[0][1]
            retry_after = int(oldest_time + window_seconds - now) + 1
        else:
            retry_after = window_seconds
    else:
        retry_after = 0

    return is_allowed, remaining, retry_after


def check_otp_rate_limit(phone: str) -> bool:
    """
    Check if an OTP request is allowed for the given phone number.
    Enforces the OTP_MAX_REQUESTS_PER_HOUR limit.

    Args:
        phone: The phone number requesting an OTP.

    Returns:
        True if the request is allowed, False if rate limited.
    """
    from app.core.security import get_otp_rate_limit_key

    key = get_otp_rate_limit_key(phone)
    is_allowed, _, _ = check_rate_limit(
        key=key,
        max_requests=settings.OTP_MAX_REQUESTS_PER_HOUR,
        window_seconds=3600,  # 1 hour window
    )
    if not is_allowed:
        logger.warning(
            "OTP rate limit exceeded",
            phone=phone[-4:],  # Log only last 4 digits for privacy
        )
    return is_allowed


# ─── Rate Limit Middleware ────────────────────────────────────────────────────


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware that applies rate limiting to all requests.
    Limits are configured via environment variables.
    Rate limit headers are added to all responses.
    """

    # Endpoints that are always exempt from rate limiting
    EXEMPT_PATHS = {"/health", "/metrics", "/docs", "/redoc", "/openapi.json"}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for exempt paths
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        # Get client IP address
        client_ip = self._get_client_ip(request)
        rate_key = f"rate:{client_ip}"

        try:
            is_allowed, remaining, retry_after = check_rate_limit(
                key=rate_key,
                max_requests=settings.RATE_LIMIT_REQUESTS,
                window_seconds=settings.RATE_LIMIT_WINDOW,
            )
        except Exception as e:
            # If Redis is down, allow the request (fail open)
            logger.warning("Rate limiter unavailable, allowing request", error=str(e))
            return await call_next(request)

        if not is_allowed:
            logger.warning(
                "Rate limit exceeded",
                ip=client_ip,
                path=request.url.path,
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please slow down.",
                    "retry_after": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(settings.RATE_LIMIT_REQUESTS),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + retry_after),
                },
            )

        response = await call_next(request)

        # Add rate limit headers to every response
        response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_REQUESTS)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(
            int(time.time()) + settings.RATE_LIMIT_WINDOW
        )

        return response

    @staticmethod
    def _get_client_ip(request: Request) -> str:
        """
        Extract client IP from request, checking X-Forwarded-For header
        for requests behind a proxy/load balancer.
        """
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP in the chain (original client)
            return forwarded_for.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"
