"""Employee models."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict


class EmployeeStatus(str, Enum):
    """Employee status within the organization."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"


class Employee(BaseModel):
    """An employee record created after an applicant is hired."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    user_id: str
    application_id: str
    
    # Agency/location assignment
    agency_id: Optional[str] = None
    location_id: Optional[str] = None
    
    # Employee identification
    employee_number: Optional[str] = None
    
    # Employment details
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    hire_date: str
    start_date: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    
    # Compensation
    pay_rate: Optional[float] = None
    pay_type: Optional[str] = None  # hourly, salary
    
    # Termination
    termination_date: Optional[str] = None
    termination_reason: Optional[str] = None
    
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
