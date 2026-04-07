"""Staff invitation management endpoints."""

import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import os

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from supabase import Client

from app.dependencies import get_supabase, require_admin
from app.models.user import UserProfile, UserRole
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/invitations", tags=["Invitations"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://medisvault.com")


class InvitationCreate(BaseModel):
    email: EmailStr
    role: str  # 'admin' or 'manager'
    location_id: Optional[str] = None


class InvitationResponse(BaseModel):
    id: str
    email: str
    role: str
    agency_id: str
    agency_name: str
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    expires_at: str
    used: bool
    created_at: str
    invite_url: Optional[str] = None


class InvitationsListResponse(BaseModel):
    invitations: List[InvitationResponse]
    total: int


class AcceptInvitationRequest(BaseModel):
    first_name: str
    last_name: str
    password: str


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


@router.get("", response_model=InvitationsListResponse)
async def list_invitations(
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """List all pending invitations for the admin's agency."""
    agency_id = get_user_agency_id(supabase, admin.id)
    
    if not agency_id:
        return InvitationsListResponse(invitations=[], total=0)
    
    # Get invitations with agency and location names
    result = (
        supabase.table("invitations")
        .select("*, agencies(name), locations(name)")
        .eq("agency_id", agency_id)
        .order("created_at", desc=True)
        .execute()
    )
    
    invitations = []
    for inv in result.data or []:
        agency_data = inv.get("agencies", {}) or {}
        location_data = inv.get("locations", {}) or {}
        
        invitations.append(
            InvitationResponse(
                id=inv["id"],
                email=inv["email"],
                role=inv["role"],
                agency_id=inv["agency_id"],
                agency_name=agency_data.get("name", "Unknown Agency"),
                location_id=inv.get("location_id"),
                location_name=location_data.get("name"),
                expires_at=inv["expires_at"],
                used=inv["used"],
                created_at=inv["created_at"],
            )
        )
    
    return InvitationsListResponse(invitations=invitations, total=len(invitations))


@router.post("", response_model=InvitationResponse)
async def create_invitation(
    request: InvitationCreate,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """
    Create a new staff invitation for the admin's agency.
    
    IMPORTANT: Creates the invitation record FIRST, then calls Supabase's
    invite_user_by_email. This is because Supabase creates the auth user
    immediately, which triggers the handle_new_user function that looks
    for the invitation to set the correct role/agency.
    """
    # Validate role
    if request.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'admin' or 'manager'",
        )
    
    # Only superadmins can invite other admins
    if request.role == "admin" and admin.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmins can invite admin users",
        )
    
    # Get admin's agency
    agency_id = get_user_agency_id(supabase, admin.id)
    if not agency_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be associated with an agency to send invitations",
        )
    
    # Get agency name
    agency_result = (
        supabase.table("agencies")
        .select("name, slug")
        .eq("id", agency_id)
        .single()
        .execute()
    )
    agency_name = agency_result.data.get("name", "Unknown") if agency_result.data else "Unknown"
    
    # Check if email already has an account
    existing = (
        supabase.table("profiles")
        .select("id")
        .eq("email", request.email)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    
    # Check for existing pending invitation
    existing_invite = (
        supabase.table("invitations")
        .select("id")
        .eq("email", request.email)
        .eq("used", False)
        .execute()
    )
    if existing_invite.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An invitation for this email is already pending",
        )
    
    # Validate location belongs to agency if provided
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
                detail="Invalid location for this agency",
            )
        location_name = loc_result.data.get("name")
    
    # Generate secure token for our tracking
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=7)
    
    # STEP 1: Create invitation record FIRST (before calling Supabase invite)
    # This is critical because invite_user_by_email creates the user immediately,
    # which triggers handle_new_user that looks for this invitation record.
    inv_data = {
        "email": request.email,
        "role": request.role,
        "agency_id": agency_id,
        "location_id": request.location_id,
        "token": token,
        "invited_by": admin.id,
        "expires_at": expires_at.isoformat(),
        "used": False,
        "created_at": now.isoformat(),
    }
    
    result = supabase.table("invitations").insert(inv_data).execute()
    inv = result.data[0]
    
    try:
        # STEP 2: Now call Supabase's invite_user_by_email
        # This sends the email via SMTP and creates the auth user
        # Redirect to complete-profile page where user sets name + password
        redirect_url = f"{FRONTEND_URL}/auth/complete-profile"
        
        supabase.auth.admin.invite_user_by_email(
            request.email,
            {
                "redirect_to": redirect_url,
                "data": {
                    "role": request.role,
                    "agency_id": agency_id,
                    "location_id": request.location_id,
                    "invited_by": admin.id,
                }
            }
        )
        
        return InvitationResponse(
            id=inv["id"],
            email=inv["email"],
            role=inv["role"],
            agency_id=inv["agency_id"],
            agency_name=agency_name,
            location_id=inv.get("location_id"),
            location_name=location_name,
            expires_at=inv["expires_at"],
            used=inv["used"],
            created_at=inv["created_at"],
            invite_url=None,  # Supabase sends the email directly
        )
        
    except Exception as e:
        # If Supabase invite fails, clean up the invitation record we created
        supabase.table("invitations").delete().eq("id", inv["id"]).execute()
        
        error_msg = str(e)
        print(f"Invitation error: {error_msg}")
        
        if "already been invited" in error_msg.lower() or "already registered" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email has already been invited or registered",
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send invitation: {error_msg}",
        )


