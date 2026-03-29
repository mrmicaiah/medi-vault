"""Admin dashboard and reporting schemas."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class DashboardStats(BaseModel):
    """Admin dashboard statistics."""
    total_applicants: int = 0
    in_progress: int = 0
    submitted: int = 0
    under_review: int = 0
    approved: int = 0
    rejected: int = 0
    hired: int = 0
    total_employees: int = 0
    active_employees: int = 0
    expiring_documents: int = 0
    expired_documents: int = 0


class PipelineStage(BaseModel):
    """A single stage in the applicant pipeline."""
    status: str
    count: int
    applicants: List[Dict[str, Any]] = []


class PipelineResponse(BaseModel):
    """Full applicant pipeline view."""
    stages: List[PipelineStage]
    total: int


class ApplicantDetail(BaseModel):
    """Detailed view of an applicant for admin review."""
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    application_id: str
    status: str
    current_step: int
    completed_steps: int
    total_steps: int = 22
    submitted_at: Optional[str] = None
    steps: List[Dict[str, Any]] = []
    documents: List[Dict[str, Any]] = []
    agreements: List[Dict[str, Any]] = []


class ReviewRequest(BaseModel):
    """Request to approve or reject an applicant."""
    notes: Optional[str] = None


class ComplianceReport(BaseModel):
    """Compliance report for the organization."""
    total_employees: int = 0
    fully_compliant: int = 0
    partially_compliant: int = 0
    non_compliant: int = 0
    expiring_within_30_days: int = 0
    expiring_within_60_days: int = 0
    expiring_within_90_days: int = 0
    expired_documents: int = 0
    missing_documents: int = 0
    compliance_rate: float = 0.0
    details: List[Dict[str, Any]] = []
