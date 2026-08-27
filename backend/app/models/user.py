"""
TownPulse User Model
======================
SQLAlchemy ORM model for application users.
Supports three roles: regular users, business owners, and admins.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class UserRole(str, enum.Enum):
    """Roles for access control throughout the application."""

    user = "user"                    # Regular public user
    business_owner = "business_owner"  # Can claim and manage listings
    admin = "admin"                  # Full platform access


class User(Base):
    """
    Application user model.

    Users can register via email/password or phone OTP.
    Business owners can claim listings after phone verification.
    Admins manage the platform through the admin dashboard.
    """

    __tablename__ = "users"

    # ─── Primary Key ──────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # ─── Identity Fields ──────────────────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Email is optional (users can sign up via phone OTP only)
    email: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
        index=True,
    )

    # Phone is optional (users can sign up via email only)
    phone: Mapped[str | None] = mapped_column(
        String(20),
        unique=True,
        nullable=True,
        index=True,
    )

    # ─── Authentication ───────────────────────────────────────────────────────
    # bcrypt hash — null for OTP-only users
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Phone verification status
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Email verification status
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ─── Authorization ────────────────────────────────────────────────────────
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        default=UserRole.user,
        nullable=False,
    )

    # Soft delete / deactivation
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ─── Timestamps ───────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    # Listings owned by this user (after claim approval)
    owned_listings: Mapped[list["Listing"]] = relationship(  # type: ignore[name-defined]
        "Listing",
        back_populates="owner",
        foreign_keys="Listing.owner_user_id",
    )

    # Claims submitted by this user
    claims: Mapped[list["Claim"]] = relationship(  # type: ignore[name-defined]
        "Claim",
        back_populates="user",
    )

    # Reviews written by this user
    reviews: Mapped[list["Review"]] = relationship(  # type: ignore[name-defined]
        "Review",
        back_populates="user",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"

    @property
    def display_name(self) -> str:
        """Return name for display purposes."""
        return self.name or self.email or self.phone or "Anonymous"

    @property
    def is_admin(self) -> bool:
        """Quick check if user is an admin."""
        return self.role == UserRole.admin

    @property
    def is_business_owner(self) -> bool:
        """Quick check if user is a business owner."""
        return self.role in (UserRole.business_owner, UserRole.admin)
