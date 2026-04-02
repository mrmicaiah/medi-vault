"""Location transfer endpoints for moving applicants/employees between locations."""

from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from app.dependencies import get_supabase, require_admin_or_manager
from app.models.user import UserProfile

router = APIRouter(prefix="/transfers", tags=["Transfers"])


class TransferRequest(BaseModel):
    """Request to transfer an applicant or employee to a new location."""
    to_location_id: str
    reason: Optional[str] = None


class TransferResponse(BaseModel):
    success: bool
    message: str
    transfer_id: Optional[str] = None


class TransferHistoryItem(BaseModel):
    id: str
    from_location_name: Optional[str]
    to_location_name: str
    transferred_by_name: str
    transferred_at: str
    reason: Optional[str]


class TransferHistoryResponse(BaseModel):
    transfers: List[TransferHistoryItem]
    total: int


def get_staff_location_id(supabase: Client, user_id: str) -> Optional[str]:
    """Get the location_id assigned to a staff member."""
    result = supabase.table("profiles").select("location_id").eq("id", user_id).single().execute()
    return result.data.get("location_id") if result.data else None


def get_location_name(supabase: Client, location_id: str) -> Optional[str]:
    """Get location name by ID."""
    if not location_id:
        return None
    result = supabase.table("locations").select("name").eq("id", location_id).single().execute()
    return result.data.get("name") if result.data else None


def get_user_full_name(supabase: Client, user_id: str) -> str:
    """Get user's full name."""
    result = supabase.table("profiles").select("first_name, last_name").eq("id", user_id).single().execute()
    if result.data:
        return f"{result.data.get('first_name', '')} {result.data.get('last_name', '')}".strip()
    return "Unknown"


