"""
TownPulse Listing & Category Tests
====================================
Tests for listing creation, search queries, and category retrieval.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.listing import Listing


def test_get_categories(client: TestClient, sample_category: Category) -> None:
    """Test retrieving categories list."""
    response = client.get("/categories")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(c["name"] == sample_category.name for c in data)


def test_create_listing_by_admin(
    client: TestClient,
    sample_category: Category,
    admin_token: str,
) -> None:
    """Test creating a new listing by an admin (auto-verified)."""
    payload = {
        "name": "Town Central Bakery",
        "description": "Fresh bread and pastries daily.",
        "address": "45 Main Street, Smalltown",
        "category_id": sample_category.id,
        "lat": 12.9716,
        "lng": 77.5946,
        "phone": "+919845012345",
        "email": "bakery@townpulse.dev",
    }
    response = client.post(
        "/listings",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Town Central Bakery"
    assert data["verified"] is True
    assert "id" in data


def test_search_listings(client: TestClient, db_session: Session, sample_category: Category) -> None:
    """Test search with text query and category filter."""
    response = client.get(f"/listings?category_id={sample_category.id}&per_page=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data


def test_get_listing_by_id_not_found(client: TestClient) -> None:
    """Test 404 response for non-existent listing ID."""
    fake_uuid = "00000000-0000-0000-0000-000000000000"
    response = client.get(f"/listings/{fake_uuid}")
    assert response.status_code == 404
