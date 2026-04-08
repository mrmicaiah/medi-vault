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
            "field_mapping": {},
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
            for ann in annotations:
                ann_field_id = self._get_annotation_field_id(ann)

                # Find matching field and add page info
                for fi in result["fields"]:
                    if fi["field_id"] == ann_field_id:
                        fi["page"] = page_index + 1
                        fi["rect"] = [float(x) for x in ann.get('/Rect', [])]
                        break

                # Handle radio buttons
                if ann_field_id in possible_radio_names:
                    try:
                        on_values = [v for v in ann["/AP"]["/N"] if v != "/Off"]
                    except KeyError:
                        continue
                    if len(on_values) == 1:
                        if ann_field_id not in radio_fields:
                            radio_fields[ann_field_id] = {
                                "field_id": ann_field_id,
                                "type": "radio_group",
                                "page": page_index + 1,
                                "radio_options": [],
                            }
                        radio_fields[ann_field_id]["radio_options"].append({
                            "value": on_values[0],
                            "rect": [float(x) for x in ann.get("/Rect", [])],
                        })

        # Add radio fields
        result["fields"].extend(radio_fields.values())

        # Sort by page and position
        result["fields"].sort(key=lambda f: (
            f.get("page", 0),
            -f.get("rect", [0, 0, 0, 0])[1] if f.get("rect") else 0,
            f.get("rect", [0, 0, 0, 0])[0] if f.get("rect") else 0
        ))

        # Auto-generate field mapping
        result["field_mapping"] = self._auto_map_i9_fields(result["fields"])

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
            if len(states) == 2:
                if "/Off" in states:
                    field_dict["checked_value"] = states[0] if states[0] != "/Off" else states[1]
                    field_dict["unchecked_value"] = "/Off"
                else:
                    field_dict["checked_value"] = states[0]
                    field_dict["unchecked_value"] = states[1]
        elif ft == "/Ch":
            field_dict["type"] = "choice"
            states = field.get("/_States_", [])
            field_dict["choice_options"] = [
                {"value": state[0], "text": state[1]}
                for state in states
            ]
        else:
            field_dict["type"] = f"unknown ({ft})"
            return None

        return field_dict

    def _get_annotation_field_id(self, annotation) -> Optional[str]:
        """Get the full field ID from an annotation."""
        components = []
        while annotation:
            field_name = annotation.get('/T')
            if field_name:
                components.append(field_name)
            annotation = annotation.get('/Parent')
        return ".".join(reversed(components)) if components else None

    def _auto_map_i9_fields(self, fields: List[Dict]) -> Dict[str, str]:
        """
        Automatically map semantic field names to PDF field IDs.
        
        Uses pattern matching on field IDs to identify fields.
        """
        import re

        # Patterns to match against field IDs (case-insensitive)
        patterns = {
            # Section 1 - Employee Info
            "last_name": [r"last.*name", r"family.*name", r"surname"],
            "first_name": [r"first.*name", r"given.*name"],
            "middle_initial": [r"middle.*initial", r"mi\b"],
            "other_names": [r"other.*name", r"maiden"],
            "address_street": [r"address.*street", r"street.*number"],
            "address_apt": [r"apt", r"apartment", r"unit"],
            "address_city": [r"city", r"town"],
            "address_state": [r"\bstate\b"],
            "address_zip": [r"zip", r"postal"],
            "date_of_birth": [r"birth", r"dob"],
            "ssn": [r"ssn", r"social.*security"],
            "email": [r"e-?mail"],
            "phone": [r"phone", r"telephone"],
            
            # Citizenship checkboxes
            "citizen_checkbox": [r"citizen.*us", r"checkbox.*1\b", r"citizen\b"],
            "noncitizen_national_checkbox": [r"noncitizen.*national", r"checkbox.*2\b"],
            "lpr_checkbox": [r"lawful.*permanent", r"lpr", r"checkbox.*3\b"],
            "alien_authorized_checkbox": [r"alien.*auth", r"checkbox.*4\b"],
            
            # Authorization fields
            "uscis_number": [r"uscis", r"a-?number"],
            "expiration_date": [r"expir"],
            "i94_number": [r"i-?94", r"admission.*number"],
            "foreign_passport": [r"foreign.*passport"],
            "country_issuance": [r"country.*issu"],
            
            # Signature
            "employee_signature_date": [r"employee.*signature.*date", r"sign.*date.*1"],
            
            # Section 2 - Document fields
            "list_a_doc_title": [r"list.*a.*title", r"list.*a.*doc"],
            "list_a_issuing": [r"list.*a.*issuing", r"list.*a.*auth"],
            "list_a_doc_number": [r"list.*a.*number"],
            "list_a_expiration": [r"list.*a.*expir"],
            
            "list_b_doc_title": [r"list.*b.*title", r"list.*b.*doc"],
            "list_b_issuing": [r"list.*b.*issuing", r"list.*b.*auth"],
            "list_b_doc_number": [r"list.*b.*number"],
            "list_b_expiration": [r"list.*b.*expir"],
            
            "list_c_doc_title": [r"list.*c.*title", r"list.*c.*doc"],
            "list_c_issuing": [r"list.*c.*issuing", r"list.*c.*auth"],
            "list_c_doc_number": [r"list.*c.*number"],
            "list_c_expiration": [r"list.*c.*expir"],
            
            # Employer fields
            "first_day_employment": [r"first.*day.*employ", r"employment.*date"],
            "employer_last_name": [r"employer.*last.*name"],
            "employer_first_name": [r"employer.*first.*name"],
            "employer_title": [r"employer.*title", r"title.*employer"],
            "employer_organization": [r"organization", r"business.*name", r"company"],
            "employer_address": [r"employer.*address"],
            "employer_city": [r"employer.*city"],
            "employer_state": [r"employer.*state"],
            "employer_zip": [r"employer.*zip"],
            "employer_signature_date": [r"employer.*signature.*date", r"sign.*date.*2"],
        }

        mapping = {}
        
        for field in fields:
            field_id = field.get("field_id", "")
            field_lower = field_id.lower().replace(" ", "").replace("-", "").replace("_", "")

            for semantic_name, pattern_list in patterns.items():
                if semantic_name in mapping:
                    continue
                for pattern in pattern_list:
                    if re.search(pattern.replace(" ", "").replace("_", ""), field_lower):
                        mapping[semantic_name] = field_id
                        break

        return mapping

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

        # Get field analysis and mapping
        field_info = self._analyze_i9_fields()
        field_mapping = field_info.get("field_mapping", {})

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

        # Build values to fill using discovered field mapping
        values_to_fill = {}

        # Helper to add value if field exists in mapping
        def add_if_mapped(semantic_name: str, value: str):
            if value and semantic_name in field_mapping:
                values_to_fill[field_mapping[semantic_name]] = value

        # Section 1 - Employee Information
        add_if_mapped("last_name", personal.get("last_name", ""))
        add_if_mapped("first_name", personal.get("first_name", ""))
        add_if_mapped("middle_initial", middle_initial)
        add_if_mapped("other_names", personal.get("other_names", ""))
        add_if_mapped("address_street", personal.get("address_line1", ""))
        add_if_mapped("address_apt", personal.get("address_line2", ""))
        add_if_mapped("address_city", personal.get("city", ""))
        add_if_mapped("address_state", personal.get("state", ""))
        add_if_mapped("address_zip", personal.get("zip", personal.get("zip_code", "")))
        add_if_mapped("date_of_birth", dob)
        add_if_mapped("ssn", ssn_formatted)
        add_if_mapped("email", personal.get("email", ""))
        add_if_mapped("phone", personal.get("phone", ""))

        # Today's date for employee signature
        today = datetime.now().strftime("%m/%d/%Y")
        add_if_mapped("employee_signature_date", today)

        # Section 2 - Employer (if provided)
        if employer_data:
            add_if_mapped("first_day_employment", employer_data.get("first_day", ""))
            add_if_mapped("employer_last_name", employer_data.get("employer_last_name", ""))
            add_if_mapped("employer_first_name", employer_data.get("employer_first_name", ""))
            add_if_mapped("employer_title", employer_data.get("employer_title", ""))
            add_if_mapped("employer_organization", employer_data.get("organization", "Eveready Home Care"))
            add_if_mapped("employer_address", employer_data.get("address", "2700 S. Quincy Street Suite #220"))
            add_if_mapped("employer_city", employer_data.get("city", "Arlington"))
            add_if_mapped("employer_state", employer_data.get("state", "VA"))
            add_if_mapped("employer_zip", employer_data.get("zip", "22206"))
            add_if_mapped("employer_signature_date", today)

            # Document info
            docs = employer_data.get("documents", {})
            if docs.get("list_a"):
                doc = docs["list_a"]
                add_if_mapped("list_a_doc_title", doc.get("title", ""))
                add_if_mapped("list_a_issuing", doc.get("issuing_authority", ""))
                add_if_mapped("list_a_doc_number", doc.get("number", ""))
                add_if_mapped("list_a_expiration", doc.get("expiration", ""))
            
            if docs.get("list_b"):
                doc = docs["list_b"]
                add_if_mapped("list_b_doc_title", doc.get("title", ""))
                add_if_mapped("list_b_issuing", doc.get("issuing_authority", ""))
                add_if_mapped("list_b_doc_number", doc.get("number", ""))
                add_if_mapped("list_b_expiration", doc.get("expiration", ""))
            
            if docs.get("list_c"):
                doc = docs["list_c"]
                add_if_mapped("list_c_doc_title", doc.get("title", ""))
                add_if_mapped("list_c_issuing", doc.get("issuing_authority", ""))
                add_if_mapped("list_c_doc_number", doc.get("number", ""))
                add_if_mapped("list_c_expiration", doc.get("expiration", ""))

        # Also try common I-9 field name patterns directly (fallback)
        # These are common patterns in official USCIS I-9 PDFs
        fallback_mappings = {
            "Last Name (Family Name)": personal.get("last_name", ""),
            "First Name (Given Name)": personal.get("first_name", ""),
            "Middle Initial": middle_initial,
            "Other Last Names Used (if any)": "",
            "Address (Street Number and Name)": personal.get("address_line1", ""),
            "Apt. Number (if any)": personal.get("address_line2", ""),
            "City or Town": personal.get("city", ""),
            "State": personal.get("state", ""),
            "ZIP Code": personal.get("zip", personal.get("zip_code", "")),
            "Date of Birth (mm/dd/yyyy)": dob,
            "U.S. Social Security Number": ssn_formatted,
            "Employee's E-mail Address": personal.get("email", ""),
            "Employee's Telephone Number": personal.get("phone", ""),
        }

        # Merge fallback (don't overwrite discovered mappings)
        for field_name, value in fallback_mappings.items():
            if field_name not in values_to_fill and value:
                values_to_fill[field_name] = value

        # Fill the form
        if values_to_fill:
            try:
                # Try to fill page 1 (main form)
                writer.update_page_form_field_values(
                    writer.pages[0],
                    values_to_fill,
                    auto_regenerate=False
                )
                logger.info(f"Filled I-9 form with {len(values_to_fill)} fields for: "
                           f"{personal.get('first_name', '')} {personal.get('last_name', '')}")
            except Exception as e:
                logger.warning(f"Could not fill some I-9 form fields: {e}")
                # Try filling fields one by one to see which work
                for field_id, value in values_to_fill.items():
                    try:
                        writer.update_page_form_field_values(
                            writer.pages[0],
                            {field_id: value},
                            auto_regenerate=False
                        )
                    except Exception:
                        logger.debug(f"Could not fill field: {field_id}")

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
