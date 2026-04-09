"""Employee portal endpoints - for employees to manage their own documents."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from supabase import Client
from datetime import datetime
from typing import Optional
import logging
import uuid

from ..dependencies import get_supabase, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/employee", tags=["employee-portal"])


# Document type display names
DOCUMENT_NAMES = {
    # From application steps
    "work_authorization": "Work Authorization",
    "id_front": "Photo ID (Front)",
    "id_back": "Photo ID (Back)",
    "social_security_card": "Social Security Card",
    "professional_credentials": "Professional Credentials",
    "cpr_certification": "CPR Certification",
    "tb_test_results": "TB Test Results",
    
    # From documents table
    "background_check": "Background Check",
    "oig_exclusion_check": "OIG Exclusion Check",
    "sam_exclusion_check": "SAM Exclusion Check",
    "license": "License",
    "drivers_license": "Driver's License",
    "first_aid": "First Aid Certification",
    "physical_exam": "Physical Exam",
    "drug_screening": "Drug Screening",
}

# Map application step numbers to document types
STEP_TO_DOC_TYPE = {
    11: "work_authorization",
    12: "id_front",
    13: "id_back",
    14: "social_security_card",
    15: "professional_credentials",
    16: "cpr_certification",
    17: "tb_test_results",
}


def get_document_name(doc_type: str) -> str:
    """Get display name for a document type."""
    return DOCUMENT_NAMES.get(doc_type, doc_type.replace("_", " ").title())


@router.get("/documents")
async def get_my_documents(
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_current_user)
):
    """
    Get all documents for the current employee.
    Combines application step uploads with documents table entries.
    """
    try:
        user_id = user["user_id"]
        
        # Verify user is an employee
        emp_res = supabase.table("employees").select(
            "id, user_id"
        ).eq("user_id", user_id).single().execute()
        
        if not emp_res.data:
            raise HTTPException(status_code=403, detail="Not an employee")
        
        employee_id = emp_res.data["id"]
        
        # Get application ID for this employee
        app_res = supabase.table("applications").select(
            "id"
        ).eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
        
        application_id = app_res.data[0]["id"] if app_res.data else None
        
        documents = []
        
        # 1. Get documents from application steps (11-17)
        if application_id:
            steps_res = supabase.table("application_steps").select(
                "step_number, data, updated_at"
            ).eq("application_id", application_id).in_(
                "step_number", [11, 12, 13, 14, 15, 16, 17]
            ).execute()
            
            for step in (steps_res.data or []):
                data = step.get("data") or {}
                if data.get("file_name"):
                    doc_type = STEP_TO_DOC_TYPE.get(step["step_number"], "unknown")
                    documents.append({
                        "id": f"app_step_{step['step_number']}",
                        "document_type": doc_type,
                        "name": get_document_name(doc_type),
                        "filename": data.get("file_name"),
                        "uploaded_at": step.get("updated_at"),
                        "expiration_date": data.get("expiration_date"),
                        "status": "approved",  # Application docs are already approved
                        "version": 1,
                        "source": "application",
                        "endpoint": f"/admin/applicants/{application_id}/documents/{step['step_number']}/url",
                    })
        
        # 2. Get documents from documents table (current versions only)
        docs_res = supabase.table("documents").select(
            "id, document_type, filename, created_at, expiration_date, status, version, storage_path"
        ).eq("user_id", user_id).eq("is_current", True).execute()
        
        for doc in (docs_res.data or []):
            doc_type = doc.get("document_type", "unknown")
            
            # Check if this supersedes an application step document
            # If so, remove the application version from the list
            documents = [d for d in documents if d["document_type"] != doc_type]
            
            documents.append({
                "id": doc["id"],
                "document_type": doc_type,
                "name": get_document_name(doc_type),
                "filename": doc.get("filename"),
                "uploaded_at": doc.get("created_at"),
                "expiration_date": doc.get("expiration_date"),
                "status": doc.get("status", "approved"),
                "version": doc.get("version", 1),
                "source": "documents_table",
                "endpoint": f"/admin/documents/{doc['id']}/url" if doc.get("storage_path") else None,
            })
        
        # Sort by name
        documents.sort(key=lambda d: d["name"])
        
        return {
            "employee_id": employee_id,
            "employee_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            "documents": documents,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching employee documents: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/upload")
async def upload_document_update(
    document_type: str = Form(...),
    file: UploadFile = File(...),
    previous_document_id: Optional[str] = Form(None),
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_current_user)
):
    """
    Employee uploads a new version of a document.
    The document goes into 'pending_review' status until manager approves.
    """
    try:
        user_id = user["user_id"]
        
        # Verify user is an employee
        emp_res = supabase.table("employees").select(
            "id"
        ).eq("user_id", user_id).single().execute()
        
        if not emp_res.data:
            raise HTTPException(status_code=403, detail="Not an employee")
        
        employee_id = emp_res.data["id"]
        
        # Determine version number
        if previous_document_id and not previous_document_id.startswith("app_step_"):
            # Mark previous document as not current
            supabase.table("documents").update({
                "is_current": False,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", previous_document_id).execute()
            
            # Get version number
            prev_doc = supabase.table("documents").select("version").eq(
                "id", previous_document_id
            ).single().execute()
            new_version = (prev_doc.data.get("version", 1) + 1) if prev_doc.data else 1
        else:
            # Check for existing documents of this type
            existing = supabase.table("documents").select("id, version").eq(
                "user_id", user_id
            ).eq("document_type", document_type).eq("is_current", True).execute()
            
            if existing.data:
                for doc in existing.data:
                    supabase.table("documents").update({
                        "is_current": False,
                        "updated_at": datetime.utcnow().isoformat()
                    }).eq("id", doc["id"]).execute()
                new_version = max(d.get("version", 1) for d in existing.data) + 1
            else:
                new_version = 1
        
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        mime_type = file.content_type
        filename = file.filename
        
        # Generate storage path
        ext = filename.split('.')[-1] if '.' in filename else 'pdf'
        storage_filename = f"{uuid.uuid4()}.{ext}"
        storage_path = f"employee_documents/{employee_id}/{document_type}/{storage_filename}"
        
        # Upload to storage
        try:
            supabase.storage.from_("documents").upload(
                storage_path,
                file_content,
                {"content-type": mime_type}
            )
        except Exception as upload_err:
            logger.error(f"Storage upload failed: {upload_err}")
            raise HTTPException(status_code=500, detail="Failed to upload file")
        
        # Create document record with pending_review status
        doc_data = {
            "user_id": user_id,
            "document_type": document_type,
            "category": "employee_upload",
            "filename": filename,
            "storage_path": storage_path,
            "mime_type": mime_type,
            "file_size": file_size,
            "version": new_version,
            "is_current": True,
            "status": "pending_review",
            "uploaded_by": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        result = supabase.table("documents").insert(doc_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create document record")
        
        new_doc = result.data[0]
        
        logger.info(f"Employee document uploaded: type={document_type}, employee={employee_id}, version={new_version}")
        
        return {
            "success": True,
            "message": "Document uploaded successfully. It will be reviewed by your manager.",
            "document": {
                "id": new_doc.get("id"),
                "document_type": document_type,
                "name": get_document_name(document_type),
                "version": new_version,
                "status": "pending_review",
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Employee document upload error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
