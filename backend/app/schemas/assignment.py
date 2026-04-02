"""Assignment audit schemas."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class AssignmentAuditEntry(BaseModel):
    """Single audit log entry for an assignment."""
    id: str
    assignment_id: str
    action: str  # 'created', 'ended', 'modified'
    performed_by: Optional[str] = None
    performed_by_name: Optional[str] = None
    performed_at: datetime
    
    # Compliance snapshot at action time
    employee_compliant: Optional[bool] = None
    background_check_status: Optional[str] = None
    oig_check_status: Optional[str] = None
    
    # For ended assignments
    end_reason: Optional[str] = None
    
    # Additional context
    changes: Optional[dict] = None
    notes: Optional[str] = None


class AssignmentHistoryEntry(BaseModel):
    """Full assignment history entry with audit trail."""
    id: str
    employee_id: str
    employee_name: str
    employee_number: Optional[str] = None
    client_id: str
    client_name: str
    
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: bool
    notes: Optional[str] = None
    
    # Who created it and when
    assigned_by: Optional[str] = None
    assigned_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    
    # Compliance at time of assignment
    was_compliant_at_assignment: Optional[bool] = None
    background_check_at_assignment: Optional[str] = None
    oig_check_at_assignment: Optional[str] = None
    
    # If ended
    ended_by: Optional[str] = None
    ended_by_name: Optional[str] = None
    ended_at: Optional[datetime] = None
    end_reason: Optional[str] = None
    
    # Full audit trail
    audit_log: List[AssignmentAuditEntry] = []


class ClientAssignmentHistory(BaseModel):
    """Full assignment history for a client."""
    client_id: str
    client_name: str
    total_assignments: int
    active_assignments: int
    assignments: List[AssignmentHistoryEntry]


class EmployeeAssignmentHistory(BaseModel):
    """Full assignment history for an employee."""
    employee_id: str
    employee_name: str
    employee_number: Optional[str] = None
    total_assignments: int
    active_assignments: int
    assignments: List[AssignmentHistoryEntry]


class EndAssignmentRequest(BaseModel):
    """Request to end an assignment."""
    end_date: Optional[str] = None  # Defaults to today
    end_reason: str  # Required for audit trail
    notes: Optional[str] = None
