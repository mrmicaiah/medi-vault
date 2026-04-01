"""Compliance document request/response schemas."""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ComplianceDocumentUpload(BaseModel):
    """Request to upload a compliance document."""
    document_type: str  # background_check, oig_exclusion_check, etc.
    document_name: str
    description: Optional[str] = None
    effective_date: str  # YYYY-MM-DD
    expiration_date: Optional[str] = None
    check_result: Optional[str] = None  # clear, match_found, pending
    notes: Optional[str] = None


class ComplianceDocumentResponse(BaseModel):
    """Response for a compliance document."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    employee_id: str
    document_type: str
    document_name: str
    description: Optional[str] = None
    
    # File info
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    
    # Validity
    effective_date: str
    expiration_date: Optional[str] = None
    status: str
    
    # Check results
    check_result: Optional[str] = None
    check_details: Optional[dict] = None
    
    # Audit
    uploaded_by: Optional[str] = None
    uploaded_by_name: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ComplianceStatusResponse(BaseModel):
    """Compliance status summary for an employee."""
    model_config = ConfigDict(from_attributes=True)

    employee_id: str
    employee_number: Optional[str] = None
    first_name: str
    last_name: str
    employee_status: str
    
    # Background check
    background_check_status: Optional[str] = None
    background_check_date: Optional[str] = None
    background_check_expires: Optional[str] = None
    
    # OIG check
    oig_check_status: Optional[str] = None
    oig_check_date: Optional[str] = None
    oig_check_result: Optional[str] = None
    
    # Overall compliance
    is_compliant: bool


class ComplianceDocumentListResponse(BaseModel):
    """Response for listing compliance documents."""
    items: List[ComplianceDocumentResponse]
    total: int


class EmployeeComplianceSummary(BaseModel):
    """Summary of all compliance documents for an employee."""
    employee_id: str
    is_compliant: bool
    
    # Document counts
    total_documents: int
    valid_documents: int
    expired_documents: int
    pending_documents: int
    
    # Key document statuses
    background_check: Optional[ComplianceDocumentResponse] = None
    oig_exclusion_check: Optional[ComplianceDocumentResponse] = None
    
    # All documents
    documents: List[ComplianceDocumentResponse] = []
    
    # Alerts
    alerts: List[str] = []  # e.g., "OIG check due", "Background check expired"
