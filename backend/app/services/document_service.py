"""Document upload and management service."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, UploadFile, status
from supabase import Client

from app.config import get_settings
from app.models.document import (
    ALLOWED_MIME_TYPES,
    DOCUMENT_CATEGORY_MAP,
    Document,
    DocumentCategory,
    DocumentType,
)
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
    ExpiringDocumentResponse,
)


class DocumentService:
    """Handles document uploads, versioning, and retrieval via Supabase Storage."""

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.settings = get_settings()

    async def upload_document(
        self,
        file: UploadFile,
        user_id: str,
        document_type: DocumentType,
        application_id: Optional[str] = None,
        expires_at: Optional[str] = None,
    ) -> DocumentUploadResponse:
        """Upload a document to Supabase Storage and create a database record."""
        # Validate MIME type
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '{file.content_type}' not allowed. Accepted: {', '.join(ALLOWED_MIME_TYPES)}",
            )

        # Read file content
        file_bytes = await file.read()
        file_size = len(file_bytes)

        # Validate file size
        if file_size > self.settings.max_upload_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size: {self.settings.max_upload_size // (1024 * 1024)} MB",
            )

        # Determine version by checking existing documents
        existing = (
            self.supabase.table("documents")
            .select("version")
            .eq("user_id", user_id)
            .eq("document_type", document_type.value)
            .eq("is_current", True)
            .execute()
        )

        version = 1
        if existing.data:
            version = existing.data[0]["version"] + 1
            # Mark old versions as not current
            self.supabase.table("documents").update({"is_current": False}).eq(
                "user_id", user_id
            ).eq("document_type", document_type.value).eq("is_current", True).execute()

        # Build storage path
        ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "pdf"
        file_id = uuid.uuid4().hex[:12]
        storage_path = f"{user_id}/{document_type.value}/{file_id}_v{version}.{ext}"

        # Upload to Supabase Storage
        try:
            self.supabase.storage.from_(self.settings.documents_bucket).upload(
                storage_path, file_bytes, {"content-type": file.content_type}
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Storage upload failed: {str(exc)}",
            )

        category = DOCUMENT_CATEGORY_MAP.get(document_type, DocumentCategory.OTHER)
        now = datetime.now(timezone.utc).isoformat()

        # Create database record
        doc_result = (
            self.supabase.table("documents")
            .insert(
                {
                    "user_id": user_id,
                    "document_type": document_type.value,
                    "category": category.value,
                    "file_name": file.filename or f"{document_type.value}.{ext}",
                    "file_path": storage_path,
                    "mime_type": file.content_type,
                    "file_size": file_size,
                    "version": version,
                    "is_current": True,
                    "expires_at": expires_at,
                    "uploaded_by": user_id,
                    "application_id": application_id,
                    "created_at": now,
                    "updated_at": now,
                }
            )
            .execute()
        )

        if not doc_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create document record",
            )

        d = doc_result.data[0]
        return DocumentUploadResponse(
            id=d["id"],
            user_id=d["user_id"],
            document_type=DocumentType(d["document_type"]),
            category=DocumentCategory(d["category"]),
            file_name=d["file_name"],
            file_path=d["file_path"],
            mime_type=d["mime_type"],
            file_size=d["file_size"],
            version=d["version"],
            is_current=d["is_current"],
            expires_at=d.get("expires_at"),
            created_at=d.get("created_at"),
        )

    def get_documents(
        self,
        user_id: str,
        document_type: Optional[DocumentType] = None,
        current_only: bool = True,
    ) -> DocumentListResponse:
        """List documents for a user."""
        query = self.supabase.table("documents").select("*", count="exact").eq("user_id", user_id)

        if document_type:
            query = query.eq("document_type", document_type.value)
        if current_only:
            query = query.eq("is_current", True)

        result = query.order("created_at", desc=True).execute()

        items = []
        for d in result.data or []:
            # Generate signed URL
            signed_url = None
            try:
                url_result = self.supabase.storage.from_(
                    self.settings.documents_bucket
                ).create_signed_url(d["file_path"], 3600)
                signed_url = url_result.get("signedURL") if isinstance(url_result, dict) else getattr(url_result, "signed_url", None)
            except Exception:
                pass

            items.append(
                DocumentResponse(
                    id=d["id"],
                    user_id=d["user_id"],
                    document_type=DocumentType(d["document_type"]),
                    category=DocumentCategory(d["category"]),
                    file_name=d["file_name"],
                    mime_type=d["mime_type"],
                    file_size=d["file_size"],
                    version=d["version"],
                    is_current=d["is_current"],
                    expires_at=d.get("expires_at"),
                    signed_url=signed_url,
                    created_at=d.get("created_at"),
                    updated_at=d.get("updated_at"),
                )
            )

        return DocumentListResponse(items=items, total=result.count or len(items))

    def get_document(self, doc_id: str, user_id: Optional[str] = None) -> DocumentResponse:
        """Get a single document by ID."""
        query = self.supabase.table("documents").select("*").eq("id", doc_id)
        if user_id:
            query = query.eq("user_id", user_id)

        result = query.single().execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )

        d = result.data
        signed_url = None
        try:
            url_result = self.supabase.storage.from_(
                self.settings.documents_bucket
            ).create_signed_url(d["file_path"], 3600)
            signed_url = url_result.get("signedURL") if isinstance(url_result, dict) else getattr(url_result, "signed_url", None)
        except Exception:
            pass

        return DocumentResponse(
            id=d["id"],
            user_id=d["user_id"],
            document_type=DocumentType(d["document_type"]),
            category=DocumentCategory(d["category"]),
            file_name=d["file_name"],
            mime_type=d["mime_type"],
            file_size=d["file_size"],
            version=d["version"],
            is_current=d["is_current"],
            expires_at=d.get("expires_at"),
            signed_url=signed_url,
            created_at=d.get("created_at"),
            updated_at=d.get("updated_at"),
        )

    def update_document(
        self,
        doc_id: str,
        user_id: str,
        expires_at: Optional[str] = None,
    ) -> DocumentResponse:
        """Update document metadata (e.g., expiration date)."""
        now = datetime.now(timezone.utc).isoformat()
        update_data: dict = {"updated_at": now}
        if expires_at is not None:
            update_data["expires_at"] = expires_at

        result = (
            self.supabase.table("documents")
            .update(update_data)
            .eq("id", doc_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )

        return self.get_document(doc_id, user_id)

    def delete_document(self, doc_id: str, user_id: str) -> None:
        """Delete a document from storage and database."""
        # Get the document to find storage path
        doc = self.get_document(doc_id, user_id)

        # Delete from storage
        try:
            self.supabase.storage.from_(self.settings.documents_bucket).remove(
                [doc.file_name]  # Use the file path stored in DB
            )
        except Exception:
            pass  # Continue even if storage delete fails

        # Delete from database
        self.supabase.table("documents").delete().eq("id", doc_id).eq(
            "user_id", user_id
        ).execute()

    def get_expiring_documents(self, days: int = 30) -> List[ExpiringDocumentResponse]:
        """Get documents expiring within the specified number of days (admin use)."""
        now = datetime.now(timezone.utc)
        from datetime import timedelta
        cutoff = (now + timedelta(days=days)).isoformat()

        result = (
            self.supabase.table("documents")
            .select("*, profiles(first_name, last_name)")
            .eq("is_current", True)
            .not_.is_("expires_at", "null")
            .lte("expires_at", cutoff)
            .gte("expires_at", now.isoformat())
            .order("expires_at")
            .execute()
        )

        items = []
        for d in result.data or []:
            profile = d.get("profiles", {}) or {}
            user_name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
            exp_date = datetime.fromisoformat(d["expires_at"].replace("Z", "+00:00"))
            days_until = (exp_date - now).days

            items.append(
                ExpiringDocumentResponse(
                    id=d["id"],
                    user_id=d["user_id"],
                    user_name=user_name or "Unknown",
                    document_type=DocumentType(d["document_type"]),
                    file_name=d["file_name"],
                    expires_at=d["expires_at"],
                    days_until_expiry=days_until,
                )
            )

        return items
