"""
TownPulse OpenStreetMap Importer
================================
Imports *real* services from the OpenStreetMap open-data project (ODbL) so the
map is populated with places that actually exist right now, instead of only
fictional seed records.

Why this exists
---------------
The bundled `seed_data.json` is hand-written sample data. It is fine for demos
but it does not answer the question a resident actually asks: "is there a
pharmacy near me *today*?". OpenStreetMap is community-maintained and carries
the fields a directory needs (name, category tags, address, phone, website,
opening hours, exact coordinates), so it is the right source for a first real
dataset.

Usage
-----
    python scripts/import_osm.py
    python scripts/import_osm.py --lat 12.9716 --lng 77.5946 --radius 3000
    python scripts/import_osm.py --radius 5000 --limit 400 --dry-run

The import is idempotent: re-running refreshes records that already exist
instead of creating duplicates, keyed on name + coordinates.

Attribution
-----------
OpenStreetMap data is (c) OpenStreetMap contributors, licensed under the Open
Database License (ODbL). Every imported record carries the source in its
description, because ODbL share-alike requires attribution to travel with the
data.
"""

from __future__ import annotations

import argparse
import math
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

# Add backend directory to Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Windows consoles default to a legacy code page (cp1252), and OSM names are
# full of scripts that will not fit in it — Kannada, Tamil, Devanagari, accented
# Latin. A plain print() then raises UnicodeEncodeError and kills the import
# half-way through. Force UTF-8 with replacement so bad bytes degrade instead of
# aborting.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

import httpx
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.logging import get_logger
from app.models.category import Category
from app.models.listing import Listing
from app.services.hours_service import normalize_hours

logger = get_logger(__name__)

# ─── Configuration ─────────────────────────────────────────────────────────────

# Overpass endpoints. The public instance rate-limits aggressively, so a few
# mirrors are tried in order before giving up.
OVERPASS_ENDPOINTS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
)
# The nine categories the app ships with. Importing reuses them by name so the
# existing chips, filters and seeded listings stay valid.
DEFAULT_CATEGORIES: dict[str, dict[str, str]] = {
    "Healthcare & Clinics": {
        "icon": "\U0001f3e5",
        "description": "Hospitals, clinics, doctors and pharmacies",
    },
    "Food & Groceries": {
        "icon": "\U0001f6d2",
        "description": "Supermarkets, shops, grocers and markets",
    },
    "Auto & Mechanics": {
        "icon": "\U0001f527",
        "description": "Garages, fuel stations, spares and repairs",
    },
    "Community & Volunteers": {
        "icon": "\U0001f91d",
        "description": "Community centres, temples and charities",
    },
    "Shelters & Emergency": {
        "icon": "\U0001f6a8",
        "description": "Shelters, police, fire and emergency services",
    },
    "Education & Libraries": {
        "icon": "\U0001f4da",
        "description": "Schools, colleges and public libraries",
    },
    "Home Services & Plumbers": {
        "icon": "\U0001f9f0",
        "description": "Hardware, plumbing, repair and home services",
    },
    "Cafes & Dining": {
        "icon": "\U00002615",
        "description": "Restaurants, cafes, bars and takeaways",
    },
    "Public Services & Civic": {
        "icon": "\U0001f3db",
        "description": "Post offices, banks, civic and government offices",
    },
}

