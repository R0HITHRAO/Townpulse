"""
TownPulse Database Cleaner & Fresh Seeder
=========================================
Cleans out dummy test listings and ensures all listings have accurate categories,
operating hours, and realistic spread coordinates across town.
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.category import Category
from app.models.listing import Listing
from app.models.review import Review
from app.models.claim import Claim
from app.models.alert import EmergencyAlert

def clean_and_reseed():
    db: Session = SessionLocal()
    try:
        print("Cleaning up test and duplicate listings...")
        # Remove dummy test listings with 'Test' or hex suffixes
        dummy_listings = db.query(Listing).filter(
            (Listing.name.like("%Test%")) | 
            (Listing.name.like("%test%")) |
            (Listing.name.like("%Reviewable%")) |
            (Listing.name.like("%Duplicate%"))
        ).all()
        for d in dummy_listings:
            db.query(Review).filter(Review.listing_id == d.id).delete()
            db.query(Claim).filter(Claim.listing_id == d.id).delete()
            db.delete(d)
        db.commit()
        print(f"Removed {len(dummy_listings)} dummy test listings.")

        # Ensure correct categories exist
        seed_path = Path(__file__).resolve().parent.parent / "seed" / "seed_data.json"
        with open(seed_path, encoding="utf-8") as f:
            data = json.load(f)

        category_map = {}
        for cat_data in data["categories"]:
            cat = db.query(Category).filter(Category.name == cat_data["name"]).first()
            if not cat:
                cat = Category(
                    name=cat_data["name"],
                    icon=cat_data.get("icon"),
                    description=cat_data.get("description"),
                )
                db.add(cat)
                db.commit()
                db.refresh(cat)
            else:
                cat.icon = cat_data.get("icon")
                db.commit()
            category_map[cat.name] = cat

        # Update and fix any existing listings
        for item in data["listings"]:
            cat = category_map.get(item["category"])
            existing = db.query(Listing).filter(Listing.name == item["name"]).first()
            if existing:
                existing.category_id = cat.id if cat else existing.category_id
                existing.address = item["address"]
                existing.description = item.get("description")
                existing.phone = item.get("phone")
                existing.hours = item.get("hours")
                existing.lat = item.get("lat")
                existing.lng = item.get("lng")
                if existing.lat and existing.lng:
                    existing.location = f"SRID=4326;POINT({existing.lng} {existing.lat})"
                existing.verified = item.get("verified", True)
                existing.status = "approved"
            else:
                new_listing = Listing(
                    name=item["name"],
                    description=item.get("description"),
                    address=item["address"],
                    category_id=cat.id if cat else None,
                    lat=item.get("lat"),
                    lng=item.get("lng"),
                    phone=item.get("phone"),
                    email=item.get("email"),
                    website=item.get("website"),
                    hours=item.get("hours"),
                    verified=item.get("verified", True),
                    status="approved",
                )
                if new_listing.lat and new_listing.lng:
                    new_listing.location = f"SRID=4326;POINT({new_listing.lng} {new_listing.lat})"
                db.add(new_listing)

        db.commit()
        print("✅ Database refreshed with clean and realistic town listings!")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    clean_and_reseed()
