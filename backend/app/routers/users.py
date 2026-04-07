"""User management endpoints for admins."""

import os
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from supabase import Client

from app.dependencies import get_supabase, require_admin, require_superadmin
from app.models.user import UserProfile, UserRole
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/users", tags=["Users"])

# Get frontend URL from environment
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://medisvault.com")


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    agency_id: Optional[str] = None
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    created_at: str
    updated_at: str


class UsersListResponse(BaseModel):
    users: List[UserResponse]
    total: int


class CreateStaffRequest(BaseModel):
    """Create a staff user (manager/admin) with direct credentials."""
    email: EmailStr
    password: str  # Temporary password to share with the user
    first_name: str
    last_name: str
    role: str  # 'admin' or 'manager'
    location_id: Optional[str] = None  # Required for managers


class UpdateUserRoleRequest(BaseModel):
    role: str


class UpdateUserRequest(BaseModel):
    """Update user details."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    location_id: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    """Reset a user's password (admin sets new temp password)."""
    new_password: str


class SendPasswordResetRequest(BaseModel):
    """Send password reset email to user."""
    redirect_url: Optional[str] = None


def get_user_agency_id(supabase: Client, user_id: str) -> Optional[str]:
    """Get the agency_id for a user."""
    result = (
        supabase.table("profiles")
        .select("agency_id")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return result.data.get("agency_id") if result.data else None


@router.get("")
@router.get("/")
async def list_users(
    role: Optional[str] = None,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
) -> UsersListResponse:
    """List all users (optionally filtered by role)."""
    query = supabase.table("profiles").select("*, locations(name)").order("created_at", desc=True)
    
    if role:
        query = query.eq("role", role)
    
    result = query.execute()
    
    users = []
    for u in result.data or []:
        location_data = u.get("locations") or {}
        users.append(
            UserResponse(
                id=u["id"],
                email=u["email"],
                first_name=u.get("first_name"),
                last_name=u.get("last_name"),
                role=u.get("role", "applicant"),
                agency_id=u.get("agency_id"),
                location_id=u.get("location_id"),
                location_name=location_data.get("name") if location_data else None,
                created_at=u["created_at"],
                updated_at=u["updated_at"],
            )
        )
    
    return UsersListResponse(users=users, total=len(users))


@router.get("/staff")
@router.get("/staff/")
async def list_staff(
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
) -> UsersListResponse:
    """List admin and manager users only."""
    agency_id = get_user_agency_id(supabase, admin.id)
    
    query = (
        supabase.table("profiles")
        .select("*, locations(name)")
        .in_("role", ["admin", "manager", "superadmin"])
        .order("created_at", desc=True)
    )
    
    # Filter by agency for non-superadmins
    if admin.role != UserRole.SUPERADMIN and agency_id:
        query = query.eq("agency_id", agency_id)
    
    result = query.execute()
    
    users = []
    for u in result.data or []:
        location_data = u.get("locations") or {}
        users.append(
            UserResponse(
                id=u["id"],
                email=u["email"],
                first_name=u.get("first_name"),
                last_name=u.get("last_name"),
                role=u.get("role", "applicant"),
                agency_id=u.get("agency_id"),
                location_id=u.get("location_id"),
                location_name=location_data.get("name") if location_data else None,
                created_at=u["created_at"],
                updated_at=u["updated_at"],
            )
        )
    
    return UsersListResponse(users=users, total=len(users))


@router.post("")
@router.post("/")
async def create_staff_user(
    request: CreateStaffRequest,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
) -> UserResponse:
    """
    Create a new staff user (admin or manager) with direct credentials.
    
    The admin provides an email and temporary password which they can
    share with the user directly. No email invite is sent.
    """
    # Validate role
    if request.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'admin' or 'manager'",
        )
    
    # Only superadmins can create other admins
    if request.role == "admin" and admin.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmins can create admin users",
        )
    
    # Managers should have a location
    if request.role == "manager" and not request.location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Managers must be assigned to a location",
        )
    
    # Get admin's agency
    agency_id = get_user_agency_id(supabase, admin.id)
    if not agency_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be associated with an agency to create users",
        )
    
    # Validate location belongs to agency
    location_name = None
    if request.location_id:
        loc_result = (
            supabase.table("locations")
            .select("name, agency_id")
            .eq("id", request.location_id)
            .single()
            .execute()
        )
        if not loc_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found",
            )
        if loc_result.data.get("agency_id") != agency_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location does not belong to your agency",
            )
        location_name = loc_result.data.get("name")
    
    # Validate password strength
    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )
    
    try:
        # Create user in Supabase Auth using admin API
        auth_response = supabase.auth.admin.create_user({
            "email": request.email,
            "password": request.password,
            "email_confirm": True,  # Auto-confirm email for admin-created users
            "user_metadata": {
                "first_name": request.first_name,
                "last_name": request.last_name,
            }
        })
        
        user_id = auth_response.user.id
        now = datetime.now(timezone.utc).isoformat()
        
        # Create/update the profile with role, agency, and location
        supabase.table("profiles").upsert({
            "id": user_id,
            "email": request.email,
            "first_name": request.first_name,
            "last_name": request.last_name,
            "role": request.role,
            "agency_id": agency_id,
            "location_id": request.location_id,
            "created_at": now,
            "updated_at": now,
        }).execute()
        
        return UserResponse(
            id=user_id,
            email=request.email,
            first_name=request.first_name,
            last_name=request.last_name,
            role=request.role,
            agency_id=agency_id,
            location_id=request.location_id,
            location_name=location_name,
            created_at=now,
            updated_at=now,
        )
        
    except Exception as e:
        error_msg = str(e)
        if "already registered" in error_msg.lower() or "already exists" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {error_msg}",
        )


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
) -> UserResponse:
    """Update a user's details (name, location assignment)."""
    agency_id = get_user_agency_id(supabase, admin.id)
    
    # Check user exists and belongs to same agency
    user_result = (
        supabase.table("profiles")
        .select("*, locations(name)")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not user_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    user_data = user_result.data
    
    # Can't edit superadmins unless you're a superadmin
    if user_data.get("role") == "superadmin" and admin.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot edit superadmin users",
        )
    
    # Validate location if provided
    location_name = None
    if request.location_id:
        loc_result = (
            supabase.table("locations")
            .select("name, agency_id")
            .eq("id", request.location_id)
            .single()
            .execute()
        )
        if not loc_result.data or loc_result.data.get("agency_id") != agency_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid location",
            )
        location_name = loc_result.data.get("name")
    
    # Build update
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if request.first_name is not None:
        update_data["first_name"] = request.first_name
    if request.last_name is not None:
        update_data["last_name"] = request.last_name
    if request.location_id is not None:
        update_data["location_id"] = request.location_id
    
    result = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
    u = result.data[0]
    
    # Re-fetch to get location name
    if request.location_id:
        loc_data = {"name": location_name}
    else:
        loc_data = user_data.get("locations") or {}
    
    return UserResponse(
        id=u["id"],
        email=u["email"],
        first_name=u.get("first_name"),
        last_name=u.get("last_name"),
        role=u.get("role", "applicant"),
        agency_id=u.get("agency_id"),
        location_id=u.get("location_id"),
        location_name=loc_data.get("name") if loc_data else None,
        created_at=u["created_at"],
        updated_at=u["updated_at"],
    )


