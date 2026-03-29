"""User management endpoints for admins."""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from supabase import Client

from app.dependencies import get_supabase, require_admin
from app.models.user import UserProfile
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/users", tags=["Users"])


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    created_at: str
    updated_at: str


class UsersListResponse(BaseModel):
    users: List[UserResponse]
    total: int


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str  # 'admin' or 'manager'


class UpdateUserRoleRequest(BaseModel):
    role: str


@router.get("", response_model=UsersListResponse)
async def list_users(
    role: Optional[str] = None,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """List all users (optionally filtered by role)."""
    query = supabase.table("profiles").select("*").order("created_at", desc=True)
    
    if role:
        query = query.eq("role", role)
    
    result = query.execute()
    
    users = [
        UserResponse(
            id=u["id"],
            email=u["email"],
            first_name=u.get("first_name"),
            last_name=u.get("last_name"),
            role=u.get("role", "applicant"),
            created_at=u["created_at"],
            updated_at=u["updated_at"],
        )
        for u in result.data or []
    ]
    
    return UsersListResponse(users=users, total=len(users))


@router.get("/staff", response_model=UsersListResponse)
async def list_staff(
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """List admin and manager users only."""
    result = (
        supabase.table("profiles")
        .select("*")
        .in_("role", ["admin", "manager", "superadmin"])
        .order("created_at", desc=True)
        .execute()
    )
    
    users = [
        UserResponse(
            id=u["id"],
            email=u["email"],
            first_name=u.get("first_name"),
            last_name=u.get("last_name"),
            role=u.get("role", "applicant"),
            created_at=u["created_at"],
            updated_at=u["updated_at"],
        )
        for u in result.data or []
    ]
    
    return UsersListResponse(users=users, total=len(users))


@router.post("", response_model=UserResponse)
async def create_user(
    request: CreateUserRequest,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """
    Create a new admin or manager user.
    
    This creates a user in Supabase Auth and sets up their profile.
    Only admins can create other admins or managers.
    """
    # Validate role
    if request.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'admin' or 'manager'",
        )
    
    # Only superadmins can create other admins
    if request.role == "admin" and admin.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmins can create admin users",
        )
    
    try:
        # Create user in Supabase Auth using admin API
        # Note: This requires the service key, not anon key
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
        
        # Update the profile with the correct role
        # The profile should be auto-created by the trigger, but we update it
        supabase.table("profiles").upsert({
            "id": user_id,
            "email": request.email,
            "first_name": request.first_name,
            "last_name": request.last_name,
            "role": request.role,
            "created_at": now,
            "updated_at": now,
        }).execute()
        
        return UserResponse(
            id=user_id,
            email=request.email,
            first_name=request.first_name,
            last_name=request.last_name,
            role=request.role,
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


@router.patch("/{user_id}/role", response_model=SuccessResponse)
async def update_user_role(
    user_id: str,
    request: UpdateUserRoleRequest,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Update a user's role."""
    # Validate role
    valid_roles = ["applicant", "manager", "admin"]
    if request.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role must be one of: {', '.join(valid_roles)}",
        )
    
    # Only superadmins can set admin role
    if request.role == "admin" and admin.role != "superadmin":
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


@router.delete("/{user_id}", response_model=SuccessResponse)
async def delete_user(
    user_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
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
    if user_result.data.get("role") == "admin" and admin.role != "superadmin":
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
