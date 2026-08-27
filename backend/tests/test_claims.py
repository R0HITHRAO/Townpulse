"""
TownPulse Claims Unit Tests
=============================
Tests for listing claim submissions, duplicate checks, and admin approvals.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.listing import Listing
from app.models.user import User


def test_claim_listing_flow(
    client: TestClient,
    user_token: str,
    admin_token: str,
    sample_category: Category,
    db_session: Session,
) -> None:
    """Test full claim flow: submit claim -> admin approve -> verify ownership."""
    # 1. Create a listing to claim
    headers_user = {"Authorization": f"Bearer {user_token}"}
    create_res = client.post(
        "/listings",
        json={"name": "Auto Works Garage", "address": "Bypass Junction", "category_id": sample_category.id},
        headers=headers_user,
    )
    listing_id = create_res.json()["id"]

    # 2. Submit claim
    claim_payload = {
        "listing_id": listing_id,
        "proof_url": "https://example.com/proof.pdf",
        "message": "I am the registered proprietor.",
    }
    claim_res = client.post(
        f"/listings/{listing_id}/claim",
        json=claim_payload,
        headers=headers_user,
    )
    assert claim_res.status_code == 201
    claim_id = claim_res.json()["id"]
    assert claim_res.json()["status"] == "pending"

    # 3. Admin approves claim
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    approve_res = client.post(
        f"/admin/claims/{claim_id}/approve",
        headers=headers_admin,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"


def test_duplicate_claim_rejected(
    client: TestClient,
    user_token: str,
    sample_category: Category,
) -> None:
    """Test that a user cannot submit multiple pending claims on the same listing."""
    headers = {"Authorization": f"Bearer {user_token}"}
    create_res = client.post(
        "/listings",
        json={"name": "Duplicate Test Clinic", "address": "123 Main St", "category_id": sample_category.id},
        headers=headers,
    )
    listing_id = create_res.json()["id"]

    # Submit first claim
    client.post(
        f"/listings/{listing_id}/claim",
        json={"listing_id": listing_id},
        headers=headers,
    )

    # Submit second claim on same listing -> should return 409
    res = client.post(
        f"/listings/{listing_id}/claim",
        json={"listing_id": listing_id},
        headers=headers,
    )
    assert res.status_code == 409
