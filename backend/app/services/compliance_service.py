"""Compliance reporting and audit service."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from supabase import Client

from app.models.document import DocumentType
from app.schemas.admin import ComplianceReport


# Required document types for a fully compliant employee
REQUIRED_DOCUMENTS = [
    DocumentType.WORK_AUTHORIZATION,
    DocumentType.ID_FRONT,
    DocumentType.ID_BACK,
    DocumentType.SOCIAL_SECURITY_CARD,
    DocumentType.PROFESSIONAL_CREDENTIALS,
    DocumentType.CPR_CERTIFICATION,
    DocumentType.TB_TEST_RESULTS,
]


class ComplianceService:
    """Handles compliance checks, expiration tracking, and audit queries."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    def get_compliance_report(self) -> ComplianceReport:
        """Generate a full compliance report across all employees."""
        now = datetime.now(timezone.utc)
        d30 = (now + timedelta(days=30)).isoformat()
        d60 = (now + timedelta(days=60)).isoformat()
        d90 = (now + timedelta(days=90)).isoformat()

        # Get all active employees
        emp_result = (
            self.supabase.table("employees")
            .select("id, user_id, profiles(first_name, last_name)")
            .eq("status", "active")
            .execute()
        )

        employees = emp_result.data or []
        total = len(employees)

        fully_compliant = 0
        partially_compliant = 0
        non_compliant = 0
        total_missing = 0
        total_expired = 0
        exp_30 = 0
        exp_60 = 0
        exp_90 = 0
        details = []

        for emp in employees:
            user_id = emp["user_id"]
            profile = emp.get("profiles", {}) or {}
            name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()

            # Get current documents for this employee
            docs_result = (
                self.supabase.table("documents")
                .select("document_type, expires_at")
                .eq("user_id", user_id)
                .eq("is_current", True)
                .execute()
            )

            docs = docs_result.data or []
            doc_types = {d["document_type"] for d in docs}

            # Check missing
            missing = [dt.value for dt in REQUIRED_DOCUMENTS if dt.value not in doc_types]
            total_missing += len(missing)

            # Check expired and expiring
            emp_expired = 0
            emp_expiring = 0
            for d in docs:
                if d.get("expires_at"):
                    exp_dt = d["expires_at"]
                    if exp_dt < now.isoformat():
                        emp_expired += 1
                        total_expired += 1
                    elif exp_dt <= d30:
                        emp_expiring += 1
                        exp_30 += 1
                    elif exp_dt <= d60:
                        exp_60 += 1
                    elif exp_dt <= d90:
                        exp_90 += 1

            # Classify compliance
            if not missing and emp_expired == 0:
                fully_compliant += 1
                comp_status = "compliant"
            elif len(missing) <= 2 and emp_expired == 0:
                partially_compliant += 1
                comp_status = "partial"
            else:
                non_compliant += 1
                comp_status = "non_compliant"

            details.append(
                {
                    "employee_id": emp["id"],
                    "user_id": user_id,
                    "name": name,
                    "status": comp_status,
                    "missing_documents": missing,
                    "expired_count": emp_expired,
                    "expiring_count": emp_expiring,
                }
            )

        compliance_rate = (fully_compliant / total * 100) if total > 0 else 0.0

        return ComplianceReport(
            total_employees=total,
            fully_compliant=fully_compliant,
            partially_compliant=partially_compliant,
            non_compliant=non_compliant,
            expiring_within_30_days=exp_30,
            expiring_within_60_days=exp_60,
            expiring_within_90_days=exp_90,
            expired_documents=total_expired,
            missing_documents=total_missing,
            compliance_rate=round(compliance_rate, 1),
            details=details,
        )

    def get_expiring_documents(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get documents expiring within the given number of days."""
        now = datetime.now(timezone.utc)
        cutoff = (now + timedelta(days=days)).isoformat()

        result = (
            self.supabase.table("documents")
            .select("*, profiles(first_name, last_name, email)")
            .eq("is_current", True)
            .not_.is_("expires_at", "null")
            .lte("expires_at", cutoff)
            .gte("expires_at", now.isoformat())
            .order("expires_at")
            .execute()
        )

        items = []
        for d in result.data or []:
            profile = d.get("profiles", {}) or {}
            exp_date = datetime.fromisoformat(d["expires_at"].replace("Z", "+00:00"))
            items.append(
                {
                    "id": d["id"],
                    "user_id": d["user_id"],
                    "employee_name": f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip(),
                    "email": profile.get("email"),
                    "document_type": d["document_type"],
                    "file_name": d["file_name"],
                    "expires_at": d["expires_at"],
                    "days_until_expiry": (exp_date - now).days,
                }
            )

        return items

    def get_expired_documents(self) -> List[Dict[str, Any]]:
        """Get all currently expired documents."""
        now = datetime.now(timezone.utc).isoformat()

        result = (
            self.supabase.table("documents")
            .select("*, profiles(first_name, last_name, email)")
            .eq("is_current", True)
            .not_.is_("expires_at", "null")
            .lt("expires_at", now)
            .order("expires_at")
            .execute()
        )

        items = []
        for d in result.data or []:
            profile = d.get("profiles", {}) or {}
            items.append(
                {
                    "id": d["id"],
                    "user_id": d["user_id"],
                    "employee_name": f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip(),
                    "email": profile.get("email"),
                    "document_type": d["document_type"],
                    "file_name": d["file_name"],
                    "expires_at": d["expires_at"],
                }
            )

        return items

    def get_missing_documents(self) -> List[Dict[str, Any]]:
        """Get a report of missing required documents per active employee."""
        emp_result = (
            self.supabase.table("employees")
            .select("id, user_id, profiles(first_name, last_name, email)")
            .eq("status", "active")
            .execute()
        )

        items = []
        for emp in emp_result.data or []:
            user_id = emp["user_id"]
            profile = emp.get("profiles", {}) or {}

            docs_result = (
                self.supabase.table("documents")
                .select("document_type")
                .eq("user_id", user_id)
                .eq("is_current", True)
                .execute()
            )

            doc_types = {d["document_type"] for d in (docs_result.data or [])}
            missing = [dt.value for dt in REQUIRED_DOCUMENTS if dt.value not in doc_types]

            if missing:
                items.append(
                    {
                        "employee_id": emp["id"],
                        "user_id": user_id,
                        "employee_name": f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip(),
                        "email": profile.get("email"),
                        "missing_documents": missing,
                        "missing_count": len(missing),
                    }
                )

        return items

    def get_point_in_time(self, employee_id: str, as_of_date: Optional[str] = None) -> Dict[str, Any]:
        """Get compliance status for an employee at a specific point in time."""
        # Get employee info
        emp_result = (
            self.supabase.table("employees")
            .select("*, profiles(first_name, last_name, email)")
            .eq("id", employee_id)
            .single()
            .execute()
        )

        if not emp_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found",
            )

        emp = emp_result.data
        user_id = emp["user_id"]
        profile = emp.get("profiles", {}) or {}

        if as_of_date:
            ref_date = as_of_date
        else:
            ref_date = datetime.now(timezone.utc).isoformat()

        # Get documents that were current as of the reference date
        docs_result = (
            self.supabase.table("documents")
            .select("*")
            .eq("user_id", user_id)
            .lte("created_at", ref_date)
            .order("created_at", desc=True)
            .execute()
        )

        # Build document status at that point in time
        doc_status = {}
        for d in docs_result.data or []:
            dt = d["document_type"]
            if dt not in doc_status:
                expired = False
                if d.get("expires_at") and d["expires_at"] < ref_date:
                    expired = True
                doc_status[dt] = {
                    "document_type": dt,
                    "file_name": d["file_name"],
                    "uploaded_at": d["created_at"],
                    "expires_at": d.get("expires_at"),
                    "was_expired": expired,
                    "version": d["version"],
                }

        # Identify missing
        missing = [dt.value for dt in REQUIRED_DOCUMENTS if dt.value not in doc_status]

        # Get agreements
        agreements_result = (
            self.supabase.table("agreements")
            .select("agreement_type, signed_at")
            .eq("user_id", user_id)
            .lte("created_at", ref_date)
            .execute()
        )

        return {
            "employee_id": employee_id,
            "employee_name": f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip(),
            "as_of_date": ref_date,
            "documents": list(doc_status.values()),
            "missing_documents": missing,
            "agreements": agreements_result.data or [],
            "is_compliant": len(missing) == 0 and all(
                not d.get("was_expired") for d in doc_status.values()
            ),
        }

    def get_client_audit(self, client_id: str) -> Dict[str, Any]:
        """Audit all employees assigned to a client and their compliance."""
        # Verify client
        client_result = (
            self.supabase.table("clients")
            .select("*")
            .eq("id", client_id)
            .single()
            .execute()
        )

        if not client_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found",
            )

        client = client_result.data

        # Get all assignments for this client
        assignments = (
            self.supabase.table("employee_client_assignments")
            .select("*, employees(id, user_id, employee_number, status, profiles(first_name, last_name))")
            .eq("client_id", client_id)
            .eq("is_active", True)
            .execute()
        )

        employee_audits = []
        all_compliant = True

        for a in assignments.data or []:
            emp = a.get("employees", {}) or {}
            profile = emp.get("profiles", {}) or {}
            emp_id = emp.get("id") or a.get("employee_id")

            if emp_id:
                pit = self.get_point_in_time(emp_id)
                if not pit["is_compliant"]:
                    all_compliant = False

                employee_audits.append(
                    {
                        "employee_id": emp_id,
                        "employee_number": emp.get("employee_number"),
                        "employee_name": f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip(),
                        "assignment_start": a["start_date"],
                        "assignment_end": a.get("end_date"),
                        "is_compliant": pit["is_compliant"],
                        "missing_documents": pit["missing_documents"],
                        "documents": pit["documents"],
                    }
                )

        return {
            "client_id": client_id,
            "client_name": f"{client['first_name']} {client['last_name']}",
            "total_assigned_employees": len(employee_audits),
            "all_employees_compliant": all_compliant,
            "employees": employee_audits,
        }
