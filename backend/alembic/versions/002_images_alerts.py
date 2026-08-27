"""Add image_url to listings and create emergency_alerts table.

Revision ID: 002_images_alerts
Revises: 001_initial
Create Date: 2024-01-02 00:00:00.000000
"""

from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_images_alerts"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─── Add image_url to listings if not exists ──────────────────────────────
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='listings' AND column_name='image_url'
            ) THEN
                ALTER TABLE listings ADD COLUMN image_url VARCHAR(500);
            END IF;
        END $$;
    """)

    # ─── Create Emergency Alerts Table if not exists ─────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS emergency_alerts (
            id UUID PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            severity VARCHAR(20) NOT NULL DEFAULT 'warning',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            link_url VARCHAR(500),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS ix_emergency_alerts_is_active ON emergency_alerts(is_active);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS emergency_alerts;")
    op.execute("ALTER TABLE listings DROP COLUMN IF EXISTS image_url;")
