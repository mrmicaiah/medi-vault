"""PDF generation service - lazily imports WeasyPrint to avoid startup failures."""

import os
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger(__name__)

# Lazy imports for WeasyPrint - only load when actually generating PDFs
_weasyprint_html = None
_weasyprint_css = None

def _get_weasyprint():
    """Lazy load WeasyPrint to avoid import errors on systems without GTK."""
    global _weasyprint_html, _weasyprint_css
    if _weasyprint_html is None:
        try:
            from weasyprint import HTML, CSS
            _weasyprint_html = HTML
            _weasyprint_css = CSS
        except OSError as e:
            logger.error(f"WeasyPrint not available: {e}")
            raise RuntimeError(
                "PDF generation requires WeasyPrint with GTK libraries. "
                "On Windows, see: https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows"
            )
    return _weasyprint_html, _weasyprint_css


# Template directory
TEMPLATE_DIR = Path(__file__).parent.parent / "templates"

# Initialize Jinja2 environment
env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=True,
)


class PDFService:
    """Generates PDF documents from HTML templates."""

    def __init__(self):
        self.template_dir = TEMPLATE_DIR
        self.css_path = TEMPLATE_DIR / "application_styles.css"

    def _render_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """Render a Jinja2 template with the given context."""
        template = env.get_template(template_name)
        return template.render(**context)

    def _generate_pdf(self, html_content: str) -> bytes:
        """Convert HTML content to PDF bytes."""
        HTML, CSS = _get_weasyprint()
        
        # Load CSS
        css = None
        if self.css_path.exists():
            css = CSS(filename=str(self.css_path))

        # Generate PDF
        html = HTML(string=html_content)
        if css:
            return html.write_pdf(stylesheets=[css])
        return html.write_pdf()

    def generate_employment_application(
        self,
        applicant_data: Dict[str, Any],
        steps_data: Dict[int, Dict[str, Any]],
    ) -> bytes:
        """Generate the employment application PDF."""
        # Build context from application steps
        context = {
            "applicant": applicant_data,
            "personal_info": steps_data.get(1, {}),
            "contact_info": steps_data.get(2, {}),
            "position_info": steps_data.get(3, {}),
            "education": steps_data.get(4, {}),
            "employment_history": steps_data.get(5, {}),
            "references": steps_data.get(6, {}),
            "skills": steps_data.get(7, {}),
            "availability": steps_data.get(8, {}),
            "generated_at": datetime.now().strftime("%B %d, %Y at %I:%M %p"),
        }

        html = self._render_template("employment_application.html", context)
        return self._generate_pdf(html)

    def generate_agreement_pdf(
        self,
        agreement_type: str,
        applicant_data: Dict[str, Any],
        agreement_data: Dict[str, Any],
    ) -> bytes:
        """Generate a signed agreement PDF."""
        template_map = {
            "confidentiality": "confidentiality_agreement.html",
            "esignature": "esignature_consent.html",
            "esignature_consent": "esignature_consent.html",
            "orientation": "orientation_acknowledgment.html",
            "criminal_background": "criminal_background_attestation.html",
            "criminal_attestation": "criminal_background_attestation.html",
            "va_code_disclosure": "va_code_disclosure.html",
            "job_description": "job_description_acknowledgment.html",
            "master_onboarding": "master_onboarding_consent.html",
            "final_signature": "master_onboarding_consent.html",
        }

        template_name = template_map.get(agreement_type)
        if not template_name:
            raise ValueError(f"Unknown agreement type: {agreement_type}")

        context = {
            "applicant": applicant_data,
            "agreement": agreement_data,
            "signature": agreement_data.get("signature", ""),
            "signed_date": agreement_data.get("signed_date", ""),
            "generated_at": datetime.now().strftime("%B %d, %Y at %I:%M %p"),
        }

        html = self._render_template(template_name, context)
        return self._generate_pdf(html)

    def generate_i9_pdf(
        self,
        applicant_data: Dict[str, Any],
        steps_data: Dict[int, Dict[str, Any]],
    ) -> bytes:
        """Generate I-9 form PDF (placeholder - would need actual I-9 form filling)."""
        # For now, we'll use pypdf to fill the actual I-9 form
        # This is a simplified version
        from pypdf import PdfReader, PdfWriter
        
        i9_path = Path(__file__).parent.parent / "assets" / "i-9.pdf"
        
        if not i9_path.exists():
            raise FileNotFoundError("I-9 template not found")

        reader = PdfReader(str(i9_path))
        writer = PdfWriter()

        # Copy all pages
        for page in reader.pages:
            writer.add_page(page)

        # Get form fields and fill them
        personal = steps_data.get(1, {})
        
        # Build field mappings based on I-9 field names
        field_mappings = {
            "Last Name Family Name": personal.get("last_name", ""),
            "First Name Given Name": personal.get("first_name", ""),
            "Middle Initial": personal.get("middle_name", "")[:1] if personal.get("middle_name") else "",
            "Address Street Number and Name": personal.get("address", ""),
            "City or Town": personal.get("city", ""),
            "State": personal.get("state", ""),
            "ZIP Code": personal.get("zip_code", ""),
            "Date of Birth mmddyyyy": personal.get("date_of_birth", ""),
        }

        # Update form fields
        if "/AcroForm" in reader.trailer["/Root"]:
            writer.update_page_form_field_values(writer.pages[0], field_mappings)

        # Write to bytes
        import io
        output = io.BytesIO()
        writer.write(output)
        return output.getvalue()


# Singleton instance
pdf_service = PDFService()
