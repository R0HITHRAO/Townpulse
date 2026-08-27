"""
TownPulse Application Configuration
====================================
All settings are loaded from environment variables using Pydantic Settings.
Copy .env.example to .env and fill in your values.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ─── Application ────────────────────────────────────────
    APP_NAME: str = "TownPulse"
    APP_VERSION: str = "0.1.0"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True

    # ─── Security ───────────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ─── Database ───────────────────────────────────────────
    DATABASE_URL: str
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "townpulse"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "townpulse"

    # ─── Redis ──────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ─── OTP / SMS ──────────────────────────────────────────
    OTP_PROVIDER: Literal["mock", "twilio"] = "mock"
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_REQUESTS_PER_HOUR: int = 5

    # Twilio credentials (optional — required when OTP_PROVIDER=twilio)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # ─── Email ──────────────────────────────────────────────
    EMAIL_PROVIDER: Literal["mock", "sendgrid", "smtp"] = "mock"
    EMAIL_FROM: str = "noreply@townpulse.dev"
    EMAIL_FROM_NAME: str = "TownPulse"

    # SendGrid (optional — required when EMAIL_PROVIDER=sendgrid)
    SENDGRID_API_KEY: str = ""

    # SMTP (optional — required when EMAIL_PROVIDER=smtp)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True

    # ─── CORS ───────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,*"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list with wildcard and multi-origin support."""
        if not self.CORS_ORIGINS or self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if "*" in origins:
            return ["*"]
        return origins

    # ─── Storage ────────────────────────────────────────────
    STORAGE_PROVIDER: Literal["local", "s3"] = "local"
    STORAGE_LOCAL_PATH: str = "./uploads"

    # AWS S3 (optional — required when STORAGE_PROVIDER=s3)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"
    AWS_S3_BUCKET: str = ""

    # ─── Monitoring ─────────────────────────────────────────
    SENTRY_DSN: str = ""
    METRICS_ENABLED: bool = True

    # ─── Rate Limiting ──────────────────────────────────────
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds

    # ─── Maps ───────────────────────────────────────────────
    DEFAULT_MAP_LAT: float = 12.9716
    DEFAULT_MAP_LNG: float = 77.5946
    DEFAULT_MAP_ZOOM: int = 12

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.APP_ENV == "development"


@lru_cache()
def get_settings() -> Settings:
    """
    Return cached settings instance.
    Uses lru_cache so settings are only loaded once per process.
    """
    return Settings()


# Convenience alias — use this in the application
settings = get_settings()
