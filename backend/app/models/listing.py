"""
TownPulse Listing Model
=========================
The core model for local services and businesses.

Key features:
- PostGIS geography column for geospatial queries (ST_DWithin, ST_Distance)
- GIST index on location for fast radius searches
- tsvector column for full-text search across name and description
- Verified flag managed by admin approval workflow
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy.types import UserDefinedType

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.claim import Claim
    from app.models.review import Review
    from app.models.user import User


class TSVector(UserDefinedType):
    """Custom type for PostgreSQL tsvector (full-text search)."""

    cache_ok = True

    def get_col_spec(self, **kw) -> str:  # type: ignore[override]
        return "TSVECTOR"


class Listing(Base):
    """
    A local service or business listing.

    Listings go through a moderation pipeline:
    1. Submitted (pending) by a user or admin
    2. Verified by an admin
    3. Optionally claimed by a business owner (via Claim model)

    Geospatial queries use PostGIS ST_DWithin against the `location` column.
    Full-text search uses the `search_vector` tsvector column.
    """

    __tablename__ = "listings"

    # ─── Primary Key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # ─── Basic Info ───────────────────────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ─── Category ─────────────────────────────────────────────────────────────
    category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ─── Geospatial Location ──────────────────────────────────────────────────
    # PostGIS geography column — stores lat/lng as WGS84 point
    # Use ST_DWithin for radius queries and ST_Distance for sorting by distance
    #
    # Annotated as Mapped[Any] rather than a bare `Column(...)`: geoalchemy2 has
    # no precise Python type for this attribute (it holds WKT strings on write
    # and WKBElement on read), and an unannotated Column makes mypy treat every
    # assignment as a Column, not the value.
    location: Mapped[Any] = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=True,
    )

    # Redundant lat/lng columns for simple queries without PostGIS functions
    lat: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    lng: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)

    # ─── Contact Info ─────────────────────────────────────────────────────────
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Operating hours stored as JSON
    # Example: {"monday": "9am-5pm", "tuesday": "9am-5pm", ...}
    hours: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ─── Status & Ownership ───────────────────────────────────────────────────
    # Admin-verified listings get a verified badge
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Status for moderation workflow
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",  # pending | approved | rejected
        nullable=False,
    )

    # Owner user (set after a claim is approved)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ─── Verification & Freshness ─────────────────────────────────────────────
    # `verified` alone is a lie over time: a pharmacy that shut down in 2023
    # stays "verified" forever, which is exactly how directories die. These
    # columns make trust a decaying quantity that must be refreshed.
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    verification_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    # Last time the owner or the crowd confirmed this listing is live.
    last_confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    # Community "still open / phone works" confirmations (positive signal).
    confirmation_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    # "Closed / wrong number" reports (negative signal).
    staleness_reports: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    # Negative signals demote a listing into the moderation queue rather than
    # silently hiding it — hiding real businesses is worse than flagging them.
    needs_review: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
    )

    # ─── Denormalised Ratings ─────────────────────────────────────────────────
    # Maintained by the review endpoints. Without these, every search had to
    # eager-load every Review row for every result and average them in Python.
    avg_rating: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    review_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    # ─── Structured Hours & Media ─────────────────────────────────────────────
    # Parsed projection of `hours` ("9am-5pm" -> {open: 540, close: 1020}),
    # which is what makes a *server-side* "open now" filter possible.
    normalized_hours: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Additional gallery images produced by the upload endpoint.
    photos: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # ─── Locality Scoping ─────────────────────────────────────────────────────
    # Free-text town/ward for now; the hook that multi-town scoping needs.
    town: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)

    # ─── Full-Text Search ─────────────────────────────────────────────────────
    # Romanised/regional spellings and local names ("kiranastore", "दवा की दुकान")
    # are what users actually type; they are indexed alongside name/address.
    search_aliases: Mapped[str | None] = mapped_column(Text, nullable=True)

    # tsvector computed by trigger from name, description, address, category
    # and aliases — see the listings_tsvector_update() function in migration 003.
    search_vector = Column(TSVector, nullable=True)

    # ─── Timestamps ───────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    category: Mapped["Category"] = relationship(  # type: ignore[name-defined]
        "Category",
        back_populates="listings",
    )
    owner: Mapped["User | None"] = relationship(  # type: ignore[name-defined]
        "User",
        back_populates="owned_listings",
        foreign_keys=[owner_user_id],
    )
    claims: Mapped[list["Claim"]] = relationship(  # type: ignore[name-defined]
        "Claim",
        back_populates="listing",
    )
    reviews: Mapped[list["Review"]] = relationship(  # type: ignore[name-defined]
        "Review",
        back_populates="listing",
    )

    # ─── Table-Level Indexes ──────────────────────────────────────────────────
    __table_args__ = (
        # GIST index on location geography for fast ST_DWithin radius queries
        Index(
            "ix_listings_location_gist",
            "location",
            postgresql_using="gist",
        ),
        # GIN index on search_vector for fast full-text search
        Index(
            "ix_listings_search_vector_gin",
            "search_vector",
            postgresql_using="gin",
        ),
        # Trigram index: typo + substring tolerance for transliterated names
        Index(
            "ix_listings_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
        # Freshness queue: "verified but nobody has confirmed it lately"
        Index("ix_listings_freshness", "verified", "verified_at"),
    )

    def __repr__(self) -> str:
        return f"<Listing id={self.id} name={self.name} verified={self.verified}>"
