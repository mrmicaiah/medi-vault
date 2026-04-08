"""PDF generation service - lazily imports WeasyPrint to avoid startup failures."""

import io
import os
import logging
import json
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

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


# =============================================================================
# EXACT I-9 FIELD MAPPING (from analyze_i9.py output)
# =============================================================================
I9_FIELD_MAPPING = {
    # Section 1 - Employee Information (Page 1)
    "last_name": "Last Name (Family Name)",
    "first_name": "First Name Given Name",
    "middle_initial": "Employee Middle Initial (if any)",
    "other_names": "Employee Other Last Names Used (if any)",
    "address_street": "Address Street Number and Name",
    "address_apt": "Apt Number (if any)",
    "address_city": "City or Town",
    "address_state": "State",
    "address_zip": "ZIP Code",
    "date_of_birth": "Date of Birth mmddyyyy",
    "ssn": "US Social Security Number",
    "email": "Employees E-mail Address",
    "phone": "Telephone Number",
    
    # Citizenship checkboxes
    "citizen_checkbox": "CB_1",
    "noncitizen_national_checkbox": "CB_2",
    "lpr_checkbox": "CB_3",
    "alien_authorized_checkbox": "CB_4",
    
    # LPR/Alien authorization fields
    "lpr_uscis_number": "3 A lawful permanent resident Enter USCIS or ANumber",
    "alien_expiration_date": "Exp Date mmddyyyy",
    "alien_uscis_number": "USCIS ANumber",
    "i94_number": "Form I94 Admission Number",
    "foreign_passport_country": "Foreign Passport Number and Country of IssuanceRow1",
    
    # Employee signature
    "employee_signature_date": "Today's Date mmddyyy",
    "employee_signature": "Signature of Employee",
    
    # Section 2 - List A Documents
    "list_a_doc_title": "Document Title 2 If any",
    "list_a_issuing": "Issuing Authority 1",
    "list_a_doc_number": "Document Number 0 (if any)",
    "list_a_expiration": "Expiration Date if any",
    
    # List A Document 2
    "list_a_doc_title_2": "Document Title 2 If any",
    "list_a_issuing_2": "Issuing Authority_2",
    "list_a_doc_number_2": "Document Number If any_2",
    "list_a_expiration_2": "List A.  Document 2. Expiration Date (if any)",
    
    # List A Document 3
    "list_a_doc_title_3": "List A.   Document Title 3.  If any",
    "list_a_issuing_3": "List A. Document 3.  Enter Issuing Authority",
    "list_a_doc_number_3": "List A.  Document 3 Number.  If any",
    "list_a_expiration_3": "Document Number if any_3",
    
    # Section 2 - List B Documents
    "list_b_doc_title": "List B Document 1 Title",
    "list_b_issuing": "List B Issuing Authority 1",
    "list_b_doc_number": "List B Document Number 1",
    "list_b_expiration": "List B Expiration Date 1",
    
    # Section 2 - List C Documents  
    "list_c_doc_title": "List C Document Title 1",
    "list_c_issuing": "List C Issuing Authority 1",
    "list_c_doc_number": "List C Document Number 1",
    "list_c_expiration": "List C Expiration Date 1",
    
    # Employer/Section 2 fields
    "additional_info": "Additional Information",
    "alternative_procedure_checkbox": "CB_Alt",
    "first_day_employment": "FirstDayEmployed mmddyyyy",
    "employer_name_title": "Last Name First Name and Title of Employer or Authorized Representative",
    "employer_signature": "Signature of Employer or AR",
    "employer_signature_date": "S2 Todays Date mmddyyyy",
    "employer_organization": "Employers Business or Org Name",
    "employer_address": "Employers Business or Org Address",
    
    # Preparer/Translator (Page 3)
    "preparer_last_name_header": "Last Name Family Name from Section 1",
    "preparer_first_name_header": "First Name Given Name from Section 1",
    "preparer_middle_initial_header": "Middle initial if any from Section 1",
}


