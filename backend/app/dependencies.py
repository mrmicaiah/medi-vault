"""FastAPI dependencies for authentication and Supabase client access."""

from fastapi import Depends, Header, HTTPException, status
from supabase import create_client, Client
import logging

from app.config import get_settings, Settings
from app.models.user import UserProfile, UserRole

logger = logging.getLogger(__name__)


def get_supabase() -> Client:
    """Create and return a Supabase client using service-role key for admin operations."""
    settings: Settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


def get_anon_supabase() -> Client:
    """Create and return a Supabase client using anon key (for public/auth ops)."""
    settings: Settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_key)


async def get_current_user(
    authorization: str = Header(..., description="Bearer <token>"),
    supabase: Client = Depends(get_supabase),
) -> UserProfile:
    """Validate JWT token and return the authenticated user profile."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Use 'Bearer <token>'",
        )

    token = authorization.replace("Bearer ", "")

    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        auth_user = user_response.user
    except Exception as exc:
        logger.error(f"Token verification failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(exc)}",
        )

    # Fetch profile from profiles table
    try:
        profile_result = (
            supabase.table("profiles")
            .select("*")
            .eq("id", str(auth_user.id))
            .single()
            .execute()
        )
    except Exception as exc:
        logger.error(f"Profile fetch failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch profile: {str(exc)}",
        )

    if not profile_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    data = profile_result.data
    
    # Parse role safely - default to applicant if invalid
    role_str = data.get("role", "applicant")
    try:
        role = UserRole(role_str)
    except ValueError:
        logger.warning(f"Invalid role '{role_str}' for user {auth_user.id}, defaulting to applicant")
        role = UserRole.APPLICANT
    
    return UserProfile(
        id=data["id"],
        email=auth_user.email or data.get("email", ""),
        first_name=data.get("first_name", ""),
        last_name=data.get("last_name", ""),
        role=role,
        phone=data.get("phone"),
        created_at=data.get("created_at"),
        updated_at=data.get("updated_at"),
    )


async def require_admin(
    user: UserProfile = Depends(get_current_user),
) -> UserProfile:
    """Require the current user to have admin or superadmin role."""
    if user.role not in (UserRole.ADMIN, UserRole.SUPERADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


async def require_staff(
    user: UserProfile = Depends(get_current_user),
) -> UserProfile:
    """Require the current user to have admin, superadmin, or manager role."""
    if user.role not in (UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required",
        )
    return user


async def require_superadmin(
    user: UserProfile = Depends(get_current_user),
) -> UserProfile:
    """Require the current user to have superadmin role."""
    if user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required",
        )
    return user
