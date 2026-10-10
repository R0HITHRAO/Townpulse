"""
TownPulse Database Seeder
===========================
Seeds the database with:
- Default Admin User (admin@townpulse.dev / Admin123!)
- Sample Business Owner (owner@townpulse.dev / Owner123!)
- 9 Service Categories
- 50 Realistic Listings with PostGIS geography coordinates
- Sample Claims and Submissions for demonstration

Usage:
    python scripts/seed.py
    # or with make:
    make seed
"""

import json
import os
import sys
from pathlib import Path

# Add backend directory to Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.models.category import Category
from app.models.claim import Claim, ClaimStatus
from app.models.listing import Listing
from app.models.user import User, UserRole


def seed_database() -> None:
    """Execute the database seeding process."""
    print("=" * 60)
    print("TownPulse Database Seeding Script")
    print("=" * 60)

    db: Session = SessionLocal()

    try:
        # ─── 1. Seed Admin User ───────────────────────────────────────────────
        admin_email = os.getenv("ADMIN_EMAIL", "admin@townpulse.dev")
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                name="TownPulse Administrator",
                email=admin_email,
                phone="+919900000001",
                password_hash=hash_password(os.getenv("ADMIN_PASSWORD", "Admin123!")),
                role=UserRole.admin,
                is_active=True,
                email_verified=True,
                phone_verified=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"✅ Created Admin User: {admin.email} (Password: Admin123!)")
        else:
            print(f"ℹ️  Admin user already exists: {admin.email}")

        # ─── 2. Seed Sample Business Owner ────────────────────────────────────
        owner_email = "owner@townpulse.dev"
        owner = db.query(User).filter(User.email == owner_email).first()
        if not owner:
            owner = User(
                name="Ramesh Kumar (Business Owner)",
                email=owner_email,
                phone="+919845012345",
                password_hash=hash_password("Owner123!"),
                role=UserRole.business_owner,
                is_active=True,
                email_verified=True,
                phone_verified=True,
            )
            db.add(owner)
            db.commit()
            db.refresh(owner)
            print(f"✅ Created Business Owner: {owner.email} (Password: Owner123!)")
        else:
            print(f"ℹ️  Business owner already exists: {owner.email}")

        # ─── 3. Load the seed file ─────────────────────────────────────────────
        # Prefer the real OpenStreetMap extract. `seed_data.json` contained
        # invented clinics and diagnostics with made-up phone numbers, all
        # flagged verified=true, so it must never be the default.
        seed_dir = Path(__file__).resolve().parent.parent / "seed"
        osm_seed = seed_dir / "osm_seed.json"
        named_seed = seed_dir / "hampi_osm.json"
        legacy_seed = seed_dir / "seed_data.json"

        if osm_seed.exists():
            seed_path = osm_seed
            print(f"ℹ️  Using real OpenStreetMap data: {osm_seed.name}")
        elif named_seed.exists():
            seed_path = named_seed
            print(f"ℹ️  Using real OpenStreetMap data: {named_seed.name}")
        elif legacy_seed.exists():
            seed_path = legacy_seed
            print(
                "⚠️  WARNING: falling back to seed_data.json, which contains "
                "INVENTED businesses with fake phone numbers.\n"
                "    Generate real data for any place first:\n"
                "      python scripts/import_osm.py --lat <LAT> --lng <LNG>\n"
                "      python scripts/build_seed_from_osm.py seed/_osm_raw.json --name \"Your town\""
            )
        else:
            raise FileNotFoundError(
                f"No seed file found. Expected {osm_seed} or {legacy_seed}."
            )

        with open(seed_path, encoding="utf-8") as f:
            data = json.load(f)

        # The OSM extract keys categories by slug, the legacy file by name.
        # Normalise to a lookup map that accepts either.
        category_map: dict[str, Category] = {}
        for cat_data in data["categories"]:
            name = cat_data["name"]
            cat = db.query(Category).filter(Category.name == name).first()
            if not cat:
                cat = Category(
                    name=name,
                    icon=cat_data.get("icon"),
                    description=cat_data.get("description"),
                )
                db.add(cat)
                db.commit()
                db.refresh(cat)
                print(f"✅ Category added: {cat.name}")
            category_map[name] = cat
            if cat_data.get("slug"):
                category_map[cat_data["slug"]] = cat

        # ─── 4. Seed Listings ─────────────────────────────────────────────────
        created_listings_count = 0
        first_listing: Listing | None = None

        for item in data["listings"]:
            existing = db.query(Listing).filter(Listing.name == item["name"]).first()
            if not existing:
                # `category` may be a slug or a display name depending on file.
                cat = category_map.get(item.get("category", ""))
                lat = item.get("lat")
                lng = item.get("lng")
                # Real data is never pre-verified: "verified" means a human
                # checked it, and nobody has checked these.
                verified = bool(item.get("verified", False))

                listing = Listing(
                    name=item["name"],
                    description=item.get("description"),
                    address=item.get("address") or "Address not listed",
                    category_id=cat.id if cat else None,
                    lat=lat,
                    lng=lng,
                    phone=item.get("phone") or None,
                    email=item.get("email") or None,
                    website=item.get("website") or None,
                    hours=item.get("hours") or None,
                    verified=verified,
                    # Visibility and trust are separate questions. These are
                    # real, mapped places, so they belong in the public
                    # directory (approved). They are NOT verified, because
                    # nobody has called or visited them — that is what the
                    # "Not yet verified" badge in the UI is for.
                    #
                    # Seeding them as "pending" would also dump all 170 into the
                    # admin moderation queue on first boot.
                    status="approved",
                    town=item.get("town"),
                )

                if lat is not None and lng is not None:
                    # PostGIS WGS84 point
                    listing.location = f"SRID=4326;POINT({lng} {lat})"

                db.add(listing)
                created_listings_count += 1
                if not first_listing:
                    first_listing = listing

        db.commit()
        print(f"✅ Seeded {created_listings_count} new listings.")

        # ─── 5. Seed Sample Claim ─────────────────────────────────────────────
        if first_listing:
            sample_claim = (
                db.query(Claim)
                .filter(Claim.listing_id == first_listing.id)
                .first()
            )
            if not sample_claim:
                sample_claim = Claim(
                    listing_id=first_listing.id,
                    user_id=owner.id,
                    status=ClaimStatus.pending,
                    proof_url="https://townpulse.dev/proofs/trade_license_sample.pdf",
                    message="I am the certified administrator and operator of this facility.",
                )
                db.add(sample_claim)
                db.commit()
                print("✅ Seeded sample pending claim for admin dashboard demonstration.")

        print("=" * 60)
        print("🎉 Database seeding complete successfully!")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"❌ Seeding error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
