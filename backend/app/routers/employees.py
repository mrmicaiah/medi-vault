"""Employee management endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
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
