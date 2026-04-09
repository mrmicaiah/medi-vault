"""Admin document approval endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
import logging

from ..dependencies import get_supabase
from .admin import get_staff_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/documents", tags=["admin-documents"])


class ApproveDocumentRequest(BaseModel):
    expiration_date: Optional[str] = None  # ISO date string YYYY-MM-DD


@router.post("/{document_id}/approve")
async def approve_document(
    document_id: str,
    request: ApproveDocumentRequest,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """
    Approve a pending document uploaded by an employee.
    Sets status to 'approved', records who approved it, and sets expiration date.
    """
    try:
        # Get the document
        doc_res = supabase.table("documents").select("*").eq("id", document_id).single().execute()
        if not doc_res.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc = doc_res.data
        
        if doc.get("status") != "pending_review":
            raise HTTPException(
                status_code=400, 
                detail=f"Document is not pending review (current status: {doc.get('status')})"
            )
        
        # Update the document
        update_data = {
            "status": "approved",
            "approved_by": user["user_id"],
            "approved_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        if request.expiration_date:
            update_data["expiration_date"] = request.expiration_date
        
        supabase.table("documents").update(update_data).eq("id", document_id).execute()
        
        logger.info(f"Document {document_id} approved by {user['user_id']}")
        
        return {
            "success": True,
            "message": "Document approved successfully",
            "document_id": document_id,
            "expiration_date": request.expiration_date
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document approval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{document_id}/reject")
async def reject_document(
    document_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """
    Reject a pending document uploaded by an employee.
    The employee will need to upload a new version.
    """
    try:
        # Get the document
        doc_res = supabase.table("documents").select("*").eq("id", document_id).single().execute()
        if not doc_res.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc = doc_res.data
        
        if doc.get("status") != "pending_review":
            raise HTTPException(
                status_code=400, 
                detail=f"Document is not pending review (current status: {doc.get('status')})"
            )
        
        # Update the document status
        supabase.table("documents").update({
            "status": "rejected",
            "is_current": False,  # Rejected docs are not current
            "approved_by": user["user_id"],  # Using approved_by to track who reviewed
            "approved_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", document_id).execute()
        
        # If there was a previous version, restore it as current
        prev_version = doc.get("version", 1) - 1
        if prev_version > 0:
            supabase.table("documents").update({
                "is_current": True,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("user_id", doc.get("user_id")).eq(
                "document_type", doc.get("document_type")
            ).eq("version", prev_version).execute()
        
        logger.info(f"Document {document_id} rejected by {user['user_id']}")
        
        return {
            "success": True,
            "message": "Document rejected",
            "document_id": document_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document rejection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending")
async def get_pending_documents(
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """
    Get all documents pending review.
    For managers, filtered to their location's employees.
    """
    try:
        role = user.get("role", "")
        profile = user.get("profile", {})
        
        # Get pending documents with user info
        query = supabase.table("documents").select(
            "*, profiles!documents_user_id_fkey(first_name, last_name, email)"
        ).eq("status", "pending_review").eq("is_current", True).order("created_at", desc=True)
        
        docs_res = query.execute()
        
        pending_docs = []
        for doc in (docs_res.data or []):
            doc_profile = doc.get("profiles") or {}
            
            # For managers, filter by location
            if role == "manager":
                # Get employee's location
                emp_res = supabase.table("employees").select("location_id").eq(
                    "user_id", doc.get("user_id")
                ).single().execute()
                
                if not emp_res.data or emp_res.data.get("location_id") != profile.get("location_id"):
                    continue
            
            pending_docs.append({
                "id": doc.get("id"),
                "document_type": doc.get("document_type"),
                "filename": doc.get("filename"),
                "uploaded_at": doc.get("created_at"),
                "version": doc.get("version"),
                "employee_name": f"{doc_profile.get('first_name', '')} {doc_profile.get('last_name', '')}".strip(),
                "employee_email": doc_profile.get("email"),
                "user_id": doc.get("user_id"),
            })
        
        return {
            "pending_documents": pending_docs,
            "total": len(pending_docs)
        }
    except Exception as e:
        logger.error(f"Pending documents fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
