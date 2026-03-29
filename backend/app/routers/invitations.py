"""Staff invitation management endpoints."""

import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from supabase import Client

from app.dependencies import get_supabase, require_admin
from app.models.user import UserProfile, UserRole
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/invitations", tags=["Invitations"])


class InvitationCreate(BaseModel):
    email: EmailStr
    role: str  # 'admin' or 'manager'
    location_id: Optional[str] = None


class InvitationResponse(BaseModel):
    id: str
    email: str
    role: str
    agency_name: str
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


@router.get("", response_model=InvitationsListResponse)
async def list_invitations(
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """List all pending invitations."""
    result = (
        supabase.table("invitations")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    
    invitations = []
    for inv in result.data or []:
        invitations.append(
            InvitationResponse(
                id=inv["id"],
                email=inv["email"],
                role=inv["role"],
                agency_name="Eveready HomeCare",  # TODO: Get from agency table
                location_name=inv.get("location_name"),
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
    Create a new staff invitation.
    
    Generates a unique token and creates an invitation record.
    The invite URL can be shared with the recipient.
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
    
    # Generate secure token
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=7)  # Invitation valid for 7 days
    
    # Get location name if provided
    location_name = None
    if request.location_id:
        # TODO: Look up from locations table
        pass
    
    # Create invitation
    inv_data = {
        "email": request.email,
        "role": request.role,
        "token": token,
        "location_id": request.location_id,
        "location_name": location_name,
        "invited_by": admin.id,
        "expires_at": expires_at.isoformat(),
        "used": False,
        "created_at": now.isoformat(),
    }
    
    result = supabase.table("invitations").insert(inv_data).execute()
    inv = result.data[0]
    
    # TODO: Send invitation email with the link
    # For now, return the invite URL in the response
    invite_url = f"https://medivault.app/invite/{token}"  # TODO: Use actual domain
    
    return InvitationResponse(
        id=inv["id"],
        email=inv["email"],
        role=inv["role"],
        agency_name="Eveready HomeCare",
        location_name=inv.get("location_name"),
        expires_at=inv["expires_at"],
        used=inv["used"],
        created_at=inv["created_at"],
        invite_url=invite_url,
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
        .select("*")
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
    return InvitationResponse(
        id=inv["id"],
        email=inv["email"],
        role=inv["role"],
        agency_name="Eveready HomeCare",
        location_name=inv.get("location_name"),
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
    
    This creates the user in Supabase Auth and sets their role.
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
    if datetime.fromisoformat(inv["expires_at"].replace("Z", "+00:00")) < datetime.now(timezone.utc):
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
        
        # Create/update profile with the correct role
        supabase.table("profiles").upsert({
            "id": user_id,
            "email": inv["email"],
            "first_name": request.first_name,
            "last_name": request.last_name,
            "role": inv["role"],
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
            data={"user_id": user_id, "role": inv["role"]},
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
    # Check invitation exists and is not used
    inv_result = (
        supabase.table("invitations")
        .select("id, used")
        .eq("id", invitation_id)
        .single()
        .execute()
    )
    
    if not inv_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
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
    """Resend an invitation email and extend expiration."""
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
    
    if inv["used"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot resend an already-used invitation",
        )
    
    # Extend expiration
    new_expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    supabase.table("invitations").update({
        "expires_at": new_expires,
    }).eq("id", invitation_id).execute()
    
    # TODO: Send email
    invite_url = f"https://medivault.app/invite/{inv['token']}"
    
    return SuccessResponse(
        message="Invitation resent",
        data={"invite_url": invite_url},
    )
