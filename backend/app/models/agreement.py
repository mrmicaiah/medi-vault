"""Agreement models for signed documents."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AgreementType(str, Enum):
    """Types of agreements that can be signed."""
    CONFIDENTIALITY = "confidentiality"
    ESIGNATURE_CONSENT = "esignature_consent"
    ORIENTATION_ACKNOWLEDGMENT = "orientation_acknowledgment"
    CRIMINAL_BACKGROUND_ATTESTATION = "criminal_background_attestation"
    VA_CODE_DISCLOSURE = "va_code_disclosure"
    JOB_DESCRIPTION_ACKNOWLEDGMENT = "job_description_acknowledgment"
    MASTER_ONBOARDING_CONSENT = "master_onboarding_consent"


# Map application step numbers to agreement types
STEP_AGREEMENT_MAP = {
    9: AgreementType.CONFIDENTIALITY,
    10: AgreementType.ESIGNATURE_CONSENT,
    18: AgreementType.ORIENTATION_ACKNOWLEDGMENT,
    19: AgreementType.CRIMINAL_BACKGROUND_ATTESTATION,
    20: AgreementType.VA_CODE_DISCLOSURE,
    21: AgreementType.JOB_DESCRIPTION_ACKNOWLEDGMENT,
    22: AgreementType.MASTER_ONBOARDING_CONSENT,
}

# Map agreement types to template files
AGREEMENT_TEMPLATE_MAP = {
    AgreementType.CONFIDENTIALITY: "confidentiality_agreement.html",
    AgreementType.ESIGNATURE_CONSENT: "esignature_consent.html",
    AgreementType.ORIENTATION_ACKNOWLEDGMENT: "orientation_acknowledgment.html",
    AgreementType.CRIMINAL_BACKGROUND_ATTESTATION: "criminal_background_attestation.html",
    AgreementType.VA_CODE_DISCLOSURE: "va_code_disclosure.html",
    AgreementType.JOB_DESCRIPTION_ACKNOWLEDGMENT: "job_description_acknowledgment.html",
    AgreementType.MASTER_ONBOARDING_CONSENT: "master_onboarding_consent.html",
}


class Agreement(BaseModel):
    """A signed agreement record."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    user_id: str
    application_id: str
    agreement_type: AgreementType
    signature_text: str
    signed_at: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    pdf_path: Optional[str] = None
    pdf_url: Optional[str] = None
    created_at: Optional[str] = None
