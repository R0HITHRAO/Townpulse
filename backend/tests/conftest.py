"""
TownPulse Pytest Configuration and Test Fixtures
==================================================
Sets up test database session, test client, and authenticated user fixtures.
"""

import os
import uuid
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Set test environment defaults
os.environ["APP_ENV"] = "development"
os.environ["SECRET_KEY"] = "test-secret-key-32-characters-long!!"
os.environ["OTP_PROVIDER"] = "mock"
os.environ["EMAIL_PROVIDER"] = "mock"

TEST_DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://townpulse:townpulse_dev_password@localhost:5432/townpulse",
)

engine = create_engine(TEST_DB_URL, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.category import Category
from app.models.listing import Listing
from app.models.user import User, UserRole


@pytest.fixture(scope="session", autouse=True)
def setup_test_db() -> Generator[None, None, None]:
    """Ensure database schema is created for test session."""
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provides a fresh database session for each test."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """FastAPI TestClient with overridden get_db dependency."""

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user(db_session: Session) -> User:
    """Create a sample regular user with unique credentials."""
    uid = uuid.uuid4().hex[:8]
    user = User(
        name=f"Test User {uid}",
        email=f"user_{uid}@test.dev",
        phone=f"+9198{uid[:8]}",
        password_hash=hash_password("UserPassword123!"),
        role=UserRole.user,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_admin(db_session: Session) -> User:
    """Create a sample administrator user with unique credentials."""
    uid = uuid.uuid4().hex[:8]
    admin = User(
        name=f"Test Admin {uid}",
        email=f"admin_{uid}@test.dev",
        phone=f"+9199{uid[:8]}",
        password_hash=hash_password("AdminPassword123!"),
        role=UserRole.admin,
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture
def user_token(sample_user: User) -> str:
    """Generate access token for regular user."""
    return create_access_token(sample_user.id)


@pytest.fixture
def admin_token(sample_admin: User) -> str:
    """Generate access token for admin user."""
    return create_access_token(sample_admin.id)


@pytest.fixture
def sample_category(db_session: Session) -> Category:
    """Get or create a sample test category."""
    cat = db_session.query(Category).filter(Category.name == "Healthcare & Clinics").first()
    if not cat:
        cat = Category(
            name="Healthcare & Clinics",
            icon="🏥",
            description="Health and medicine services",
        )
        db_session.add(cat)
        db_session.commit()
        db_session.refresh(cat)
    return cat
