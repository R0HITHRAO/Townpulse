"""
TownPulse Submission API Endpoints
==================================
Public "suggest a listing" flow plus the admin queue that promotes a
submission into a real Listing.

Why submissions exist instead of letting anyone create listings directly:
anonymous residents must be able to contribute, but nothing unreviewed should
ever be searchable. Every decision in this file is written to the audit trail —
the README promises audited moderation and this is where that promise is kept.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status

from app.core.dependencies import AdminUser, DbSession, OptionalUser
from app.models.audit_log import AuditAction
from app.models.listing import Listing
from app.models.submission import Submission, SubmissionStatus
from app.schemas.common import MessageResponse
from app.schemas.listing import ListingCreate, ListingOut
from app.schemas.submission import SubmissionCreate, SubmissionOut, SubmissionReview
from app.services.audit_service import AuditService
from app.services.cache_service import CacheService
from app.services.listing_service import ListingService

router = APIRouter(tags=["Submissions"])

# Columns a submission payload may transfer onto a Listing. Everything else
# (submitter metadata) stays submission-only.
_LISTING_FIELDS = frozenset(
    {
        "name",
        "description",
        "address",
        "image_url",
        "category_id",
        "lat",
        "lng",
        "phone",
        "email",
        "website",
        "hours",
    }
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@router.post(
    "/submissions",
    response_model=SubmissionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Suggest a new listing for review",
)
def create_submission(
    data: SubmissionCreate,
    db: DbSession,
    user: OptionalUser,
) -> Submission:
    """
    Accept an anonymous or authenticated suggestion.

    Responds 201 with the stored submission so the submitter gets a reference,
    while the data stays invisible to search until an admin approves it.
    """
    payload = data.model_dump()
    payload.pop("note", None)

    submission = Submission(
        data_json=payload,
        status=SubmissionStatus.pending,
        submitted_by_user_id=user.id if user else None,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.get(
    "/admin/submissions",
    response_model=list[SubmissionOut],
    summary="List public listing submissions (admin)",
)
def list_submissions(
    admin_user: AdminUser,
    db: DbSession,
    submission_status: str = "pending",
    limit: int = 100,
) -> list[Submission]:
    """Moderation queue, newest first."""
    query = db.query(Submission).order_by(Submission.created_at.desc())
    if submission_status in {s.value for s in SubmissionStatus}:
        query = query.filter(Submission.status == SubmissionStatus(submission_status))
    return query.limit(min(max(limit, 1), 200)).all()


@router.post(
    "/admin/submissions/{submission_id}/approve",
    response_model=ListingOut,
    status_code=status.HTTP_201_CREATED,
    summary="Approve a submission and create the listing (admin)",
)
def approve_submission(
    submission_id: uuid.UUID,
    admin_user: AdminUser,
    request: Request,
    db: DbSession,
) -> Listing:
    """
    Promote a reviewed submission into a pending Listing and audit the call.

    Approved submissions stay `pending` verification on purpose: a submission
    proves the data was reviewed, not that the shop still exists.
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )
    if submission.status != SubmissionStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Submission already {submission.status.value}",
        )

    clean = {
        key: value
        for key, value in (submission.data_json or {}).items()
        if key in _LISTING_FIELDS
    }
    listing = ListingService.create_listing(
        db,
        ListingCreate(**clean),
        owner_id=submission.submitted_by_user_id,
        auto_verify=False,
    )

    submission.status = SubmissionStatus.approved
    submission.reviewed_at = _utcnow()
    db.commit()

    CacheService.delete_pattern("listings:*")

    AuditService.record(
        db,
        actor=admin_user,
        action=AuditAction.SUBMISSION_APPROVE,
        entity_type="submission",
        entity_id=submission.id,
        summary=f"Approved submission -> listing {listing.id}",
        before={"status": "pending"},
        after={"status": "approved", "listing_id": str(listing.id)},
        request=request,
    )
    return listing  # type: ignore[return-value]


@router.post(
    "/admin/submissions/{submission_id}/reject",
    response_model=MessageResponse,
    summary="Reject a submission (admin)",
)
def reject_submission(
    submission_id: uuid.UUID,
    data: SubmissionReview,
    admin_user: AdminUser,
    request: Request,
    db: DbSession,
) -> MessageResponse:
    """Reject with a reason the submitter can act on, and audit the call."""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )
    if submission.status != SubmissionStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Submission already {submission.status.value}",
        )

    previous = {"status": submission.status.value}
    submission.status = SubmissionStatus.rejected
    submission.rejection_reason = data.rejection_reason
    submission.reviewed_at = _utcnow()
    db.commit()

    AuditService.record(
        db,
        actor=admin_user,
        action=AuditAction.SUBMISSION_REJECT,
        entity_type="submission",
        entity_id=submission.id,
        summary=data.rejection_reason or "Rejected submission",
        before=previous,
        after={"status": "rejected"},
        request=request,
    )
    return MessageResponse(message="Submission rejected.")
