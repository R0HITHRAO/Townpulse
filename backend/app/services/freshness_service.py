"""
TownPulse Listing Freshness Service
====================================
Trust decay for directory data.

A listing marked `verified` in 2023 stays "verified" forever, which is exactly
how small-town directories die: users tap a dead phone number twice and stop
coming back. This module turns verification into a decaying quantity with a
small, explainable scoring model plus three levers:

- `confirm`  — one tap from an owner or resident ("still open", "number works")
- `report_stale` — negative signal that escalates into the moderation queue
- `expire_stale` — background sweep that expires verification silently

Nothing here hides a listing. The failure mode we deliberately avoid is
suppressing a real business because nobody touched its row in six months; a
stale listing is demoted and flagged, never deleted.
"""

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import get_logger
from app.models.analytics import Analytics
from app.models.listing import Listing
from app.services.analytics_service import EventType, track
from app.services.cache_service import CacheService

logger = get_logger(__name__)

# A verification is believed for this long before it must be re-confirmed.
VERIFICATION_VALID_DAYS = 180
# Days before expiry at which the badge switches to "expiring".
EXPIRING_SOON_DAYS = 30
# Independent negative reports that push a listing into moderation.
REPORTS_FOR_REVIEW = 3
# Score bounds.
SCORE_FLOOR_ON_DECAY = 20
CONFIRM_SCORE_BONUS = 2  # capped by CONFIRM_SCORE_BONUS_MAX
CONFIRM_SCORE_BONUS_MAX = 10
REPORT_PENALTY = 15

