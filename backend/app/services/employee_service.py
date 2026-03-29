"""Employee management service."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, status
from supabase import Client

from app.models.application import ApplicationStatus
from app.models.employee import Employee, EmployeeStatus
from app.models.user import UserRole
from app.schemas.employee import (
    ClientAssignmentRequest,
    ClientAssignmentResponse,
    EmployeeResponse,
    EmployeeUpdate,
    HireRequest,
)


class EmployeeService:
    """Handles employee creation (hire flow), updates, and client assignments."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    def hire_applicant(self, request: HireRequest, admin_id: str) -> EmployeeResponse:
        """Convert an approved applicant into an employee."""
        # Verify application exists and is approved
        app_result = (
            self.supabase.table("applications")
            .select("*, profiles(first_name, last_name, email)")
            .eq("id", request.application_id)
            .single()
            .execute()
        )

        if not app_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found",
            )

        app = app_result.data
        if app["status"] != ApplicationStatus.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Application status is '{app['status']}', must be 'approved' to hire",
            )

        user_id = app["user_id"]

        # Check if already hired
        existing = (
            self.supabase.table("employees")
            .select("id")
            .eq("application_id", request.application_id)
            .execute()
        )

        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This applicant has already been hired",
            )

        now = datetime.now(timezone.utc).isoformat()
        hire_date = request.start_date or now[:10]

        # Generate employee number
        emp_count = (
            self.supabase.table("employees")
            .select("id", count="exact")
            .execute()
        )
        emp_number = f"EMP-{(emp_count.count or 0) + 1:05d}"

        # Create employee record
        emp_result = (
            self.supabase.table("employees")
            .insert(
                {
                    "user_id": user_id,
                    "application_id": request.application_id,
                    "employee_number": emp_number,
                    "status": EmployeeStatus.ACTIVE.value,
                    "hire_date": hire_date,
                    "job_title": request.job_title,
                    "department": request.department,
                    "pay_rate": request.pay_rate,
                    "pay_type": request.pay_type,
                    "start_date": request.start_date,
                    "notes": request.notes,
                    "created_at": now,
                    "updated_at": now,
                }
            )
            .execute()
        )

        if not emp_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create employee record",
            )

        # Update application status to hired
        self.supabase.table("applications").update(
            {"status": ApplicationStatus.HIRED.value, "updated_at": now}
        ).eq("id", request.application_id).execute()

        # Update user role to employee
        self.supabase.table("profiles").update(
            {"role": UserRole.EMPLOYEE.value, "updated_at": now}
        ).eq("id", user_id).execute()

        e = emp_result.data[0]
        profile = app.get("profiles", {}) or {}

        return EmployeeResponse(
            id=e["id"],
            user_id=e["user_id"],
            application_id=e["application_id"],
            employee_number=e.get("employee_number"),
            status=EmployeeStatus(e["status"]),
            hire_date=e["hire_date"],
            job_title=e.get("job_title"),
            department=e.get("department"),
            pay_rate=e.get("pay_rate"),
            pay_type=e.get("pay_type"),
            start_date=e.get("start_date"),
            first_name=profile.get("first_name"),
            last_name=profile.get("last_name"),
            email=profile.get("email"),
            created_at=e.get("created_at"),
            updated_at=e.get("updated_at"),
        )

    def get_employees(
        self,
        page: int = 1,
        page_size: int = 25,
        status_filter: Optional[EmployeeStatus] = None,
        search: Optional[str] = None,
    ) -> tuple[List[EmployeeResponse], int]:
        """List employees with optional filtering."""
        query = (
            self.supabase.table("employees")
            .select("*, profiles(first_name, last_name, email)", count="exact")
        )

        if status_filter:
            query = query.eq("status", status_filter.value)

        offset = (page - 1) * page_size
        result = query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()

        employees = []
        for e in result.data or []:
            profile = e.get("profiles", {}) or {}
            emp = EmployeeResponse(
                id=e["id"],
                user_id=e["user_id"],
                application_id=e["application_id"],
                employee_number=e.get("employee_number"),
                status=EmployeeStatus(e["status"]),
                hire_date=e["hire_date"],
                job_title=e.get("job_title"),
                department=e.get("department"),
                pay_rate=e.get("pay_rate"),
                pay_type=e.get("pay_type"),
                start_date=e.get("start_date"),
                termination_date=e.get("termination_date"),
                termination_reason=e.get("termination_reason"),
                first_name=profile.get("first_name"),
                last_name=profile.get("last_name"),
                email=profile.get("email"),
                created_at=e.get("created_at"),
                updated_at=e.get("updated_at"),
            )
            employees.append(emp)

        return employees, result.count or len(employees)

    def get_employee(self, emp_id: str) -> EmployeeResponse:
        """Get a single employee by ID."""
        result = (
            self.supabase.table("employees")
            .select("*, profiles(first_name, last_name, email)")
            .eq("id", emp_id)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found",
            )

        e = result.data
        profile = e.get("profiles", {}) or {}

        return EmployeeResponse(
            id=e["id"],
            user_id=e["user_id"],
            application_id=e["application_id"],
            employee_number=e.get("employee_number"),
            status=EmployeeStatus(e["status"]),
            hire_date=e["hire_date"],
            job_title=e.get("job_title"),
            department=e.get("department"),
            pay_rate=e.get("pay_rate"),
            pay_type=e.get("pay_type"),
            start_date=e.get("start_date"),
            termination_date=e.get("termination_date"),
            termination_reason=e.get("termination_reason"),
            notes=e.get("notes"),
            first_name=profile.get("first_name"),
            last_name=profile.get("last_name"),
            email=profile.get("email"),
            created_at=e.get("created_at"),
            updated_at=e.get("updated_at"),
        )

    def update_employee(self, emp_id: str, update: EmployeeUpdate) -> EmployeeResponse:
        """Update employee details."""
        now = datetime.now(timezone.utc).isoformat()
        update_data = {k: v for k, v in update.model_dump(exclude_none=True).items()}

        if "status" in update_data:
            update_data["status"] = update_data["status"].value if hasattr(update_data["status"], "value") else update_data["status"]

        update_data["updated_at"] = now

        result = (
            self.supabase.table("employees")
            .update(update_data)
            .eq("id", emp_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found",
            )

        return self.get_employee(emp_id)

    def assign_client(
        self, emp_id: str, request: ClientAssignmentRequest, admin_id: str
    ) -> ClientAssignmentResponse:
        """Assign a client to an employee."""
        # Verify employee exists
        self.get_employee(emp_id)

        # Verify client exists
        client_result = (
            self.supabase.table("clients")
            .select("id, first_name, last_name")
            .eq("id", request.client_id)
            .single()
            .execute()
        )

        if not client_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found",
            )

        client = client_result.data
        now = datetime.now(timezone.utc).isoformat()

        assignment_result = (
            self.supabase.table("employee_client_assignments")
            .insert(
                {
                    "employee_id": emp_id,
                    "client_id": request.client_id,
                    "assigned_by": admin_id,
                    "start_date": request.start_date,
                    "end_date": request.end_date,
                    "schedule": request.schedule,
                    "notes": request.notes,
                    "is_active": True,
                    "created_at": now,
                }
            )
            .execute()
        )

        if not assignment_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create assignment",
            )

        a = assignment_result.data[0]
        return ClientAssignmentResponse(
            id=a["id"],
            employee_id=a["employee_id"],
            client_id=a["client_id"],
            client_name=f"{client['first_name']} {client['last_name']}",
            assigned_by=a.get("assigned_by"),
            start_date=a["start_date"],
            end_date=a.get("end_date"),
            schedule=a.get("schedule"),
            notes=a.get("notes"),
            is_active=a.get("is_active", True),
            created_at=a.get("created_at"),
        )

    def get_assignments(self, emp_id: str) -> List[ClientAssignmentResponse]:
        """Get all client assignments for an employee."""
        result = (
            self.supabase.table("employee_client_assignments")
            .select("*, clients(first_name, last_name)")
            .eq("employee_id", emp_id)
            .order("created_at", desc=True)
            .execute()
        )

        assignments = []
        for a in result.data or []:
            client = a.get("clients", {}) or {}
            assignments.append(
                ClientAssignmentResponse(
                    id=a["id"],
                    employee_id=a["employee_id"],
                    client_id=a["client_id"],
                    client_name=f"{client.get('first_name', '')} {client.get('last_name', '')}".strip() or None,
                    assigned_by=a.get("assigned_by"),
                    start_date=a["start_date"],
                    end_date=a.get("end_date"),
                    schedule=a.get("schedule"),
                    notes=a.get("notes"),
                    is_active=a.get("is_active", True),
                    created_at=a.get("created_at"),
                )
            )

        return assignments
