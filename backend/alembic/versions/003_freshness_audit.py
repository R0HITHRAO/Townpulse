"""Freshness, geo-targeted alerts, audit/push/saved-place/check-in tables.

Revision ID: 003_freshness_audit
Revises: 002_images_alerts
Create Date: 2024-01-03 00:00:00.000000

Schema delta for the trust/freshness + emergency-response feature set:

listings
- Verification freshness columns (verified_at, verification_expires_at,
  last_confirmed_at, confirmation_count, staleness_reports, needs_review)
  so "verified" decays instead of being a permanent badge.
- Denormalised rating columns (avg_rating, review_count) maintained by the
  review endpoints to keep search results off the reviews table.
- Structured hours projection (normalized_hours), gallery media (photos),
  locality scoping (town) and search_aliases for full-text matching.
- Trigram index for typo-tolerant name search + freshness queue index.
- Replaces listings_tsvector_update() so the trigger also indexes
  search_aliases and the category name (see models/listing.py).

emergency_alerts
- Geo-fencing (lat/lng/district/location/radius_meters) so a ward-level
  warning is not broadcast town-wide.
- Provenance & scheduling (created_by_id, source, publish_at) and
  fan-out accounting (push_delivered, sms_queued).

analytics
- Indexed attribution columns (listing_id, session_id, path) plus a
  composite (event_type, created_at) index for aggregate queries.

New tables
- saved_places: cross-device listing bookmarks.
- push_subscriptions: Web Push transport material for offline delivery.
- audit_logs: append-only moderation/administrative action trail.
- alert_checkins: "I'm safe" / "I need help" responses to alerts.
"""

from typing import Sequence, Union

from alembic import op

revision: str = "003_freshness_audit"
down_revision: Union[str, None] = "002_images_alerts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_column_if_missing(table: str, column_sql: str) -> None:
    """Idempotent ADD COLUMN so re-running the migration is harmless."""
    column_name = column_sql.split()[0]
    op.execute(
        f"""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='{table}' AND column_name='{column_name}'
            ) THEN
                ALTER TABLE {table} ADD COLUMN {column_sql};
            END IF;
        END $$;
        """
    )