class PDFService:
    """Generates PDF documents from HTML templates."""

    def __init__(self):
        self.template_dir = TEMPLATE_DIR
        self.assets_dir = ASSETS_DIR
        self.css_path = TEMPLATE_DIR / "application_styles.css"
        self._i9_field_cache: Optional[Dict[str, Any]] = None

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
        """Generate the employment application PDF."""
        steps = application_data.get("steps", {})
        
        step1_data = steps.get(1, {}).get("data", {})
        step2_data = steps.get(2, {}).get("data", {})
        step3_data = steps.get(3, {}).get("data", {})
        step4_data = steps.get(4, {}).get("data", {})
        step5_data = steps.get(5, {}).get("data", {})
        step6_data = steps.get(6, {}).get("data", {})
        step7_data = steps.get(7, {}).get("data", {})
        step8_data = steps.get(8, {}).get("data", {})
        
        context = {
            "application_id": application_data.get("id", ""),
            "status": application_data.get("status", ""),
            "submitted_at": application_data.get("submitted_at", ""),
            "first_name": step2_data.get("first_name", step1_data.get("first_name", "")),
            "last_name": step2_data.get("last_name", step1_data.get("last_name", "")),
            "middle_name": step2_data.get("middle_name", step1_data.get("middle_name", "")),
            "date_of_birth": step2_data.get("date_of_birth", step1_data.get("date_of_birth", "")),
            "email": step2_data.get("email", step1_data.get("email", "")),
            "phone": step2_data.get("phone", step1_data.get("phone", "")),
            "address_line1": step2_data.get("address_line1", ""),
            "address_line2": step2_data.get("address_line2", ""),
            "city": step2_data.get("city", ""),
            "state": step2_data.get("state", ""),
            "zip": step2_data.get("zip", step2_data.get("zip_code", "")),
            "ec_name": step3_data.get("name", step3_data.get("ec_name", "")),
            "ec_relationship": step3_data.get("relationship", step3_data.get("ec_relationship", "")),
            "ec_phone": step3_data.get("phone", step3_data.get("ec_phone", "")),
            "position": step4_data.get("position", step3_data.get("position", "")),
            "desired_pay": step4_data.get("desired_pay", ""),
            "start_date": step4_data.get("start_date", ""),
            "employment_history": step5_data.get("employers", []),
            "education": step4_data.get("education", step6_data.get("education", [])),
            "references": step6_data.get("references", step7_data.get("references", [])),
            "skills": step7_data.get("skills", step8_data.get("skills", {})),
            "availability": step8_data.get("availability", step4_data.get("availability", {})),
            "steps": steps,
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

    # =========================================================================
    # I-9 Form Methods
    # =========================================================================

    def get_i9_field_names(self) -> List[str]:
        """Get all fillable field names from the I-9 PDF template."""
        try:
            import fillpdf
            from fillpdf import fillpdfs
            i9_path = str(self.assets_dir / "i-9.pdf")
            fields = fillpdfs.get_form_fields(i9_path)
            return list(fields.keys()) if fields else []
        except Exception as e:
            logger.error(f"Could not get I-9 field names: {e}")
            return []

    def get_i9_field_info(self) -> Dict[str, Any]:
        """Get detailed information about all I-9 form fields."""
        try:
            import fillpdf
            from fillpdf import fillpdfs
            i9_path = str(self.assets_dir / "i-9.pdf")
            fields = fillpdfs.get_form_fields(i9_path)
            return {
                "pdf_path": i9_path,
                "is_fillable": bool(fields),
                "fields": fields if fields else {},
                "field_mapping": I9_FIELD_MAPPING,
            }
        except Exception as e:
            logger.error(f"Could not analyze I-9 fields: {e}")
            return {"error": str(e)}

    def generate_i9_form(
        self,
        application_data: Dict[str, Any],
        ssn: Optional[str] = None,
        employer_data: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        """
        Generate I-9 form PDF by filling in the official template.
        
        Uses fillpdf library for reliable form filling.
        """
        try:
            import fillpdf
            from fillpdf import fillpdfs
        except ImportError:
            raise RuntimeError("fillpdf is required for I-9 generation. Install with: pip install fillpdf")

        i9_path = self.assets_dir / "i-9.pdf"
        if not i9_path.exists():
            raise FileNotFoundError(f"I-9 template not found at {i9_path}")

        # Extract applicant info from steps
        steps = application_data.get("steps", {})
        
        # Log for debugging
        logger.info(f"I-9 generate_i9_form called")
        logger.info(f"Steps keys: {list(steps.keys())}")
        
        # Try both int and string keys
        step2_data = steps.get(2, steps.get("2", {}))
        if isinstance(step2_data, dict) and "data" in step2_data:
            step2_data = step2_data.get("data", {})
            
        step1_data = steps.get(1, steps.get("1", {}))
        if isinstance(step1_data, dict) and "data" in step1_data:
            step1_data = step1_data.get("data", {})
        
        logger.info(f"Step 1 data type: {type(step1_data)}, keys: {list(step1_data.keys()) if isinstance(step1_data, dict) else 'N/A'}")
        logger.info(f"Step 2 data type: {type(step2_data)}, keys: {list(step2_data.keys()) if isinstance(step2_data, dict) else 'N/A'}")

        # Use step 2 primarily, fall back to step 1
        personal = {}
        if isinstance(step1_data, dict):
            personal.update(step1_data)
        if isinstance(step2_data, dict):
            personal.update(step2_data)
        
        logger.info(f"Personal combined: first_name={personal.get('first_name')}, last_name={personal.get('last_name')}, email={personal.get('email')}")

        # Format date of birth as MM/DD/YYYY
        dob = personal.get("date_of_birth", "")
        if dob and "-" in dob:
            try:
                parts = dob.split("-")
                if len(parts) == 3:
                    dob = f"{parts[1]}/{parts[2]}/{parts[0]}"
            except Exception:
                pass

        # Format SSN
        ssn_formatted = ""
        if ssn:
            ssn_clean = ssn.replace("-", "").replace(" ", "")
            if len(ssn_clean) == 9:
                ssn_formatted = f"{ssn_clean[:3]}-{ssn_clean[3:5]}-{ssn_clean[5:]}"
            logger.info(f"SSN formatted (masked): ***-**-{ssn_clean[-4:] if len(ssn_clean) >= 4 else '****'}")

        # Get middle initial
        middle_name = personal.get("middle_name", "")
        middle_initial = middle_name[0].upper() if middle_name else ""

        # Today's date
        today = datetime.now().strftime("%m/%d/%Y")

        # Build field values using the EXACT field names from the PDF
        field_data = {}
        
        def set_field(semantic_name: str, value: str):
            if value and semantic_name in I9_FIELD_MAPPING:
                field_data[I9_FIELD_MAPPING[semantic_name]] = str(value)

        # Section 1 - Employee Information
        set_field("last_name", personal.get("last_name", ""))
        set_field("first_name", personal.get("first_name", ""))
        set_field("middle_initial", middle_initial)
        set_field("other_names", personal.get("other_names", personal.get("maiden_name", "")))
        set_field("address_street", personal.get("address_line1", ""))
        set_field("address_apt", personal.get("address_line2", ""))
        set_field("address_city", personal.get("city", ""))
        set_field("address_state", personal.get("state", ""))
        set_field("address_zip", personal.get("zip", personal.get("zip_code", "")))
        set_field("date_of_birth", dob)
        set_field("ssn", ssn_formatted)
        set_field("email", personal.get("email", ""))
        set_field("phone", personal.get("phone", ""))
        set_field("employee_signature_date", today)

        # Citizenship - default to citizen
        citizenship = personal.get("citizenship_status", "citizen")
        if citizenship == "citizen" or not citizenship:
            field_data["CB_1"] = "Yes"  # fillpdf uses "Yes" for checkboxes
        elif citizenship == "noncitizen_national":
            field_data["CB_2"] = "Yes"
        elif citizenship == "lpr":
            field_data["CB_3"] = "Yes"
            set_field("lpr_uscis_number", personal.get("uscis_number", ""))
        elif citizenship == "alien_authorized":
            field_data["CB_4"] = "Yes"

        logger.info(f"Filling {len(field_data)} fields")
        logger.info(f"Field names being filled: {list(field_data.keys())}")

        # Create temporary files for fillpdf
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as output_file:
            output_path = output_file.name

        try:
            # Fill the PDF using fillpdf
            fillpdfs.write_fillable_pdf(
                str(i9_path),
                output_path,
                field_data,
                flatten=False  # Keep form fillable
            )
            
            logger.info(f"Successfully filled I-9 for: {personal.get('first_name', '')} {personal.get('last_name', '')}")
            
            # Read the output file
            with open(output_path, "rb") as f:
                pdf_bytes = f.read()
            
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"fillpdf failed: {e}")
            # Fall back to returning original PDF
            logger.warning("Falling back to original PDF without filling")
            with open(i9_path, "rb") as f:
                return f.read()
        finally:
            # Clean up temp file
            try:
                os.unlink(output_path)
            except Exception:
                pass

    def clear_i9_cache(self):
        """Clear the cached I-9 field analysis."""
        self._i9_field_cache = None


# Singleton instance
pdf_service = PDFService()
