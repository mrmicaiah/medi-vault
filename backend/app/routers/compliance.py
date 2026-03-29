"""Compliance reporting and audit endpoints."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.dependencies import get_supabase, require_admin
from app.models.user import UserProfile
from app.schemas.admin import ComplianceReport
from app.services.compliance_service import ComplianceService

router = APIRouter(prefix="/compliance", tags=["Compliance"])


@router.get("/report", response_model=ComplianceReport)
async def get_compliance_report(
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Generate a full compliance report across all active employees."""
    service = ComplianceService(supabase)
    return service.get_compliance_report()


@router.get("/expiring", response_model=List[Dict[str, Any]])
async def get_expiring_documents(
    days: int = Query(30, ge=1, le=365),
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get documents expiring within the specified number of days."""
    service = ComplianceService(supabase)
    return service.get_expiring_documents(days)


@router.get("/expired", response_model=List[Dict[str, Any]])
async def get_expired_documents(
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get all currently expired documents."""
    service = ComplianceService(supabase)
    return service.get_expired_documents()


@router.get("/missing", response_model=List[Dict[str, Any]])
async def get_missing_documents(
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get missing required documents per active employee."""
    service = ComplianceService(supabase)
    return service.get_missing_documents()


@router.get("/employee/{employee_id}/point-in-time", response_model=Dict[str, Any])
async def get_point_in_time(
    employee_id: str,
    as_of_date: Optional[str] = Query(None, description="ISO date string for point-in-time query"),
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get compliance status for an employee at a specific point in time."""
    service = ComplianceService(supabase)
    return service.get_point_in_time(employee_id, as_of_date)


@router.get("/client/{client_id}/audit", response_model=Dict[str, Any])
async def get_client_audit(
    client_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Audit all employees assigned to a client and their compliance status."""
    service = ComplianceService(supabase)
    return service.get_client_audit(client_id)
