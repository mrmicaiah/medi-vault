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
    COMPLIANCE = "compliance"
    OTHER = "other"


class DocumentType(str, Enum):
    """Specific document types within the system."""
    # Identification
    WORK_AUTHORIZATION = "work_authorization"
    ID_FRONT = "id_front"
    ID_BACK = "id_back"
    SOCIAL_SECURITY_CARD = "social_security_card"
    DRIVERS_LICENSE = "drivers_license"
    
    # Certifications
    PROFESSIONAL_CREDENTIALS = "professional_credentials"
    CPR_CERTIFICATION = "cpr_certification"
    FIRST_AID = "first_aid"
    
    # Medical
    TB_TEST_RESULTS = "tb_test_results"
    DRUG_SCREENING = "drug_screening"
    PHYSICAL_EXAM = "physical_exam"
    
    # Compliance (for audit readiness)
    BACKGROUND_CHECK = "background_check"
    OIG_EXCLUSION_CHECK = "oig_exclusion_check"
    STATE_EXCLUSION_CHECK = "state_exclusion_check"
    LICENSE = "license"
    TRAINING_RECORD = "training_record"
    
    OTHER = "other"


# Map document types to categories
DOCUMENT_CATEGORY_MAP = {
    DocumentType.WORK_AUTHORIZATION: DocumentCategory.AUTHORIZATION,
    DocumentType.ID_FRONT: DocumentCategory.IDENTIFICATION,
    DocumentType.ID_BACK: DocumentCategory.IDENTIFICATION,
    DocumentType.SOCIAL_SECURITY_CARD: DocumentCategory.IDENTIFICATION,
    DocumentType.DRIVERS_LICENSE: DocumentCategory.IDENTIFICATION,
    DocumentType.PROFESSIONAL_CREDENTIALS: DocumentCategory.CERTIFICATION,
    DocumentType.CPR_CERTIFICATION: DocumentCategory.CERTIFICATION,
    DocumentType.FIRST_AID: DocumentCategory.CERTIFICATION,
    DocumentType.TB_TEST_RESULTS: DocumentCategory.MEDICAL,
    DocumentType.DRUG_SCREENING: DocumentCategory.MEDICAL,
    DocumentType.PHYSICAL_EXAM: DocumentCategory.MEDICAL,
    DocumentType.BACKGROUND_CHECK: DocumentCategory.COMPLIANCE,
    DocumentType.OIG_EXCLUSION_CHECK: DocumentCategory.COMPLIANCE,
    DocumentType.STATE_EXCLUSION_CHECK: DocumentCategory.COMPLIANCE,
    DocumentType.LICENSE: DocumentCategory.COMPLIANCE,
    DocumentType.TRAINING_RECORD: DocumentCategory.COMPLIANCE,
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


class ComplianceDocumentStatus(str, Enum):
    """Status of a compliance document."""
    VALID = "valid"
    EXPIRED = "expired"
    PENDING = "pending"
    REJECTED = "rejected"


class ComplianceCheckResult(str, Enum):
    """Result of a compliance check (OIG, background, etc.)."""
    CLEAR = "clear"
    MATCH_FOUND = "match_found"
    PENDING = "pending"


class EmployeeComplianceDocument(BaseModel):
    """A compliance document for an employee (background check, OIG check, etc.)."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    employee_id: str
    document_type: str  # background_check, oig_exclusion_check, etc.
    document_name: str
    description: Optional[str] = None
    
    # File storage
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    
    # Validity tracking
    effective_date: str  # When the check was performed
    expiration_date: Optional[str] = None
    
    # Status
    status: ComplianceDocumentStatus = ComplianceDocumentStatus.VALID
    
    # For checks (OIG, background)
    check_result: Optional[ComplianceCheckResult] = None
    check_details: Optional[dict] = None
    
    # Audit trail
    uploaded_by: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