# OSM tag values -> TownPulse category.
#
# Order matters: the first category that claims a value wins, which is how
# eateries end up in "Cafes & Dining" rather than the broader
# "Food & Groceries" bucket.
_CATEGORY_VALUES: tuple[tuple[str, frozenset[str]], ...] = (
    (
        "Cafes & Dining",
        frozenset(
            {
                "cafe",
                "restaurant",
                "fast_food",
                "bar",
                "pub",
                "biergarten",
                "ice_cream",
                "food_court",
                "nightclub",
            }
        ),
    ),
    (
        "Healthcare & Clinics",
        frozenset(
            {
                "pharmacy",
                "clinic",
                "doctors",
                "hospital",
                "dentist",
                "veterinary",
                "laboratory",
                "physiotherapist",
                "midwife",
                "blood_bank",
            }
        ),
    ),
    (
        "Shelters & Emergency",
        frozenset(
            {
                "police",
                "fire_station",
                "shelter",
                "emergency",
                "lifeguard",
            }
        ),
    ),
    (
        "Education & Libraries",
        frozenset(
            {
                "school",
                "kindergarten",
                "university",
                "college",
                "library",
                "books",
                "stationery",
            }
        ),
    ),
    (
        "Auto & Mechanics",
        frozenset(
            {
                "car",
                "car_repair",
                "car_parts",
                "motorcycle",
                "bicycle",
                "tyre",
                "fuel",
                "car_wash",
                "charging_station",
            }
        ),
    ),
    (
        "Home Services & Plumbers",
        frozenset(
            {
                "hardware",
                "doityourself",
                "plumbing",
                "paint",
                "flooring",
                "furniture",
                "electricity",
                "locksmith",
                "garden_centre",
                "tools",
                "plumber",
                "electrician",
                "carpenter",
                "shoemaker",
                "tailor",
            }
        ),
    ),
    (
        "Community & Volunteers",
        frozenset(
            {
                "community_centre",
                "social_facility",
                "place_of_worship",
                "charity",
                "charity_shop",
                "second_hand",
                "fitness_centre",
                "sports_centre",
                "playground",
                "sports_hall",
            }
        ),
    ),
    (
        "Public Services & Civic",
        frozenset(
            {
                "townhall",
                "courthouse",
                "post_office",
                "bank",
                "atm",
                "tax_office",
                "registry_office",
                "embassy",
                "prison",
                "government",
                "company",
                "notary",
                "insurance",
                "marketplace",
                "bus_station",
                "taxi",
            }
        ),
    ),
    (
        "Food & Groceries",
        frozenset(
            {
                "supermarket",
                "convenience",
                "grocery",
                "bakery",
                "greengrocer",
                "butchers",
                "fishmonger",
                "general",
                "department_store",
                "wholesale",
                "store",
                "alcohol",
                "confectionery",
                "spices",
                "tea",
                "coffee",
            }
        ),
    ),
)

# Tag keys consulted, in priority order.
TAG_KEYS = ("amenity", "shop", "craft", "office", "healthcare", "leisure")


def _build_value_map() -> dict[str, str]:
    """Flatten the ordered category buckets into value -> category."""
    value_map: dict[str, str] = {}
    for category, values in _CATEGORY_VALUES:
        for value in values:
            value_map.setdefault(value, category)
    return value_map


VALUE_TO_CATEGORY = _build_value_map()


def resolve_category(tags: dict[str, str]) -> str | None:
    """Map OSM tags onto one of the app's categories, or None if unrecognised."""
    for key in TAG_KEYS:
        value = tags.get(key)
        if value and value in VALUE_TO_CATEGORY:
            return VALUE_TO_CATEGORY[value]
    return None


# Overpass requires a descriptive User-Agent; anonymous requests get HTTP 406.
# ─── Overpass ──────────────────────────────────────────────────────────────────


def build_query(lat: float, lng: float, radius_m: float) -> str:
    """Build an Overpass QL query for named places within a radius.

    Metres -> degrees is approximated per axis and squared off into a bounding
    box, which is what Overpass accepts.
    """
    dlat = radius_m / 111_320.0
    dlng = radius_m / (111_320.0 * max(0.01, abs(math.cos(math.radians(lat)))))
    bbox = f"{lat - dlat:.6f},{lng - dlng:.6f},{lat + dlat:.6f},{lng + dlng:.6f}"
    selections = "".join(f'  nw["name"]["{key}"]({bbox});\n' for key in TAG_KEYS)
    # "nw" (nodes + ways) rather than "nwr": relations add a great deal of
    # server-side work for a directory that only needs a name and a point.
    # "out center" returns one representative point per way instead of every
    # node of its geometry, which is a fraction of the response size.
    return f"[out:json][timeout:{OVERPASS_TIMEOUT}];\n(\n{selections});\nout center;\n"


