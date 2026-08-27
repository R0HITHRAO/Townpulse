"""
TownPulse Emergency Alert Endpoints
====================================
API endpoints for retrieving active emergency broadcasts and admin announcement management.
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_admin_user
from app.models.alert import EmergencyAlert
from app.models.user import User
from app.schemas.alert import EmergencyAlertCreate, EmergencyAlertResponse

router = APIRouter(tags=["Emergency Alerts"])


@router.get("/alerts/active", response_model=list[EmergencyAlertResponse])
def get_active_alerts(
    db: Session = Depends(get_db),
) -> list[EmergencyAlert]:
    """Retrieve all active municipal emergency alerts that have not expired."""
    now = datetime.now(timezone.utc)
    alerts = (
        db.query(EmergencyAlert)
        .filter(EmergencyAlert.is_active == True)
        .order_by(EmergencyAlert.created_at.desc())
        .all()
    )

    # Filter out expired alerts
    active_alerts = []
    for alert in alerts:
        if alert.expires_at and alert.expires_at < now:
            continue
        active_alerts.append(alert)

    return active_alerts


@router.post("/admin/alerts", response_model=EmergencyAlertResponse, status_code=status.HTTP_201_CREATED)
def create_emergency_alert(
    alert_in: EmergencyAlertCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> EmergencyAlert:
    """Create a new emergency alert broadcast announcement. Admin only."""
    new_alert = EmergencyAlert(
        title=alert_in.title,
        message=alert_in.message,
        severity=alert_in.severity,
        is_active=alert_in.is_active,
        link_url=alert_in.link_url,
        expires_at=alert_in.expires_at,
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert


@router.delete("/admin/alerts/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_emergency_alert(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> None:
    """Deactivate or remove an emergency alert broadcast. Admin only."""
    alert = db.query(EmergencyAlert).filter(EmergencyAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency alert not found.",
        )

    alert.is_active = False
    db.commit()
