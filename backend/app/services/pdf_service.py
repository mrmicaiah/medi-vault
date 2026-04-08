"""PDF generation service - lazily imports WeasyPrint to avoid startup failures."""

import io
import os
import logging
import json
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
    "list_a_doc_title": "Document Title 2 If any",  # First List A doc title field
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

    # =========================================================================
    # I-9 Form Methods
    # =========================================================================

    def get_i9_field_names(self) -> List[str]:
        """
        Get all fillable field names from the I-9 PDF template.
        
        Returns:
            List of field IDs found in the PDF
        """
        field_info = self._analyze_i9_fields()
        return [f["field_id"] for f in field_info.get("fields", [])]

    def get_i9_field_info(self) -> Dict[str, Any]:
        """
        Get detailed information about all I-9 form fields.
        
        Returns:
            Dictionary with field analysis including types and positions
        """
        return self._analyze_i9_fields()

    def _analyze_i9_fields(self) -> Dict[str, Any]:
        """
        Analyze the I-9 PDF and extract field information.
        
        Uses caching to avoid repeated analysis.
        """
        if self._i9_field_cache is not None:
            return self._i9_field_cache

        try:
            from pypdf import PdfReader
        except ImportError:
            raise RuntimeError("pypdf is required for I-9 analysis")

        i9_path = self.assets_dir / "i-9.pdf"
        if not i9_path.exists():
            raise FileNotFoundError(f"I-9 template not found at {i9_path}")

        reader = PdfReader(str(i9_path))
        fields = reader.get_fields()
        
        result = {
            "pdf_path": str(i9_path),
            "page_count": len(reader.pages),
            "is_fillable": bool(fields),
            "fields": [],
            "field_mapping": I9_FIELD_MAPPING,  # Use our hardcoded mapping
        }

        if not fields:
            logger.warning("I-9 PDF does not have fillable form fields")
            self._i9_field_cache = result
            return result

        # Track radio button groups
        possible_radio_names = set()

        for field_id, field in fields.items():
            if field.get("/Kids"):
                if field.get("/FT") == "/Btn":
                    possible_radio_names.add(field_id)
                continue

            field_dict = self._make_field_dict(field, field_id)
            if field_dict:
                result["fields"].append(field_dict)

        # Get page locations from annotations
        radio_fields = {}
        for page_index, page in enumerate(reader.pages):
            annotations = page.get('/Annots', [])
            if not annotations:
                continue
            for ann in annotations:
                try:
                    ann_field_id = self._get_annotation_field_id(ann)
                except Exception:
                    continue

                # Find matching field and add page info
                for fi in result["fields"]:
                    if fi["field_id"] == ann_field_id:
                        fi["page"] = page_index + 1
                        try:
                            fi["rect"] = [float(x) for x in ann.get('/Rect', [])]
                        except (TypeError, ValueError):
                            fi["rect"] = []
                        break

                # Handle radio buttons
                if ann_field_id in possible_radio_names:
                    try:
                        on_values = [v for v in ann["/AP"]["/N"] if v != "/Off"]
                    except (KeyError, TypeError):
                        continue
                    if len(on_values) == 1:
                        if ann_field_id not in radio_fields:
                            radio_fields[ann_field_id] = {
                                "field_id": ann_field_id,
                                "type": "radio_group",
                                "page": page_index + 1,
                                "radio_options": [],
                            }
                        try:
                            rect = [float(x) for x in ann.get("/Rect", [])]
                        except (TypeError, ValueError):
                            rect = []
                        radio_fields[ann_field_id]["radio_options"].append({
                            "value": on_values[0],
                            "rect": rect,
                        })

        # Add radio fields
        result["fields"].extend(radio_fields.values())

        # Sort by page and position
        def sort_key(f):
            page = f.get("page", 0)
            rect = f.get("rect", [0, 0, 0, 0])
            if len(rect) >= 2:
                return (page, -rect[1], rect[0])
            return (page, 0, 0)
        
        result["fields"].sort(key=sort_key)

        self._i9_field_cache = result
        return result

    def _make_field_dict(self, field, field_id: str) -> Optional[Dict]:
        """Create a field dictionary from a PDF field object."""
        field_dict = {"field_id": field_id}
        ft = field.get('/FT')

        if ft == "/Tx":
            field_dict["type"] = "text"
        elif ft == "/Btn":
            field_dict["type"] = "checkbox"
            states = field.get("/_States_", [])
            if len(states) >= 2:
                if "/Off" in states:
                    field_dict["checked_value"] = states[0] if states[0] != "/Off" else states[1]
                    field_dict["unchecked_value"] = "/Off"
                else:
                    field_dict["checked_value"] = states[0]
                    field_dict["unchecked_value"] = states[1]
        elif ft == "/Ch":
            field_dict["type"] = "choice"
            states = field.get("/_States_", [])
            # Handle different formats of choice options
            choice_options = []
            for state in states:
                if isinstance(state, (list, tuple)) and len(state) >= 2:
                    choice_options.append({"value": state[0], "text": state[1]})
                elif isinstance(state, str):
                    choice_options.append({"value": state, "text": state})
            field_dict["choice_options"] = choice_options
        else:
            field_dict["type"] = f"unknown ({ft})"
            return None

        return field_dict

    def _get_annotation_field_id(self, annotation) -> Optional[str]:
        """Get the full field ID from an annotation."""
        components = []
        current = annotation
        while current:
            field_name = current.get('/T')
            if field_name:
                components.append(str(field_name))
            current = current.get('/Parent')
        return ".".join(reversed(components)) if components else None

    def generate_i9_form(
        self,
        application_data: Dict[str, Any],
        ssn: Optional[str] = None,
        employer_data: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        """
        Generate I-9 form PDF by filling in the official template.
        
        Args:
            application_data: Should contain steps dict with employee data
            ssn: Decrypted SSN (optional)
            employer_data: Employer/Section 2 data (optional)
        
        Returns:
            PDF bytes with filled form
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

        # Check if form is fillable
        if not reader.get_fields():
            logger.warning("I-9 PDF is not fillable, returning original")
            output = io.BytesIO()
            writer.write(output)
            return output.getvalue()

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
            except Exception:
                pass

        # Format SSN as XXX-XX-XXXX
        ssn_formatted = ""
        if ssn:
            ssn_clean = ssn.replace("-", "").replace(" ", "")
            if len(ssn_clean) == 9:
                ssn_formatted = f"{ssn_clean[:3]}-{ssn_clean[3:5]}-{ssn_clean[5:]}"

        # Get middle initial
        middle_name = personal.get("middle_name", "")
        middle_initial = middle_name[0].upper() if middle_name else ""

        # Today's date
        today = datetime.now().strftime("%m/%d/%Y")

        # Build field values using the EXACT field names from the PDF
        values_to_fill = {}
        
        def set_field(semantic_name: str, value: str):
            """Set a field value using our mapping."""
            if value and semantic_name in I9_FIELD_MAPPING:
                values_to_fill[I9_FIELD_MAPPING[semantic_name]] = value

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

        # Citizenship status - check the appropriate box
        citizenship = personal.get("citizenship_status", "citizen")
        if citizenship == "citizen":
            values_to_fill["CB_1"] = "/On"
        elif citizenship == "noncitizen_national":
            values_to_fill["CB_2"] = "/On"
        elif citizenship == "lpr":
            values_to_fill["CB_3"] = "/On"
            set_field("lpr_uscis_number", personal.get("uscis_number", ""))
        elif citizenship == "alien_authorized":
            values_to_fill["CB_4"] = "/On"
            set_field("alien_expiration_date", personal.get("work_auth_expiration", ""))
            set_field("alien_uscis_number", personal.get("uscis_number", ""))
            set_field("i94_number", personal.get("i94_number", ""))
            set_field("foreign_passport_country", personal.get("foreign_passport", ""))

        # Section 2 - Employer (if provided)
        if employer_data:
            set_field("first_day_employment", employer_data.get("first_day", today))
            
            # Employer name and title combined
            emp_name = employer_data.get("employer_name", "")
            emp_title = employer_data.get("employer_title", "")
            if emp_name and emp_title:
                set_field("employer_name_title", f"{emp_name}, {emp_title}")
            elif emp_name:
                set_field("employer_name_title", emp_name)
            
            set_field("employer_signature_date", today)
            set_field("employer_organization", employer_data.get("organization", "Eveready Home Care"))
            
            # Combine address into single field
            emp_addr = employer_data.get("address", "2700 S. Quincy Street Suite #220")
            emp_city = employer_data.get("city", "Arlington")
            emp_state = employer_data.get("state", "VA")
            emp_zip = employer_data.get("zip", "22206")
            full_address = f"{emp_addr}, {emp_city}, {emp_state} {emp_zip}"
            set_field("employer_address", full_address)

            # Alternative procedure checkbox
            if employer_data.get("alternative_procedure"):
                values_to_fill["CB_Alt"] = "/Yes"

            # Document info
            docs = employer_data.get("documents", {})
            
            # List A documents (identity + work auth combined)
            if docs.get("list_a"):
                doc = docs["list_a"]
                set_field("list_a_doc_title", doc.get("title", ""))
                set_field("list_a_issuing", doc.get("issuing_authority", ""))
                set_field("list_a_doc_number", doc.get("number", ""))
                set_field("list_a_expiration", doc.get("expiration", ""))
            
            # List B document (identity only)
            if docs.get("list_b"):
                doc = docs["list_b"]
                set_field("list_b_doc_title", doc.get("title", ""))
                set_field("list_b_issuing", doc.get("issuing_authority", ""))
                set_field("list_b_doc_number", doc.get("number", ""))
                set_field("list_b_expiration", doc.get("expiration", ""))
            
            # List C document (work auth only)
            if docs.get("list_c"):
                doc = docs["list_c"]
                set_field("list_c_doc_title", doc.get("title", ""))
                set_field("list_c_issuing", doc.get("issuing_authority", ""))
                set_field("list_c_doc_number", doc.get("number", ""))
                set_field("list_c_expiration", doc.get("expiration", ""))

            # Additional info
            if employer_data.get("additional_info"):
                set_field("additional_info", employer_data["additional_info"])

        # Fill the form
        if values_to_fill:
            try:
                # Fill page 1 (main form - sections 1 and 2)
                writer.update_page_form_field_values(
                    writer.pages[0],
                    values_to_fill,
                    auto_regenerate=False
                )
                logger.info(f"Filled I-9 form with {len(values_to_fill)} fields for: "
                           f"{personal.get('first_name', '')} {personal.get('last_name', '')}")
            except Exception as e:
                logger.warning(f"Bulk fill failed, trying individual fields: {e}")
                # Try filling fields one by one
                for field_id, value in values_to_fill.items():
                    try:
                        writer.update_page_form_field_values(
                            writer.pages[0],
                            {field_id: value},
                            auto_regenerate=False
                        )
                    except Exception as field_error:
                        logger.debug(f"Could not fill field '{field_id}': {field_error}")

        # Set NeedAppearances to ensure fields display properly
        try:
            writer.set_need_appearances_writer(True)
        except Exception:
            pass

        # Write to bytes
        output = io.BytesIO()
        writer.write(output)
        return output.getvalue()

    def clear_i9_cache(self):
        """Clear the cached I-9 field analysis."""
        self._i9_field_cache = None


# Singleton instance
pdf_service = PDFService()
