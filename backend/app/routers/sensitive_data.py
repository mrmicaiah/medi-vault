"""Sensitive data endpoints (SSN management)."""

from typing import Optional
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, validator
from supabase import Client

from app.dependencies import get_supabase, get_current_user, require_admin
from app.models.user import UserProfile
from app.services.sensitive_data_service import SensitiveDataService


router = APIRouter(prefix="/sensitive", tags=["Sensitive Data"])


class SSNInput(BaseModel):
    """Input model for SSN submission."""
    ssn: str

    @validator("ssn")
    def validate_ssn(cls, v):
        # Remove formatting
        clean = ''.join(filter(str.isdigit, v))
        if len(clean) != 9:
            raise ValueError("SSN must be exactly 9 digits")
        return v


class SSNRevealRequest(BaseModel):
    """Request model for revealing SSN."""
    reason: Optional[str] = None


class SSNDisplayResponse(BaseModel):
    """Response model for masked SSN display."""
    ssn_masked: Optional[str]
    ssn_last_four: Optional[str]
    ssn_provided: bool
    ssn_provided_at: Optional[str] = None


class SSNFullResponse(BaseModel):
    """Response model for full SSN reveal."""
    ssn_full: str
    ssn_last_four: str


@router.post("/ssn", response_model=SSNDisplayResponse)
async def store_ssn(
    ssn_input: SSNInput,
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Store encrypted SSN for the current user."""
    service = SensitiveDataService(supabase)
    return service.store_ssn(user.id, ssn_input.ssn)


@router.get("/ssn", response_model=SSNDisplayResponse)
async def get_my_ssn(
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Get masked SSN display for current user."""
    service = SensitiveDataService(supabase)
    return service.get_ssn_display(user.id)


@router.get("/ssn/{user_id}", response_model=SSNDisplayResponse)
async def get_user_ssn_display(
    user_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get masked SSN display for a user (admin only)."""
    service = SensitiveDataService(supabase)
    return service.get_ssn_display(user_id)


@router.post("/ssn/{user_id}/reveal", response_model=SSNFullResponse)
async def reveal_user_ssn(
    user_id: str,
    reveal_request: SSNRevealRequest,
    request: Request,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Reveal full SSN for a user (admin only). Access is logged."""
    service = SensitiveDataService(supabase)
    
    # Get request metadata for logging
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    return service.reveal_ssn(
        user_id=user_id,
        accessed_by=admin.id,
        ip_address=ip_address,
        user_agent=user_agent,
        reason=reveal_request.reason,
    )


@router.get("/ssn/{user_id}/access-log")
async def get_ssn_access_log(
    user_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get SSN access log for a user (admin only)."""
    service = SensitiveDataService(supabase)
    return service.get_ssn_access_log(user_id)