def fetch_overpass(query: str) -> list[dict[str, Any]]:
    """Run the Overpass query, trying mirrors until one answers."""
    last_error: Exception | None = None
    for endpoint in OVERPASS_ENDPOINTS:
        for attempt in range(3):
            try:
                with httpx.Client(timeout=240.0) as client:
                    response = client.post(
                        endpoint,
                        data={"data": query},
                        headers={"User-Agent": USER_AGENT},
                    )
                if response.status_code == 429:
                    wait = 10 * (attempt + 1)
                    logger.warning(
                        "overpass rate limited",
                        endpoint=endpoint,
                        retry_in_seconds=wait,
                    )
                    time.sleep(wait)
                    continue
                response.raise_for_status()
                elements = response.json().get("elements", [])
                logger.info(
                    "overpass responded", endpoint=endpoint, elements=len(elements)
                )
                return elements
            except Exception as exc:  # noqa: BLE001 - try the next mirror
                last_error = exc
                logger.warning(
                    "overpass request failed", endpoint=endpoint, error=str(exc)
                )
                time.sleep(3)
    raise RuntimeError(f"All Overpass endpoints failed: {last_error}")


USER_AGENT = (
    "TownPulse/0.2 (local services directory; "
    "https://github.com/R0HITHRAO/Townpulse)"
)

OSM_ATTRIBUTION = "Data (c) OpenStreetMap contributors (ODbL)"

# Overpass query budget. Kept well under the usual 180s gateway limit so a slow
# query fails fast and falls through to a mirror instead of returning HTTP 504.
OVERPASS_TIMEOUT = 90
# ─── Conversion ────────────────────────────────────────────────────────────────

_WEEKDAY_NAMES = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)
# "mo".."su" -> index, used to expand ranges like "Mo-Fr".
_DAY_INDEX = {name[:2]: i for i, name in enumerate(_WEEKDAY_NAMES)}
_RANGE_RE = re.compile(r"(\d{1,2}:?\d{0,2})\s*-\s*(\d{1,2}:?\d{0,2})")


def _parse_day_spec(spec: str) -> set[str]:
    """Expand an OSM day selector into concrete day names.

    Handles "Mo", "Mo,We,Fr" and ranges like "Mo-Fr" / "Sa-Su". Getting this
    right matters: a "Mo-Fr 09:00-18:00" shop that only registers Monday and
    Friday would be reported closed on Tuesday, which is exactly the kind of
    confidently-wrong answer a local directory must not give.
    """
    days: set[str] = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start_key, _, end_key = part.partition("-")
            start = _DAY_INDEX.get(start_key.strip()[:2])
            end = _DAY_INDEX.get(end_key.strip()[:2])
            if start is None or end is None:
                continue
            low, high = sorted((start, end))
            days.update(_WEEKDAY_NAMES[low : high + 1])
        else:
            index = _DAY_INDEX.get(part[:2])
            if index is not None:
                days.add(_WEEKDAY_NAMES[index])
    return days


def _normalise_clock(value: str) -> str | None:
    """Turn '9', '09', '930', '09:30' into 'HH:MM'."""
    text = value.strip()
    if ":" in text:
        hours, _, minutes = text.partition(":")
        if not (hours.strip().isdigit() and minutes.strip().isdigit()):
            return None
        hours_i, minutes_i = int(hours), int(minutes)
        if hours_i > 23 or minutes_i > 59:
            return None
        return f"{hours_i:02d}:{minutes_i:02d}"
    if not text.isdigit():
        return None
    if len(text) <= 2:
        hours_i = int(text)
        return f"{hours_i:02d}:00" if hours_i <= 23 else None
    if len(text) == 3:
        hours_i, minutes_i = int(text[0]), int(text[1:])
    elif len(text) == 4:
        hours_i, minutes_i = int(text[:2]), int(text[2:])
    else:
        return None
    if hours_i > 23 or minutes_i > 59:
        return None
    return f"{hours_i:02d}:{minutes_i:02d}"


