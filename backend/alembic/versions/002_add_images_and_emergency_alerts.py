"""Add image_url to listings and create emergency_alerts table.

Revision ID: 002_add_images_and_emergency_alerts
Revises: 001_initial
Create Date: 2024-01-02 00:00:00.000000
"""

from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_add_images_and_emergency_alerts"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─── Add image_url to listings ───────────────────────────────────────────
    op.add_column("listings", sa.Column("image_url", sa.String(500), nullable=True))

    # ─── Create Emergency Alerts Table ───────────────────────────────────────
    op.create_table(
        "emergency_alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("severity", sa.String(20), default="warning", nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("link_url", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_emergency_alerts_is_active", "emergency_alerts", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_emergency_alerts_is_active", "emergency_alerts")
    op.drop_table("emergency_alerts")
    op.drop_column("listings", "image_url")