# Freshness badge states rendered by the frontend.
STATE_FRESH = "fresh"
STATE_EXPIRING = "expiring"
STATE_EXPIRED = "expired"
STATE_REVIEW = "needs_review"
STATE_UNVERIFIED = "unverified"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class FreshnessService:
    """Scoring, one-tap confirmations, and staleness escalation."""

    @staticmethod
    def freshness_score(
        listing: Listing,
        now: datetime | None = None,
    ) -> int:
        """
        Score 0-100 for how much a listing can currently be trusted.

        Decay is driven by the last *positive* touch (community confirmation,
        else verification, else creation) over the 180-day belief window.
        """
        current = now or _utcnow()

        last_touch = (
            listing.last_confirmed_at or listing.verified_at or listing.created_at
        )
        if last_touch is None:
            age_days = VERIFICATION_VALID_DAYS
        else:
            if last_touch.tzinfo is None:
                last_touch = last_touch.replace(tzinfo=timezone.utc)
            age_days = max(0, (current - last_touch).days)

        # Linear decay: 100 at day 0 -> 20 at the 180-day window, never below.
        span = float(VERIFICATION_VALID_DAYS)
        score = 100.0 - (min(age_days, span) / span) * (100 - SCORE_FLOOR_ON_DECAY)

        if listing.confirmation_count:
            score += min(
                listing.confirmation_count * CONFIRM_SCORE_BONUS,
                CONFIRM_SCORE_BONUS_MAX,
            )
        if listing.staleness_reports:
            score -= listing.staleness_reports * REPORT_PENALTY

        expired = FreshnessService.is_expired(listing, current)
        if expired:
            score = min(score, 40.0)
        if listing.needs_review:
            score = min(score, 30.0)

        return int(max(0, min(100, round(score))))

    @staticmethod
    def is_expired(listing: Listing, now: datetime | None = None) -> bool:
        """True when the verification window has lapsed."""
        if listing.verification_expires_at is None:
            return False
        expiry = listing.verification_expires_at
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        return expiry <= (now or _utcnow())

    @staticmethod
    def badge(listing: Listing, now: datetime | None = None) -> dict[str, Any]:
        """
        Render the freshness badge the listing card and detail page show.

        Returns:
            Dict with `state`, `score`, `verified_at`, `expires_at` and
            `expires_in_days` (None when never verified).
        """
        current = now or _utcnow()
        score = FreshnessService.freshness_score(listing, current)

        if listing.needs_review:
            state = STATE_REVIEW
        elif not listing.verified:
            state = STATE_UNVERIFIED
        elif listing.verification_expires_at is None:
            state = STATE_FRESH
        elif FreshnessService.is_expired(listing, current):
            state = STATE_EXPIRED
        else:
            expiry = listing.verification_expires_at
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            days_left = (expiry - current).days
            state = STATE_EXPIRING if days_left <= EXPIRING_SOON_DAYS else STATE_FRESH

        expires_at = listing.verification_expires_at
        days_left: int | None = None
        if expires_at is not None:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            days_left = (expires_at - current).days

        return {
            "state": state,
            "score": score,
            "verified": listing.verified,
            "verified_at": listing.verified_at,
            "last_confirmed_at": listing.last_confirmed_at,
            "expires_at": expires_at,
            "expires_in_days": days_left,
            "confirmation_count": listing.confirmation_count,
            "staleness_reports": listing.staleness_reports,
        }

    @staticmethod
    def mark_verified(listing: Listing, now: datetime | None = None) -> None:
        """
        Stamp a fresh verification window. Call whenever an admin verifies or
        re-verifies a listing so `verified` stops being a permanent claim.
        """
        current = now or _utcnow()
        listing.verified = True
        listing.verified_at = current
        listing.verification_expires_at = current + timedelta(
            days=VERIFICATION_VALID_DAYS
        )
        listing.last_confirmed_at = current

    @staticmethod
    def confirm(
        db: Session,
        listing: Listing,
        user_id: UUID | None = None,
        now: datetime | None = None,
    ) -> dict[str, Any]:
        """
        One tap: "this place is still there / the number still works".

        De-duplicated per user per 24h via the analytics stream — a second tap
        on the same day is acknowledged but does not inflate the counter, so
        the signal cannot be farmed by holding the button.
        """
        current = now or _utcnow()

        if user_id is not None:
            already = (
                db.query(Analytics)
                .filter(
                    Analytics.event_type == EventType.LISTING_CONFIRM,
                    Analytics.listing_id == listing.id,
                    Analytics.user_id == user_id,
                    Analytics.created_at >= current - timedelta(hours=24),
                )
                .first()
            )
            if already:
                return {
                    "counted": False,
                    "confirmation_count": listing.confirmation_count,
                    "last_confirmed_at": listing.last_confirmed_at,
                }

        listing.confirmation_count = (listing.confirmation_count or 0) + 1
        listing.last_confirmed_at = current

        track(
            db,
            event_type=EventType.LISTING_CONFIRM,
            listing_id=listing.id,
            user_id=user_id,
            commit=False,
        )
        db.commit()
        db.refresh(listing)

        logger.info(
            "Listing confirmed",
            listing_id=str(listing.id),
            confirmations=listing.confirmation_count,
        )
        return {
            "counted": True,
            "confirmation_count": listing.confirmation_count,
            "last_confirmed_at": listing.last_confirmed_at,
        }

    @staticmethod
    def report_stale(
        db: Session,
        listing: Listing,
        user_id: UUID | None = None,
        reason: str | None = None,
    ) -> dict[str, Any]:
        """
        One tap: "closed / wrong number / moved".

        Three independent reports move the listing into the moderation queue —
        escalated, never hidden, because wrongly hiding a working shop is the
        more expensive error.
        """
        listing.staleness_reports = (listing.staleness_reports or 0) + 1

        escalated = False
        if listing.staleness_reports >= REPORTS_FOR_REVIEW and not listing.needs_review:
            listing.needs_review = True
            escalated = True

        db.commit()
        db.refresh(listing)

        logger.info(
            "Listing reported stale",
            listing_id=str(listing.id),
            reports=listing.staleness_reports,
            escalated=escalated,
            reason=(reason or "")[:200],
        )
        return {
            "staleness_reports": listing.staleness_reports,
            "needs_review": listing.needs_review,
            "escalated": escalated,
        }

    @staticmethod
    def expire_stale(db: Session, now: datetime | None = None) -> int:
        """
        Background sweep: flag listings whose verification window has lapsed.

        Returns:
            Number of listings moved into moderation for re-verification.
        """
        current = now or _utcnow()
        stale = (
            db.query(Listing)
            .filter(
                Listing.verified.is_(True),
                Listing.verification_expires_at.isnot(None),
                Listing.verification_expires_at <= current,
                Listing.needs_review.is_(False),
            )
            .all()
        )
        for listing in stale:
            listing.needs_review = True

        if stale:
            db.commit()
            logger.info("Verifications expired", count=len(stale))
        return len(stale)

    @staticmethod
    async def request_reverify_code(
        db: Session,
        listing: Listing,
        user_id: UUID | None = None,
    ) -> dict[str, Any]:
        """
        Kick off the owner's one-tap re-verification: SMS a fresh code through
        the existing OTP provider and stash it in Redis for 10 minutes.

        The same BaseOTPProvider stack (mock/Twilio/MSG91) is reused, so a
        municipality that already configured SMS for login gets re-confirmation
        with zero extra setup.

        Returns:
            Dict with `sms_sent`, `phone_hint` and `expires_in_minutes`.
        """
        import secrets

        from app.services.otp_provider import get_otp_provider

        phone = listing.phone
        if not phone:
            return {
                "sms_sent": False,
                "reason": "listing_has_no_phone",
                "expires_in_minutes": 0,
            }

        code = f"{secrets.randbelow(1_000_000):06d}"
        cache_key = f"listing:reverify:{listing.id}:{user_id or 'anon'}"
        ttl = settings.OTP_EXPIRE_MINUTES * 60
        CacheService.set(cache_key, code, ttl_seconds=ttl)

        sent = False
        try:
            sent = await get_otp_provider().send_otp(phone, code)
        except Exception as exc:  # provider misconfiguration, not a 500
            logger.warning("Re-verify SMS failed", error=str(exc))
            sent = False

        logger.info(
            "Re-verification requested",
            listing_id=str(listing.id),
            user_id=str(user_id) if user_id else None,
            sent=sent,
        )
        return {
            "sms_sent": sent,
            "phone_hint": phone[-4:],
            "expires_in_minutes": settings.OTP_EXPIRE_MINUTES,
        }

    @staticmethod
    def confirm_reverify_code(
        db: Session,
        listing: Listing,
        code: str,
        user_id: UUID | None = None,
    ) -> bool:
        """Consume the SMS code and, on match, stamp a fresh verification."""
        cache_key = f"listing:reverify:{listing.id}:{user_id or 'anon'}"
        expected = CacheService.get(cache_key)
        if not expected or str(expected) != str(code).strip():
            return False

        CacheService.delete(cache_key)
        FreshnessService.mark_verified(listing)
        db.commit()
        db.refresh(listing)
        logger.info("Listing re-verified by owner", listing_id=str(listing.id))
        return True

        listing.needs_review = False