@router.get("/{token}", response_model=InvitationResponse)
async def get_invitation(
    token: str,
    supabase: Client = Depends(get_supabase),
):
    """
    Get invitation details by token.
    
    This is a public endpoint used by the invitation acceptance page.
    """
    result = (
        supabase.table("invitations")
        .select("*, agencies(name), locations(name)")
        .eq("token", token)
        .single()
        .execute()
    )
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )
    
    inv = result.data
    agency_data = inv.get("agencies", {}) or {}
    location_data = inv.get("locations", {}) or {}
    
    return InvitationResponse(
        id=inv["id"],
        email=inv["email"],
        role=inv["role"],
        agency_id=inv["agency_id"],
        agency_name=agency_data.get("name", "Unknown Agency"),
        location_id=inv.get("location_id"),
        location_name=location_data.get("name"),
        expires_at=inv["expires_at"],
        used=inv["used"],
        created_at=inv["created_at"],
    )


@router.post("/{token}/accept", response_model=SuccessResponse)
async def accept_invitation(
    token: str,
    request: AcceptInvitationRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Accept an invitation and create a staff account.
    
    This creates the user in Supabase Auth and sets their role and agency.
    """
    # Get invitation
    inv_result = (
        supabase.table("invitations")
        .select("*")
        .eq("token", token)
        .single()
        .execute()
    )
    
    if not inv_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )
    
    inv = inv_result.data
    
    # Check if already used
    if inv["used"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has already been used",
        )
    
    # Check if expired
    expires_at = inv["expires_at"]
    if isinstance(expires_at, str):
        expires_at = expires_at.replace("Z", "+00:00")
        expires_dt = datetime.fromisoformat(expires_at)
    else:
        expires_dt = expires_at
        
    if expires_dt < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has expired",
        )
    
    # Validate password
    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )
    
    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.admin.create_user({
            "email": inv["email"],
            "password": request.password,
            "email_confirm": True,  # Auto-confirm since they used valid invite link
            "user_metadata": {
                "first_name": request.first_name,
                "last_name": request.last_name,
            }
        })
        
        user_id = auth_response.user.id
        now = datetime.now(timezone.utc).isoformat()
        
        # Create/update profile with the correct role AND agency
        supabase.table("profiles").upsert({
            "id": user_id,
            "email": inv["email"],
            "first_name": request.first_name,
            "last_name": request.last_name,
            "role": inv["role"],
            "agency_id": inv["agency_id"],
            "location_id": inv.get("location_id"),
            "created_at": now,
            "updated_at": now,
        }).execute()
        
        # Mark invitation as used
        supabase.table("invitations").update({
            "used": True,
            "used_at": now,
            "used_by": user_id,
        }).eq("id", inv["id"]).execute()
        
        return SuccessResponse(
            message="Account created successfully",
            data={"user_id": user_id, "role": inv["role"], "agency_id": inv["agency_id"]},
        )
        
    except Exception as e:
        error_msg = str(e)
        if "already registered" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create account: {error_msg}",
        )


@router.delete("/{invitation_id}", response_model=SuccessResponse)
async def revoke_invitation(
    invitation_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Revoke a pending invitation."""
    agency_id = get_user_agency_id(supabase, admin.id)
    
    # Check invitation exists, belongs to agency, and is not used
    inv_result = (
        supabase.table("invitations")
        .select("id, used, agency_id")
        .eq("id", invitation_id)
        .single()
        .execute()
    )
    
    if not inv_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )
    
    if inv_result.data.get("agency_id") != agency_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only revoke invitations for your agency",
        )
    
    if inv_result.data["used"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot revoke an already-used invitation",
        )
    
    # Delete the invitation
    supabase.table("invitations").delete().eq("id", invitation_id).execute()
    
    return SuccessResponse(message="Invitation revoked")


@router.post("/{invitation_id}/resend", response_model=SuccessResponse)
async def resend_invitation(
    invitation_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Resend an invitation email."""
    agency_id = get_user_agency_id(supabase, admin.id)
    
    # Get invitation
    inv_result = (
        supabase.table("invitations")
        .select("*")
        .eq("id", invitation_id)
        .single()
        .execute()
    )
    
    if not inv_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )
    
    inv = inv_result.data
    
    if inv.get("agency_id") != agency_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only resend invitations for your agency",
        )
    
    if inv["used"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot resend an already-used invitation",
        )
    
    try:
        # Use Supabase to resend the invite email
        redirect_url = f"{FRONTEND_URL}/auth/complete-profile"
        
        # Re-invite the user - this will resend the email
        supabase.auth.admin.invite_user_by_email(
            inv["email"],
            {
                "redirect_to": redirect_url,
                "data": {
                    "role": inv["role"],
                    "agency_id": inv["agency_id"],
                    "location_id": inv.get("location_id"),
                    "invited_by": admin.id,
                }
            }
        )
        
        # Extend expiration
        new_expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        supabase.table("invitations").update({
            "expires_at": new_expires,
        }).eq("id", invitation_id).execute()
        
        return SuccessResponse(message="Invitation email resent")
        
    except Exception as e:
        error_msg = str(e)
        print(f"Resend invitation error: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resend invitation: {error_msg}",
        )
