"""
TownPulse Category Model
==========================
Listing categories (grocery, clinic, mechanic, etc.)
"""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Category(Base):
    """
    Service category for classifying listings.

    Examples: Grocery, Clinic, Mechanic, Library, Volunteer Org, etc.
    """

    __tablename__ = "categories"

    # Serial integer PK (categories are small, stable data)
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Unique category name
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    # Emoji or icon name for UI display (e.g., "🏥" or "clinic")
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Optional longer description
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ─── Relationships ──────────────────────────────────────────────────────
    listings: Mapped[list["Listing"]] = relationship(  # type: ignore[name-defined]
        "Listing",
        back_populates="category",
    )

    def __repr__(self) -> str:
        return f"<Category id={self.id} name={self.name}>"
