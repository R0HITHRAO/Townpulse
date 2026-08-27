"""
TownPulse Emergency Alert Integration Tests
============================================
Tests emergency alert creation by admin, active alerts retrieval, and deactivation.
"""

import pytest
from fastapi.testclient import TestClient


def test_emergency_alert_lifecycle(client: TestClient, admin_headers: dict[str, str]):
    """Test creating an emergency alert and retrieving active broadcasts."""
    # 1. Create alert via admin
    alert_res = client.post(
        "/admin/alerts",
        headers=admin_headers,
        json={
            "title": "Town Heavy Rain & Flood Warning",
            "message": "Low-lying areas near town river are advised to move to higher ground.",
            "severity": "critical",
            "is_active": True,
            "link_url": "https://emergency.townpulse.dev",
        },
    )
    assert alert_res.status_code == 201
    alert_id = alert_res.json()["id"]

    # 2. Retrieve public active alerts
    active_res = client.get("/alerts/active")
    assert active_res.status_code == 200
    active_list = active_res.json()
    assert len(active_list) >= 1
    assert any(a["id"] == alert_id for a in active_list)

    # 3. Deactivate alert
    deactivate_res = client.delete(f"/admin/alerts/{alert_id}", headers=admin_headers)
    assert deactivate_res.status_code == 204
