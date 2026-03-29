"""Document request/response schemas."""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.document import DocumentCategory, DocumentType


class DocumentUploadResponse(BaseModel):
    """Response after uploading a document."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    document_type: DocumentType
    category: DocumentCategory
    file_name: str
    file_path: str
    mime_type: str
    file_size: int
    version: int
    is_current: bool
    expires_at: Optional[str] = None
    created_at: Optional[str] = None


class DocumentResponse(BaseModel):
    """Response for a single document."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    document_type: DocumentType
    category: DocumentCategory
    file_name: str
    mime_type: str
    file_size: int
    version: int
    is_current: bool
    expires_at: Optional[str] = None
    signed_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class DocumentListResponse(BaseModel):
    """Response for listing documents."""
    items: List[DocumentResponse]
    total: int


class ExpiringDocumentResponse(BaseModel):
    """Response for documents nearing expiration."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    user_name: str
    document_type: DocumentType
    file_name: str
    expires_at: str
    days_until_expiry: int
