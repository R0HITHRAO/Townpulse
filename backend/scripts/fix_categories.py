"""
TownPulse Database Category & Coordinates Alignment
===================================================
Aligns legacy listings to their exact matching category ID.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.category import Category
from app.models.listing import Listing

def fix_listing_categories():
    db: Session = SessionLocal()
    try:
        categories = {c.name.lower(): c.id for c in db.query(Category).all()}
        
        bakery_cat_id = categories.get("food & groceries", 2)
        auto_cat_id = categories.get("auto & mechanics", 3)
        cafe_cat_id = categories.get("cafes & dining", 8)
        clinic_cat_id = categories.get("healthcare & clinics", 1)
        civic_cat_id = categories.get("public services & civic", 9)
        school_cat_id = categories.get("education & libraries", 6)

        # Update Bakery
        bakeries = db.query(Listing).filter(Listing.name.ilike("%bakery%")).all()
        for b in bakeries:
            b.category_id = bakery_cat_id
        
        # Update Auto / Garage
        autos = db.query(Listing).filter((Listing.name.ilike("%garage%")) | (Listing.name.ilike("%auto%")) | (Listing.name.ilike("%mechanic%"))).all()
        for a in autos:
            a.category_id = auto_cat_id

        # Update Cafes & Dining
        cafes = db.query(Listing).filter((Listing.name.ilike("%cafe%")) | (Listing.name.ilike("%tea%")) | (Listing.name.ilike("%restaurant%")) | (Listing.name.ilike("%hotel%"))).all()
        for c in cafes:
            c.category_id = cafe_cat_id

        # Update Clinics / Hospitals
        clinics = db.query(Listing).filter((Listing.name.ilike("%clinic%")) | (Listing.name.ilike("%hospital%")) | (Listing.name.ilike("%health%")) | (Listing.name.ilike("%medical%"))).all()
        for cl in clinics:
            cl.category_id = clinic_cat_id

        # Update Civic / Public
        civics = db.query(Listing).filter((Listing.name.ilike("%police%")) | (Listing.name.ilike("%panchayat%")) | (Listing.name.ilike("%post office%")) | (Listing.name.ilike("%bus stand%"))).all()
        for cv in civics:
            cv.category_id = civic_cat_id

        db.commit()
        print("✅ Listing categories successfully corrected in PostgreSQL!")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_listing_categories()
