"""Initial database migration: create all TownPulse tables with PostGIS and full-text search.

Revision ID: 001_initial
Revises:
Create Date: 2024-01-01 00:00:00.000000

Tables created:
- users (with role enum)
- categories
- listings (with PostGIS geography and tsvector)
- claims (with status enum)
- submissions (with status enum)
- reviews (with rating constraint)
- analytics
"""

from typing import Sequence, Union

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─── Enable PostGIS Extension ─────────────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")  # For similarity search

    # ─── Enums ────────────────────────────────────────────────────────────────
    user_role_enum = postgresql.ENUM(
        "user", "business_owner", "admin",
        name="user_role",
    )
    user_role_enum.create(op.get_bind())

    claim_status_enum = postgresql.ENUM(
        "pending", "approved", "rejected",
        name="claim_status",
    )
    claim_status_enum.create(op.get_bind())

    submission_status_enum = postgresql.ENUM(
        "pending", "approved", "rejected",
        name="submission_status",
    )
    submission_status_enum.create(op.get_bind())

    # ─── Users Table ──────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=True),
        sa.Column("phone", sa.String(20), unique=True, nullable=True),
        sa.Column("password_hash", sa.Text, nullable=True),
        sa.Column("phone_verified", sa.Boolean, default=False, nullable=False),
        sa.Column("email_verified", sa.Boolean, default=False, nullable=False),
        sa.Column(
            "role",
            sa.Enum("user", "business_owner", "admin", name="user_role"),
            default="user",
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_phone", "users", ["phone"])

    # ─── Categories Table ─────────────────────────────────────────────────────
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
    )

    # ─── Listings Table ───────────────────────────────────────────────────────
    op.create_table(
        "listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("address", sa.Text, nullable=False),
        sa.Column(
            "category_id",
            sa.Integer,
            sa.ForeignKey("categories.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # PostGIS geography column (WGS84 POINT)
        sa.Column(
            "location",
            geoalchemy2.Geography(geometry_type="POINT", srid=4326),
            nullable=True,
        ),
        sa.Column("lat", sa.Numeric(10, 7), nullable=True),
        sa.Column("lng", sa.Numeric(10, 7), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("hours", postgresql.JSONB, nullable=True),
        sa.Column("verified", sa.Boolean, default=False, nullable=False),
        sa.Column("status", sa.String(20), default="pending", nullable=False),
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # tsvector column for full-text search
        sa.Column("search_vector", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # Indexes for listings
    op.create_index("ix_listings_name", "listings", ["name"])
    op.create_index("ix_listings_category_id", "listings", ["category_id"])
    op.create_index("ix_listings_owner_user_id", "listings", ["owner_user_id"])

    # GIST index on location for fast ST_DWithin radius queries
    op.execute(
        "CREATE INDEX ix_listings_location_gist ON listings USING GIST (location)"
    )

    # GIN index on search_vector for full-text search
    # Note: search_vector is updated by a trigger below
    op.execute(
        "ALTER TABLE listings ALTER COLUMN search_vector TYPE tsvector USING search_vector::tsvector"
    )
    op.execute(
        "CREATE INDEX ix_listings_search_vector_gin ON listings USING GIN (search_vector)"
    )

    # Trigger to auto-update tsvector from name + description
    op.execute("""
        CREATE OR REPLACE FUNCTION listings_tsvector_update()
        RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
                setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
                setweight(to_tsvector('english', coalesce(NEW.address, '')), 'C');
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER listings_tsvector_trigger
        BEFORE INSERT OR UPDATE ON listings
        FOR EACH ROW
        EXECUTE FUNCTION listings_tsvector_update();
    """)

    # ─── Claims Table ─────────────────────────────────────────────────────────
    op.create_table(
        "claims",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "listing_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("listings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "rejected", name="claim_status"),
            default="pending",
            nullable=False,
        ),
        sa.Column("proof_url", sa.String(500), nullable=True),
        sa.Column("message", sa.Text, nullable=True),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_claims_listing_id", "claims", ["listing_id"])
    op.create_index("ix_claims_user_id", "claims", ["user_id"])

    # ─── Submissions Table ────────────────────────────────────────────────────
    op.create_table(
        "submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("data_json", postgresql.JSONB, nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "rejected", name="submission_status"),
            default="pending",
            nullable=False,
        ),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column(
            "submitted_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_submissions_submitted_by", "submissions", ["submitted_by_user_id"]
    )

    # ─── Reviews Table ────────────────────────────────────────────────────────
    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "listing_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("listings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating"),
    )
    op.create_index("ix_reviews_listing_id", "reviews", ["listing_id"])
    op.create_index("ix_reviews_user_id", "reviews", ["user_id"])

    # ─── Analytics Table ──────────────────────────────────────────────────────
    op.create_table(
        "analytics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("payload_json", postgresql.JSONB, nullable=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_analytics_event_type", "analytics", ["event_type"])
    op.create_index("ix_analytics_created_at", "analytics", ["created_at"])
    op.create_index("ix_analytics_user_id", "analytics", ["user_id"])


def downgrade() -> None:
    # Drop tables in reverse order (respect FK constraints)
    op.drop_table("analytics")
    op.drop_table("reviews")
    op.drop_table("submissions")
    op.drop_table("claims")
    op.drop_index("ix_listings_search_vector_gin")
    op.drop_index("ix_listings_location_gist")
    op.execute("DROP TRIGGER IF EXISTS listings_tsvector_trigger ON listings")
    op.execute("DROP FUNCTION IF EXISTS listings_tsvector_update()")
    op.drop_table("listings")
    op.drop_table("categories")
    op.drop_table("users")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS submission_status")
    op.execute("DROP TYPE IF EXISTS claim_status")
    op.execute("DROP TYPE IF EXISTS user_role")