@router.post("/applicant/{application_id}")
@router.post("/applicant/{application_id}/")
async def transfer_applicant(
    application_id: str,
    request: TransferRequest,
    staff: UserProfile = Depends(require_admin_or_manager),
    supabase: Client = Depends(get_supabase),
) -> TransferResponse:
    """
    Transfer an applicant to a different location.
    
    The staff member must be at the applicant's current location to transfer them.
    """
    staff_location_id = get_staff_location_id(supabase, staff.id)
    
    # Get the application
    app_result = supabase.table("applications").select(
        "id, user_id, location_id, status"
    ).eq("id", application_id).single().execute()
    
    if not app_result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    
    application = app_result.data
    current_location_id = application.get("location_id")
    
    # Verify staff is at the applicant's current location
    if staff_location_id != current_location_id:
        raise HTTPException(
            status_code=403,
            detail="You can only transfer applicants from your own location"
        )
    
    # Verify target location exists and is in the same agency
    to_location = supabase.table("locations").select(
        "id, name, agency_id"
    ).eq("id", request.to_location_id).single().execute()
    
    if not to_location.data:
        raise HTTPException(status_code=404, detail="Target location not found")
    
    # Get current location's agency to verify same agency
    from_location = supabase.table("locations").select(
        "agency_id, name"
    ).eq("id", current_location_id).single().execute()
    
    if from_location.data.get("agency_id") != to_location.data.get("agency_id"):
        raise HTTPException(
            status_code=400,
            detail="Cannot transfer to a location in a different agency"
        )
    
    # Can't transfer to same location
    if current_location_id == request.to_location_id:
        raise HTTPException(
            status_code=400,
            detail="Applicant is already at this location"
        )
    
    # Create the transfer record
    transfer_record = {
        "entity_type": "applicant",
        "application_id": application_id,
        "user_id": application.get("user_id"),
        "from_location_id": current_location_id,
        "to_location_id": request.to_location_id,
        "transferred_by": staff.id,
        "transferred_at": datetime.now(timezone.utc).isoformat(),
        "reason": request.reason,
        "from_location_name": from_location.data.get("name"),
        "to_location_name": to_location.data.get("name"),
        "transferred_by_name": get_user_full_name(supabase, staff.id),
    }
    
    transfer_result = supabase.table("location_transfers").insert(transfer_record).execute()
    
    # Update the application's location
    supabase.table("applications").update({
        "location_id": request.to_location_id,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", application_id).execute()
    
    return TransferResponse(
        success=True,
        message=f"Applicant transferred to {to_location.data.get('name')}",
        transfer_id=transfer_result.data[0]["id"] if transfer_result.data else None
    )


@router.post("/employee/{employee_id}")
@router.post("/employee/{employee_id}/")
async def transfer_employee(
    employee_id: str,
    request: TransferRequest,
    staff: UserProfile = Depends(require_admin_or_manager),
    supabase: Client = Depends(get_supabase),
) -> TransferResponse:
    """
    Transfer an employee to a different location.
    
    The staff member must be at the employee's current location.
    The employee cannot be currently assigned to a client.
    """
    staff_location_id = get_staff_location_id(supabase, staff.id)
    
    # Get the employee
    emp_result = supabase.table("employees").select(
        "id, user_id, location_id, status"
    ).eq("id", employee_id).single().execute()
    
    if not emp_result.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee = emp_result.data
    current_location_id = employee.get("location_id")
    
    # Verify staff is at the employee's current location
    if staff_location_id != current_location_id:
        raise HTTPException(
            status_code=403,
            detail="You can only transfer employees from your own location"
        )
    
    # Check if employee is assigned to any active client
    assignments = supabase.table("assignments").select(
        "id, client_id, clients(first_name, last_name)"
    ).eq("employee_id", employee_id).eq("status", "active").execute()
    
    if assignments.data and len(assignments.data) > 0:
        client = assignments.data[0].get("clients", {})
        client_name = f"{client.get('first_name', '')} {client.get('last_name', '')}".strip()
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transfer: Employee is assigned to client '{client_name}'. Remove the assignment first."
        )
    
    # Verify target location exists and is in the same agency
    to_location = supabase.table("locations").select(
        "id, name, agency_id"
    ).eq("id", request.to_location_id).single().execute()
    
    if not to_location.data:
        raise HTTPException(status_code=404, detail="Target location not found")
    
    # Get current location's agency to verify same agency
    from_location = supabase.table("locations").select(
        "agency_id, name"
    ).eq("id", current_location_id).single().execute()
    
    if from_location.data.get("agency_id") != to_location.data.get("agency_id"):
        raise HTTPException(
            status_code=400,
            detail="Cannot transfer to a location in a different agency"
        )
    
    # Can't transfer to same location
    if current_location_id == request.to_location_id:
        raise HTTPException(
            status_code=400,
            detail="Employee is already at this location"
        )
    
    # Create the transfer record
    transfer_record = {
        "entity_type": "employee",
        "employee_id": employee_id,
        "user_id": employee.get("user_id"),
        "from_location_id": current_location_id,
        "to_location_id": request.to_location_id,
        "transferred_by": staff.id,
        "transferred_at": datetime.now(timezone.utc).isoformat(),
        "reason": request.reason,
        "from_location_name": from_location.data.get("name"),
        "to_location_name": to_location.data.get("name"),
        "transferred_by_name": get_user_full_name(supabase, staff.id),
    }
    
    transfer_result = supabase.table("location_transfers").insert(transfer_record).execute()
    
    # Update the employee's location
    supabase.table("employees").update({
        "location_id": request.to_location_id,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", employee_id).execute()
    
    return TransferResponse(
        success=True,
        message=f"Employee transferred to {to_location.data.get('name')}",
        transfer_id=transfer_result.data[0]["id"] if transfer_result.data else None
    )


@router.get("/history/applicant/{application_id}")
@router.get("/history/applicant/{application_id}/")
async def get_applicant_transfer_history(
    application_id: str,
    staff: UserProfile = Depends(require_admin_or_manager),
    supabase: Client = Depends(get_supabase),
) -> TransferHistoryResponse:
    """Get transfer history for an applicant."""
    result = supabase.table("location_transfers").select(
        "id, from_location_name, to_location_name, transferred_by_name, transferred_at, reason"
    ).eq("application_id", application_id).order("transferred_at", desc=True).execute()
    
    transfers = [
        TransferHistoryItem(
            id=t["id"],
            from_location_name=t.get("from_location_name"),
            to_location_name=t.get("to_location_name", "Unknown"),
            transferred_by_name=t.get("transferred_by_name", "Unknown"),
            transferred_at=t.get("transferred_at"),
            reason=t.get("reason")
        )
        for t in (result.data or [])
    ]
    
    return TransferHistoryResponse(transfers=transfers, total=len(transfers))


@router.get("/history/employee/{employee_id}")
@router.get("/history/employee/{employee_id}/")
async def get_employee_transfer_history(
    employee_id: str,
    staff: UserProfile = Depends(require_admin_or_manager),
    supabase: Client = Depends(get_supabase),
) -> TransferHistoryResponse:
    """Get transfer history for an employee."""
    result = supabase.table("location_transfers").select(
        "id, from_location_name, to_location_name, transferred_by_name, transferred_at, reason"
    ).eq("employee_id", employee_id).order("transferred_at", desc=True).execute()
    
    transfers = [
        TransferHistoryItem(
            id=t["id"],
            from_location_name=t.get("from_location_name"),
            to_location_name=t.get("to_location_name", "Unknown"),
            transferred_by_name=t.get("transferred_by_name", "Unknown"),
            transferred_at=t.get("transferred_at"),
            reason=t.get("reason")
        )
        for t in (result.data or [])
    ]
    
    return TransferHistoryResponse(transfers=transfers, total=len(transfers))
