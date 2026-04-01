"""Employee compliance document endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile, Query
from supabase import Client

from app.dependencies import get_supabase, require_admin
from app.models.user import UserProfile
from app.schemas.compliance import (
    ComplianceDocumentResponse,
    ComplianceDocumentListResponse,
    EmployeeComplianceSummary,
    ComplianceStatusResponse,
)
from app.services.employee_compliance_service import (
    EmployeeComplianceService,
    ComplianceDocumentUpload,
)

router = APIRouter(prefix="/employees", tags=["Employee Compliance"])


@router.post(
    "/{employee_id}/compliance-documents",
    response_model=ComplianceDocumentResponse,
    status_code=201,
)
async def upload_compliance_document(
    employee_id: str,
    document_type: str = Form(..., description="Type: background_check, oig_exclusion_check, license, etc."),
    document_name: str = Form(..., description="Display name for the document"),
    effective_date: str = Form(..., description="Date the check was performed (YYYY-MM-DD)"),
    description: Optional[str] = Form(None),
    expiration_date: Optional[str] = Form(None, description="Expiration date if applicable (YYYY-MM-DD)"),
    check_result: Optional[str] = Form(None, description="For checks: clear, match_found, pending"),
    notes: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None, description="Document file (PDF, image)"),
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """
    Upload a compliance document for an employee.
    
    Document types:
    - background_check: Criminal background check
    - oig_exclusion_check: OIG/LEIE exclusion list check (monthly)
    - state_exclusion_check: State Medicaid exclusion check
    - license: Professional license (nursing, etc.)
    - certification: Professional certification
    - tb_test: TB test results
    - cpr_certification: CPR certification
    - first_aid: First aid certification
    - training_record: Training completion record
    - drug_screening: Drug screening results
    - physical_exam: Physical examination
    - other: Other compliance document
    """
    metadata = ComplianceDocumentUpload(
        document_type=document_type,
        document_name=document_name,
        description=description,
        effective_date=effective_date,
        expiration_date=expiration_date,
        check_result=check_result,
        notes=notes,
    )
    
    service = EmployeeComplianceService(supabase)
    return service.upload_compliance_document(
        employee_id=employee_id,
        metadata=metadata,
        file=file,
        uploaded_by=admin.id,
    )


@router.get(
    "/{employee_id}/compliance-documents",
    response_model=ComplianceDocumentListResponse,
)
async def list_compliance_documents(
    employee_id: str,
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get all compliance documents for an employee."""
    service = EmployeeComplianceService(supabase)
    return service.get_employee_compliance_documents(
        employee_id=employee_id,
        document_type=document_type,
    )


@router.get(
    "/{employee_id}/compliance-summary",
    response_model=EmployeeComplianceSummary,
)
async def get_compliance_summary(
    employee_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """
    Get compliance summary for an employee.
    
    Returns overall compliance status, alerts, and key document information.
    Useful for at-a-glance compliance checking.
    """
    service = EmployeeComplianceService(supabase)
    return service.get_compliance_summary(employee_id)


@router.get(
    "/{employee_id}/compliance-documents/{document_id}/download",
)
async def download_compliance_document(
    employee_id: str,
    document_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get a signed URL to download a compliance document."""
    service = EmployeeComplianceService(supabase)
    url = service.get_document_download_url(document_id, employee_id)
    return {"signed_url": url}


@router.delete(
    "/{employee_id}/compliance-documents/{document_id}",
    status_code=204,
)
async def delete_compliance_document(
    employee_id: str,
    document_id: str,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Delete a compliance document."""
    service = EmployeeComplianceService(supabase)
    service.delete_compliance_document(document_id, employee_id)


# Agency-wide compliance dashboard endpoint
compliance_router = APIRouter(prefix="/compliance", tags=["Compliance Dashboard"])


@compliance_router.get(
    "/employees",
    response_model=list[ComplianceStatusResponse],
)
async def get_all_employee_compliance(
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """
    Get compliance status for all active employees in the agency.
    
    Shows at a glance which employees are compliant vs need attention.
    Useful for audit preparation and compliance monitoring.
    """
    service = EmployeeComplianceService(supabase)
    return service.get_all_compliance_status(admin.agency_id)
