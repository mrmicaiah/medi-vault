"""
Document Generation API Routes

Endpoints for generating PDF documents:
- Employment Application PDF
- I-9 Form PDF
"""

import io
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from ..dependencies import get_current_user, get_supabase
from ..services.pdf_service import pdf_service
from ..services.encryption_service import encryption_service

router = APIRouter(prefix="/documents", tags=["documents"])


class GeneratePDFRequest(BaseModel):
    """Request to generate a PDF document."""
    save_to_storage: bool = True  # Whether to save to Supabase Storage


class PDFResponse(BaseModel):
    """Response after generating a PDF."""
    success: bool
    message: str
    storage_path: Optional[str] = None
    storage_url: Optional[str] = None


@router.post("/generate/application", response_model=PDFResponse)
async def generate_employment_application(
    request: GeneratePDFRequest = GeneratePDFRequest(),
    user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Generate Employment Application PDF for the current user.
    
    The PDF is generated from the user's application data and optionally
    saved to Supabase Storage.
    """
    try:
        # Get the user's application with all steps
        app_result = supabase.table('applications').select('*').eq('user_id', user['id']).single().execute()
        
        if not app_result.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        application = app_result.data
        
        # Get all steps for this application
        steps_result = supabase.table('application_steps').select('*').eq(
            'application_id', application['id']
        ).execute()
        
        # Build the application data structure
        steps_dict = {}
        for step in steps_result.data:
            steps_dict[step['step_number']] = {
                'data': step.get('data', {}),
                'status': step.get('status', 'not_started')
            }
        
        application_data = {
            'id': application['id'],
            'status': application['status'],
            'submitted_at': application.get('submitted_at'),
            'steps': steps_dict
        }
        
        # Generate the PDF
        pdf_bytes = pdf_service.generate_employment_application(application_data)
        
        if request.save_to_storage:
            # Save to Supabase Storage
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            file_path = f"{user['id']}/generated/employment_application_{timestamp}.pdf"
            
            # Upload to storage
            storage_result = supabase.storage.from_('documents').upload(
                file_path,
                pdf_bytes,
                file_options={"content-type": "application/pdf"}
            )
            
            # Get signed URL
            url_result = supabase.storage.from_('documents').create_signed_url(
                file_path,
                60 * 60 * 24 * 365  # 1 year
            )
            
            return PDFResponse(
                success=True,
                message="Employment Application PDF generated and saved",
                storage_path=file_path,
                storage_url=url_result.get('signedURL')
            )
        else:
            # Just return success, PDF would need to be returned differently
            return PDFResponse(
                success=True,
                message="Employment Application PDF generated"
            )
            
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@router.get("/download/application")
async def download_employment_application(
    user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Generate and download Employment Application PDF.
    
    Returns the PDF file directly for download.
    """
    try:
        # Get the user's application with all steps
        app_result = supabase.table('applications').select('*').eq('user_id', user['id']).single().execute()
        
        if not app_result.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        application = app_result.data
        
        # Get all steps for this application
        steps_result = supabase.table('application_steps').select('*').eq(
            'application_id', application['id']
        ).execute()
        
        # Build the application data structure
        steps_dict = {}
        for step in steps_result.data:
            steps_dict[step['step_number']] = {
                'data': step.get('data', {}),
                'status': step.get('status', 'not_started')
            }
        
        application_data = {
            'id': application['id'],
            'status': application['status'],
            'submitted_at': application.get('submitted_at'),
            'steps': steps_dict
        }
        
        # Generate the PDF
        pdf_bytes = pdf_service.generate_employment_application(application_data)
        
        # Get applicant name for filename
        step2 = steps_dict.get(2, {}).get('data', {})
        first_name = step2.get('first_name', 'Applicant')
        last_name = step2.get('last_name', '')
        filename = f"Employment_Application_{last_name}_{first_name}.pdf".replace(' ', '_')
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@router.post("/generate/i9", response_model=PDFResponse)
async def generate_i9_form(
    request: GeneratePDFRequest = GeneratePDFRequest(),
    user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Generate I-9 Form PDF for the current user.
    
    Fills out Section 1 (employee info) and prepares Section 2 (employer) 
    with document information. The PDF is optionally saved to Supabase Storage.
    
    Note: This requires the I-9 form template to be present in backend/app/assets/i-9.pdf
    """
    try:
        # Get the user's application with all steps
        app_result = supabase.table('applications').select('*').eq('user_id', user['id']).single().execute()
        
        if not app_result.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        application = app_result.data
        
        # Get all steps for this application
        steps_result = supabase.table('application_steps').select('*').eq(
            'application_id', application['id']
        ).execute()
        
        # Build the application data structure
        steps_dict = {}
        for step in steps_result.data:
            steps_dict[step['step_number']] = {
                'data': step.get('data', {}),
                'status': step.get('status', 'not_started')
            }
        
        application_data = {
            'id': application['id'],
            'status': application['status'],
            'submitted_at': application.get('submitted_at'),
            'steps': steps_dict
        }
        
        # Get decrypted SSN for the I-9
        ssn = None
        try:
            ssn_result = supabase.table('sensitive_data').select('encrypted_ssn').eq(
                'user_id', user['id']
            ).single().execute()
            
            if ssn_result.data and ssn_result.data.get('encrypted_ssn'):
                ssn = encryption_service.decrypt_ssn(ssn_result.data['encrypted_ssn'])
        except Exception:
            # SSN not available, will be blank on form
            pass
        
        # Generate the I-9 PDF
        pdf_bytes = pdf_service.generate_i9_form(application_data, ssn)
        
        if request.save_to_storage:
            # Save to Supabase Storage
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            file_path = f"{user['id']}/generated/i9_form_{timestamp}.pdf"
            
            # Upload to storage
            storage_result = supabase.storage.from_('documents').upload(
                file_path,
                pdf_bytes,
                file_options={"content-type": "application/pdf"}
            )
            
            # Get signed URL
            url_result = supabase.storage.from_('documents').create_signed_url(
                file_path,
                60 * 60 * 24 * 365  # 1 year
            )
            
            return PDFResponse(
                success=True,
                message="I-9 Form PDF generated and saved",
                storage_path=file_path,
                storage_url=url_result.get('signedURL')
            )
        else:
            return PDFResponse(
                success=True,
                message="I-9 Form PDF generated"
            )
            
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate I-9: {str(e)}")


@router.get("/download/i9")
async def download_i9_form(
    user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Generate and download I-9 Form PDF.
    
    Returns the PDF file directly for download.
    """
    try:
        # Get the user's application with all steps
        app_result = supabase.table('applications').select('*').eq('user_id', user['id']).single().execute()
        
        if not app_result.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        application = app_result.data
        
        # Get all steps for this application
        steps_result = supabase.table('application_steps').select('*').eq(
            'application_id', application['id']
        ).execute()
        
        # Build the application data structure
        steps_dict = {}
        for step in steps_result.data:
            steps_dict[step['step_number']] = {
                'data': step.get('data', {}),
                'status': step.get('status', 'not_started')
            }
        
        application_data = {
            'id': application['id'],
            'status': application['status'],
            'submitted_at': application.get('submitted_at'),
            'steps': steps_dict
        }
        
        # Get decrypted SSN for the I-9
        ssn = None
        try:
            ssn_result = supabase.table('sensitive_data').select('encrypted_ssn').eq(
                'user_id', user['id']
            ).single().execute()
            
            if ssn_result.data and ssn_result.data.get('encrypted_ssn'):
                ssn = encryption_service.decrypt_ssn(ssn_result.data['encrypted_ssn'])
        except Exception:
            pass
        
        # Generate the I-9 PDF
        pdf_bytes = pdf_service.generate_i9_form(application_data, ssn)
        
        # Get applicant name for filename
        step2 = steps_dict.get(2, {}).get('data', {})
        first_name = step2.get('first_name', 'Applicant')
        last_name = step2.get('last_name', '')
        filename = f"I9_Form_{last_name}_{first_name}.pdf".replace(' ', '_')
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
            
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate I-9: {str(e)}")
