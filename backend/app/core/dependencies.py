"""
TownPulse FastAPI Dependencies
================================
Reusable dependency functions for authentication, authorization,
database sessions, and pagination.
"""

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_access_token

# Import User model — resolved at runtime to avoid circular imports
from app.models.user import User, UserRole

# ─── HTTP Bearer Security Scheme ─────────────────────────────────────────────

# auto_error=False allows us to return custom 401 messages
security = HTTPBearer(auto_error=False)


# ─── Database Session ─────────────────────────────────────────────────────────

# Type alias for database session dependency
DbSession = Annotated[Session, Depends(get_db)]


# ─── Authentication Dependencies ──────────────────────────────────────────────


def get_current_user(
    db: DbSession,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> User:
    """
    Extract and validate the JWT token from the Authorization header.
    Returns the authenticated User object.

    Args:
        db: Database session from dependency injection.
        credentials: Bearer token from Authorization header.

    Returns:
        The authenticated User instance.

    Raises:
        HTTPException 401: If token is missing, invalid, or expired.
        HTTPException 401: If the user no longer exists or is inactive.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = verify_access_token(credentials.credentials)
    except JWTError:
        raise credentials_exception

    # Validate UUID format
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise credentials_exception

    # Fetch user from database
    user = db.query(User).filter(User.id == user_uuid).first()
    if user is None:
        raise credentials_exception

    # Check user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
        )

    return user


def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Dependency that returns the current authenticated, active user."""
    return current_user


def require_business_owner(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Require the current user to have business_owner or admin role.

    Raises:
        HTTPException 403: If user lacks the required role.
    """
    if current_user.role not in (UserRole.business_owner, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Business owner access required",
        )
    return current_user


def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Require the current user to have admin role.

    Raises:
        HTTPException 403: If user is not an admin.
    """
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ─── Pagination Dependencies ──────────────────────────────────────────────────


class PaginationParams:
    """Reusable pagination query parameters."""

    def __init__(
        self,
        page: int = 1,
        per_page: int = 20,
    ) -> None:
        if page < 1:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Page number must be >= 1",
            )
        if per_page < 1 or per_page > 100:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="per_page must be between 1 and 100",
            )
        self.page = page
        self.per_page = per_page
        self.offset = (page - 1) * per_page


Pagination = Annotated[PaginationParams, Depends(PaginationParams)]

# Type aliases for common dependencies
CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
BusinessUser = Annotated[User, Depends(require_business_owner)]
