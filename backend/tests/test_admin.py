"""
TownPulse Admin Unit Tests
============================
Tests for admin endpoints, analytics KPIs, and RBAC authorization barriers.
"""

from fastapi.testclient import TestClient


def test_admin_analytics_authorized(client: TestClient, admin_token: str) -> None:
    """Test that admin can view platform analytics."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/admin/analytics", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_listings" in data
    assert "verified_listings" in data
    assert "total_users" in data


def test_admin_analytics_forbidden_for_regular_user(
    client: TestClient,
    user_token: str,
) -> None:
    """Test that regular users are forbidden from accessing admin endpoints (403)."""
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.get("/admin/analytics", headers=headers)
    assert response.status_code == 403


def test_system_health_check(client: TestClient) -> None:
    """Test /health returns ok status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data