def upgrade() -> None:
    # ─── Listings: freshness & denormalised ratings ────────────────────────────
    _add_column_if_missing("listings", "verified_at TIMESTAMPTZ")
    _add_column_if_missing("listings", "verification_expires_at TIMESTAMPTZ")
    _add_column_if_missing("listings", "last_confirmed_at TIMESTAMPTZ")
    _add_column_if_missing("listings", "confirmation_count INTEGER NOT NULL DEFAULT 0")
    _add_column_if_missing("listings", "staleness_reports INTEGER NOT NULL DEFAULT 0")
    _add_column_if_missing("listings", "needs_review BOOLEAN NOT NULL DEFAULT FALSE")
    _add_column_if_missing("listings", "avg_rating NUMERIC(3,2)")
    _add_column_if_missing("listings", "review_count INTEGER NOT NULL DEFAULT 0")

    # ─── Listings: structured hours, media, locality, search aliases ───────────
    _add_column_if_missing("listings", "normalized_hours JSONB")
    _add_column_if_missing("listings", "photos JSONB")
    _add_column_if_missing("listings", "town VARCHAR(120)")
    _add_column_if_missing("listings", "search_aliases TEXT")

    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_listings_verification_expires_at "
        "ON listings (verification_expires_at)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_listings_needs_review ON listings (needs_review)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_listings_town ON listings (town)")

    # Trigram index: typo + substring tolerance for transliterated names.
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_listings_name_trgm
        ON listings USING GIN (name gin_trgm_ops)
        """
    )
    # Freshness queue: "verified but nobody has confirmed it lately".
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_listings_freshness "
        "ON listings (verified, verified_at)"
    )

    # ─── Listings: widen the full-text trigger ─────────────────────────────────
    # 001 weighted name/description/address only. Aliases ("kiranastore") and
    # the category name are what residents actually type, so they join the
    # index here — see the model comment referencing migration 003.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION listings_tsvector_update()
        RETURNS trigger AS $$
        DECLARE
            cat_name TEXT;
        BEGIN
            SELECT c.name INTO cat_name
            FROM categories c
            WHERE c.id = NEW.category_id;

            NEW.search_vector :=
                setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
                setweight(to_tsvector('english', coalesce(NEW.search_aliases, '')), 'A') ||
                setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
                setweight(to_tsvector('english', coalesce(cat_name, '')), 'B') ||
                setweight(to_tsvector('english', coalesce(NEW.address, '')), 'C');
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
        """
    )

    # ─── Emergency alerts: geo-targeting, provenance, accounting ───────────────
    _add_column_if_missing("emergency_alerts", "lat NUMERIC(10,7)")
    _add_column_if_missing("emergency_alerts", "lng NUMERIC(10,7)")
    _add_column_if_missing("emergency_alerts", "district VARCHAR(120)")
    _add_column_if_missing("emergency_alerts", "location geography(Point, 4326)")
    _add_column_if_missing("emergency_alerts", "radius_meters NUMERIC(10,1)")
    _add_column_if_missing(
        "emergency_alerts",
        "created_by_id UUID REFERENCES users(id) ON DELETE SET NULL",
    )
    _add_column_if_missing("emergency_alerts", "source VARCHAR(160)")
    _add_column_if_missing("emergency_alerts", "publish_at TIMESTAMPTZ")
    _add_column_if_missing(
        "emergency_alerts", "push_delivered INTEGER NOT NULL DEFAULT 0"
    )
    _add_column_if_missing("emergency_alerts", "sms_queued INTEGER NOT NULL DEFAULT 0")
    _add_column_if_missing(
        "emergency_alerts", "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_emergency_alerts_district "
        "ON emergency_alerts (district)"
    )

    # ─── Analytics: indexed attribution for per-listing performance ────────────
    _add_column_if_missing(
        "analytics", "listing_id UUID REFERENCES listings(id) ON DELETE CASCADE"
    )
    _add_column_if_missing("analytics", "session_id VARCHAR(64)")
    _add_column_if_missing("analytics", "path VARCHAR(512)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_analytics_listing_id ON analytics (listing_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_analytics_session_id ON analytics (session_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_analytics_type_created "
        "ON analytics (event_type, created_at)"
    )

    # ─── Saved places ──────────────────────────────────────────────────────────
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS saved_places (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
            note TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_saved_places_user_listing UNIQUE (user_id, listing_id)
        );
        CREATE INDEX IF NOT EXISTS ix_saved_places_user_id ON saved_places (user_id);
        CREATE INDEX IF NOT EXISTS ix_saved_places_listing_id
            ON saved_places (listing_id);
        """
    )

    # ─── Push subscriptions ────────────────────────────────────────────────────
    # auth is a payload-encryption secret and is never returned by any API.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            endpoint TEXT NOT NULL UNIQUE,
            p256dh VARCHAR(255) NOT NULL,
            auth VARCHAR(255) NOT NULL,
            agency VARCHAR(120),
            lat DOUBLE PRECISION,
            lng DOUBLE PRECISION,
            town VARCHAR(120),
            critical_only BOOLEAN NOT NULL DEFAULT FALSE,
            failure_count INTEGER NOT NULL DEFAULT 0,
            last_delivery_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_push_subscriptions_user_id
            ON push_subscriptions (user_id);
        """
    )

    # ─── Audit logs ────────────────────────────────────────────────────────────
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY,
            actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
            actor_role VARCHAR(32),
            action VARCHAR(80) NOT NULL,
            entity_type VARCHAR(40) NOT NULL,
            entity_id UUID,
            summary TEXT,
            before_json JSONB,
            after_json JSONB,
            ip_address VARCHAR(64),
            user_agent VARCHAR(512),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_id ON audit_logs (actor_id);
        CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs (action);
        CREATE INDEX IF NOT EXISTS ix_audit_logs_entity_type
            ON audit_logs (entity_type);
        CREATE INDEX IF NOT EXISTS ix_audit_logs_entity_id ON audit_logs (entity_id);
        CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at);
        CREATE INDEX IF NOT EXISTS ix_audit_logs_entity
            ON audit_logs (entity_type, entity_id);
        """
    )

    # ─── Alert check-ins ───────────────────────────────────────────────────────
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS alert_checkins (
            id UUID PRIMARY KEY,
            alert_id UUID NOT NULL REFERENCES emergency_alerts(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'safe',
            note TEXT,
            phone VARCHAR(20),
            lat DOUBLE PRECISION,
            lng DOUBLE PRECISION,
            resolved BOOLEAN NOT NULL DEFAULT FALSE,
            resolved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_alert_checkins_alert_user UNIQUE (alert_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS ix_alert_checkins_alert_id
            ON alert_checkins (alert_id);
        CREATE INDEX IF NOT EXISTS ix_alert_checkins_user_id
            ON alert_checkins (user_id);
        """
    )

    # Backfill the tsvector for rows written before this migration.
    op.execute(
        """
        UPDATE listings
        SET search_vector =
            setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(search_aliases, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(address, '')), 'C')
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS alert_checkins")
    op.execute("DROP TABLE IF EXISTS audit_logs")
    op.execute("DROP TABLE IF EXISTS push_subscriptions")
    op.execute("DROP TABLE IF EXISTS saved_places")

    op.execute("DROP INDEX IF EXISTS ix_analytics_type_created")
    op.execute("DROP INDEX IF EXISTS ix_analytics_session_id")
    op.execute("DROP INDEX IF EXISTS ix_analytics_listing_id")
    op.execute("ALTER TABLE analytics DROP COLUMN IF EXISTS path")
    op.execute("ALTER TABLE analytics DROP COLUMN IF EXISTS session_id")
    op.execute("ALTER TABLE analytics DROP COLUMN IF EXISTS listing_id")

    op.execute("DROP INDEX IF EXISTS ix_emergency_alerts_district")
    for col in (
        "updated_at",
        "sms_queued",
        "push_delivered",
        "publish_at",
        "source",
        "created_by_id",
        "radius_meters",
        "location",
        "district",
        "lng",
        "lat",
    ):
        op.execute(f"ALTER TABLE emergency_alerts DROP COLUMN IF EXISTS {col}")

    # Restore the 001 trigger definition (aliases/category weighting removed).
    op.execute(
        """
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
        """
    )

    op.execute("DROP INDEX IF EXISTS ix_listings_freshness")
    op.execute("DROP INDEX IF EXISTS ix_listings_name_trgm")
    op.execute("DROP INDEX IF EXISTS ix_listings_town")
    op.execute("DROP INDEX IF EXISTS ix_listings_needs_review")
    op.execute("DROP INDEX IF EXISTS ix_listings_verification_expires_at")
    for col in (
        "search_aliases",
        "town",
        "photos",
        "normalized_hours",
        "review_count",
        "avg_rating",
        "needs_review",
        "staleness_reports",
        "confirmation_count",
        "last_confirmed_at",
        "verification_expires_at",
        "verified_at",
    ):
        op.execute(f"ALTER TABLE listings DROP COLUMN IF EXISTS {col}")
