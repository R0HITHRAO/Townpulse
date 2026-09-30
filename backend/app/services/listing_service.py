"""
TownPulse Listing Service
===========================
Business logic for listing CRUD operations, PostGIS radius queries,
and PostgreSQL full-text search with tsvector.
"""

import uuid
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import cast, func, text
from sqlalchemy.orm import Session, joinedload

from app.core.logging import get_logger
from app.models.listing import Listing
from app.schemas.listing import ListingCreate, ListingSearch, ListingUpdate
from app.services.freshness_service import FreshnessService
from app.services.hours_service import OPEN_NOW_SQL, normalize_hours, open_now_window

logger = get_logger(__name__)


class ListingService:
    """Service handling all listing search, CRUD, and geospatial operations."""

    @staticmethod
    def get_by_id(db: Session, listing_id: uuid.UUID) -> dict[str, Any] | None:
        """Fetch a single listing with category, owner, and reviews stats."""
        listing = (
            db.query(Listing)
            .options(
                joinedload(Listing.category),
                joinedload(Listing.owner),
                joinedload(Listing.reviews),
            )
            .filter(Listing.id == listing_id)
            .first()
        )
        if not listing:
            return None

        reviews = listing.reviews or []
        review_count = len(reviews)
        avg_rating = (
            round(sum(r.rating for r in reviews) / review_count, 1)
            if review_count > 0
            else None
        )

        return {
            "id": listing.id,
            "name": listing.name,
            "description": listing.description,
            "address": listing.address,
            "image_url": listing.image_url,
            "category_id": listing.category_id,
            "lat": float(listing.lat) if listing.lat is not None else None,
            "lng": float(listing.lng) if listing.lng is not None else None,
            "phone": listing.phone,
            "email": listing.email,
            "website": listing.website,
            "hours": listing.hours,
            "verified": listing.verified,
            "status": listing.status,
            "owner_user_id": listing.owner_user_id,
            "created_at": listing.created_at,
            "updated_at": listing.updated_at,
            "category": listing.category,
            "distance_meters": None,
            "average_rating": avg_rating,
            "review_count": review_count,
        }

    @staticmethod
    def search_listings(
        db: Session,
        params: ListingSearch,
    ) -> tuple[list[dict[str, Any]], int]:
        """
        Search listings using PostGIS geospatial proximity and full-text search.

        Args:
            db: Database session.
            params: Search query parameters.

        Returns:
            Tuple of (list_of_listing_dicts_with_distance, total_count).
        """
        # Filters run on `base` (no eager loads) so `count()` sees one row per
        # listing — joinedload rows multiply inside a count subquery and
        # inflate the total, which is how "50 results" pages showed 500.
        base = db.query(Listing)

        # Filter by verified only if requested
        if params.verified_only:
            base = base.filter(Listing.verified.is_(True))

        # Filter by category
        if params.category_id:
            base = base.filter(Listing.category_id == params.category_id)

        # Map viewport bounding box (cheap range scan on lat/lng columns).
        if params.min_lat is not None:
            base = base.filter(Listing.lat >= params.min_lat)
        if params.max_lat is not None:
            base = base.filter(Listing.lat <= params.max_lat)
        if params.min_lng is not None:
            base = base.filter(Listing.lng >= params.min_lng)
        if params.max_lng is not None:
            base = base.filter(Listing.lng <= params.max_lng)

        # Full-text search: websearch_to_tsquery parses what people actually
        # paste ("clinic near me -dentist"), with a substring fallback so
        # transliterated aliases and addresses still match.
        if params.q and params.q.strip():
            search_query = params.q.strip()
            base = base.filter(
                text(
                    "search_vector @@ websearch_to_tsquery('english', :q)"
                    " OR lower(name) LIKE :like"
                    " OR lower(coalesce(search_aliases, '')) LIKE :like"
                    " OR lower(coalesce(address, '')) LIKE :like"
                )
            ).params(
                q=search_query,
                like=f"%{search_query.lower()}%",
            )

        # Server-side "open now": normalised hours, one SQL predicate, so the
        # map can filter by open-now without shipping every row to the browser.
        if params.open_now:
            base = base.filter(text(OPEN_NOW_SQL)).params(**open_now_window())

        # Geospatial radius search using PostGIS ST_DWithin
        has_geo = params.lat is not None and params.lng is not None
        if has_geo and params.lat is not None and params.lng is not None:
            # Create PostGIS point geography: ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
            #
            # This must use SQLAlchemy's `cast()` with a real type object.
            # `func.cast(...)` resolves to the *PostgreSQL* cast() SQL function,
            # not the SQL type-cast constructor, so passing `func.geography()`
            # there makes the statement fail to compile with
            # "AttributeError: 'Function' object has no attribute
            # '_variant_mapping'" the moment anyone searches with coordinates.
            center_point = cast(
                func.ST_SetSRID(func.ST_MakePoint(params.lng, params.lat), 4326),
                Geography(geometry_type="POINT", srid=4326),
            )
            # ST_DWithin checks if distance is <= radius_meters (in meters on geography)
            base = base.filter(
                func.ST_DWithin(
                    Listing.location,
                    center_point,
                    params.radius_meters or 10000.0,
                )
            )

        total = base.count()

        # Eager loads are attached only for the row fetch (see the count note).
        query = base.options(joinedload(Listing.category))

        # Sorting
        if (
            has_geo
            and params.sort_by == "distance"
            and params.lat is not None
            and params.lng is not None
        ):
            query = query.order_by(
                func.ST_Distance(
                    Listing.location,
                    center_point,
                )
            )
        elif params.sort_by == "name":
            query = query.order_by(
                Listing.name.asc()
                if params.sort_order == "asc"
                else Listing.name.desc()
            )
        elif params.sort_by == "rating":
            # Denormalised avg_rating; reviews with no rating sink to the end.
            query = query.order_by(
                Listing.avg_rating.desc().nullslast()
                if params.sort_order == "desc"
                else Listing.avg_rating.asc().nullsfirst()
            )
        else:
            query = query.order_by(
                Listing.created_at.asc()
                if params.sort_order == "asc"
                else Listing.created_at.desc()
            )

        # Pagination
        offset = (params.page - 1) * params.per_page
        listings = query.offset(offset).limit(params.per_page).all()

        results = []
        for listing_row in listings:
            # Denormalised on write by the review endpoints — no per-row
            # review loading just to render one row of stars.
            review_count = listing_row.review_count or 0
            avg_rating = (
                round(float(listing_row.avg_rating), 1)
                if listing_row.avg_rating is not None
                else None
            )

            data = {
                "id": listing_row.id,
                "name": listing_row.name,
                "description": listing_row.description,
                "address": listing_row.address,
                "image_url": listing_row.image_url,
                "category_id": listing_row.category_id,
                "lat": float(listing_row.lat) if listing_row.lat is not None else None,
                "lng": float(listing_row.lng) if listing_row.lng is not None else None,
                "phone": listing_row.phone,
                "email": listing_row.email,
                "website": listing_row.website,
                "hours": listing_row.hours,
                "verified": listing_row.verified,
                "status": listing_row.status,
                "owner_user_id": listing_row.owner_user_id,
                "created_at": listing_row.created_at,
                "updated_at": listing_row.updated_at,
                "category": listing_row.category,
                "distance_meters": None,
                "average_rating": avg_rating,
                "review_count": review_count,
            }
            results.append(data)

        return results, total

    @staticmethod
    def create_listing(
        db: Session,
        data: ListingCreate,
        owner_id: uuid.UUID | None = None,
        auto_verify: bool = False,
    ) -> Listing:
        """Create a new listing with PostGIS geography point."""
        listing = Listing(
            name=data.name,
            description=data.description,
            address=data.address,
            image_url=data.image_url,
            category_id=data.category_id,
            lat=data.lat,
            lng=data.lng,
            phone=data.phone,
            email=data.email,
            website=data.website,
            hours=data.hours,
            normalized_hours=normalize_hours(data.hours),
            verified=auto_verify,
            status="approved" if auto_verify else "pending",
            owner_user_id=owner_id,
        )

        if data.lat is not None and data.lng is not None:
            # Set geography point in WGS84
            listing.location = f"SRID=4326;POINT({data.lng} {data.lat})"

        if auto_verify:
            # An admin-created listing starts its verification clock like any
            # other — "verified forever" is exactly what we are fixing.
            FreshnessService.mark_verified(listing)

        db.add(listing)
        db.commit()
        db.refresh(listing)
        logger.info("Listing created", listing_id=str(listing.id), name=listing.name)
        return listing

    @staticmethod
    def update_listing(
        db: Session,
        listing: Listing,
        data: ListingUpdate,
    ) -> Listing:
        """Update listing fields and recalculate geography point if coordinates changed."""
        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(listing, key, value)

        if "hours" in update_dict:
            # Keep the structured projection in lockstep with the free text —
            # the server-side open-now filter reads only normalized_hours.
            listing.normalized_hours = normalize_hours(listing.hours)

        if "lat" in update_dict or "lng" in update_dict:
            lat = listing.lat
            lng = listing.lng
            if lat is not None and lng is not None:
                listing.location = f"SRID=4326;POINT({lng} {lat})"

        db.commit()
        db.refresh(listing)
        logger.info("Listing updated", listing_id=str(listing.id))
        return listing

    @staticmethod
    def delete_listing(db: Session, listing: Listing) -> bool:
        """Delete a listing from the database."""
        db.delete(listing)
        db.commit()
        logger.info("Listing deleted", listing_id=str(listing.id))
        return True
