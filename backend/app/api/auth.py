"""
TownPulse Authentication API Endpoints
========================================
Routes for user registration, email/password login, phone OTP,
session refreshing, and current user profile.
"""

from fastapi import APIRouter, Depends, status

from app.core.dependencies import CurrentUser, DbSession
from app.schemas.common import MessageResponse
from app.schemas.user import (
    OTPRequest,
    OTPVerify,
    Token,
    TokenRefresh,
    UserCreate,
    UserLogin,
    UserOut,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(
    data: UserCreate,
    db: DbSession,
) -> Token:
    """Register with email/password or phone number."""
    _, token = AuthService.register(db, data)
    return token


@router.post(
    "/login",
    response_model=Token,
    summary="Login with email and password",
)
def login(
    data: UserLogin,
    db: DbSession,
) -> Token:
    """Authenticate with email and password to receive JWT tokens."""
    return AuthService.login(db, data)


@router.post(
    "/otp/request",
    response_model=MessageResponse,
    summary="Request a phone OTP code",
)
async def request_otp(
    data: OTPRequest,
) -> MessageResponse:
    """Send a 6-digit verification code to the phone number."""
    await AuthService.request_otp(data.phone)
    return MessageResponse(
        message="OTP sent successfully. Valid for 10 minutes."
    )


@router.post(
    "/otp/verify",
    response_model=Token,
    summary="Verify OTP and login",
)
def verify_otp(
    data: OTPVerify,
    db: DbSession,
) -> Token:
    """Verify phone OTP code to authenticate or create an account."""
    return AuthService.verify_otp(db, data.phone, data.otp)


@router.post(
    "/refresh",
    response_model=Token,
    summary="Refresh access token",
)
def refresh_token(
    data: TokenRefresh,
    db: DbSession,
) -> Token:
    """Exchange a valid refresh token for a new access token."""
    return AuthService.refresh_session(db, data.refresh_token)


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get current user profile",
)
def get_me(
    current_user: CurrentUser,
) -> UserOut:
    """Return the profile of the currently authenticated user."""
    return current_user  # type: ignore[return-value]
