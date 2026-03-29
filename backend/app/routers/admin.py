"""Admin dashboard and applicant management endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.dependencies import get_supabase, require_admin, require_staff
from app.models.application import ApplicationStatus
from app.models.user import UserProfile
from app.schemas.admin import (
    ApplicantDetail,
    DashboardStats,
    PipelineResponse,
    PipelineStage,
    ReviewRequest,
)
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


def get_user_agency_id(supabase: Client, user_id: str) -> str | None:
    """Get the agency_id for a user."""
    result = (
        supabase.table("profiles")
        .select("agency_id")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return result.data.get("agency_id") if result.data else None


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    staff: UserProfile = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
):
    """Get admin dashboard statistics for the user's agency."""
    agency_id = get_user_agency_id(supabase, staff.id)
    
    # Count applications by status (filtered by agency)
    statuses = ["in_progress", "submitted", "under_review", "approved", "rejected", "hired"]
    counts = {}
    
    for s in statuses:
        query = (
            supabase.table("applications")
            .select("id", count="exact")
            .eq("status", s)
        )
        if agency_id:
            query = query.eq("agency_id", agency_id)
        result = query.execute()
        counts[s] = result.count or 0

    # Total applicants
    query = supabase.table("applications").select("user_id", count="exact")
    if agency_id:
        query = query.eq("agency_id", agency_id)
    total_apps = query.execute()

    # Employee counts (TODO: add agency_id to employees table)
    total_emp = (
        supabase.table("employees")
        .select("id", count="exact")
        .execute()
    )
    active_emp = (
        supabase.table("employees")
        .select("id", count="exact")
        .eq("status", "active")
        .execute()
    )

    # Expiring documents (next 30 days)
    now = datetime.now(timezone.utc)
    from datetime import timedelta

    cutoff_30 = (now + timedelta(days=30)).isoformat()
    expiring = (
        supabase.table("documents")
        .select("id", count="exact")
        .eq("is_current", True)
        .not_.is_("expires_at", "null")
        .lte("expires_at", cutoff_30)
        .gte("expires_at", now.isoformat())
        .execute()
    )
    expired = (
        supabase.table("documents")
        .select("id", count="exact")
        .eq("is_current", True)
        .not_.is_("expires_at", "null")
        .lt("expires_at", now.isoformat())
        .execute()
    )

    return DashboardStats(
        total_applicants=total_apps.count or 0,
        in_progress=counts.get("in_progress", 0),
        submitted=counts.get("submitted", 0),
        under_review=counts.get("under_review", 0),
        approved=counts.get("approved", 0),
        rejected=counts.get("rejected", 0),
        hired=counts.get("hired", 0),
        total_employees=total_emp.count or 0,
        active_employees=active_emp.count or 0,
        expiring_documents=expiring.count or 0,
        expired_documents=expired.count or 0,
    )


@router.get("/pipeline", response_model=PipelineResponse)
async def get_pipeline(
    staff: UserProfile = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
):
    """Get the full applicant pipeline for the user's agency."""
    agency_id = get_user_agency_id(supabase, staff.id)
    
    pipeline_statuses = [
        "in_progress",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "hired",
    ]

    stages = []
    total = 0

    for s in pipeline_statuses:
        query = (
            supabase.table("applications")
            .select("*, profiles(first_name, last_name, email), locations(name)")
            .eq("status", s)
            .order("updated_at", desc=True)
        )
        
        if agency_id:
            query = query.eq("agency_id", agency_id)
        
        result = query.execute()

        applicants = []
        for app in result.data or []:
            profile = app.get("profiles", {}) or {}
            location = app.get("locations", {}) or {}
            
            applicants.append(
                {
                    "application_id": app["id"],
                    "user_id": app["user_id"],
                    "first_name": profile.get("first_name", ""),
                    "last_name": profile.get("last_name", ""),
                    "email": profile.get("email", ""),
                    "current_step": app.get("current_step", 1),
                    "completed_steps": app.get("completed_steps", 0),
                    "submitted_at": app.get("submitted_at"),
                    "updated_at": app.get("updated_at"),
                    "location_name": location.get("name"),
                }
            )

        stages.append(PipelineStage(status=s, count=len(applicants), applicants=applicants))
        total += len(applicants)

    return PipelineResponse(stages=stages, total=total)


