"""
TownPulse Reviews Integration Tests
====================================
Tests review submission, average rating computation, and deletion permissions.
"""

import uuid
import pytest
from fastapi.testclient import TestClient


def test_review_lifecycle(client: TestClient, auth_headers: dict[str, str]):
    """Test creating, reading, and computing reviews for a listing."""
    # 1. Create a test listing
    listing_res = client.post(
        "/listings",
        headers=auth_headers,
        json={
            "name": f"Reviewable Clinic {uuid.uuid4().hex[:6]}",
            "address": "123 Healthcare Ave, Town",
            "category_id": 1,
            "lat": 12.9716,
            "lng": 77.5946,
        },
    )
    assert listing_res.status_code == 201
    listing_id = listing_res.json()["id"]

    # 2. Add a review
    review_res = client.post(
        f"/listings/{listing_id}/reviews",
        headers=auth_headers,
        json={
            "rating": 5,
            "comment": "Exceptional healthcare facility with friendly staff!",
        },
    )
    assert review_res.status_code == 201
    review_data = review_res.json()
    assert review_data["rating"] == 5
    assert "Exceptional" in review_data["comment"]
    review_id = review_data["id"]

    # 3. Retrieve listing reviews
    reviews_list = client.get(f"/listings/{listing_id}/reviews")
    assert reviews_list.status_code == 200
    data = reviews_list.json()
    assert data["total"] == 1
    assert data["average_rating"] == 5.0

    # 4. Check listing details reflects rating
    listing_detail = client.get(f"/listings/{listing_id}")
    assert listing_detail.status_code == 200
    assert listing_detail.json()["average_rating"] == 5.0
    assert listing_detail.json()["review_count"] == 1

    # 5. Delete review
    delete_res = client.delete(f"/reviews/{review_id}", headers=auth_headers)
    assert delete_res.status_code == 204
