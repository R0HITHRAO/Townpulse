# API package
from app.api.admin import router as admin_router
from app.api.alerts import router as alerts_router
from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.listings import router as listings_router
from app.api.photos import router as photos_router
from app.api.push import router as push_router
from app.api.reviews import router as reviews_router
from app.api.saved_places import router as saved_places_router
from app.api.submissions import router as submissions_router

__all__ = [
    "auth_router",
    "listings_router",
    "admin_router",
    "health_router",
    "reviews_router",
    "alerts_router",
    "analytics_router",
    "photos_router",
    "push_router",
    "saved_places_router",
    "submissions_router",
]
