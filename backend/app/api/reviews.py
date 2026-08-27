"""
TownPulse Reviews Endpoints
============================
Community citizen reviews and star ratings for local service listings.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_admin
from app.models.listing import Listing
from app.models.review import Review
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewListResponse, ReviewResponse

router = APIRouter(tags=["Reviews"])


@router.get("/listings/{listing_id}/reviews", response_model=ReviewListResponse)
def get_listing_reviews(
    listing_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ReviewListResponse:
    """Get all reviews and computed average star rating for a listing."""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found.",
        )

    reviews = (
        db.query(Review)
        .filter(Review.listing_id == listing_id)
        .order_by(Review.created_at.desc())
        .all()
    )

    total = len(reviews)
    avg_rating = 0.0
    if total > 0:
        avg_rating = round(sum(r.rating for r in reviews) / total, 1)

    return ReviewListResponse(
        total=total,
        average_rating=avg_rating,
        items=reviews,  # type: ignore[arg-type]
    )


@router.post("/listings/{listing_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_or_update_review(
    listing_id: uuid.UUID,
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Review:
    """Submit a rating and comment for a listing. Updates existing review if already submitted."""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found.",
        )

    # Check for existing review by this user
    existing_review = (
        db.query(Review)
        .filter(Review.listing_id == listing_id, Review.user_id == current_user.id)
        .first()
    )

    if existing_review:
        existing_review.rating = review_in.rating
        existing_review.comment = review_in.comment
        db.commit()
        db.refresh(existing_review)
        return existing_review

    new_review = Review(
        listing_id=listing_id,
        user_id=current_user.id,
        rating=review_in.rating,
        comment=review_in.comment,
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete a review. Users can delete their own reviews; Admins can delete any review."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found.",
        )

    if review.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this review.",
        )

    db.delete(review)
    db.commit()
