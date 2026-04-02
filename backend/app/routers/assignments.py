"""Assignment management endpoints with audit trail."""

from fastapi import APIRouter, Depends
from supabase import Client

from app.dependencies import get_supabase, require_admin
from app.models.user import UserProfile
from app.schemas.assignment import (
    AssignmentHistoryEntry,
    ClientAssignmentHistory,
    EmployeeAssignmentHistory,
    EndAssignmentRequest,
)
from app.schemas.employee import ClientAssignmentRequest, ClientAssignmentResponse
from app.services.assignment_service import AssignmentService

router = APIRouter(prefix="/assignments", tags=["Assignments"])


@router.get("/client/{client_id}/history", response_model=ClientAssignmentHistory)
async def get_client_assignment_history(
    client_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get full assignment history for a client (for audits)."""
    service = AssignmentService(supabase)
    return service.get_client_assignment_history(client_id)


@router.get("/employee/{employee_id}/history", response_model=EmployeeAssignmentHistory)
async def get_employee_assignment_history(
    employee_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get full assignment history for an employee (for audits)."""
    service = AssignmentService(supabase)
    return service.get_employee_assignment_history(employee_id)


@router.get("/{assignment_id}", response_model=AssignmentHistoryEntry)
async def get_assignment_detail(
    assignment_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get full assignment detail with audit trail."""
    service = AssignmentService(supabase)
    return service.get_assignment_detail(assignment_id)


@router.post("/{assignment_id}/end", response_model=AssignmentHistoryEntry)
async def end_assignment(
    assignment_id: str,
    request: EndAssignmentRequest,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """End an assignment with audit trail."""
    service = AssignmentService(supabase)
    return service.end_assignment(assignment_id, request, admin.id)
