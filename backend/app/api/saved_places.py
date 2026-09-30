"""
TownPulse Saved Places API Endpoints
====================================
Server-side bookmarks.

The localStorage-only implementation lost saves on cache clear and never left
the device they were made on; these endpoints make saves follow the resident's
account, while the client keeps an offline copy (see the outbox in
frontend/src/services/api.ts) that reconciles when the connection returns.
"""

import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import joinedload

from app.core.dependencies import CurrentUser, DbSession
from app.models.listing import Listing
from app.models.saved_place import SavedPlace
from app.schemas.common import MessageResponse
from app.schemas.saved_place import SavedPlaceIn, SavedPlaceOut, SavedPlaceUpdate

router = APIRouter(prefix="/saved-places", tags=["Saved Places"])


def _serialize(place: SavedPlace) -> dict:
    """Flatten a save plus the listing fields the list view needs."""
    listing: Listing | None = place.listing
    return {
        "id": place.id,
        "listing_id": place.listing_id,
        "note": place.note,
        "created_at": place.created_at,
        "listing": (
            {
                "id": listing.id,
                "name": listing.name,
                "address": listing.address,
                "category_id": listing.category_id,
                "image_url": listing.image_url,
                "verified": listing.verified,
                "status": listing.status,
                "lat": float(listing.lat) if listing.lat is not None else None,
                "lng": float(listing.lng) if listing.lng is not None else None,
                "average_rating": (
                    float(listing.avg_rating)
                    if listing.avg_rating is not None
                    else None
                ),
                "review_count": listing.review_count,
            }
            if listing
            else None
        ),
    }


@router.get(
    "",
    response_model=list[SavedPlaceOut],
    summary="List the current user's saved places",
)
def list_saved_places(
    current_user: CurrentUser,
    db: DbSession,
) -> list[SavedPlaceOut]:
    """Newest saves first, with listing detail included (no N+1 from here)."""
    places = (
        db.query(SavedPlace)
        .options(joinedload(SavedPlace.listing))
        .filter(SavedPlace.user_id == current_user.id)
        .order_by(SavedPlace.created_at.desc())
        .all()
    )
    return [_serialize(place) for place in places]  # type: ignore[misc]


@router.post(
    "",
    response_model=SavedPlaceOut,
    status_code=status.HTTP_201_CREATED,
    summary="Save a listing",
)
def save_place(
    payload: SavedPlaceIn,
    current_user: CurrentUser,
    db: DbSession,
) -> SavedPlaceOut:
    """
    Idempotent save: saving twice updates the note instead of duplicating,
    because the offline outbox may replay the same operation.
    """
    listing = db.get(Listing, payload.listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

    place = (
        db.query(SavedPlace)
        .filter(
            SavedPlace.user_id == current_user.id,
            SavedPlace.listing_id == payload.listing_id,
        )
        .first()
    )
    if place is None:
        place = SavedPlace(
            user_id=current_user.id,
            listing_id=payload.listing_id,
            note=payload.note,
        )
        db.add(place)
    else:
        place.note = payload.note
    db.commit()
    db.refresh(place)
    return _serialize(place)


@router.put(
    "/{listing_id}",
    response_model=SavedPlaceOut,
    summary="Update the note on a saved place",
)
def update_saved_place(
    listing_id: uuid.UUID,
    payload: SavedPlaceUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> SavedPlaceOut:
    """Patch the private note ("the one near the bus stand")."""
    place = (
        db.query(SavedPlace)
        .filter(
            SavedPlace.user_id == current_user.id,
            SavedPlace.listing_id == listing_id,
        )
        .first()
    )
    if not place:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved place not found",
        )
    place.note = payload.note
    db.commit()
    db.refresh(place)
    return _serialize(place)


@router.delete(
    "/{listing_id}",
    response_model=MessageResponse,
    summary="Remove a saved place",
)
def delete_saved_place(
    listing_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    """Remove by listing id so an offline replay can safely no-op."""
    place = (
        db.query(SavedPlace)
        .filter(
            SavedPlace.user_id == current_user.id,
            SavedPlace.listing_id == listing_id,
        )
        .first()
    )
    if not place:
        return MessageResponse(message="Not saved.")

    db.delete(place)
    db.commit()
    return MessageResponse(message="Removed from saved places.")