def parse_opening_hours(raw: str | None) -> dict[str, str] | None:
    """Best-effort conversion of an OSM `opening_hours` value.

    The real opening_hours grammar is large. This handles the forms that cover
    the overwhelming majority of shops and clinics and returns None for the
    rest, because a wrong guess is worse than "unknown" — a mis-parsed range
    makes the app claim a business is shut when it is open.

    Known limitation: the app stores a single range per day, so a split day
    ("Mo-Fr 09:00-13:00,14:00-18:00") is widened to the outer span. That
    over-reports openness slightly, which is the safer direction of error.
    """
    if not raw:
        return None
    text = raw.strip().lower()

    if text in {"24/7", "24 hours", "open 24/7"}:
        return {day: "00:00-23:59" for day in _WEEKDAY_NAMES}

    spans: dict[str, tuple[int, int]] = {}
    for segment in text.split(";"):
        segment = segment.strip()
        if not segment or segment in {"off", "closed", "closed off"}:
            continue
        matches = list(_RANGE_RE.finditer(segment))
        if not matches:
            continue

        # Resolve the day set once, from the text before the first range.
        # "Mo,We,Fr 10:00-14:00" -> {monday, wednesday, friday}.
        days = _parse_day_spec(segment[: matches[0].start()])
        if not days:
            # A bare "09:00-18:00" with no day selector applies every day.
            days = set(_WEEKDAY_NAMES)

        # A segment may hold several ranges ("Mo 08:00-12:00,14:00-19:00").
        # Merge them into the outer span, as documented above.
        for match in matches:
            open_at = _normalise_clock(match.group(1))
            close_at = _normalise_clock(match.group(2))
            if not (open_at and close_at):
                continue
            open_minutes = int(open_at[:2]) * 60 + int(open_at[3:])
            close_minutes = int(close_at[:2]) * 60 + int(close_at[3:])
            for day in days:
                previous = spans.get(day)
                if previous is None:
                    spans[day] = (open_minutes, close_minutes)
                else:
                    spans[day] = (
                        min(previous[0], open_minutes),
                        max(previous[1], close_minutes),
                    )

    return {
        day: f"{open_at // 60:02d}:{open_at % 60:02d}-{close_at // 60:02d}:{close_at % 60:02d}"
        for day, (open_at, close_at) in spans.items()
    } or None


def build_address(tags: dict[str, str], lat: float, lng: float) -> str:
    """Compose a human-readable address, falling back to coordinates."""
    street = " ".join(
        part
        for part in (tags.get("addr:housenumber", ""), tags.get("addr:street", ""))
        if part
    ).strip()
    locality = (
        tags.get("addr:suburb")
        or tags.get("addr:city")
        or tags.get("addr:district")
        or ""
    )
    if street and locality:
        return f"{street}, {locality}"
    if street:
        return street
    if locality:
        return locality
    return f"Near {lat:.5f}, {lng:.5f}"


