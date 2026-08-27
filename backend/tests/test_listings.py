"""
TownPulse Listings Unit Tests
===============================
Tests for categories, listing creation, search queries, details, and updates.
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
    assert data[0]["name"] == sample_category.name


def test_create_listing(client: TestClient, user_token: str, sample_category: Category) -> None:
    """Test creating a new listing with valid data."""
    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {
        "name": "Town Community Pharmacy",
        "description": "24/7 medicines and first aid supplies.",
        "address": "45 Market Square",
        "category_id": sample_category.id,
        "lat": 12.9716,
        "lng": 77.5946,
        "phone": "+919845000000",
    }
    response = client.post("/listings", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Town Community Pharmacy"
    assert data["address"] == "45 Market Square"
    assert "id" in data


def test_search_listings(client: TestClient, user_token: str, sample_category: Category) -> None:
    """Test searching listings returns paginated envelope."""
    # First create a listing to search for
    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {
        "name": "General Diagnostic Centre",
        "address": "12 Hospital Road",
        "category_id": sample_category.id,
    }
    client.post("/listings", json=payload, headers=headers)

    response = client.get("/listings")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert data["page"] == 1


def test_get_listing_by_id_not_found(client: TestClient) -> None:
    """Test that requesting nonexistent listing ID returns 404."""
    import uuid
    fake_id = str(uuid.uuid4())
    response = client.get(f"/listings/{fake_id}")
    assert response.status_code == 404
