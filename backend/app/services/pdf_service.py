"""PDF generation service - lazily imports WeasyPrint to avoid startup failures."""

import io
import os
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Lazy imports for WeasyPrint - only load when actually generating PDFs
_weasyprint_html = None
_weasyprint_css = None
_jinja_env = None

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


def _get_jinja_env():
    """Lazy load Jinja2 environment."""
    global _jinja_env
    if _jinja_env is None:
        from jinja2 import Environment, FileSystemLoader
        template_dir = Path(__file__).parent.parent / "templates"
        _jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=True,
        )
    return _jinja_env


# Template and asset directories
TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
ASSETS_DIR = Path(__file__).parent.parent / "assets"


class PDFService:
    """Generates PDF documents from HTML templates."""

    def __init__(self):
        self.template_dir = TEMPLATE_DIR
        self.assets_dir = ASSETS_DIR
        self.css_path = TEMPLATE_DIR / "application_styles.css"

    def _render_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """Render a Jinja2 template with the given context."""
        env = _get_jinja_env()
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
        application_data: Dict[str, Any],
    ) -> bytes:
        """
        Generate the employment application PDF.
        
        application_data should contain:
        - id: application ID
        - status: application status
        - submitted_at: submission timestamp
        - steps: dict of step_number -> {data: {...}, completed: bool}
        """
        steps = application_data.get("steps", {})
        
        # Extract data from various steps
        step1_data = steps.get(1, {}).get("data", {})
        step2_data = steps.get(2, {}).get("data", {})
        step3_data = steps.get(3, {}).get("data", {})
        step4_data = steps.get(4, {}).get("data", {})
        step5_data = steps.get(5, {}).get("data", {})
        step6_data = steps.get(6, {}).get("data", {})
        step7_data = steps.get(7, {}).get("data", {})
        step8_data = steps.get(8, {}).get("data", {})
        
        # Build context for template
        context = {
            "application_id": application_data.get("id", ""),
            "status": application_data.get("status", ""),
            "submitted_at": application_data.get("submitted_at", ""),
            
            # Personal info (step 1 or 2 depending on structure)
            "first_name": step2_data.get("first_name", step1_data.get("first_name", "")),
            "last_name": step2_data.get("last_name", step1_data.get("last_name", "")),
            "middle_name": step2_data.get("middle_name", step1_data.get("middle_name", "")),
            "date_of_birth": step2_data.get("date_of_birth", step1_data.get("date_of_birth", "")),
            "email": step2_data.get("email", step1_data.get("email", "")),
            "phone": step2_data.get("phone", step1_data.get("phone", "")),
            
            # Address info
            "address_line1": step2_data.get("address_line1", ""),
            "address_line2": step2_data.get("address_line2", ""),
            "city": step2_data.get("city", ""),
            "state": step2_data.get("state", ""),
            "zip": step2_data.get("zip", step2_data.get("zip_code", "")),
            
            # Emergency contact (step 3)
            "ec_name": step3_data.get("name", step3_data.get("ec_name", "")),
            "ec_relationship": step3_data.get("relationship", step3_data.get("ec_relationship", "")),
            "ec_phone": step3_data.get("phone", step3_data.get("ec_phone", "")),
            
            # Position/availability (step 4 or combined)
            "position": step4_data.get("position", step3_data.get("position", "")),
            "desired_pay": step4_data.get("desired_pay", ""),
            "start_date": step4_data.get("start_date", ""),
            
            # Work history (step 5)
            "employment_history": step5_data.get("employers", []),
            
            # Education (step 4 or 6)
            "education": step4_data.get("education", step6_data.get("education", [])),
            
            # References (step 6 or 7)
            "references": step6_data.get("references", step7_data.get("references", [])),
            
            # Skills (step 7 or 8)
            "skills": step7_data.get("skills", step8_data.get("skills", {})),
            
            # Availability
            "availability": step8_data.get("availability", step4_data.get("availability", {})),
            
            # Full steps data for flexibility
            "steps": steps,
            
            # Generation metadata
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

    def generate_i9_form(
        self,
        application_data: Dict[str, Any],
        ssn: Optional[str] = None,
    ) -> bytes:
        """
        Generate I-9 form PDF by filling in the official template.
        
        application_data should contain:
        - steps: dict of step_number -> {data: {...}, completed: bool}
        """
        try:
            from pypdf import PdfReader, PdfWriter
        except ImportError:
            raise RuntimeError("pypdf is required for I-9 generation")
        
        i9_path = self.assets_dir / "i-9.pdf"
        
        if not i9_path.exists():
            raise FileNotFoundError(f"I-9 template not found at {i9_path}")

        reader = PdfReader(str(i9_path))
        writer = PdfWriter()

        # Copy all pages
        for page in reader.pages:
            writer.add_page(page)

        # Extract applicant info from steps
        steps = application_data.get("steps", {})
        step2_data = steps.get(2, {}).get("data", {})
        step1_data = steps.get(1, {}).get("data", {})
        
        # Use step 2 primarily, fall back to step 1
        personal = {**step1_data, **step2_data}
        
        # Format date of birth as MM/DD/YYYY
        dob = personal.get("date_of_birth", "")
        if dob and "-" in dob:
            try:
                parts = dob.split("-")
                if len(parts) == 3:
                    dob = f"{parts[1]}/{parts[2]}/{parts[0]}"
            except:
                pass
        
        # Format SSN as XXX-XX-XXXX
        ssn_formatted = ""
        if ssn and len(ssn) == 9:
            ssn_formatted = f"{ssn[:3]}-{ssn[3:5]}-{ssn[5:]}"
        
        # Build address
        address = personal.get("address_line1", "")
        if personal.get("address_line2"):
            address += f" {personal.get('address_line2')}"
        
        # Common I-9 field names - these may need adjustment based on actual PDF field names
        field_mappings = {
            # Section 1 fields
            "Last Name Family Name": personal.get("last_name", ""),
            "First Name Given Name": personal.get("first_name", ""),
            "Middle Initial": personal.get("middle_name", "")[:1] if personal.get("middle_name") else "",
            "Other Last Names Used if any": "",
            "Address Street Number and Name": address,
            "Apt Number": personal.get("address_line2", ""),
            "City or Town": personal.get("city", ""),
            "State": personal.get("state", ""),
            "ZIP Code": personal.get("zip", personal.get("zip_code", "")),
            "Date of Birth mmddyyyy": dob,
            "US Social Security Number": ssn_formatted,
            "Employees E-mail Address": personal.get("email", ""),
            "Employees Telephone Number": personal.get("phone", ""),
        }

        # Try to update form fields
        try:
            if len(writer.pages) > 0:
                writer.update_page_form_field_values(writer.pages[0], field_mappings)
        except Exception as e:
            logger.warning(f"Could not fill I-9 form fields: {e}")

        # Write to bytes
        output = io.BytesIO()
        writer.write(output)
        return output.getvalue()


# Singleton instance
pdf_service = PDFService()
