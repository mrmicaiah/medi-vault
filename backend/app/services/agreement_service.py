"""Agreement signing and management service."""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, status
from supabase import Client

from app.models.agreement import Agreement, AgreementType, STEP_AGREEMENT_MAP
from app.schemas.agreement import (
    AgreementResponse,
    AgreementSignRequest,
)


class AgreementService:
    """Handles agreement signing, storage, and retrieval."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    def sign_agreement(
        self,
        request: AgreementSignRequest,
        user_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AgreementResponse:
        """Sign an agreement and store the record."""
        # Verify the application belongs to the user
        app_result = (
            self.supabase.table("applications")
            .select("id, status, user_id")
            .eq("id", request.application_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )

        if not app_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found",
            )

        if app_result.data["status"] not in ("in_progress", "not_started"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application is not in a modifiable state",
            )

        # Check if this agreement type was already signed for this application
        existing = (
            self.supabase.table("agreements")
            .select("id")
            .eq("application_id", request.application_id)
            .eq("agreement_type", request.agreement_type.value)
            .execute()
        )

        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Agreement '{request.agreement_type.value}' already signed for this application",
            )

        now = datetime.now(timezone.utc).isoformat()

        # Create the agreement record
        agreement_result = (
            self.supabase.table("agreements")
            .insert(
                {
                    "user_id": user_id,
                    "application_id": request.application_id,
                    "agreement_type": request.agreement_type.value,
                    "signature_text": request.signature_text,
                    "signed_at": now,
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                    "created_at": now,
                }
            )
            .execute()
        )

        if not agreement_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create agreement record",
            )

        # Mark the corresponding application step as completed
        if request.step_number:
            self.supabase.table("application_steps").update(
                {
                    "status": "completed",
                    "data": {
                        "agreement_type": request.agreement_type.value,
                        "signature_text": request.signature_text,
                        "signed_at": now,
                    },
                    "completed_at": now,
                    "updated_at": now,
                }
            ).eq("application_id", request.application_id).eq(
                "step_number", request.step_number
            ).execute()

            # Update completed steps count
            completed_result = (
                self.supabase.table("application_steps")
                .select("id", count="exact")
                .eq("application_id", request.application_id)
                .eq("status", "completed")
                .execute()
            )
            completed_count = completed_result.count or 0

            self.supabase.table("applications").update(
                {
                    "completed_steps": completed_count,
                    "current_step": min(request.step_number + 1, 22),
                    "updated_at": now,
                }
            ).eq("id", request.application_id).execute()

        a = agreement_result.data[0]
        return AgreementResponse(
            id=a["id"],
            user_id=a["user_id"],
            application_id=a["application_id"],
            agreement_type=AgreementType(a["agreement_type"]),
            signature_text=a["signature_text"],
            signed_at=a["signed_at"],
            ip_address=a.get("ip_address"),
            pdf_path=a.get("pdf_path"),
            pdf_url=a.get("pdf_url"),
            created_at=a.get("created_at"),
        )

    def get_user_agreements(
        self, user_id: str, application_id: Optional[str] = None
    ) -> List[AgreementResponse]:
        """Get all agreements for a user, optionally filtered by application."""
        query = (
            self.supabase.table("agreements")
            .select("*")
            .eq("user_id", user_id)
        )

        if application_id:
            query = query.eq("application_id", application_id)

        result = query.order("created_at", desc=True).execute()

        return [
            AgreementResponse(
                id=a["id"],
                user_id=a["user_id"],
                application_id=a["application_id"],
                agreement_type=AgreementType(a["agreement_type"]),
                signature_text=a["signature_text"],
                signed_at=a["signed_at"],
                ip_address=a.get("ip_address"),
                pdf_path=a.get("pdf_path"),
                pdf_url=a.get("pdf_url"),
                created_at=a.get("created_at"),
            )
            for a in (result.data or [])
        ]

    def get_agreement(self, agreement_id: str, user_id: Optional[str] = None) -> AgreementResponse:
        """Get a single agreement by ID."""
        query = self.supabase.table("agreements").select("*").eq("id", agreement_id)
        if user_id:
            query = query.eq("user_id", user_id)

        result = query.single().execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agreement not found",
            )

        a = result.data
        return AgreementResponse(
            id=a["id"],
            user_id=a["user_id"],
            application_id=a["application_id"],
            agreement_type=AgreementType(a["agreement_type"]),
            signature_text=a["signature_text"],
            signed_at=a["signed_at"],
            ip_address=a.get("ip_address"),
            pdf_path=a.get("pdf_path"),
            pdf_url=a.get("pdf_url"),
            created_at=a.get("created_at"),
        )

    def update_agreement_pdf(self, agreement_id: str, pdf_path: str, pdf_url: str) -> None:
        """Update agreement with generated PDF path and URL."""
        self.supabase.table("agreements").update(
            {"pdf_path": pdf_path, "pdf_url": pdf_url}
        ).eq("id", agreement_id).execute()
