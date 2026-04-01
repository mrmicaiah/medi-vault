"""Client request/response schemas."""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ClientCreate(BaseModel):
    """Request to create a new client."""
    nickname: str
    location_id: Optional[str] = None
    notes: Optional[str] = None
    
    # Optional expanded fields
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    medicaid_id: Optional[str] = None
    medicare_id: Optional[str] = None


class ClientUpdate(BaseModel):
    """Request to update a client."""
    nickname: Optional[str] = None
    location_id: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    medicaid_id: Optional[str] = None
    medicare_id: Optional[str] = None


class ClientResponse(BaseModel):
    """Response for a client record."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    agency_id: str
    location_id: Optional[str] = None
    nickname: str
    status: str
    notes: Optional[str] = None
    
    # Optional expanded fields
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    medicaid_id: Optional[str] = None
    medicare_id: Optional[str] = None
    
    # Location name for display
    location_name: Optional[str] = None
    
    # Stats
    active_assignments: int = 0
    
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ClientListResponse(BaseModel):
    """Response for listing clients."""
    items: List[ClientResponse]
    total: int
    page: int = 1
    page_size: int = 25


class ClientAssignmentInfo(BaseModel):
    """Info about an employee assigned to a client."""
    model_config = ConfigDict(from_attributes=True)

    assignment_id: str
    employee_id: str
    employee_name: str
    employee_number: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    schedule: Optional[dict] = None
    is_active: bool
    notes: Optional[str] = None


class ClientDetailResponse(ClientResponse):
    """Detailed client response with assignments."""
    assignments: List[ClientAssignmentInfo] = []
