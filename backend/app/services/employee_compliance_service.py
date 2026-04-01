"""Employee compliance document service."""

import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import HTTPException, UploadFile, status
from supabase import Client

from app.schemas.compliance import (
    ComplianceDocumentUpload,
    ComplianceDocumentResponse,
    ComplianceDocumentListResponse,
    EmployeeComplianceSummary,
    ComplianceStatusResponse,
)


# Allowed document types
COMPLIANCE_DOCUMENT_TYPES = {
    "background_check",
    "oig_exclusion_check",
    "state_exclusion_check",
    "license",
    "certification",
    "tb_test",
    "cpr_certification",
    "first_aid",
    "training_record",
    "drug_screening",
    "physical_exam",
    "other",
}


class EmployeeComplianceService:
    """Handles employee compliance document management."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    def upload_compliance_document(
        self,
        employee_id: str,
        metadata: ComplianceDocumentUpload,
        file: Optional[UploadFile],
        uploaded_by: str,
    ) -> ComplianceDocumentResponse:
        """Upload a compliance document for an employee."""
        # Validate document type
        if metadata.document_type not in COMPLIANCE_DOCUMENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid document type. Must be one of: {', '.join(COMPLIANCE_DOCUMENT_TYPES)}",
            )

        # Verify employee exists
        emp_result = (
            self.supabase.table("employees")
            .select("id")
            .eq("id", employee_id)
            .single()
            .execute()
        )
        if not emp_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found",
            )

        now = datetime.now(timezone.utc).isoformat()
        file_path = None
        file_name = None
        mime_type = None
        file_size = None

        # Upload file to Supabase Storage if provided
        if file:
            file_ext = file.filename.split(".")[-1] if file.filename else "pdf"
            storage_filename = f"{uuid.uuid4()}.{file_ext}"
            file_path = f"compliance/{employee_id}/{metadata.document_type}/{storage_filename}"
            
            file_content = file.file.read()
            file_size = len(file_content)
            file.file.seek(0)  # Reset for potential reuse

            try:
                self.supabase.storage.from_("documents").upload(
                    file_path,
                    file_content,
                    {"content-type": file.content_type or "application/octet-stream"},
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to upload file: {str(e)}",
                )

            file_name = file.filename
            mime_type = file.content_type

        # Determine status
        doc_status = "valid"
        if metadata.check_result == "pending":
            doc_status = "pending"
        elif metadata.check_result == "match_found":
            doc_status = "rejected"
        elif metadata.expiration_date:
            exp_date = datetime.fromisoformat(metadata.expiration_date.replace("Z", "+00:00"))
            if exp_date.date() < datetime.now(timezone.utc).date():
                doc_status = "expired"

        # Create database record
        doc_data = {
            "employee_id": employee_id,
            "document_type": metadata.document_type,
            "document_name": metadata.document_name,
            "description": metadata.description,
            "file_path": file_path,
            "file_name": file_name,
            "mime_type": mime_type,
            "file_size": file_size,
            "effective_date": metadata.effective_date,
            "expiration_date": metadata.expiration_date,
            "status": doc_status,
            "check_result": metadata.check_result,
            "uploaded_by": uploaded_by,
            "notes": metadata.notes,
            "created_at": now,
            "updated_at": now,
        }

        result = (
            self.supabase.table("employee_compliance_documents")
            .insert(doc_data)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create compliance document record",
            )

        return self._to_response(result.data[0])

    def get_employee_compliance_documents(
        self,
        employee_id: str,
        document_type: Optional[str] = None,
    ) -> ComplianceDocumentListResponse:
        """Get all compliance documents for an employee."""
        query = (
            self.supabase.table("employee_compliance_documents")
            .select("*, profiles:uploaded_by(first_name, last_name)")
            .eq("employee_id", employee_id)
        )

        if document_type:
            query = query.eq("document_type", document_type)

        result = query.order("effective_date", desc=True).execute()

        documents = [self._to_response(d) for d in result.data or []]
        return ComplianceDocumentListResponse(
            items=documents,
            total=len(documents),
        )

    def get_compliance_summary(self, employee_id: str) -> EmployeeComplianceSummary:
        """Get compliance summary for an employee."""
        docs_result = (
            self.supabase.table("employee_compliance_documents")
            .select("*")
            .eq("employee_id", employee_id)
            .order("effective_date", desc=True)
            .execute()
        )

        documents = [self._to_response(d) for d in docs_result.data or []]

        # Count by status
        valid_count = sum(1 for d in documents if d.status == "valid")
        expired_count = sum(1 for d in documents if d.status == "expired")
        pending_count = sum(1 for d in documents if d.status == "pending")

        # Find latest of key document types
        background_check = None
        oig_check = None
        
        for doc in documents:
            if doc.document_type == "background_check" and not background_check:
                background_check = doc
            elif doc.document_type == "oig_exclusion_check" and not oig_check:
                oig_check = doc

        # Generate alerts
        alerts = []
        
        if not background_check:
            alerts.append("No background check on file")
        elif background_check.status == "expired":
            alerts.append("Background check has expired")
        elif background_check.status == "pending":
            alerts.append("Background check pending review")

        if not oig_check:
            alerts.append("No OIG exclusion check on file")
        else:
            # OIG checks should be monthly
            check_date = datetime.fromisoformat(
                oig_check.effective_date.replace("Z", "+00:00")
            ).date()
            days_since = (datetime.now(timezone.utc).date() - check_date).days
            if days_since > 31:
                alerts.append(f"OIG check is {days_since} days old (monthly required)")

        # Determine overall compliance
        is_compliant = (
            background_check is not None
            and background_check.status == "valid"
            and oig_check is not None
            and oig_check.status == "valid"
            and oig_check.check_result == "clear"
        )

        # Also check OIG is recent (within 31 days)
        if oig_check:
            check_date = datetime.fromisoformat(
                oig_check.effective_date.replace("Z", "+00:00")
            ).date()
            if (datetime.now(timezone.utc).date() - check_date).days > 31:
                is_compliant = False

        return EmployeeComplianceSummary(
            employee_id=employee_id,
            is_compliant=is_compliant,
            total_documents=len(documents),
            valid_documents=valid_count,
            expired_documents=expired_count,
            pending_documents=pending_count,
            background_check=background_check,
            oig_exclusion_check=oig_check,
            documents=documents,
            alerts=alerts,
        )

    def get_all_compliance_status(
        self,
        agency_id: str,
    ) -> List[ComplianceStatusResponse]:
        """Get compliance status for all active employees in an agency."""
        # Use the view we created
        result = (
            self.supabase.rpc(
                "get_employee_compliance_status",
                {"p_agency_id": agency_id}
            ).execute()
        )

        # If the RPC doesn't exist, fall back to manual query
        if not result.data:
            # Get all active employees
            emp_result = (
                self.supabase.table("employees")
                .select("id, employee_number, user_id, profiles(first_name, last_name)")
                .eq("status", "active")
                .execute()
            )

            statuses = []
            for emp in emp_result.data or []:
                summary = self.get_compliance_summary(emp["id"])
                profile = emp.get("profiles", {}) or {}
                
                statuses.append(
                    ComplianceStatusResponse(
                        employee_id=emp["id"],
                        employee_number=emp.get("employee_number"),
                        first_name=profile.get("first_name", ""),
                        last_name=profile.get("last_name", ""),
                        employee_status="active",
                        background_check_status=summary.background_check.status if summary.background_check else None,
                        background_check_date=summary.background_check.effective_date if summary.background_check else None,
                        background_check_expires=summary.background_check.expiration_date if summary.background_check else None,
                        oig_check_status=summary.oig_exclusion_check.status if summary.oig_exclusion_check else None,
                        oig_check_date=summary.oig_exclusion_check.effective_date if summary.oig_exclusion_check else None,
                        oig_check_result=summary.oig_exclusion_check.check_result if summary.oig_exclusion_check else None,
                        is_compliant=summary.is_compliant,
                    )
                )

            return statuses

        return [ComplianceStatusResponse(**row) for row in result.data]

    def delete_compliance_document(self, document_id: str, employee_id: str) -> bool:
        """Delete a compliance document."""
        # Get the document first to delete the file
        doc_result = (
            self.supabase.table("employee_compliance_documents")
            .select("file_path")
            .eq("id", document_id)
            .eq("employee_id", employee_id)
            .single()
            .execute()
        )

        if not doc_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )

        # Delete file from storage if it exists
        if doc_result.data.get("file_path"):
            try:
                self.supabase.storage.from_("documents").remove(
                    [doc_result.data["file_path"]]
                )
            except Exception:
                pass  # File might not exist, continue anyway

        # Delete database record
        self.supabase.table("employee_compliance_documents").delete().eq(
            "id", document_id
        ).execute()

        return True

    def get_document_download_url(self, document_id: str, employee_id: str) -> str:
        """Get a signed URL for downloading a compliance document."""
        doc_result = (
            self.supabase.table("employee_compliance_documents")
            .select("file_path, file_name")
            .eq("id", document_id)
            .eq("employee_id", employee_id)
            .single()
            .execute()
        )

        if not doc_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )

        if not doc_result.data.get("file_path"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No file attached to this document",
            )

        # Generate signed URL (valid for 1 hour)
        signed_url = self.supabase.storage.from_("documents").create_signed_url(
            doc_result.data["file_path"],
            3600,
        )

        return signed_url.get("signedURL", "")

    def _to_response(self, data: dict) -> ComplianceDocumentResponse:
        """Convert database row to response model."""
        uploader = data.get("profiles", {}) or {}
        uploader_name = None
        if uploader:
            name_parts = [uploader.get("first_name", ""), uploader.get("last_name", "")]
            uploader_name = " ".join(p for p in name_parts if p).strip() or None

        return ComplianceDocumentResponse(
            id=data["id"],
            employee_id=data["employee_id"],
            document_type=data["document_type"],
            document_name=data["document_name"],
            description=data.get("description"),
            file_path=data.get("file_path"),
            file_name=data.get("file_name"),
            mime_type=data.get("mime_type"),
            file_size=data.get("file_size"),
            effective_date=data["effective_date"],
            expiration_date=data.get("expiration_date"),
            status=data.get("status", "valid"),
            check_result=data.get("check_result"),
            check_details=data.get("check_details"),
            uploaded_by=data.get("uploaded_by"),
            uploaded_by_name=uploader_name,
            verified_by=data.get("verified_by"),
            verified_at=data.get("verified_at"),
            notes=data.get("notes"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )
