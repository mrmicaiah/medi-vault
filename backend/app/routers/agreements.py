"""Agreement signing endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse
from supabase import Client

from app.dependencies import get_supabase, get_current_user
from app.models.user import UserProfile
from app.schemas.agreement import (
    AgreementListResponse,
    AgreementResponse,
    AgreementSignRequest,
)
from app.services.agreement_service import AgreementService
from app.services.pdf_service import PDFService

router = APIRouter(prefix="/agreements", tags=["Agreements"])


@router.post("/sign", response_model=AgreementResponse, status_code=201)
async def sign_agreement(
    request_body: AgreementSignRequest,
    request: Request,
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Sign an agreement and generate a PDF record."""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    agreement_service = AgreementService(supabase)
    agreement = agreement_service.sign_agreement(
        request=request_body,
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    # Generate PDF asynchronously
    try:
        pdf_service = PDFService(supabase)
        pdf_path, pdf_url = pdf_service.generate_and_upload_agreement(
            agreement_type=request_body.agreement_type,
            applicant_first_name=user.first_name,
            applicant_last_name=user.last_name,
            signature_text=request_body.signature_text,
            signed_at=agreement.signed_at,
            ip_address=ip_address,
        )

        # Update agreement record with PDF info
        agreement_service.update_agreement_pdf(agreement.id, pdf_path, pdf_url)
        agreement.pdf_path = pdf_path
        agreement.pdf_url = pdf_url
    except Exception:
        # PDF generation failure should not block signing
        pass

    return agreement


@router.get("", response_model=AgreementListResponse)
@router.get("/", response_model=AgreementListResponse)
async def list_agreements(
    application_id: Optional[str] = Query(None),
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """List all agreements for the current user."""
    service = AgreementService(supabase)
    items = service.get_user_agreements(user.id, application_id)
    return AgreementListResponse(items=items, total=len(items))


@router.get("/{agreement_id}/pdf")
async def get_agreement_pdf(
    agreement_id: str,
    user: UserProfile = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Get a signed URL for the agreement PDF."""
    agreement_service = AgreementService(supabase)
    agreement = agreement_service.get_agreement(agreement_id, user.id)

    if not agreement.pdf_path:
        return JSONResponse(
            status_code=404,
            content={"detail": "PDF not yet generated for this agreement"},
        )

    pdf_service = PDFService(supabase)
    url = pdf_service.get_agreement_pdf_url(agreement.pdf_path)

    return {"pdf_url": url, "agreement_id": agreement_id}
