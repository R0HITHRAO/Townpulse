# API package
from app.api.admin import router as admin_router
from app.api.alerts import router as alerts_router
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.listings import router as listings_router
from app.api.reviews import router as reviews_router

__all__ = [
    "auth_router",
    "listings_router",
    "admin_router",
    "health_router",
    "reviews_router",
    "alerts_router",
]
