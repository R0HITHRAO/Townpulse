"""
TownPulse Database Configuration
===================================
Sets up the SQLAlchemy engine, session factory, and declarative base.
Uses connection pooling and retry logic for production reliability.
"""

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from tenacity import retry, stop_after_attempt, wait_fixed

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# ─── SQLAlchemy Engine ────────────────────────────────────────────────────────

# Connection pool settings optimized for production use
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,           # Maximum number of connections in the pool
    max_overflow=20,        # Extra connections allowed above pool_size
    pool_pre_ping=True,     # Verify connections before using them
    pool_recycle=3600,      # Recycle connections after 1 hour
    echo=settings.DEBUG,    # Log SQL queries in debug mode
)


# ─── Session Factory ──────────────────────────────────────────────────────────

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ─── Declarative Base ─────────────────────────────────────────────────────────


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.
    All models should inherit from this class.
    """
    pass


# ─── Database Health Check ────────────────────────────────────────────────────


@retry(stop=stop_after_attempt(5), wait=wait_fixed(2))
def check_database_connection() -> bool:
    """
    Check if the database is reachable.
    Retries up to 5 times with 2 second delays (for Docker startup).

    Returns:
        True if connected, raises exception otherwise.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection established")
        return True
    except Exception as e:
        logger.error("Database connection failed", error=str(e))
        raise


def check_postgis_extension() -> bool:
    """
    Verify that the PostGIS extension is installed.

    Returns:
        True if PostGIS is available, False otherwise.
    """
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT extname FROM pg_extension WHERE extname = 'postgis'")
            )
            return result.fetchone() is not None
    except Exception:
        return False


# ─── Dependency ───────────────────────────────────────────────────────────────


def get_db():
    """
    FastAPI dependency that provides a database session.
    Ensures the session is properly closed after each request.

    Yields:
        SQLAlchemy Session instance.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
