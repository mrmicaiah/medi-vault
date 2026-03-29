"""Client and assignment models."""

from typing import Optional

from pydantic import BaseModel, ConfigDict


class Client(BaseModel):
    """A client (patient) who receives home care services."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    first_name: str
    last_name: str
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    care_level: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class EmployeeClientAssignment(BaseModel):
    """Assignment linking an employee to a client."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    employee_id: str
    client_id: str
    assigned_by: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    schedule: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
