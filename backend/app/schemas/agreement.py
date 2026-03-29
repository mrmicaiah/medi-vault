"""Agreement request/response schemas."""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.agreement import AgreementType


class AgreementSignRequest(BaseModel):
    """Request to sign an agreement."""
    application_id: str
    agreement_type: AgreementType
    signature_text: str
    step_number: int


class AgreementResponse(BaseModel):
    """Response for a signed agreement."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    application_id: str
    agreement_type: AgreementType
    signature_text: str
    signed_at: str
    ip_address: Optional[str] = None
    pdf_path: Optional[str] = None
    pdf_url: Optional[str] = None
    created_at: Optional[str] = None


class AgreementListResponse(BaseModel):
    """Response for listing agreements."""
    items: List[AgreementResponse]
    total: int
