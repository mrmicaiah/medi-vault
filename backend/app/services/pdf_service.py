"""
PDF Generation Service for MediVault

Generates:
1. Employment Application PDF - Professional document from form data
2. I-9 Form PDF - Fills the official USCIS I-9 fillable form

"""

import io
import os
from datetime import datetime
from typing import Optional, Dict, List
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS
from pypdf import PdfReader, PdfWriter


# Path to templates directory
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'templates')

# Path to static assets (blank I-9 form, logo, etc.)
ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets')


class PDFService:
    """Service for generating PDF documents."""
    
    def __init__(self):
        self.jinja_env = Environment(
            loader=FileSystemLoader(TEMPLATES_DIR),
            autoescape=True
        )
        self._i9_field_cache: Optional[List[str]] = None
    
    def get_i9_field_names(self) -> List[str]:
        """
        Get all fillable field names from the I-9 PDF.
        
        Useful for debugging and mapping data to the correct fields.
        
        Returns:
            List of field names in the I-9 form
        """
        i9_path = os.path.join(ASSETS_DIR, 'i-9.pdf')
        
        if not os.path.exists(i9_path):
            raise FileNotFoundError(
                "I-9 form template not found. Please add i-9.pdf to backend/app/assets/"
            )
        
        if self._i9_field_cache is not None:
            return self._i9_field_cache
        
        reader = PdfReader(i9_path)
        fields = []
        
        # Get fields from the form
        if reader.get_fields():
            for field_name in reader.get_fields().keys():
                if field_name not in fields:
                    fields.append(field_name)
        
        self._i9_field_cache = fields
        return fields
    
    def generate_employment_application(self, application_data: dict) -> bytes:
        """
        Generate a professional Employment Application PDF from form data.
        
        Args:
            application_data: Dictionary containing all application step data
            
        Returns:
            PDF file as bytes
        """
        # Load and render the HTML template
        template = self.jinja_env.get_template('employment_application.html')
        
        # Flatten the step data for easier template access
        flat_data = self._flatten_application_data(application_data)
        flat_data['generated_date'] = datetime.now().strftime('%B %d, %Y')
        
        html_content = template.render(**flat_data)
        
        # Load CSS
        css_path = os.path.join(TEMPLATES_DIR, 'application_styles.css')
        stylesheets = []
        if os.path.exists(css_path):
            stylesheets.append(CSS(filename=css_path))
        
        # Convert HTML to PDF
        pdf_bytes = HTML(string=html_content).write_pdf(stylesheets=stylesheets)
        
        return pdf_bytes
    
    def generate_i9_form(self, application_data: dict, ssn: Optional[str] = None) -> bytes:
        """
        Fill out the official USCIS I-9 form with applicant data.
        
        Args:
            application_data: Dictionary containing all application step data
            ssn: Decrypted SSN (passed separately for security)
            
        Returns:
            Filled I-9 PDF as bytes
        """
        # Path to blank I-9 form
        i9_path = os.path.join(ASSETS_DIR, 'i-9.pdf')
        
        if not os.path.exists(i9_path):
            raise FileNotFoundError(
                "I-9 form template not found. Please add i-9.pdf to backend/app/assets/"
            )
        
        # Read the blank I-9 form
        reader = PdfReader(i9_path)
        writer = PdfWriter()
        
        # Clone the PDF
        writer.clone_document_from_reader(reader)
        
        # Get our field values mapped to exact I-9 field names
        field_values = self._map_data_to_i9_fields(application_data, ssn)
        
        # Fill in the form fields on all pages
        for page_num, page in enumerate(writer.pages):
            writer.update_page_form_field_values(page, field_values)
        
        # Write to bytes
        output = io.BytesIO()
        writer.write(output)
        output.seek(0)
        
        return output.read()
    
    def _flatten_application_data(self, application_data: dict) -> dict:
        """
        Flatten nested step data into a single dictionary.
        
        Args:
            application_data: Dict with 'steps' containing step_number -> data mappings
            
        Returns:
            Flattened dictionary with all fields
        """
        flat = {
            'application_id': application_data.get('id', ''),
            'submitted_at': application_data.get('submitted_at', ''),
            'status': application_data.get('status', ''),
        }
        
        steps = application_data.get('steps', {})
        
        # Step 1: Application Basics
        step1 = steps.get(1, {}).get('data', {})
        flat['position'] = step1.get('position', '')
        flat['convicted_violent_crime'] = step1.get('convicted_violent_crime', '')
        flat['background_check_consent'] = step1.get('background_check_consent', '')
        flat['is_18_or_older'] = step1.get('is_18_or_older', '')
        flat['primary_language'] = step1.get('primary_language', '')
        flat['other_languages'] = step1.get('other_languages', [])
        flat['citizenship_status'] = step1.get('citizenship_status', '')
        
        # Step 2: Personal Information
        step2 = steps.get(2, {}).get('data', {})
        flat['first_name'] = step2.get('first_name', '')
        flat['middle_name'] = step2.get('middle_name', '')
        flat['last_name'] = step2.get('last_name', '')
        flat['other_last_names'] = step2.get('other_last_names', '')
        flat['date_of_birth'] = step2.get('date_of_birth', '')
        flat['gender'] = step2.get('gender', '')
        flat['address_line1'] = step2.get('address_line1', '')
        flat['address_line2'] = step2.get('address_line2', '')
        flat['city'] = step2.get('city', '')
        flat['state'] = step2.get('state', '')
        flat['zip'] = step2.get('zip', '')
        flat['phone'] = step2.get('phone', '')
        flat['alt_phone'] = step2.get('alt_phone', '')
        flat['email'] = step2.get('email', '')
        flat['ssn_last_four'] = step2.get('ssn_last_four', '')
        
        # Step 3: Emergency Contact
        step3 = steps.get(3, {}).get('data', {})
        flat['emergency_name'] = step3.get('name', '')
        flat['emergency_relationship'] = step3.get('relationship', '')
        flat['emergency_phone'] = step3.get('phone', '')
        
        # Step 4: Education
        step4 = steps.get(4, {}).get('data', {})
        flat['high_school_graduate'] = step4.get('high_school_graduate', '')
        flat['certifications'] = step4.get('certifications', [])
        flat['cpr_certified'] = step4.get('cpr_certified', '')
        flat['licensed_driver'] = step4.get('licensed_driver', '')
        flat['eligible_to_work'] = step4.get('eligible_to_work', '')
        flat['tb_test_recent'] = step4.get('tb_test_recent', '')
        flat['will_travel_30_min'] = step4.get('will_travel_30_min', '')
        flat['can_do_catheter'] = step4.get('can_do_catheter', '')
        flat['can_do_vitals'] = step4.get('can_do_vitals', '')
        flat['work_bedbound'] = step4.get('work_bedbound', '')
        flat['special_skills'] = step4.get('special_skills', '')
        
        # Step 5: Reference 1
        step5 = steps.get(5, {}).get('data', {})
        flat['ref1_name'] = step5.get('name', '')
        flat['ref1_relationship'] = step5.get('relationship', '')
        flat['ref1_phone'] = step5.get('phone', '')
        
        # Step 6: Reference 2
        step6 = steps.get(6, {}).get('data', {})
        flat['ref2_name'] = step6.get('name', '')
        flat['ref2_relationship'] = step6.get('relationship', '')
        flat['ref2_phone'] = step6.get('phone', '')
        flat['contact_references_consent'] = step6.get('contact_references_consent', '')
        
        # Step 7: Employment History
        step7 = steps.get(7, {}).get('data', {})
        flat['currently_employed'] = step7.get('currently_employed', '')
        flat['current_employer'] = step7.get('current_employer', '')
        flat['current_supervisor'] = step7.get('current_supervisor', '')
        flat['current_supervisor_phone'] = step7.get('current_supervisor_phone', '')
        flat['current_start_date'] = step7.get('current_start_date', '')
        flat['current_end_date'] = step7.get('current_end_date', '')
        flat['employer1_name'] = step7.get('employer1_name', '')
        flat['employer1_supervisor'] = step7.get('employer1_supervisor', '')
        flat['employer1_phone'] = step7.get('employer1_phone', '')
        flat['employer1_start'] = step7.get('employer1_start', '')
        flat['employer1_end'] = step7.get('employer1_end', '')
        flat['employer2_name'] = step7.get('employer2_name', '')
        flat['employer2_supervisor'] = step7.get('employer2_supervisor', '')
        flat['employer2_phone'] = step7.get('employer2_phone', '')
        flat['employer2_start'] = step7.get('employer2_start', '')
        flat['employer2_end'] = step7.get('employer2_end', '')
        flat['no_second_employer'] = step7.get('no_second_employer', False)
        
        # Step 8: Work Preferences
        step8 = steps.get(8, {}).get('data', {})
        flat['available_shifts'] = step8.get('available_shifts', [])
        flat['work_weekends'] = step8.get('work_weekends', '')
        flat['available_days'] = step8.get('available_days', [])
        flat['comfortable_pets'] = step8.get('comfortable_pets', '')
        flat['comfortable_smokers'] = step8.get('comfortable_smokers', '')
        flat['hours_per_week'] = step8.get('hours_per_week', '')
        flat['conditions_not_wanted'] = step8.get('conditions_not_wanted', '')
        flat['desired_hourly_rate'] = step8.get('desired_hourly_rate', '')
        
        # Step 11: Work Authorization (for I-9 List C document info)
        step11 = steps.get(11, {}).get('data', {})
        flat['work_auth_doc_type'] = step11.get('document_type', '')
        flat['work_auth_doc_number'] = step11.get('document_number', '')
        flat['work_auth_issuing_authority'] = step11.get('issuing_authority', '')
        
        # Step 12: ID Front (for I-9 List B document info)
        step12 = steps.get(12, {}).get('data', {})
        flat['id_type'] = step12.get('id_type', '')
        flat['id_number'] = step12.get('id_number', '')
        flat['id_issuing_state'] = step12.get('issuing_state', '')
        flat['id_expiration'] = step12.get('expiration_date', '')
        
        # Step 22: Final Signature
        step22 = steps.get(22, {}).get('data', {})
        flat['signature_name'] = step22.get('signature_name', '')
        flat['signature_date'] = step22.get('signature_date', '')
        
        return flat
    
    def _map_data_to_i9_fields(self, application_data: dict, ssn: Optional[str] = None) -> Dict[str, str]:
        """
        Map application data to exact I-9 form field names.
        
        Based on the actual USCIS I-9 PDF field names.
        
        Args:
            application_data: Full application data with steps
            ssn: Decrypted SSN
            
        Returns:
            Dictionary mapping exact I-9 field names to values
        """
        flat = self._flatten_application_data(application_data)
        today = datetime.now().strftime('%m/%d/%Y')
        
        # Build field values using EXACT field names from the I-9 PDF
        fields = {}
        
        # ===== SECTION 1: Employee Information (Page 1) =====
        
        # Name fields
        fields['Last Name (Family Name)'] = flat.get('last_name', '')
        fields['First Name Given Name'] = flat.get('first_name', '')
        fields['Employee Middle Initial (if any)'] = (flat.get('middle_name', '') or '')[:1]
        fields['Employee Other Last Names Used (if any)'] = flat.get('other_last_names', '') or 'N/A'
        
        # Address fields
        fields['Address Street Number and Name'] = flat.get('address_line1', '')
        fields['Apt Number (if any)'] = flat.get('address_line2', '')
        fields['City or Town'] = flat.get('city', '')
        fields['State'] = flat.get('state', '')
        fields['ZIP Code'] = flat.get('zip', '')
        
        # Personal info
        fields['Date of Birth mmddyyyy'] = self._format_date(flat.get('date_of_birth', ''))
        fields['US Social Security Number'] = self._format_ssn(ssn) if ssn else ''
        fields['Employees E-mail Address'] = flat.get('email', '')
        fields['Telephone Number'] = flat.get('phone', '')
        
        # Citizenship status checkboxes
        # CB_1 = US Citizen, CB_2 = Noncitizen National, CB_3 = Lawful Permanent Resident, CB_4 = Alien
        # Since we only accept birth certificates, they are US Citizens
        citizenship = flat.get('citizenship_status', '')
        if citizenship == 'us_citizen' or citizenship == 'A citizen of the United States':
            fields['CB_1'] = 'Yes'
        elif citizenship == 'noncitizen_national':
            fields['CB_2'] = 'Yes'
        elif citizenship == 'lawful_permanent_resident':
            fields['CB_3'] = 'Yes'
        elif citizenship == 'alien_authorized':
            fields['CB_4'] = 'Yes'
        else:
            # Default to US Citizen for birth certificate holders
            fields['CB_1'] = 'Yes'
        
        # Employee signature
        fields['Signature of Employee'] = flat.get('signature_name', '')
        fields["Today's Date mmddyyyy"] = self._format_date(flat.get('signature_date', '')) or today
        
        # ===== SECTION 2: Employer Review (Page 1) =====
        # This section is filled by employer after examining documents
        
        # List B - Identity Document (Driver's License / State ID)
        fields['List B Document 1 Title'] = self._get_id_document_title(flat.get('id_type', ''))
        fields['List B Issuing Authority 1'] = flat.get('id_issuing_state', '')
        fields['List B Document Number 1'] = flat.get('id_number', '')
        fields['List B Expiration Date 1'] = self._format_date(flat.get('id_expiration', ''))
        
        # List C - Employment Authorization (Birth Certificate)
        fields['List C Document Title 1'] = 'U.S. Birth Certificate'
        fields['List C Issuing Authority 1'] = flat.get('work_auth_issuing_authority', '') or 'United States'
        fields['List C Document Number 1'] = flat.get('work_auth_doc_number', '') or 'N/A'
        fields['List C Expiration Date 1'] = 'N/A'  # Birth certificates don't expire
        
        # Employer info (pre-fill company name)
        fields['Employers Business or Org Name'] = 'Eveready HomeCare'
        
        # Leave these blank for employer to fill:
        # - FirstDayEmployed mmddyyyy
        # - Last Name First Name and Title of Employer or Authorized Rep
        # - Signature of Employer or AR
        # - S2 Todays Date mmddyyyy
        # - Employers Business or Org Address
        
        return fields
    
    def _get_id_document_title(self, id_type: str) -> str:
        """Convert our ID type to I-9 document title."""
        mapping = {
            'drivers_license': "Driver's License",
            'state_id': 'State ID Card',
            'passport': 'U.S. Passport',
        }
        return mapping.get(id_type, id_type or "Driver's License")
    
    def _format_date(self, date_str: str) -> str:
        """Convert YYYY-MM-DD to MM/DD/YYYY format for I-9."""
        if not date_str:
            return ''
        try:
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            return dt.strftime('%m/%d/%Y')
        except ValueError:
            return date_str
    
    def _format_ssn(self, ssn: str) -> str:
        """Format SSN as XXX-XX-XXXX."""
        if not ssn:
            return ''
        # Remove any existing formatting
        digits = ''.join(c for c in ssn if c.isdigit())
        if len(digits) == 9:
            return f"{digits[:3]}-{digits[3:5]}-{digits[5:]}"
        return ssn


# Singleton instance
pdf_service = PDFService()
