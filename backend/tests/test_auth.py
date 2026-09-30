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


def test_register_duplicate_email_rejected(
    client: TestClient, sample_user: User
) -> None:
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


def test_get_current_user_profile(
    client: TestClient, user_token: str, sample_user: User
) -> None:
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


def test_otp_request_returns_dev_otp_in_mock_mode(client: TestClient) -> None:
    """Mock OTP provider (dev) must return the code so login is testable."""
    response = client.post("/auth/otp/request", json={"phone": "+919812345670"})
    assert response.status_code == 200
    data = response.json()
    assert "OTP sent" in data["message"]
    assert data.get("dev_otp")
    assert len(data["dev_otp"]) == 6
    assert data["dev_otp"].isdigit()


def test_otp_request_and_verify_login_flow(client: TestClient) -> None:
    """Full phone OTP flow: request the code, then verify it for tokens."""
    phone = "+919812345671"
    request_resp = client.post("/auth/otp/request", json={"phone": phone})
    assert request_resp.status_code == 200
    dev_otp = request_resp.json()["dev_otp"]
    assert dev_otp

    verify_resp = client.post("/auth/otp/verify", json={"phone": phone, "otp": dev_otp})
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["phone"] == phone
    assert data["user"]["phone_verified"] is True


def test_otp_verify_rejects_wrong_code(client: TestClient) -> None:
    """Verifying with an incorrect OTP must return 400."""
    phone = "+919812345672"
    resp = client.post("/auth/otp/verify", json={"phone": phone, "otp": "000000"})
    assert resp.status_code == 400
