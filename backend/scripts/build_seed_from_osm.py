"""Build a real, honest seed file for the TownPulse directory.

    python scripts/build_seed_from_osm.py seed/_osm_raw.json \
        --name "Your Town" --region "Your Region" --district "Your District" \
        --out seed/osm_seed.json

Why this exists
---------------
The bundled `seed/seed_data.json` contained *invented* businesses — a "Town
Primary Health Centre", a "Dr. Rao Dental Clinic", an "Arogya Diagnostic" —
each with a made-up phone number and email, each flagged `"verified": true`.
Fabricated contact details for health services, presented as verified, is the
single most harmful thing this project could ship.

Every record produced here is a real place recorded in OpenStreetMap, at the
coordinates OSM holds, carrying only the fields OSM actually has. Nothing is
invented; anything OSM does not know is left empty. Every record is written
`verified: false`, `status: "unverified"`, `source: "openstreetmap"`, because
none has been checked by a human yet. `DATA_NEEDED.md` lists what is missing.

The place identity (name/region/district) and the output path are supplied as
arguments — this tool seeds *any* area and never assumes a particular town.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import Counter
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent

# There is deliberately no baked-in town centre or name here. TownPulse is
# location-first: this script is told which place it is seeding via CLI args
# (see `main`), and the geographic centre is computed from the actual records
# rather than assumed. Hardcoding a town silently mislabels every seed it ever
# produces, so nothing is assumed.

# Set in `main()` to the centroid of the imported records; used as the origin
# for per-listing distances. Starts as a neutral placeholder and is overwritten
# before any distance is emitted.
TOWN_CENTER: tuple[float, float] = (0.0, 0.0)

# Slugs are stable and drive the /c/<slug> URLs.
CATEGORIES: dict[str, dict[str, str]] = {
    "healthcare": {"name": "Health & clinics", "description": "Hospitals, clinics, doctors, pharmacies"},
    "food": {"name": "Food & groceries", "description": "Restaurants, shops, bakeries, markets"},
    "shelter": {"name": "Shelter & emergency", "description": "Police, fire, water, night shelter"},
    "auto": {"name": "Mechanics & transport", "description": "Garages, fuel, towing, spares"},
    "civic": {"name": "Civic & government", "description": "Post office, panchayat, bus stand, bank"},
    "community": {"name": "Community & volunteers", "description": "Temples, charities, help groups"},
    "education": {"name": "Education & library", "description": "Schools, colleges, public library"},
    "home-services": {"name": "Home & repair", "description": "Hardware, electricians, plumbers"},
}

TAG_MAP: dict[str, dict[str, str]] = {
    "amenity": {
        "clinic": "healthcare", "hospital": "healthcare", "doctors": "healthcare",
        "pharmacy": "healthcare", "police": "shelter", "fire_station": "shelter",
        "shelter": "shelter", "drinking_water": "shelter", "water_point": "shelter",
        "restaurant": "food", "cafe": "food", "fast_food": "food", "food_court": "food",
        "bank": "civic", "atm": "civic", "townhall": "civic", "post_office": "civic",
        "bureau_de_change": "civic", "courthouse": "civic",
        "place_of_worship": "community", "school": "education", "college": "education",
        "university": "education", "library": "education", "kindergarten": "education",
        "bus_station": "auto", "taxi": "auto", "car_rental": "auto", "fuel": "auto",
    },
    "shop": {
        "supermarket": "food", "convenience": "food", "bakery": "food", "butcher": "food",
        "greengrocer": "food", "general": "food", "grocery": "food", "car_repair": "auto",
        "tyres": "auto", "motorcycle_repair": "auto", "fuel": "auto",
        "hardware": "home-services", "doityourself": "home-services",
        "trade": "home-services", "electrical": "home-services", "paint": "home-services",
    },
    "office": {"government": "civic"},
    "craft": {"plumber": "home-services", "electrician": "home-services"},
    "tourism": {"hotel": "civic", "guest_house": "civic", "hostel": "civic", "information": "civic"},
}


def pick_category(tags: dict[str, str]) -> str | None:
    """Resolve an OSM element to one of our category slugs, or None."""
    for key in ("amenity", "shop", "office", "craft", "tourism"):
        value = tags.get(key)
        if value:
            slug = TAG_MAP.get(key, {}).get(value)
            if slug:
                return slug
    if tags.get("building") == "temple":
        return "community"
    return None


def haversine_m(lat: float, lng: float, origin: tuple[float, float] | None = None) -> int:
    """Distance in metres from `origin` (defaults to the computed centroid)."""
    r = 6371000.0
    lat0, lng0 = origin if origin is not None else TOWN_CENTER
    p1, p2 = math.radians(lat0), math.radians(lat)
    dp = math.radians(lat - lat0)
    dl = math.radians(lng - lng0)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * r * math.asin(math.sqrt(a)))


def build_address(tags: dict[str, str]) -> str:
    """Compose an address only from tags OSM actually carries.

    Never invents a street: an address we do not have is stated as missing
    rather than filled with a plausible guess.
    """
    if tags.get("addr:full"):
        return tags["addr:full"]
    street = ", ".join(
        p for p in (tags.get("addr:housename") or tags.get("addr:housenumber"), tags.get("addr:street")) if p
    )
    city = tags.get("addr:city") or tags.get("addr:suburb")
    if street and city:
        return f"{street}, {city}"
    if street:
        return street
    if city:
        return city
    return "Address not listed"


def first(tags: dict[str, str], *keys: str) -> str:
    for key in keys:
        value = (tags.get(key) or "").strip()
        if value:
            return value
    return ""
def to_listing(element: dict[str, Any]) -> dict[str, Any] | None:
    tags = element.get("tags") or {}
    name = (tags.get("name") or "").strip()
    lat, lng = element.get("lat"), element.get("lon")
    if not name or lat is None or lng is None:
        return None
    slug = pick_category(tags)
    if slug is None:
        return None

    osm_type, osm_id = element.get("type"), element.get("id")
    hours = first(tags, "opening_hours")

    services: list[str] = []
    for key, label in (("wheelchair", "Wheelchair access"), ("internet_access", "Internet"),
                       ("atm", "ATM"), ("parking", "Parking"), ("takeaway", "Takeaway")):
        value = tags.get(key)
        if value and value not in ("no", "false"):
            services.append(f"{label}: {value}")

    return {
        "name": name,
        "name_local": first(tags, "name:kn", "name:hi", "name:ta"),
        "category": slug,
        "address": build_address(tags),
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        # Distance from the seeded area is filled in `main()` once the centroid
        # of the actual records is known; there is no assumed centre to measure
        # against during collection.
        "distance_meters": 0,
        "phone": first(tags, "phone", "contact:phone", "contact:mobile"),
        "email": first(tags, "email", "contact:email"),
        "website": first(tags, "website", "contact:website"),
        "hours": {"all_days": hours} if hours else {},
        "services": services,
        # Honesty defaults: NOT verified, and we record where it came from.
        "verified": False,
        "status": "unverified",
        "source": "openstreetmap",
        "source_url": f"https://www.openstreetmap.org/{osm_type}/{osm_id}",
        "osm_id": f"{osm_type}/{osm_id}",
    }


def main() -> None:
    global TOWN_CENTER

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("raw", help="Path to the raw OSM JSON payload")
    parser.add_argument(
        "--name", default="Your town",
        help="Human name of the place being seeded (no default town is assumed)",
    )
    parser.add_argument("--region", default="", help="State/region name")
    parser.add_argument("--district", default="", help="District name")
    parser.add_argument(
        "--out", default=str(ROOT / "seed" / "osm_seed.json"),
        help="Where to write the seed JSON",
    )
    args = parser.parse_args()

    payload = json.loads(Path(args.raw).read_text(encoding="utf-8"))
    elements = payload.get("elements", []) if isinstance(payload, dict) else payload

    listings: list[dict[str, Any]] = []
    seen: set[tuple[str, int]] = set()
    skipped = 0

    for element in elements:
        key = (element.get("type", "node"), element.get("id", 0))
        if key in seen:
            continue
        if pick_category(element.get("tags") or {}) is None:
            skipped += 1
            continue
        seen.add(key)
        listing = to_listing(element)
        if listing:
            listings.append(listing)

    # The area centre is the centroid of the records themselves, never an
    # assumed coordinate. Distances and the town.lat/lng below are measured
    # from it, so the seed describes exactly the area it was fetched for.
    if listings:
        TOWN_CENTER = (
            round(sum(l["lat"] for l in listings) / len(listings), 6),
            round(sum(l["lng"] for l in listings) / len(listings), 6),
        )
        for l in listings:
            l["distance_meters"] = haversine_m(l["lat"], l["lng"], TOWN_CENTER)

    listings.sort(key=lambda item: item["distance_meters"])

    output = {
        "town": {
            "name": args.name, "region": args.region, "district": args.district,
            "lat": TOWN_CENTER[0], "lng": TOWN_CENTER[1],
            "languages": ["en"],
        },
        "attribution": (
            "Contains information from OpenStreetMap, available under the Open "
            "Database License (ODbL). (c) OpenStreetMap contributors."
        ),
        "categories": [{"slug": s, **m} for s, m in CATEGORIES.items()],
        "listings": listings,
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    total = len(listings) or 1
    print(f"Wrote {out_path}")
    print(f"  listings: {len(listings)}   skipped (no category): {skipped}")
    print("  Coverage gaps (need a human - see DATA_NEEDED.md):")
    print(f"    phone    {sum(1 for i in listings if i['phone']):4}/{total}")
    print(f"    hours    {sum(1 for i in listings if i['hours']):4}/{total}")
    print(f"    address  {sum(1 for i in listings if i['address'] != 'Address not listed'):4}/{total}")
    print("  By category:")
    for slug, count in Counter(i["category"] for i in listings).most_common():
        print(f"    {slug:14} {count}")


if __name__ == "__main__":
    main()