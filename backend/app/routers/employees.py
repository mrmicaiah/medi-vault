"""Employee management endpoints."""

from typing import List, Optional
import logging

from fastapi import APIRouter, Depends, Query, HTTPException
from supabase import Client

from app.dependencies import get_supabase, require_admin
from app.models.employee import EmployeeStatus
from app.models.user import UserProfile
from app.schemas.employee import (
    ClientAssignmentRequest,
    ClientAssignmentResponse,
    EmployeeListResponse,
    EmployeeResponse,
    EmployeeUpdate,
    HireRequest,
)
from app.services.employee_service import EmployeeService
from app.services.assignment_service import AssignmentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.post("/hire", response_model=EmployeeResponse, status_code=201)
async def hire_applicant(
    request: HireRequest,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Hire an approved applicant, converting them to an employee."""
    service = EmployeeService(supabase)
    return service.hire_applicant(request, admin.id)


# Handle both /employees and /employees/ explicitly
@router.get("", response_model=EmployeeListResponse)
@router.get("/", response_model=EmployeeListResponse)
async def list_employees(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status: Optional[EmployeeStatus] = Query(None),
    search: Optional[str] = Query(None, description="Search by name, email, or employee number"),
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """List all employees with optional filtering and search (admin only)."""
    service = EmployeeService(supabase)
    employees, total = service.get_employees(page, page_size, status, search)
    return EmployeeListResponse(
        items=employees,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{emp_id}", response_model=EmployeeResponse)
async def get_employee(
    emp_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get a specific employee's details."""
    service = EmployeeService(supabase)
    return service.get_employee(emp_id)


@router.get("/{emp_id}/preferences")
async def get_employee_preferences(
    emp_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """
    Get employee's work preferences from their original application.
    Returns availability, transportation, shift preferences, etc.
    """
    try:
        # Get the employee to find their application_id
        emp_res = supabase.table("employees").select("application_id, user_id").eq("id", emp_id).single().execute()
        if not emp_res.data:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        application_id = emp_res.data.get("application_id")
        if not application_id:
            # No linked application - return empty preferences
            return {"preferences": {}, "has_application": False}
        
        # Fetch relevant application steps
        # Step 1: Position/Application Basics
        # Step 2: Personal Info (for city)
        # Step 8: Work Preferences
        # Step 15: Credentials
        steps_res = supabase.table("application_steps").select(
            "step_number, data"
        ).eq("application_id", application_id).in_("step_number", [1, 2, 8, 15]).execute()
        
        steps_map = {}
        for step in (steps_res.data or []):
            steps_map[step["step_number"]] = step.get("data") or {}
        
        step1 = steps_map.get(1, {})
        step2 = steps_map.get(2, {})
        step8 = steps_map.get(8, {})
        step15 = steps_map.get(15, {})
        
        preferences = {
            # From Step 1 - Application Basics
            "position_applied": step1.get("position_applied"),
            "employment_type": step1.get("employment_type"),
            "desired_hourly_rate": step1.get("desired_hourly_rate"),
            "desired_start_date": step1.get("desired_start_date"),
            "speaks_other_languages": step1.get("speaks_other_languages"),
            "other_languages": step1.get("other_languages"),
            "how_heard": step1.get("how_heard"),
            
            # From Step 2 - Personal Info
            "city": step2.get("city"),
            "state": step2.get("state"),
            "address_line1": step2.get("address_line1"),
            "zip": step2.get("zip"),
            
            # From Step 8 - Work Preferences
            "available_days": step8.get("available_days"),
            "shift_preferences": step8.get("shift_preferences"),
            "hours_per_week": step8.get("hours_per_week"),
            "has_transportation": step8.get("has_transportation"),
            "max_travel_miles": step8.get("max_travel_miles"),
            "comfortable_with_pets": step8.get("comfortable_with_pets"),
            "comfortable_with_smokers": step8.get("comfortable_with_smokers"),
            
            # From Step 15 - Credentials
            "credential_type": step15.get("credential_type"),
        }
        
        return {
            "preferences": preferences,
            "has_application": True,
            "application_id": application_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Employee preferences fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{emp_id}", response_model=EmployeeResponse)
async def update_employee(
    emp_id: str,
    update: EmployeeUpdate,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Update employee information."""
    service = EmployeeService(supabase)
    return service.update_employee(emp_id, update)


@router.post("/{emp_id}/assignments", response_model=ClientAssignmentResponse, status_code=201)
async def assign_client(
    emp_id: str,
    request: ClientAssignmentRequest,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Assign a client to an employee (with audit trail)."""
    service = AssignmentService(supabase)
    return service.create_assignment(emp_id, request, admin.id)


@router.get("/{emp_id}/assignments", response_model=List[ClientAssignmentResponse])
async def get_assignments(
    emp_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get all client assignments for an employee."""
    service = EmployeeService(supabase)
    return service.get_assignments(emp_id)