@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: str,
    request: UpdateUserRoleRequest,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
) -> SuccessResponse:
    """Update a user's role."""
    # Validate role
    valid_roles = ["applicant", "employee", "manager", "admin"]
    if request.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role must be one of: {', '.join(valid_roles)}",
        )
    
    # Only superadmins can set admin role
    if request.role == "admin" and admin.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmins can promote users to admin",
        )
    
    # Can't change your own role
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role",
        )
    
    # Check user exists
    user_result = supabase.table("profiles").select("id, role").eq("id", user_id).single().execute()
    if not user_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Can't demote superadmins
    if user_result.data.get("role") == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot change superadmin role",
        )
    
    # Update role
    supabase.table("profiles").update({
        "role": request.role,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", user_id).execute()
    
    return SuccessResponse(message=f"User role updated to {request.role}")


@router.post("/{user_id}/send-password-reset")
async def send_password_reset_email(
    user_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
) -> SuccessResponse:
    """
    Send a password reset email to the user.
    
    Uses Supabase Admin API to generate a recovery link and send it.
    """
    agency_id = get_user_agency_id(supabase, admin.id)
    
    # Check user exists
    user_result = (
        supabase.table("profiles")
        .select("id, email, role, agency_id")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not user_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    user_data = user_result.data
    user_email = user_data.get("email")
    
    # Can't reset your own password this way
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use the profile settings to change your own password",
        )
    
    # Can't reset superadmin passwords unless you're superadmin
    if user_data.get("role") == "superadmin" and admin.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot reset superadmin passwords",
        )
    
    try:
        # Use admin API to generate invite link with recovery type
        # This sends an email to the user with a password reset link
        redirect_url = f"{FRONTEND_URL}/auth/reset-callback"
        
        response = supabase.auth.admin.generate_link({
            "type": "recovery",
            "email": user_email,
            "options": {
                "redirect_to": redirect_url
            }
        })
        
        # The generate_link with type "recovery" sends the email automatically
        # when using Supabase's email service
        
        return SuccessResponse(
            message=f"Password reset email sent to {user_email}",
            data={"email": user_email}
        )
        
    except Exception as e:
        error_message = str(e)
        print(f"Password reset error for {user_email}: {error_message}")
        
        if "rate limit" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many reset requests. Please wait before trying again.",
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send reset email: {error_message}",
        )


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
) -> SuccessResponse:
    """Delete a user account."""
    # Can't delete yourself
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )
    
    # Check user exists and get their role
    user_result = supabase.table("profiles").select("id, role").eq("id", user_id).single().execute()
    if not user_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Can't delete superadmins
    if user_result.data.get("role") == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete superadmin users",
        )
    
    # Only superadmins can delete admins
    if user_result.data.get("role") == "admin" and admin.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmins can delete admin users",
        )
    
    try:
        # Delete from Supabase Auth (this will cascade to profile via trigger/FK)
        supabase.auth.admin.delete_user(user_id)
        
        return SuccessResponse(message="User deleted successfully")
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}",
        )
