"""
PDF Generation Service for MediVault

Generates:
1. Employment Application PDF - Professional document from form data
2. I-9 Form PDF - Fills the official USCIS I-9 fillable form
"""

import io
import os
from datetime import datetime
from typing import Optional
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
        
        # Convert HTML to PDF
        pdf_bytes = HTML(string=html_content).write_pdf(
            stylesheets=[CSS(os.path.join(TEMPLATES_DIR, 'application_styles.css'))]
        )
        
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
        
        # Copy all pages
        for page in reader.pages:
            writer.add_page(page)
        
        # Get field mappings
        field_values = self._map_data_to_i9_fields(application_data, ssn)
        
        # Fill in the form fields
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
    
    def _map_data_to_i9_fields(self, application_data: dict, ssn: Optional[str] = None) -> dict:
        """
        Map application data to I-9 form field names.
        
        The I-9 form has specific field names. This maps our data to those fields.
        Field names may vary slightly between I-9 versions.
        
        Section 1 (Employee fills out):
        - Last name, first name, middle initial
        - Other last names used
        - Address (street, apt, city, state, zip)
        - Date of birth
        - SSN
        - Email, phone
        - Citizenship status checkbox
        - Signature and date
        
        Section 2 (Employer fills out after examining documents):
        - List B document info (ID)
        - List C document info (Birth Certificate)
        - Employer signature
        
        Args:
            application_data: Full application data with steps
            ssn: Decrypted SSN
            
        Returns:
            Dictionary mapping I-9 field names to values
        """
        flat = self._flatten_application_data(application_data)
        today = datetime.now().strftime('%m/%d/%Y')
        
        # Common I-9 field names (may need adjustment based on actual form version)
        # These are typical field names found in USCIS I-9 fillable PDFs
        fields = {
            # Section 1 - Employee Information
            'Last Name (Family Name)': flat.get('last_name', ''),
            'First Name (Given Name)': flat.get('first_name', ''),
            'Middle Initial': flat.get('middle_name', '')[:1] if flat.get('middle_name') else '',
            'Other Last Names Used (if any)': flat.get('other_last_names', '') or 'N/A',
            'Address (Street Number and Name)': flat.get('address_line1', ''),
            'Apt. Number': flat.get('address_line2', ''),
            'City or Town': flat.get('city', ''),
            'State': flat.get('state', ''),
            'ZIP Code': flat.get('zip', ''),
            'Date of Birth (mm/dd/yyyy)': self._format_date(flat.get('date_of_birth', '')),
            'Employee\'s E-mail Address': flat.get('email', ''),
            'Employee\'s Telephone Number': flat.get('phone', ''),
            
            # SSN fields (often split into 3 parts)
            'U.S. Social Security Number': ssn if ssn else '',
            
            # Citizenship status - typically checkboxes
            # For birth certificate holders, they are US Citizens
            'I attest, under penalty of perjury, that I am (check one of the following boxes):': '',
            'Citizen': 'Yes',  # Checkbox for US Citizen
            
            # Section 1 signature
            'Employee Signature': flat.get('signature_name', ''),
            'Today\'s Date (mm/dd/yyyy)': today,
            
            # Section 2 - Employer fills out
            # List B - Identity Document (Driver's License/State ID)
            'List B - Document Title': self._get_id_document_title(flat.get('id_type', '')),
            'List B - Issuing Authority': flat.get('id_issuing_state', ''),
            'List B - Document Number': flat.get('id_number', ''),
            'List B - Expiration Date (if any) (mm/dd/yyyy)': self._format_date(flat.get('id_expiration', '')),
            
            # List C - Employment Authorization (Birth Certificate)
            'List C - Document Title': 'Birth Certificate',
            'List C - Issuing Authority': flat.get('work_auth_issuing_authority', 'United States'),
            'List C - Document Number': flat.get('work_auth_doc_number', '') or 'N/A',
            'List C - Expiration Date (if any) (mm/dd/yyyy)': 'N/A',  # Birth certs don't expire
            
            # Employer certification
            'First Day of Employment (mm/dd/yyyy)': '',  # To be filled by employer
            'Employer or Authorized Representative Signature': '',
            'Title of Employer or Authorized Representative': '',
            'Employer\'s Business or Organization Name': 'Eveready HomeCare',
            'Employer\'s Business or Organization Address (Street Number and Name)': '',
            'City or Town 2': '',
            'State 2': 'VA',
            'ZIP Code 2': '',
        }
        
        return fields
    
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