def element_to_listing_data(element: dict[str, Any]) -> dict[str, Any] | None:
    """Convert one Overpass element into the field values a Listing needs."""
    tags: dict[str, str] = element.get("tags") or {}
    name = (tags.get("name") or "").strip()
    if not name:
        return None

    lat = element.get("lat") or (element.get("center") or {}).get("lat")
    lng = element.get("lon") or (element.get("center") or {}).get("lon")
    if lat is None or lng is None:
        return None

    category_name = resolve_category(tags)
    if not category_name:
        return None

    primary_key = next((key for key in TAG_KEYS if tags.get(key)), None)
    description_parts = []
    if primary_key:
        description_parts.append(tags[primary_key].replace("_", " ").title())
    if tags.get("cuisine"):
        description_parts.append(f"{tags['cuisine'].title()} cuisine")
    if tags.get("addr:city") or tags.get("addr:suburb"):
        description_parts.append(tags.get("addr:city") or tags.get("addr:suburb") or "")
    description_parts.append(OSM_ATTRIBUTION)

    phone = tags.get("phone") or tags.get("contact:phone")
    website = tags.get("website") or tags.get("contact:website")
    email = tags.get("email") or tags.get("contact:email")

    return {
        "name": name[:255],
        "description": " · ".join(p for p in description_parts if p)[:2000],
        "address": build_address(tags, lat, lng)[:2000],
        "category_name": category_name,
        "lat": lat,
        "lng": lng,
        "phone": phone[:20] if phone else None,
        "email": email[:255] if email else None,
        "website": website[:500] if website else None,
        "hours": parse_opening_hours(tags.get("opening_hours")),
        # OSM is crowd-maintained, so these records are NOT marked verified:
        # "verified" in TownPulse means the municipality vouched for them.
        "verified": False,
        "status": "approved",
    }


# ─── Import ────────────────────────────────────────────────────────────────────


def ensure_categories(db: Session) -> dict[str, Category]:
    """Create any missing default categories and return them keyed by name."""
    result: dict[str, Category] = {}
    for name, meta in DEFAULT_CATEGORIES.items():
        category = db.query(Category).filter(Category.name == name).first()
        if category is None:
            category = Category(
                name=name, icon=meta["icon"], description=meta["description"]
            )
            db.add(category)
            print(f"  + category: {name}")
        result[name] = category
    db.commit()
    for category in result.values():
        db.refresh(category)
    return result


def run_import(
    lat: float,
    lng: float,
    radius_m: float,
    limit: int,
    dry_run: bool,
) -> int:
    """Import OSM elements for a location. Returns the number of records written."""
    query = build_query(lat, lng, radius_m)
    print(f"Querying OpenStreetMap around {lat:.5f}, {lng:.5f} (r={radius_m:.0f}m) ...")
    elements = fetch_overpass(query)
    print(f"Received {len(elements)} elements from Overpass.")

    db: Session = SessionLocal()
    try:
        categories = ensure_categories(db)

        created = updated = skipped = 0
        for element in elements:
            if limit and created + updated >= limit:
                break
            data = element_to_listing_data(element)
            if data is None:
                skipped += 1
                continue

            category = categories.get(data.pop("category_name"))
            hours = data["hours"]
            data["normalized_hours"] = normalize_hours(hours)

            listing = (
                db.query(Listing)
                .filter(Listing.name == data["name"], Listing.lat == data["lat"])
                .first()
            )
            if listing is None:
                listing = Listing(**data)
                created += 1
            else:
                for key, value in data.items():
                    setattr(listing, key, value)
                updated += 1

            if category is not None:
                listing.category_id = category.id
            listing.location = f"SRID=4326;POINT({data['lng']} {data['lat']})"
            db.add(listing)

        if dry_run:
            db.rollback()
            print(f"[dry-run] would create {created}, update {updated}, skip {skipped}")
        else:
            db.commit()
            print(f"Imported {created} new, updated {updated} (skipped {skipped}).")
        return created + updated
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import TownPulse listings from OpenStreetMap."
    )
    parser.add_argument(
        "--lat", type=float, default=float(os.getenv("OSM_LAT", 15.335))
    )
    parser.add_argument(
        "--lng", type=float, default=float(os.getenv("OSM_LNG", 76.46))
    )
    parser.add_argument(
        "--radius",
        type=float,
        default=float(os.getenv("OSM_RADIUS", 3000)),
        help="Search radius in metres",
    )
    parser.add_argument("--limit", type=int, default=0, help="Max records (0 = all)")
    parser.add_argument(
        "--dry-run", action="store_true", help="Fetch and report without writing"
    )
    args = parser.parse_args()

    run_import(
        lat=args.lat,
        lng=args.lng,
        radius_m=args.radius,
        limit=args.limit,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
