"""Document upload and management endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from supabase import Client

from app.dependencies import get_supabase, get_current_user, require_admin
from app.models.document import DocumentType
from app.models.user import UserProfile
from app.schemas.common import SuccessResponse
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
    ExpiringDocumentResponse,
)
from app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...),
    application_id: Optional[str] = Form(None),
    expires_at: Optional[str] = Form(None),
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Upload a document for the current user."""
    service = DocumentService(supabase)
    return await service.upload_document(
        file=file,
        user_id=user.id,
        document_type=document_type,
        application_id=application_id,
        expires_at=expires_at,
    )


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    document_type: Optional[DocumentType] = Query(None),
    current_only: bool = Query(True),
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """List documents for the current user."""
    service = DocumentService(supabase)
    return service.get_documents(
        user_id=user.id,
        document_type=document_type,
        current_only=current_only,
    )


@router.get("/admin/expiring", response_model=List[ExpiringDocumentResponse])
async def get_expiring_documents(
    days: int = Query(30, ge=1, le=365),
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Get documents expiring within the specified number of days (admin only)."""
    service = DocumentService(supabase)
    return service.get_expiring_documents(days)


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: str,
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Get a specific document with a signed download URL."""
    service = DocumentService(supabase)
    return service.get_document(doc_id, user.id)


@router.put("/{doc_id}", response_model=DocumentResponse)
async def update_document(
    doc_id: str,
    expires_at: Optional[str] = None,
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Update document metadata (e.g., expiration date)."""
    service = DocumentService(supabase)
    return service.update_document(doc_id, user.id, expires_at)


@router.delete("/{doc_id}", response_model=SuccessResponse)
async def delete_document(
    doc_id: str,
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Delete a document."""
    service = DocumentService(supabase)
    service.delete_document(doc_id, user.id)
    return SuccessResponse(message="Document deleted successfully")
