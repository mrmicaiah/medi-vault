"""FastAPI dependencies for authentication and Supabase client access."""

from fastapi import Depends, Header, HTTPException, status
from supabase import create_client, Client

from app.config import get_settings, Settings
from app.models.user import UserProfile, UserRole


def get_supabase() -> Client:
    """Create and return a Supabase client using service-role key."""
    settings: Settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_key)


def get_anon_supabase() -> Client:
    """Create and return a Supabase client using anon key (for auth ops)."""
    settings: Settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)


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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(exc)}",
        )

    # Fetch profile from profiles table
    profile_result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", str(auth_user.id))
        .single()
        .execute()
    )

    if not profile_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    data = profile_result.data
    return UserProfile(
        id=data["id"],
        email=auth_user.email or data.get("email", ""),
        first_name=data.get("first_name", ""),
        last_name=data.get("last_name", ""),
        role=UserRole(data.get("role", "applicant")),
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
