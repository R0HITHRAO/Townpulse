"""
TownPulse Security Utilities
==============================
Provides JWT token creation/verification, password hashing with direct bcrypt,
and OTP generation/verification.
"""

import random
import string
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# ─── Password Hashing ─────────────────────────────────────────────────────────


def hash_password(password: str) -> str:
    """Hash a plain-text password using native bcrypt."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


# ─── JWT Tokens ───────────────────────────────────────────────────────────────


def create_access_token(
    subject: str | Any,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a short-lived JWT access token.

    Args:
        subject: The token subject (typically user ID).
        expires_delta: Optional custom expiry. Defaults to ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns:
        Encoded JWT string.
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str | Any) -> str:
    """
    Create a long-lived JWT refresh token.

    Args:
        subject: The token subject (typically user ID).

    Returns:
        Encoded JWT string.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT token.

    Args:
        token: The JWT string to decode.

    Returns:
        Decoded token payload as dict.

    Raises:
        JWTError: If the token is invalid or expired.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def verify_access_token(token: str) -> str:
    """
    Verify an access token and return the subject (user ID).

    Args:
        token: JWT access token string.

    Returns:
        User ID (subject) from the token.

    Raises:
        JWTError: If token is invalid, expired, or wrong type.
    """
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise JWTError("Token is not an access token")
    subject = payload.get("sub")
    if subject is None:
        raise JWTError("Token missing subject claim")
    return subject


def verify_refresh_token(token: str) -> str:
    """
    Verify a refresh token and return the subject (user ID).

    Args:
        token: JWT refresh token string.

    Returns:
        User ID (subject) from the token.

    Raises:
        JWTError: If token is invalid, expired, or wrong type.
    """
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise JWTError("Token is not a refresh token")
    subject = payload.get("sub")
    if subject is None:
        raise JWTError("Token missing subject claim")
    return subject


# ─── OTP Generation ───────────────────────────────────────────────────────────


def generate_otp(length: int = 6) -> str:
    """
    Generate a numeric OTP of the given length.

    Args:
        length: Number of digits in the OTP (default: 6).

    Returns:
        OTP string of the specified length.
    """
    return "".join(random.choices(string.digits, k=length))


def get_otp_redis_key(phone: str) -> str:
    """Return the Redis key for storing an OTP for the given phone number."""
    return f"otp:{phone}"


def get_otp_rate_limit_key(phone: str) -> str:
    """Return the Redis key for OTP rate limiting for the given phone number."""
    return f"otp_rate:{phone}"
