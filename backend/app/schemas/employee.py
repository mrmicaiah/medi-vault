"""Employee request/response schemas."""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.employee import EmployeeStatus


class HireRequest(BaseModel):
    """Request to hire an approved applicant."""
    application_id: str
    job_title: str
    department: Optional[str] = None
    pay_rate: Optional[float] = None
    pay_type: Optional[str] = "hourly"
    start_date: Optional[str] = None
    notes: Optional[str] = None


class EmployeeUpdate(BaseModel):
    """Request to update employee details."""
    job_title: Optional[str] = None
    department: Optional[str] = None
    pay_rate: Optional[float] = None
    pay_type: Optional[str] = None
    status: Optional[EmployeeStatus] = None
    notes: Optional[str] = None
    termination_date: Optional[str] = None
    termination_reason: Optional[str] = None


class EmployeeResponse(BaseModel):
    """Response for an employee record."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    application_id: str
    employee_number: Optional[str] = None
    status: EmployeeStatus
    hire_date: str
    job_title: Optional[str] = None
    department: Optional[str] = None
    pay_rate: Optional[float] = None
    pay_type: Optional[str] = None
    start_date: Optional[str] = None
    termination_date: Optional[str] = None
    termination_reason: Optional[str] = None
    notes: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class EmployeeListResponse(BaseModel):
    """Response for listing employees."""
    items: List[EmployeeResponse]
    total: int
    page: int = 1
    page_size: int = 25


class ClientAssignmentRequest(BaseModel):
    """Request to assign a client to an employee."""
    client_id: str
    start_date: str
    end_date: Optional[str] = None
    schedule: Optional[str] = None
    notes: Optional[str] = None


class ClientAssignmentResponse(BaseModel):
    """Response for an employee-client assignment."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    employee_id: str
    client_id: str
    client_name: Optional[str] = None
    assigned_by: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    schedule: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: Optional[str] = None
