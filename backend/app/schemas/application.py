"""Application request/response schemas."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.application import ApplicationStatus, StepType


class ApplicationCreate(BaseModel):
    """Request to create a new application."""
    pass  # No fields needed; user_id comes from auth


class StepData(BaseModel):
    """Data submitted for a specific application step."""
    data: Dict[str, Any]


class ApplicationStepResponse(BaseModel):
    """Response for a single application step."""
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    application_id: str
    step_number: int
    step_name: str
    step_type: StepType
    status: str = "pending"
    data: Optional[Dict[str, Any]] = None
    completed_at: Optional[str] = None


class ApplicationResponse(BaseModel):
    """Response containing application details."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    status: ApplicationStatus
    current_step: int
    completed_steps: int
    total_steps: int = 22
    submitted_at: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    steps: Optional[List[ApplicationStepResponse]] = None


class ApplicationUpdate(BaseModel):
    """Request to update application metadata."""
    notes: Optional[str] = None
    status: Optional[ApplicationStatus] = None


class ApplicationListResponse(BaseModel):
    """Response for listing applications."""
    items: List[ApplicationResponse]
    total: int
    page: int = 1
    page_size: int = 25
