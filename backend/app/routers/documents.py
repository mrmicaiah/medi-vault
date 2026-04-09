"""Document management endpoints for employee documents."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from supabase import Client
from datetime import datetime
from typing import Optional
import logging
import uuid

from ..dependencies import get_supabase
from .admin import get_staff_user, generate_signed_url

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/employees/documents", tags=["documents"])


# Document type configuration
DOCUMENT_CONFIG = {
    # Compliance
    "background_check": {"category": "compliance", "name": "Background Check"},
    "oig_exclusion_check": {"category": "compliance", "name": "OIG Exclusion Check"},
    "sam_exclusion_check": {"category": "compliance", "name": "SAM Exclusion Check"},
    "state_exclusion_check": {"category": "compliance", "name": "State Registry Check"},
    
    # Certifications
    "license": {"category": "certification", "name": "License"},
    "cpr_certification": {"category": "certification", "name": "CPR Certification"},
    "first_aid": {"category": "certification", "name": "First Aid"},
    "professional_credentials": {"category": "certification", "name": "Professional Credentials"},
    
    # Medical
    "tb_test_results": {"category": "medical", "name": "TB Test Results"},
    "physical_exam": {"category": "medical", "name": "Physical Exam"},
    "drug_screening": {"category": "medical", "name": "Drug Screening"},
    
    # Identification
    "drivers_license": {"category": "identification", "name": "Driver's License"},
    "id_card": {"category": "identification", "name": "State ID Card"},
    
    # Other
    "training_record": {"category": "other", "name": "Training Record"},
    "other": {"category": "other", "name": "Other Document"},
}


def get_document_name(doc_type: str) -> str:
    """Get the display name for a document type."""
    config = DOCUMENT_CONFIG.get(doc_type)
    if config:
        return config["name"]
    return doc_type.replace("_", " ").title()


def get_document_category(doc_type: str) -> str:
    """Get the category for a document type."""
    config = DOCUMENT_CONFIG.get(doc_type)
    if config:
        return config["category"]
    return "other"


@router.post("/upload")
async def upload_employee_document(
    employee_id: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(None),
    file_back: UploadFile = File(None),
    expiration_date: Optional[str] = Form(None),
    document_number: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    check_result: Optional[str] = Form(None),
    previous_document_id: Optional[str] = Form(None),
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """
    Upload a new document or update an existing one for an employee.
    Supports versioning - previous documents are retained.
    """
    try:
        # Validate employee exists
        emp_res = supabase.table("employees").select("id, user_id").eq("id", employee_id).single().execute()
        if not emp_res.data:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        user_id = emp_res.data.get("user_id")
        
        # Validate document type
        if document_type not in DOCUMENT_CONFIG:
            # Allow unknown types with fallback
            logger.warning(f"Unknown document type: {document_type}")
        
        # If this is an update, mark previous document as not current
        if previous_document_id:
            supabase.table("documents").update({
                "is_current": False,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", previous_document_id).execute()
            
            # Get the version number of the previous document
            prev_doc = supabase.table("documents").select("version").eq("id", previous_document_id).single().execute()
            new_version = (prev_doc.data.get("version", 1) + 1) if prev_doc.data else 1
        else:
            # Check if there's an existing current document of this type
            existing = supabase.table("documents").select("id, version").eq(
                "user_id", user_id
            ).eq("document_type", document_type).eq("is_current", True).execute()
            
            if existing.data and len(existing.data) > 0:
                # Mark existing as not current
                for doc in existing.data:
                    supabase.table("documents").update({
                        "is_current": False,
                        "updated_at": datetime.utcnow().isoformat()
                    }).eq("id", doc["id"]).execute()
                new_version = max(d.get("version", 1) for d in existing.data) + 1
            else:
                new_version = 1
        
        # Upload file to storage
        storage_path = None
        filename = None
        mime_type = None
        file_size = None
        
        if file:
            # Read file content
            file_content = await file.read()
            file_size = len(file_content)
            mime_type = file.content_type
            filename = file.filename
            
            # Generate unique storage path
            ext = filename.split('.')[-1] if '.' in filename else 'pdf'
            storage_filename = f"{uuid.uuid4()}.{ext}"
            storage_path = f"employee_documents/{employee_id}/{document_type}/{storage_filename}"
            
            # Upload to Supabase Storage
            try:
                supabase.storage.from_("documents").upload(
                    storage_path,
                    file_content,
                    {"content-type": mime_type}
                )
            except Exception as upload_err:
                logger.error(f"Storage upload failed: {upload_err}")
                raise HTTPException(status_code=500, detail="Failed to upload file to storage")
        
        # Upload back file if provided
        storage_path_back = None
        if file_back:
            file_back_content = await file_back.read()
            ext_back = file_back.filename.split('.')[-1] if '.' in file_back.filename else 'pdf'
            storage_filename_back = f"{uuid.uuid4()}_back.{ext_back}"
            storage_path_back = f"employee_documents/{employee_id}/{document_type}/{storage_filename_back}"
            
            try:
                supabase.storage.from_("documents").upload(
                    storage_path_back,
                    file_back_content,
                    {"content-type": file_back.content_type}
                )
            except Exception as upload_err:
                logger.error(f"Back file storage upload failed: {upload_err}")
                # Continue without back file
        
        # Create document record
        doc_data = {
            "user_id": user_id,
            "document_type": document_type,
            "category": get_document_category(document_type),
            "filename": filename,
            "storage_path": storage_path,
            "storage_path_back": storage_path_back,
            "mime_type": mime_type,
            "file_size": file_size,
            "version": new_version,
            "is_current": True,
            "uploaded_by": user["user_id"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        # Add optional fields
        if expiration_date:
            doc_data["expiration_date"] = expiration_date
        if document_number:
            doc_data["document_number"] = document_number
        if notes:
            doc_data["notes"] = notes
        if check_result:
            doc_data["check_result"] = check_result
        
        # Insert document
        result = supabase.table("documents").insert(doc_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create document record")
        
        new_doc = result.data[0]
        
        logger.info(f"Document uploaded: type={document_type}, employee={employee_id}, version={new_version}, by={user['user_id']}")
        
        return {
            "success": True,
            "document": {
                "id": new_doc.get("id"),
                "document_type": document_type,
                "name": get_document_name(document_type),
                "version": new_version,
                "filename": filename,
                "expiration_date": expiration_date,
                "is_update": previous_document_id is not None,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}/history")
async def get_document_history(
    document_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """
    Get version history for a document.
    """
    try:
        # Get the document to find user_id and type
        doc_res = supabase.table("documents").select("*").eq("id", document_id).single().execute()
        if not doc_res.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc = doc_res.data
        user_id = doc.get("user_id")
        doc_type = doc.get("document_type")
        
        # Get all versions of this document type for this user
        history_res = supabase.table("documents").select(
            "id, version, is_current, filename, expiration_date, created_at, uploaded_by"
        ).eq("user_id", user_id).eq("document_type", doc_type).order(
            "version", desc=True
        ).execute()
        
        return {
            "document_type": doc_type,
            "name": get_document_name(doc_type),
            "versions": history_res.data or []
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
