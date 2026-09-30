"""
TownPulse Hours Service
=======================
Parses the free-text operating hours people actually write into listings
("9am-5pm", "10:00 - 18:00", "closed") into a machine-checkable structure.

Why this exists: the app previously computed "Open now" in the browser from the
raw strings, which meant (a) the map could not filter by open-now, (b) each
client re-implemented the parsing, and (c) any malformed string silently broke
the badge. Normalising once on write means the API can answer "is it open?"
with an indexed SQL predicate instead of loading every row into JavaScript.

Stored shape (`listings.normalized_hours` JSONB)::

    {"monday": {"open": 540, "close": 1020, "closed": false}, ...}
    {"sunday": {"closed": true}}

Minutes are counted from local midnight; a range crossing midnight
("8pm-6am") stores `close` as > 1440 so a single comparison stays correct.
"""

import re
from datetime import datetime, timedelta, timezone
from typing import Any

DAY_NAMES = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)

# Accepts "9", "09", "9:30", "09:30" with an optional am/pm suffix.
_CLOCK_RE = re.compile(r"^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$", re.IGNORECASE)

# Free-form separators seen in the wild: "-", "–", "—", "to", "/".
_RANGE_SPLIT_RE = re.compile(r"\s*(?:-|–|—|to|/)\s*", re.IGNORECASE)

_CLOSED_TOKENS = frozenset(
    {"closed", "close", "shut", "holiday", "off", "none", "n/a", "na", ""}
)


def _parse_clock(token: str) -> int | None:
    """
    Parse one clock token into minutes past midnight.

    Returns:
        Minutes (0..1439), or None when the token is not a valid time.
    """
    match = _CLOCK_RE.match(token)
    if not match:
        return None

    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    suffix = (match.group(3) or "").lower()

    if suffix:
        if hour > 12 or minute > 59:
            return None
        if hour == 12 and suffix == "am":
            hour = 0
        elif hour != 12 and suffix == "pm":
            hour += 12
    else:
        # 24h clock ("14:30"); bare "14" without a suffix is ambiguous, so it
        # is only accepted in the 0-23 range to keep typos visible.
        if hour > 23 or minute > 59:
            return None

    return hour * 60 + minute


def parse_range(raw: str) -> dict[str, Any] | None:
    """
    Parse a single day's hours string into open/close minutes.

    Args:
        raw: e.g. "9am-5pm", "10:00 to 18:00", "Closed".

    Returns:
        {"open": int, "close": int, "closed": False},
        {"closed": True} for explicit closures, or None if unparseable
        (caller should treat None as "unknown", never as "closed").
    """
    if raw is None:
        return None

    text = str(raw).strip()
    if text.lower() in _CLOSED_TOKENS:
        return {"closed": True}

    parts = _RANGE_SPLIT_RE.split(text, maxsplit=1)
    if len(parts) != 2:
        return None

    open_minutes = _parse_clock(parts[0])
    close_minutes = _parse_clock(parts[1])
    if open_minutes is None or close_minutes is None:
        return None

    # "8pm-6am" — push close past midnight so open <= now < close holds.
    if close_minutes <= open_minutes:
        close_minutes += 24 * 60

    return {"open": open_minutes, "close": close_minutes, "closed": False}


def normalize_hours(hours: dict[str, Any] | None) -> dict[str, Any] | None:
    """
    Convert a listing's free-text `hours` mapping into the stored projection.

    Idempotent: passing an already-normalised mapping returns it unchanged, so
    writes and backfills can share this one function.

    Args:
        hours: e.g. {"monday": "9am-5pm", "sunday": "closed"}.

    Returns:
        {"monday": {"open": 540, "close": 1020, "closed": False}, ...},
        or None when nothing could be parsed.
    """
    if not hours or not isinstance(hours, dict):
        return None

    normalized: dict[str, Any] = {}
    for day in DAY_NAMES:
        raw = hours.get(day)
        if raw is None:
            continue
        if isinstance(raw, dict) and ("closed" in raw or "open" in raw):
            # Already normalised (or supplied in structured form).
            normalized[day] = raw
            continue
        parsed = parse_range(str(raw))
        if parsed is not None:
            normalized[day] = parsed

    return normalized or None


def local_window(
    at: datetime | None = None,
    offset_minutes: int = 330,
) -> tuple[str, int, str]:
    """
    Resolve the local day for "now".

    Returns:
        (today_day_name, minutes_past_local_midnight, yesterday_day_name)
    """
    instant = at or datetime.now(timezone.utc)
    if instant.tzinfo is None:
        instant = instant.replace(tzinfo=timezone.utc)
    local = instant.astimezone(timezone(timedelta(minutes=offset_minutes)))
    today = local.strftime("%A").lower()
    previous = (local - timedelta(days=1)).strftime("%A").lower()
    return today, local.hour * 60 + local.minute, previous


def is_open_now(
    normalized: dict[str, Any] | None,
    at: datetime | None = None,
    offset_minutes: int = 330,
) -> bool | None:
    """
    Decide open/closed from the stored projection.

    Returns:
        True/False when hours are known, None when they are not — callers must
        render "unknown", never guess "closed" from missing data.
    """
    if not normalized:
        return None

    today, minutes, previous = local_window(at=at, offset_minutes=offset_minutes)

    entry = normalized.get(today)
    if isinstance(entry, dict) and not entry.get("closed"):
        open_at = entry.get("open")
        close_at = entry.get("close")
        if isinstance(open_at, int) and isinstance(close_at, int):
            if open_at <= minutes < close_at:
                return True

    # Overnight shift crossing midnight from yesterday ("8pm-6am").
    prev_entry = normalized.get(previous)
    if isinstance(prev_entry, dict) and not prev_entry.get("closed"):
        open_at = prev_entry.get("open")
        close_at = prev_entry.get("close")
        if isinstance(open_at, int) and isinstance(close_at, int) and close_at > 1440:
            if open_at <= minutes + 1440 < close_at:
                return True

    return False


# SQL predicate for the server-side "open now" filter. Bound names are
# :tp_today / :tp_mins / :tp_prev (see open_now_window()). Safe against
# missing keys: a NULL cast stays NULL, and every NULL comparison is false.
OPEN_NOW_SQL = """
    (
        (normalized_hours -> :tp_today ->> 'open') IS NOT NULL
        AND COALESCE((normalized_hours -> :tp_today ->> 'closed')::boolean, FALSE) = FALSE
        AND (normalized_hours -> :tp_today ->> 'open')::int <= :tp_mins
        AND (normalized_hours -> :tp_today ->> 'close')::int > :tp_mins
    )
    OR
    (
        (normalized_hours -> :tp_prev ->> 'close')::int > 1440
        AND (normalized_hours -> :tp_prev ->> 'open')::int <= :tp_mins + 1440
        AND (normalized_hours -> :tp_prev ->> 'close')::int > :tp_mins + 1440
    )
"""


def open_now_window(
    at: datetime | None = None,
    offset_minutes: int = 330,
) -> dict[str, Any]:
    """Bind values for OPEN_NOW_SQL at the current instant."""
    today, minutes, previous = local_window(at=at, offset_minutes=offset_minutes)
    return {"tp_today": today, "tp_mins": minutes, "tp_prev": previous}
