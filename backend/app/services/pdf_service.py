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
        
        for page in reader.pages:
            if '/Annots' in page:
                for annot in page['/Annots']:
                    obj = annot.get_object()
                    if obj.get('/FT') == '/Tx':  # Text field
                        field_name = obj.get('/T')
                        if field_name:
                            fields.append(str(field_name))
                    elif obj.get('/FT') == '/Btn':  # Checkbox/Radio
                        field_name = obj.get('/T')
                        if field_name:
                            fields.append(str(field_name))
        
        # Also try getting fields from the form
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
        
        # Get available field names for mapping
        available_fields = self.get_i9_field_names()
        
        # Get our field values
        field_values = self._map_data_to_i9_fields(application_data, ssn, available_fields)
        
        # Fill in the form fields on page 1 (Section 1 and 2)
        if len(writer.pages) > 0:
            writer.update_page_form_field_values(writer.pages[0], field_values)
        
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
    
    def _map_data_to_i9_fields(
        self, 
        application_data: dict, 
        ssn: Optional[str],
        available_fields: List[str]
    ) -> Dict[str, str]:
        """
        Map application data to I-9 form field names.
        
        The I-9 form has specific field names that vary by version.
        This method attempts to match common field name patterns.
        
        Args:
            application_data: Full application data with steps
            ssn: Decrypted SSN
            available_fields: List of actual field names in the PDF
            
        Returns:
            Dictionary mapping I-9 field names to values
        """
        flat = self._flatten_application_data(application_data)
        today = datetime.now().strftime('%m/%d/%Y')
        
        # Define our data with multiple possible field name variations
        # The I-9 form field names can vary between versions
        field_mappings = {
            # Last Name variations
            'last_name': [
                'Last Name (Family Name)',
                'Last Name',
                'lastName',
                'family_name',
                'Last Name Family Name',
                'Employee Last Name',
            ],
            'first_name': [
                'First Name (Given Name)',
                'First Name',
                'firstName',
                'given_name',
                'First Name Given Name',
                'Employee First Name',
            ],
            'middle_initial': [
                'Middle Initial',
                'MI',
                'middleInitial',
                'Middle',
            ],
            'other_names': [
                'Other Last Names Used (if any)',
                'Other Names Used',
                'otherNames',
                'Other Last Names Used if any',
                'Maiden Name',
            ],
            'address': [
                'Address (Street Number and Name)',
                'Address',
                'Street Address',
                'address',
                'Address Street Number and Name',
            ],
            'apt': [
                'Apt. Number',
                'Apt Number',
                'Apartment',
                'apt',
                'Apt',
            ],
            'city': [
                'City or Town',
                'City',
                'city',
            ],
            'state': [
                'State',
                'state',
            ],
            'zip': [
                'ZIP Code',
                'Zip Code',
                'zip',
                'Zip',
                'ZIP',
            ],
            'dob': [
                'Date of Birth (mm/dd/yyyy)',
                'Date of Birth',
                'DOB',
                'dateOfBirth',
                'Birth Date',
            ],
            'ssn': [
                'U.S. Social Security Number',
                'Social Security Number',
                'SSN',
                'ssn',
            ],
            'email': [
                "Employee's E-mail Address",
                "Employee E-mail Address",
                'E-mail Address',
                'Email',
                'email',
            ],
            'phone': [
                "Employee's Telephone Number",
                "Employee Telephone Number",
                'Telephone Number',
                'Phone',
                'phone',
            ],
            'employee_signature': [
                'Employee Signature',
                'Signature of Employee',
                'employeeSignature',
            ],
            'employee_sign_date': [
                "Today's Date (mm/dd/yyyy)",
                "Today's Date",
                'Date',
                'Signature Date',
            ],
        }
        
        # Our data values
        data_values = {
            'last_name': flat.get('last_name', ''),
            'first_name': flat.get('first_name', ''),
            'middle_initial': (flat.get('middle_name', '') or '')[:1],
            'other_names': flat.get('other_last_names', '') or 'N/A',
            'address': flat.get('address_line1', ''),
            'apt': flat.get('address_line2', ''),
            'city': flat.get('city', ''),
            'state': flat.get('state', ''),
            'zip': flat.get('zip', ''),
            'dob': self._format_date(flat.get('date_of_birth', '')),
            'ssn': ssn or '',
            'email': flat.get('email', ''),
            'phone': flat.get('phone', ''),
            'employee_signature': flat.get('signature_name', ''),
            'employee_sign_date': today,
        }
        
        # Build the final field values dict
        result = {}
        
        # For each data field, find a matching PDF field name
        for data_key, possible_names in field_mappings.items():
            value = data_values.get(data_key, '')
            if not value:
                continue
                
            # Try to find a matching field name in the PDF
            for possible_name in possible_names:
                # Check exact match
                if possible_name in available_fields:
                    result[possible_name] = value
                    break
                # Check case-insensitive match
                for avail_field in available_fields:
                    if avail_field.lower() == possible_name.lower():
                        result[avail_field] = value
                        break
                    # Check partial match
                    if possible_name.lower() in avail_field.lower():
                        result[avail_field] = value
                        break
        
        return result
    
    def _get_id_document_title(self, id_type: str) -> str:
        """Convert our ID type to I-9 document title."""
        mapping = {
            'drivers_license': "Driver's License",
            'state_id': 'State ID Card',
            'passport': 'U.S. Passport',
        }
        return mapping.get(id_type, id_type)
    
    def _format_date(self, date_str: str) -> str:
        """Convert YYYY-MM-DD to MM/DD/YYYY format."""
        if not date_str:
            return ''
        try:
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            return dt.strftime('%m/%d/%Y')
        except ValueError:
            return date_str


# Singleton instance
pdf_service = PDFService()