@router.get("/applicants/{app_id}", response_model=ApplicantDetail)
async def get_applicant_detail(
    app_id: str,
    staff: UserProfile = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
):
    """Get detailed view of an applicant for review."""
    agency_id = get_user_agency_id(supabase, staff.id)
    
    # Get application with profile
    query = (
        supabase.table("applications")
        .select("*, profiles(first_name, last_name, email, phone), locations(name)")
        .eq("id", app_id)
    )
    
    # Only filter by agency if user has one (superadmins might not)
    if agency_id:
        query = query.eq("agency_id", agency_id)
    
    app_result = query.single().execute()

    if not app_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    app = app_result.data
    profile = app.get("profiles", {}) or {}
    location = app.get("locations", {}) or {}
    user_id = app["user_id"]

    # Get steps
    steps_result = (
        supabase.table("application_steps")
        .select("*")
        .eq("application_id", app_id)
        .order("step_number")
        .execute()
    )

    # Get documents
    docs_result = (
        supabase.table("documents")
        .select("id, document_type, file_name, created_at, expires_at, is_current")
        .eq("user_id", user_id)
        .eq("is_current", True)
        .execute()
    )

    # Get agreements
    agreements_result = (
        supabase.table("agreements")
        .select("id, agreement_type, signed_at, pdf_path")
        .eq("application_id", app_id)
        .execute()
    )

    return ApplicantDetail(
        user_id=user_id,
        email=profile.get("email", ""),
        first_name=profile.get("first_name", ""),
        last_name=profile.get("last_name", ""),
        phone=profile.get("phone"),
        application_id=app_id,
        status=app["status"],
        current_step=app.get("current_step", 1),
        completed_steps=app.get("completed_steps", 0),
        total_steps=app.get("total_steps", 22),
        submitted_at=app.get("submitted_at"),
        location_name=location.get("name"),
        steps=steps_result.data or [],
        documents=docs_result.data or [],
        agreements=agreements_result.data or [],
    )


@router.post("/applicants/{app_id}/approve", response_model=SuccessResponse)
async def approve_applicant(
    app_id: str,
    review: ReviewRequest,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Approve an applicant's application. Admins only."""
    agency_id = get_user_agency_id(supabase, admin.id)
    
    # Verify application is in reviewable state and belongs to agency
    query = (
        supabase.table("applications")
        .select("id, status, agency_id")
        .eq("id", app_id)
    )
    if agency_id:
        query = query.eq("agency_id", agency_id)
    
    app_result = query.single().execute()

    if not app_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    if app_result.data["status"] not in ("submitted", "under_review"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve application with status '{app_result.data['status']}'",
        )

    now = datetime.now(timezone.utc).isoformat()
    supabase.table("applications").update(
        {
            "status": ApplicationStatus.APPROVED.value,
            "reviewed_at": now,
            "reviewed_by": admin.id,
            "notes": review.notes,
            "updated_at": now,
        }
    ).eq("id", app_id).execute()

    return SuccessResponse(message="Application approved", data={"application_id": app_id})


@router.post("/applicants/{app_id}/reject", response_model=SuccessResponse)
async def reject_applicant(
    app_id: str,
    review: ReviewRequest,
    admin: UserProfile = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Reject an applicant's application. Admins only."""
    agency_id = get_user_agency_id(supabase, admin.id)
    
    query = (
        supabase.table("applications")
        .select("id, status, agency_id")
        .eq("id", app_id)
    )
    if agency_id:
        query = query.eq("agency_id", agency_id)
    
    app_result = query.single().execute()

    if not app_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    if app_result.data["status"] not in ("submitted", "under_review"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject application with status '{app_result.data['status']}'",
        )

    now = datetime.now(timezone.utc).isoformat()
    supabase.table("applications").update(
        {
            "status": ApplicationStatus.REJECTED.value,
            "reviewed_at": now,
            "reviewed_by": admin.id,
            "notes": review.notes,
            "updated_at": now,
        }
    ).eq("id", app_id).execute()

    return SuccessResponse(message="Application rejected", data={"application_id": app_id})
