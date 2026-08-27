"""
TownPulse Listing Service
===========================
Business logic for listing CRUD operations, PostGIS radius queries,
and PostgreSQL full-text search with tsvector.
"""

import uuid
from typing import Any

from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_MakePoint, ST_SetSRID
from sqlalchemy import desc, func, text
from sqlalchemy.orm import Session, joinedload

from app.core.logging import get_logger
from app.models.category import Category
from app.models.listing import Listing
from app.models.review import Review
from app.models.user import User, UserRole
from app.schemas.listing import ListingCreate, ListingSearch, ListingUpdate

logger = get_logger(__name__)


class ListingService:
    """Service handling all listing search, CRUD, and geospatial operations."""

    @staticmethod
    def get_by_id(db: Session, listing_id: uuid.UUID) -> dict[str, Any] | None:
        """Fetch a single listing with category, owner, and reviews stats."""
        listing = (
            db.query(Listing)
            .options(joinedload(Listing.category), joinedload(Listing.owner), joinedload(Listing.reviews))
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
        query = db.query(Listing).options(joinedload(Listing.category), joinedload(Listing.reviews))

        # Filter by verified only if requested
        if params.verified_only:
            query = query.filter(Listing.verified.is_(True))

        # Filter by category
        if params.category_id:
            query = query.filter(Listing.category_id == params.category_id)

        # Full-text search using tsvector
        if params.q and params.q.strip():
            search_query = params.q.strip()
            # Use websearch_to_tsquery for natural query parsing
            query = query.filter(
                text("search_vector @@ plainto_tsquery('english', :q)")
            ).params(q=search_query)

        # Geospatial radius search using PostGIS ST_DWithin
        has_geo = params.lat is not None and params.lng is not None
        if has_geo and params.lat is not None and params.lng is not None:
            # Create PostGIS point geography: ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
            center_point = func.ST_SetSRID(
                func.ST_MakePoint(params.lng, params.lat),
                4326,
            )
            # ST_DWithin checks if distance is <= radius_meters (in meters on geography)
            query = query.filter(
                func.ST_DWithin(
                    Listing.location,
                    func.cast(center_point, func.geography),
                    params.radius_meters or 10000.0,
                )
            )

        total = query.count()

        # Sorting
        if has_geo and params.sort_by == "distance" and params.lat is not None and params.lng is not None:
            center_point = func.ST_SetSRID(
                func.ST_MakePoint(params.lng, params.lat), 4326
            )
            query = query.order_by(
                func.ST_Distance(
                    Listing.location,
                    func.cast(center_point, func.geography),
                )
            )
        elif params.sort_by == "name":
            query = query.order_by(
                Listing.name.asc() if params.sort_order == "asc" else Listing.name.desc()
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
        for l in listings:
            reviews = l.reviews or []
            review_count = len(reviews)
            avg_rating = (
                round(sum(r.rating for r in reviews) / review_count, 1)
                if review_count > 0
                else None
            )

            data = {
                "id": l.id,
                "name": l.name,
                "description": l.description,
                "address": l.address,
                "image_url": l.image_url,
                "category_id": l.category_id,
                "lat": float(l.lat) if l.lat is not None else None,
                "lng": float(l.lng) if l.lng is not None else None,
                "phone": l.phone,
                "email": l.email,
                "website": l.website,
                "hours": l.hours,
                "verified": l.verified,
                "status": l.status,
                "owner_user_id": l.owner_user_id,
                "created_at": l.created_at,
                "updated_at": l.updated_at,
                "category": l.category,
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
            verified=auto_verify,
            status="approved" if auto_verify else "pending",
            owner_user_id=owner_id,
        )

        if data.lat is not None and data.lng is not None:
            # Set geography point in WGS84
            listing.location = f"SRID=4326;POINT({data.lng} {data.lat})"

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
