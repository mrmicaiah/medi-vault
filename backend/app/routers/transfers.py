"""Location transfer router for moving applicants between locations."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from ..dependencies import get_supabase, require_admin_or_manager

router = APIRouter(prefix="/transfers", tags=["transfers"])


class TransferRequest(BaseModel):
    to_location_id: str
    reason: Optional[str] = None


class TransferResponse(BaseModel):
    success: bool
    transfer_id: str
    message: str


@router.post("/applicant/{application_id}", response_model=TransferResponse)
async def transfer_applicant(
    application_id: str,
    request: TransferRequest,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(require_admin_or_manager)
):
    """
    Transfer an applicant to a different location within the same agency.
    
    Rules:
    - Applicants can be transferred at any time
    - Staff must be at the current location (or be superadmin)
    - Cannot transfer to a location in a different agency
    """
    now = datetime.now(timezone.utc)
    
    # Get the application
    app_res = supabase.table("applications").select(
        "id, user_id, location_id, status, locations(agency_id, name)"
    ).eq("id", application_id).single().execute()
    
    if not app_res.data:
        raise HTTPException(status_code=404, detail="Application not found")
    
    application = app_res.data
    current_location_id = application.get("location_id")
    current_location = application.get("locations") or {}
    current_agency_id = current_location.get("agency_id")
    
    # Check staff is at current location (unless superadmin)
    if user["role"] != "superadmin":
        staff_location = user.get("profile", {}).get("location_id")
        if staff_location != current_location_id:
            raise HTTPException(
                status_code=403, 
                detail="You can only transfer applicants from your own location"
            )
    
    # Get target location and verify same agency
    target_res = supabase.table("locations").select(
        "id, name, agency_id"
    ).eq("id", request.to_location_id).single().execute()
    
    if not target_res.data:
        raise HTTPException(status_code=404, detail="Target location not found")
    
    target_location = target_res.data
    
    if target_location.get("agency_id") != current_agency_id:
        raise HTTPException(
            status_code=400, 
            detail="Cannot transfer to a location in a different agency"
        )
    
    if request.to_location_id == current_location_id:
        raise HTTPException(
            status_code=400, 
            detail="Applicant is already at this location"
        )
    
    # Get user profile for name
    profile_res = supabase.table("profiles").select(
        "first_name, last_name"
    ).eq("id", application.get("user_id")).single().execute()
    
    applicant_name = "Unknown"
    if profile_res.data:
        applicant_name = f"{profile_res.data.get('first_name', '')} {profile_res.data.get('last_name', '')}".strip()
    
    # Get staff name
    staff_profile = user.get("profile", {})
    staff_name = f"{staff_profile.get('first_name', '')} {staff_profile.get('last_name', '')}".strip() or "Unknown"
    
    # Create transfer record
    transfer_data = {
        "entity_type": "applicant",
        "application_id": application_id,
        "from_location_id": current_location_id,
        "to_location_id": request.to_location_id,
        "transferred_by": user["user_id"],
        "transferred_at": now.isoformat(),
        "reason": request.reason,
        # Denormalized for audit trail
        "from_location_name": current_location.get("name"),
        "to_location_name": target_location.get("name"),
        "transferred_by_name": staff_name,
        "entity_name": applicant_name,
    }
    
    transfer_res = supabase.table("location_transfers").insert(transfer_data).execute()
    
    if not transfer_res.data:
        raise HTTPException(status_code=500, detail="Failed to create transfer record")
    
    # Update the application's location
    supabase.table("applications").update({
        "location_id": request.to_location_id,
        "updated_at": now.isoformat()
    }).eq("id", application_id).execute()
    
    return TransferResponse(
        success=True,
        transfer_id=transfer_res.data[0]["id"],
        message=f"Applicant transferred to {target_location.get('name')}"
    )


@router.get("/history/applicant/{application_id}")
async def get_applicant_transfer_history(
    application_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(require_admin_or_manager)
):
    """Get transfer history for an applicant."""
    res = supabase.table("location_transfers").select("*").eq(
        "application_id", application_id
    ).order("transferred_at", desc=True).execute()
    
    return {"transfers": res.data or []}
