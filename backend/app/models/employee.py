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
    employee_number: Optional[str] = None
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    hire_date: str
    job_title: Optional[str] = None
    department: Optional[str] = None
    pay_rate: Optional[float] = None
    pay_type: Optional[str] = None  # hourly, salary
    start_date: Optional[str] = None
    termination_date: Optional[str] = None
    termination_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
