"""
TownPulse User Pydantic Schemas
==================================
Request and response schemas for user authentication and management.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole


# ─── Request Schemas ──────────────────────────────────────────────────────────


class UserCreate(BaseModel):
    """Schema for user registration."""

    name: str = Field(..., min_length=2, max_length=255, examples=["Jane Smith"])
    email: EmailStr | None = Field(
        None, examples=["jane@example.com"]
    )
    phone: str | None = Field(
        None,
        pattern=r"^\+?[1-9]\d{6,14}$",
        examples=["+919876543210"],
    )
    password: str | None = Field(
        None,
        min_length=8,
        max_length=100,
        examples=["StrongPassword123!"],
    )

    @field_validator("phone")
    @classmethod
    def validate_phone_or_email(cls, v: str | None, info: object) -> str | None:
        """At least one of email or phone must be provided."""
        return v

    model_config = {"json_schema_extra": {"examples": [
        {"name": "Jane Smith", "email": "jane@example.com", "password": "Secret123!"}
    ]}}


class UserLogin(BaseModel):
    """Schema for email/password login."""

    email: EmailStr = Field(..., examples=["jane@example.com"])
    password: str = Field(..., min_length=1, examples=["Secret123!"])


class OTPRequest(BaseModel):
    """Schema for requesting a phone OTP."""

    phone: str = Field(
        ...,
        pattern=r"^\+?[1-9]\d{6,14}$",
        examples=["+919876543210"],
    )


class OTPVerify(BaseModel):
    """Schema for verifying a phone OTP."""

    phone: str = Field(..., pattern=r"^\+?[1-9]\d{6,14}$", examples=["+919876543210"])
    otp: str = Field(..., min_length=6, max_length=6, examples=["123456"])


class TokenRefresh(BaseModel):
    """Schema for refresh token request."""

    refresh_token: str = Field(..., examples=["eyJhbGci..."])


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    name: str | None = Field(None, min_length=2, max_length=255)
    email: EmailStr | None = None


# ─── Response Schemas ─────────────────────────────────────────────────────────


class UserOut(BaseModel):
    """Schema for user data returned in API responses."""

    id: uuid.UUID
    name: str
    email: str | None = None
    phone: str | None = None
    role: UserRole
    phone_verified: bool
    email_verified: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    """JWT token pair returned after successful login or registration."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut

    model_config = {"json_schema_extra": {"examples": [
        {
            "access_token": "eyJhbGci...",
            "refresh_token": "eyJhbGci...",
            "token_type": "bearer",
            "user": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "name": "Jane Smith",
                "email": "jane@example.com",
                "role": "user",
            },
        }
    ]}}
