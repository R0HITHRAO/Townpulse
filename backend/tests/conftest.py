"""
TownPulse Pytest Configuration and Test Fixtures
==================================================
Sets up test database session, test client, and authenticated user fixtures.
"""

import os
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Set test environment
os.environ["APP_ENV"] = "development"
os.environ["SECRET_KEY"] = "test-secret-key-32-characters-long!!"
os.environ["OTP_PROVIDER"] = "mock"
os.environ["EMAIL_PROVIDER"] = "mock"

from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.category import Category
from app.models.listing import Listing
from app.models.user import User, UserRole

# Use in-memory SQLite for fast test suite execution
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db() -> Generator[None, None, None]:
    """Create all tables in test database once for the session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provides a transactional database session rolled back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


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
    """Create a sample regular user."""
    user = User(
        name="Test Regular User",
        email="user@test.dev",
        phone="+919876543210",
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
    """Create a sample administrator user."""
    admin = User(
        name="Test Admin User",
        email="admin@test.dev",
        phone="+919900000001",
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
    """Create a sample test category."""
    cat = Category(
        name="Healthcare",
        icon="🏥",
        description="Health and medicine services",
    )
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)
    return cat
