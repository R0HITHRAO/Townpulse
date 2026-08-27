"""
TownPulse Authentication Unit Tests
=====================================
Tests for registration, login, phone OTP flow, password security, and token refresh.
"""

import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User


def test_register_with_email(client: TestClient, db_session: Session) -> None:
    """Test user registration with email and password."""
    uid = uuid.uuid4().hex[:8]
    test_email = f"jane_{uid}@example.com"
    payload = {
        "name": "Jane Doe",
        "email": test_email,
        "password": "SecurePassword123!",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == test_email
    assert data["user"]["name"] == "Jane Doe"


def test_register_duplicate_email_rejected(client: TestClient, sample_user: User) -> None:
    """Test that registering with an existing email returns 409 Conflict."""
    payload = {
        "name": "Duplicate User",
        "email": sample_user.email,
        "password": "Password123!",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 409


def test_login_success(client: TestClient, sample_user: User) -> None:
    """Test successful login with correct email and password."""
    payload = {
        "email": sample_user.email,
        "password": "UserPassword123!",
    }
    response = client.post("/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password(client: TestClient, sample_user: User) -> None:
    """Test that login fails with wrong password."""
    payload = {
        "email": sample_user.email,
        "password": "WrongPassword!",
    }
    response = client.post("/auth/login", json=payload)
    assert response.status_code == 401


def test_get_current_user_profile(client: TestClient, user_token: str, sample_user: User) -> None:
    """Test fetching /auth/me with valid Bearer token."""
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == sample_user.email
    assert data["name"] == sample_user.name


def test_get_profile_unauthorized_without_token(client: TestClient) -> None:
    """Test that /auth/me returns 401 when missing Authorization header."""
    response = client.get("/auth/me")
    assert response.status_code == 401
