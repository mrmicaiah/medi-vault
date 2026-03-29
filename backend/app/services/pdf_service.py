"""PDF generation service using Jinja2 and WeasyPrint."""

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, status
from jinja2 import Environment, FileSystemLoader
from supabase import Client
from weasyprint import HTML

from app.config import get_settings
from app.models.agreement import AGREEMENT_TEMPLATE_MAP, AgreementType


class PDFService:
    """Generates PDF documents from Jinja2 templates and uploads to Supabase Storage."""

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.settings = get_settings()
        templates_dir = Path(__file__).parent.parent / "templates"
        self.env = Environment(
            loader=FileSystemLoader(str(templates_dir)),
            autoescape=True,
        )

    def generate_agreement_pdf(
        self,
        agreement_type: AgreementType,
        applicant_first_name: str,
        applicant_last_name: str,
        signature_text: str,
        signed_at: str,
        ip_address: Optional[str] = None,
        agreement_id: Optional[str] = None,
    ) -> tuple[bytes, str]:
        """Render an agreement template to PDF and return the bytes and storage path."""
        template_name = AGREEMENT_TEMPLATE_MAP.get(agreement_type)
        if not template_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No template found for agreement type: {agreement_type.value}",
            )

        try:
            template = self.env.get_template(template_name)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Template loading failed: {str(exc)}",
            )

        # Parse the signed_at date for display
        try:
            signed_date = datetime.fromisoformat(signed_at.replace("Z", "+00:00"))
            date_display = signed_date.strftime("%B %d, %Y at %I:%M %p UTC")
            date_short = signed_date.strftime("%Y-%m-%d")
        except Exception:
            date_display = signed_at
            date_short = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Render the template
        html_content = template.render(
            applicant_name=f"{applicant_first_name} {applicant_last_name}",
            first_name=applicant_first_name,
            last_name=applicant_last_name,
            signature_text=signature_text,
            signed_at=date_display,
            date=date_short,
            ip_address=ip_address or "N/A",
            agreement_type=agreement_type.value,
            company_name="MediVault Home Care Agency",
            generated_at=datetime.now(timezone.utc).strftime("%B %d, %Y at %I:%M %p UTC"),
        )

        # Convert HTML to PDF
        try:
            pdf_bytes = HTML(string=html_content).write_pdf()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"PDF generation failed: {str(exc)}",
            )

        # Build filename: Last_First_Type_YYYY-MM-DD.pdf
        safe_last = applicant_last_name.replace(" ", "_")
        safe_first = applicant_first_name.replace(" ", "_")
        type_label = agreement_type.value.replace("_", "-")
        filename = f"{safe_last}_{safe_first}_{type_label}_{date_short}.pdf"
        storage_path = f"agreements/{filename}"

        return pdf_bytes, storage_path

    def upload_pdf(self, pdf_bytes: bytes, storage_path: str) -> str:
        """Upload PDF bytes to Supabase Storage and return a signed URL."""
        try:
            self.supabase.storage.from_(self.settings.agreements_bucket).upload(
                storage_path, pdf_bytes, {"content-type": "application/pdf"}
            )
        except Exception as exc:
            # If file already exists, try removing and re-uploading
            try:
                self.supabase.storage.from_(self.settings.agreements_bucket).remove([storage_path])
                self.supabase.storage.from_(self.settings.agreements_bucket).upload(
                    storage_path, pdf_bytes, {"content-type": "application/pdf"}
                )
            except Exception as inner_exc:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"PDF upload failed: {str(inner_exc)}",
                )

        # Generate a signed URL (1 hour)
        try:
            url_result = self.supabase.storage.from_(
                self.settings.agreements_bucket
            ).create_signed_url(storage_path, 3600)
            if isinstance(url_result, dict):
                return url_result.get("signedURL", "")
            return getattr(url_result, "signed_url", "")
        except Exception:
            return ""

    def generate_and_upload_agreement(
        self,
        agreement_type: AgreementType,
        applicant_first_name: str,
        applicant_last_name: str,
        signature_text: str,
        signed_at: str,
        ip_address: Optional[str] = None,
    ) -> tuple[str, str]:
        """Generate a PDF and upload it. Returns (storage_path, signed_url)."""
        pdf_bytes, storage_path = self.generate_agreement_pdf(
            agreement_type=agreement_type,
            applicant_first_name=applicant_first_name,
            applicant_last_name=applicant_last_name,
            signature_text=signature_text,
            signed_at=signed_at,
            ip_address=ip_address,
        )

        signed_url = self.upload_pdf(pdf_bytes, storage_path)
        return storage_path, signed_url

    def get_agreement_pdf_url(self, storage_path: str) -> str:
        """Get a fresh signed URL for an existing agreement PDF."""
        try:
            url_result = self.supabase.storage.from_(
                self.settings.agreements_bucket
            ).create_signed_url(storage_path, 3600)
            if isinstance(url_result, dict):
                return url_result.get("signedURL", "")
            return getattr(url_result, "signed_url", "")
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"PDF not found: {str(exc)}",
            )
