"""Assignment management service with audit trail."""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, status
from supabase import Client

from app.schemas.assignment import (
    AssignmentAuditEntry,
    AssignmentHistoryEntry,
    ClientAssignmentHistory,
    EmployeeAssignmentHistory,
    EndAssignmentRequest,
)
from app.schemas.employee import ClientAssignmentRequest, ClientAssignmentResponse


class AssignmentService:
    """Handles assignments with full audit trail for compliance."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    def create_assignment(
        self,
        employee_id: str,
        request: ClientAssignmentRequest,
        admin_id: str,
    ) -> ClientAssignmentResponse:
        """Create a new assignment with compliance snapshot."""
        now = datetime.now(timezone.utc)
        
        # Get employee info
        emp_result = self.supabase.table("employees").select("*").eq("id", employee_id).single().execute()
        if not emp_result.data:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Get client info
        client_result = self.supabase.table("clients").select("*").eq("id", request.client_id).single().execute()
        if not client_result.data:
            raise HTTPException(status_code=404, detail="Client not found")
        
        client = client_result.data
        
        # Get current compliance status for audit snapshot
        compliance = self._get_compliance_snapshot(employee_id)
        
        # Create the assignment
        assignment_data = {
            "employee_id": employee_id,
            "client_id": request.client_id,
            "assigned_by": admin_id,
            "assignment_start": request.start_date or now.date().isoformat(),
            "assignment_end": request.end_date,
            "schedule": request.schedule,
            "notes": request.notes,
            "is_active": True,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        
        result = self.supabase.table("employee_client_assignments").insert(assignment_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create assignment")
        
        assignment = result.data[0]
        
        # Create audit log entry
        self._create_audit_log(
            assignment_id=assignment["id"],
            action="created",
            performed_by=admin_id,
            compliance=compliance,
            notes=request.notes,
        )
        
        client_name = client.get("nickname") or f"{client.get('first_name', '')} {client.get('last_name', '')}".strip()
        
        return ClientAssignmentResponse(
            id=assignment["id"],
            employee_id=assignment["employee_id"],
            client_id=assignment["client_id"],
            client_name=client_name,
            assigned_by=assignment.get("assigned_by"),
            start_date=assignment.get("assignment_start"),
            end_date=assignment.get("assignment_end"),
            schedule=assignment.get("schedule"),
            notes=assignment.get("notes"),
            is_active=True,
            created_at=assignment.get("created_at"),
        )

    def end_assignment(
        self,
        assignment_id: str,
        request: EndAssignmentRequest,
        admin_id: str,
    ) -> AssignmentHistoryEntry:
        """End an assignment with audit trail."""
        now = datetime.now(timezone.utc)
        
        # Get assignment
        result = self.supabase.table("employee_client_assignments").select("*").eq("id", assignment_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        assignment = result.data
        
        if not assignment.get("is_active"):
            raise HTTPException(status_code=400, detail="Assignment is already ended")
        
        # Update assignment
        end_date = request.end_date or now.date().isoformat()
        update_data = {
            "is_active": False,
            "assignment_end": end_date,
            "updated_at": now.isoformat(),
        }
        
        self.supabase.table("employee_client_assignments").update(update_data).eq("id", assignment_id).execute()
        
        # Create audit log entry
        self._create_audit_log(
            assignment_id=assignment_id,
            action="ended",
            performed_by=admin_id,
            end_reason=request.end_reason,
            notes=request.notes,
        )
        
        return self.get_assignment_detail(assignment_id)

    def get_assignment_detail(self, assignment_id: str) -> AssignmentHistoryEntry:
        """Get full assignment detail with audit trail."""
        result = (
            self.supabase.table("employee_client_assignments")
            .select("*, employees(id, employee_number, user_id), clients(id, nickname, first_name, last_name)")
            .eq("id", assignment_id)
            .single()
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        return self._build_history_entry(result.data)

    def get_client_assignment_history(self, client_id: str) -> ClientAssignmentHistory:
        """Get full assignment history for a client."""
        # Get client
        client_result = self.supabase.table("clients").select("*").eq("id", client_id).single().execute()
        if not client_result.data:
            raise HTTPException(status_code=404, detail="Client not found")
        
        client = client_result.data
        client_name = client.get("nickname") or f"{client.get('first_name', '')} {client.get('last_name', '')}".strip()
        
        # Get all assignments
        result = (
            self.supabase.table("employee_client_assignments")
            .select("*, employees(id, employee_number, user_id)")
            .eq("client_id", client_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        assignments = [self._build_history_entry(a, include_client=False, client_name=client_name) for a in (result.data or [])]
        active_count = sum(1 for a in assignments if a.is_active)
        
        return ClientAssignmentHistory(
            client_id=client_id,
            client_name=client_name,
            total_assignments=len(assignments),
            active_assignments=active_count,
            assignments=assignments,
        )

    def get_employee_assignment_history(self, employee_id: str) -> EmployeeAssignmentHistory:
        """Get full assignment history for an employee."""
        # Get employee
        emp_result = self.supabase.table("employees").select("*, profiles:user_id(first_name, last_name)").eq("id", employee_id).single().execute()
        if not emp_result.data:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        emp = emp_result.data
        profile = emp.get("profiles") or {}
        emp_name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip() or "Unknown"
        
        # Get all assignments
        result = (
            self.supabase.table("employee_client_assignments")
            .select("*, clients(id, nickname, first_name, last_name)")
            .eq("employee_id", employee_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        assignments = [self._build_history_entry(a, include_employee=False, employee_name=emp_name, employee_number=emp.get("employee_number")) for a in (result.data or [])]
        active_count = sum(1 for a in assignments if a.is_active)
        
        return EmployeeAssignmentHistory(
            employee_id=employee_id,
            employee_name=emp_name,
            employee_number=emp.get("employee_number"),
            total_assignments=len(assignments),
            active_assignments=active_count,
            assignments=assignments,
        )

    def _build_history_entry(
        self,
        data: dict,
        include_employee: bool = True,
        include_client: bool = True,
        employee_name: str = None,
        employee_number: str = None,
        client_name: str = None,
    ) -> AssignmentHistoryEntry:
        """Build a history entry from assignment data."""
        # Get employee name
        if include_employee:
            emp = data.get("employees") or {}
            if emp.get("user_id"):
                profile_result = self.supabase.table("profiles").select("first_name, last_name").eq("id", emp["user_id"]).single().execute()
                if profile_result.data:
                    employee_name = f"{profile_result.data.get('first_name', '')} {profile_result.data.get('last_name', '')}".strip()
            employee_number = emp.get("employee_number")
        
        # Get client name
        if include_client:
            client = data.get("clients") or {}
            client_name = client.get("nickname") or f"{client.get('first_name', '')} {client.get('last_name', '')}".strip()
        
        # Get assigned_by name
        assigned_by_name = None
        if data.get("assigned_by"):
            profile_result = self.supabase.table("profiles").select("first_name, last_name").eq("id", data["assigned_by"]).single().execute()
            if profile_result.data:
                assigned_by_name = f"{profile_result.data.get('first_name', '')} {profile_result.data.get('last_name', '')}".strip()
        
        # Get audit log
        audit_log = self._get_audit_log(data["id"])
        
        # Get compliance snapshot from creation audit entry
        was_compliant = None
        bg_check = None
        oig_check = None
        ended_by = None
        ended_by_name = None
        ended_at = None
        end_reason = None
        
        for entry in audit_log:
            if entry.action == "created":
                was_compliant = entry.employee_compliant
                bg_check = entry.background_check_status
                oig_check = entry.oig_check_status
            elif entry.action == "ended":
                ended_by = entry.performed_by
                ended_by_name = entry.performed_by_name
                ended_at = entry.performed_at
                end_reason = entry.end_reason
        
        return AssignmentHistoryEntry(
            id=data["id"],
            employee_id=data["employee_id"],
            employee_name=employee_name or "Unknown",
            employee_number=employee_number,
            client_id=data["client_id"],
            client_name=client_name or "Unknown",
            start_date=data.get("assignment_start"),
            end_date=data.get("assignment_end"),
            is_active=data.get("is_active", False),
            notes=data.get("notes"),
            assigned_by=data.get("assigned_by"),
            assigned_by_name=assigned_by_name,
            created_at=data.get("created_at"),
            was_compliant_at_assignment=was_compliant,
            background_check_at_assignment=bg_check,
            oig_check_at_assignment=oig_check,
            ended_by=ended_by,
            ended_by_name=ended_by_name,
            ended_at=ended_at,
            end_reason=end_reason,
            audit_log=audit_log,
        )

    def _get_compliance_snapshot(self, employee_id: str) -> dict:
        """Get current compliance status for an employee."""
        result = (
            self.supabase.table("employee_compliance_documents")
            .select("*")
            .eq("employee_id", employee_id)
            .in_("document_type", ["background_check", "oig_exclusion_check"])
            .execute()
        )
        
        bg_status = None
        oig_status = None
        
        for doc in result.data or []:
            if doc["document_type"] == "background_check":
                bg_status = doc.get("status") or doc.get("check_result")
            elif doc["document_type"] == "oig_exclusion_check":
                oig_status = doc.get("check_result") or doc.get("status")
        
        # Determine overall compliance
        is_compliant = (bg_status == "valid" or bg_status == "clear") and (oig_status == "clear")
        
        return {
            "is_compliant": is_compliant,
            "background_check_status": bg_status,
            "oig_check_status": oig_status,
        }

    def _create_audit_log(
        self,
        assignment_id: str,
        action: str,
        performed_by: str,
        compliance: dict = None,
        end_reason: str = None,
        changes: dict = None,
        notes: str = None,
    ):
        """Create an audit log entry."""
        now = datetime.now(timezone.utc).isoformat()
        
        data = {
            "assignment_id": assignment_id,
            "action": action,
            "performed_by": performed_by,
            "performed_at": now,
            "end_reason": end_reason,
            "changes": changes,
            "notes": notes,
        }
        
        if compliance:
            data["employee_compliant"] = compliance.get("is_compliant")
            data["background_check_status"] = compliance.get("background_check_status")
            data["oig_check_status"] = compliance.get("oig_check_status")
        
        self.supabase.table("assignment_audit_log").insert(data).execute()

    def _get_audit_log(self, assignment_id: str) -> List[AssignmentAuditEntry]:
        """Get audit log for an assignment."""
        result = (
            self.supabase.table("assignment_audit_log")
            .select("*")
            .eq("assignment_id", assignment_id)
            .order("performed_at", desc=True)
            .execute()
        )
        
        entries = []
        for row in result.data or []:
            # Get performer name
            performer_name = None
            if row.get("performed_by"):
                profile_result = self.supabase.table("profiles").select("first_name, last_name").eq("id", row["performed_by"]).single().execute()
                if profile_result.data:
                    performer_name = f"{profile_result.data.get('first_name', '')} {profile_result.data.get('last_name', '')}".strip()
            
            entries.append(AssignmentAuditEntry(
                id=row["id"],
                assignment_id=row["assignment_id"],
                action=row["action"],
                performed_by=row.get("performed_by"),
                performed_by_name=performer_name,
                performed_at=row["performed_at"],
                employee_compliant=row.get("employee_compliant"),
                background_check_status=row.get("background_check_status"),
                oig_check_status=row.get("oig_check_status"),
                end_reason=row.get("end_reason"),
                changes=row.get("changes"),
                notes=row.get("notes"),
            ))
        
        return entries
