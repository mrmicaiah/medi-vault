"""Document models for uploaded files and credentials."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict


class DocumentCategory(str, Enum):
    """High-level category for documents."""
    IDENTIFICATION = "identification"
    CERTIFICATION = "certification"
    MEDICAL = "medical"
    AUTHORIZATION = "authorization"
    AGREEMENT = "agreement"
    OTHER = "other"


class DocumentType(str, Enum):
    """Specific document types within the system."""
    WORK_AUTHORIZATION = "work_authorization"
    ID_FRONT = "id_front"
    ID_BACK = "id_back"
    SOCIAL_SECURITY_CARD = "social_security_card"
    PROFESSIONAL_CREDENTIALS = "professional_credentials"
    CPR_CERTIFICATION = "cpr_certification"
    TB_TEST_RESULTS = "tb_test_results"
    DRIVERS_LICENSE = "drivers_license"
    BACKGROUND_CHECK = "background_check"
    DRUG_SCREENING = "drug_screening"
    FIRST_AID = "first_aid"
    OTHER = "other"


# Map document types to categories
DOCUMENT_CATEGORY_MAP = {
    DocumentType.WORK_AUTHORIZATION: DocumentCategory.AUTHORIZATION,
    DocumentType.ID_FRONT: DocumentCategory.IDENTIFICATION,
    DocumentType.ID_BACK: DocumentCategory.IDENTIFICATION,
    DocumentType.SOCIAL_SECURITY_CARD: DocumentCategory.IDENTIFICATION,
    DocumentType.PROFESSIONAL_CREDENTIALS: DocumentCategory.CERTIFICATION,
    DocumentType.CPR_CERTIFICATION: DocumentCategory.CERTIFICATION,
    DocumentType.TB_TEST_RESULTS: DocumentCategory.MEDICAL,
    DocumentType.DRIVERS_LICENSE: DocumentCategory.IDENTIFICATION,
    DocumentType.BACKGROUND_CHECK: DocumentCategory.AUTHORIZATION,
    DocumentType.DRUG_SCREENING: DocumentCategory.MEDICAL,
    DocumentType.FIRST_AID: DocumentCategory.CERTIFICATION,
    DocumentType.OTHER: DocumentCategory.OTHER,
}

# Allowed MIME types for uploads
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
}


class Document(BaseModel):
    """A document uploaded by or for a user."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    user_id: str
    document_type: DocumentType
    category: DocumentCategory
    file_name: str
    file_path: str
    mime_type: str
    file_size: int
    version: int = 1
    is_current: bool = True
    expires_at: Optional[str] = None
    uploaded_by: Optional[str] = None
    application_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
