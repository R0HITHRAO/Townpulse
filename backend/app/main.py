"""
TownPulse Backend Application
===============================
Main entry point for the FastAPI application.
Configures CORS, rate limiting, structured logging, OpenAPI documentation, and API routers.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import (
    admin_router,
    alerts_router,
    auth_router,
    health_router,
    listings_router,
    reviews_router,
)
from app.core.config import settings
from app.core.database import check_database_connection
from app.core.logging import configure_logging, get_logger
from app.core.rate_limiter import RateLimitMiddleware

# Configure logging on module load
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown events."""
    logger.info(
        "Starting TownPulse backend",
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
    )
    # Validate database connectivity (with retries for Docker startup)
    try:
        check_database_connection()
    except Exception as e:
        logger.error("Initial database health check failed", error=str(e))

    yield

    logger.info("TownPulse backend shutting down")


def create_app() -> FastAPI:
    """FastAPI Application Factory."""
    app = FastAPI(
        title="TownPulse API",
        description=(
            "Community-first local resource and services finder for small towns.\n\n"
            "Features:\n"
            "- PostGIS-powered geospatial proximity queries\n"
            "- PostgreSQL full-text search with tsvector\n"
            "- Business claim and verification workflows\n"
            "- Community reviews and ratings\n"
            "- Municipal emergency broadcast announcements\n"
            "- Phone OTP and JWT authentication\n"
            "- Built-in rate limiting and caching"
        ),
        version=settings.APP_VERSION,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # ─── Middleware ───────────────────────────────────────────────────────────

    # Rate Limiting Middleware (Redis sliding window)
    app.add_middleware(RateLimitMiddleware)

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ─── Routers ──────────────────────────────────────────────────────────────
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(listings_router)
    app.include_router(reviews_router)
    app.include_router(alerts_router)
    app.include_router(admin_router)

    # Global root redirect or info
    @app.get("/", include_in_schema=False)
    def root() -> dict[str, str]:
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/docs",
            "health": "/health",
        }

    return app


# Main application instance
app = create_app()
