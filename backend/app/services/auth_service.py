"""
TownPulse Authentication Service
==================================
Handles user registration, login, phone OTP generation and verification,
and token refreshing.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import get_logger
from app.core.rate_limiter import check_otp_rate_limit, get_redis_client
from app.core.security import (
    create_access_token,
    create_refresh_token,
    generate_otp,
    get_otp_redis_key,
    hash_password,
    verify_password,
    verify_refresh_token,
)
from app.models.user import User, UserRole
from app.schemas.user import Token, UserCreate, UserLogin
from app.services.otp_provider import get_otp_provider

logger = get_logger(__name__)


class AuthService:
    """Service handling all user authentication operations."""

    @staticmethod
    def register(db: Session, data: UserCreate) -> tuple[User, Token]:
        """
        Register a new user with email or phone.

        Args:
            db: Database session.
            data: User registration data.

        Returns:
            Tuple of (created_user, token_pair).
        """
        if not data.email and not data.phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either email or phone number is required to register.",
            )

        if data.email:
            existing = db.query(User).filter(User.email == data.email).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A user with this email already exists.",
                )

        if data.phone:
            existing_phone = db.query(User).filter(User.phone == data.phone).first()
            if existing_phone:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A user with this phone number already exists.",
                )

        pwd_hash = hash_password(data.password) if data.password else None

        user = User(
            name=data.name,
            email=data.email,
            phone=data.phone,
            password_hash=pwd_hash,
            role=UserRole.user,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        token = Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user,  # type: ignore[arg-type]
        )
        logger.info("User registered successfully", user_id=str(user.id))
        return user, token

    @staticmethod
    def login(db: Session, data: UserLogin) -> Token:
        """
        Authenticate user with email and password.

        Args:
            db: Database session.
            data: Login credentials.

        Returns:
            Token pair with user details.
        """
        user = db.query(User).filter(User.email == data.email).first()
        if not user or not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account has been deactivated",
            )

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        logger.info("User logged in successfully", user_id=str(user.id))
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user,  # type: ignore[arg-type]
        )

    @staticmethod
    async def request_otp(phone: str) -> bool:
        """
        Request a 6-digit OTP code sent to the given phone number.
        Enforces hourly rate limiting per phone number.
        """
        if not check_otp_rate_limit(phone):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many OTP requests. Maximum 5 requests per hour.",
            )

        otp = generate_otp(6)
        redis_client = get_redis_client()
        key = get_otp_redis_key(phone)

        # Store in Redis with TTL
        redis_client.setex(key, settings.OTP_EXPIRE_MINUTES * 60, otp)

        provider = get_otp_provider()
        success = await provider.send_otp(phone, otp)
        return success

    @staticmethod
    def verify_otp(db: Session, phone: str, otp: str) -> Token:
        """
        Verify the OTP code and log in or create the user account.
        """
        redis_client = get_redis_client()
        key = get_otp_redis_key(phone)
        stored_otp = redis_client.get(key)

        if not stored_otp or stored_otp != otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP code.",
            )

        # Remove used OTP
        redis_client.delete(key)

        # Find or create user
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            user = User(
                name=f"User {phone[-4:]}",
                phone=phone,
                phone_verified=True,
                role=UserRole.user,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user.phone_verified = True
            db.commit()

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user,  # type: ignore[arg-type]
        )

    @staticmethod
    def refresh_session(db: Session, refresh_token_str: str) -> Token:
        """Refresh an expired access token using a valid refresh token."""
        try:
            user_id = verify_refresh_token(refresh_token_str)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        import uuid
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        new_access = create_access_token(user.id)
        new_refresh = create_refresh_token(user.id)

        return Token(
            access_token=new_access,
            refresh_token=new_refresh,
            token_type="bearer",
            user=user,  # type: ignore[arg-type]
        )
