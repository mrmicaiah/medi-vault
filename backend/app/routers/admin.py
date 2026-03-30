from fastapi import APIRouter, Depends, HTTPException, Header
from supabase import Client
from datetime import datetime, timedelta
from typing import Optional
import logging

from ..dependencies import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


async def get_staff_user(
    authorization: str = Header(None),
    supabase: Client = Depends(get_supabase),
) -> dict:
    """Validate JWT and require staff role. Returns user dict."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        auth_user = user_response.user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Token verification failed")
    
    try:
        profile_result = supabase.table("profiles").select("*").eq("id", str(auth_user.id)).single().execute()
        if not profile_result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        profile = profile_result.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch profile")
    
    role = profile.get("role", "applicant")
    if role not in ("admin", "superadmin", "manager"):
        raise HTTPException(status_code=403, detail="Staff access required")
    
    return {"user_id": str(auth_user.id), "role": role, "profile": profile}


def generate_signed_url(supabase: Client, storage_path: str, expires_in: int = 3600) -> Optional[str]:
    """Generate a signed URL for a file in Supabase Storage."""
    if not storage_path:
        return None
    try:
        result = supabase.storage.from_("documents").create_signed_url(storage_path, expires_in)
        return result.get("signedURL") or result.get("signedUrl")
    except Exception as e:
        logger.warning(f"Failed to generate signed URL for {storage_path}: {e}")
        return None


@router.get("/dashboard")
async def get_dashboard_stats(
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """Get dashboard statistics for admin users."""
    try:
        now = datetime.utcnow()
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        seven_days_ago = (now - timedelta(days=7)).isoformat()
        
        stats = {
            "total_applicants": 0,
            "pending_review": 0,
            "approved_this_month": 0,
            "expiring_documents": 0,
            "recent_applications": []
        }
        
        try:
            apps_res = supabase.table("applications").select("id", count="exact").execute()
            stats["total_applicants"] = apps_res.count or 0
        except Exception as e:
            logger.warning(f"Failed to get total applicants: {e}")
        
        try:
            pending_res = supabase.table("applications").select("id", count="exact").in_("status", ["submitted", "under_review"]).execute()
            stats["pending_review"] = pending_res.count or 0
        except Exception as e:
            logger.warning(f"Failed to get pending review count: {e}")
        
        try:
            approved_res = supabase.table("applications").select("id", count="exact").eq("status", "approved").gte("updated_at", thirty_days_ago).execute()
            stats["approved_this_month"] = approved_res.count or 0
        except Exception as e:
            logger.warning(f"Failed to get approved count: {e}")
        
        try:
            thirty_days_future = (now + timedelta(days=30)).isoformat()
            docs_res = supabase.table("documents").select("id", count="exact").lt("expiration_date", thirty_days_future).gt("expiration_date", now.isoformat()).execute()
            stats["expiring_documents"] = docs_res.count or 0
        except Exception as e:
            logger.warning(f"Failed to get expiring docs count: {e}")
        
        try:
            recent_res = supabase.table("applications").select("*").gte("created_at", seven_days_ago).order("created_at", desc=True).limit(10).execute()
            for app in (recent_res.data or []):
                try:
                    profile_res = supabase.table("profiles").select("first_name, last_name, email").eq("id", app["user_id"]).single().execute()
                    profile = profile_res.data or {}
                except:
                    profile = {}
                stats["recent_applications"].append({
                    "id": app["id"],
                    "status": app["status"],
                    "created_at": app["created_at"],
                    "applicant_name": f"{profile.get('first_name') or ''} {profile.get('last_name') or ''}".strip() or "Unknown",
                    "email": profile.get("email")
                })
        except Exception as e:
            logger.warning(f"Failed to get recent applications: {e}")
        
        return stats
        
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pipeline")
async def get_pipeline(
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """Get applicant pipeline for admin users."""
    try:
        res = supabase.table("applications").select("*").order("created_at", desc=True).execute()
        
        applications = []
        for app in (res.data or []):
            profile = {}
            location = {}
            
            try:
                profile_res = supabase.table("profiles").select("first_name, last_name, email").eq("id", app["user_id"]).single().execute()
                profile = profile_res.data or {}
            except:
                pass
            
            if app.get("location_id"):
                try:
                    location_res = supabase.table("locations").select("name").eq("id", app["location_id"]).single().execute()
                    location = location_res.data or {}
                except:
                    pass
            
            applications.append({
                "id": app["id"],
                "user_id": app["user_id"],
                "status": app["status"],
                "created_at": app["created_at"],
                "submitted_at": app.get("submitted_at"),
                "updated_at": app["updated_at"],
                "first_name": profile.get("first_name") or "",
                "last_name": profile.get("last_name") or "",
                "email": profile.get("email") or "",
                "location_name": location.get("name") or ""
            })
        
        return {"applications": applications}
        
    except Exception as e:
        logger.error(f"Pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/applicants/{application_id}")
async def get_applicant_detail(
    application_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """Get detailed applicant information including documents and agreements."""
    try:
        # Get application
        app_res = supabase.table("applications").select("*").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        app = app_res.data
        
        # Get profile
        profile = {}
        try:
            profile_res = supabase.table("profiles").select("*").eq("id", app["user_id"]).single().execute()
            profile = profile_res.data or {}
        except Exception as e:
            logger.warning(f"Failed to fetch profile: {e}")
        
        # Get location
        location_name = None
        if app.get("location_id"):
            try:
                location_res = supabase.table("locations").select("name").eq("id", app["location_id"]).single().execute()
                location_name = location_res.data.get("name") if location_res.data else None
            except:
                pass
        
        # Get all application steps
        steps = []
        try:
            steps_res = supabase.table("application_steps").select("*").eq("application_id", application_id).order("step_number").execute()
            steps = steps_res.data or []
        except Exception as e:
            logger.warning(f"Failed to fetch steps: {e}")
        
        # Get documents from documents table with signed URLs
        documents = []
        try:
            docs_res = supabase.table("documents").select("*").eq("user_id", app["user_id"]).order("created_at", desc=True).execute()
            for doc in (docs_res.data or []):
                signed_url = generate_signed_url(supabase, doc.get("storage_path"))
                documents.append({
                    "id": doc["id"],
                    "document_type": doc.get("document_type"),
                    "category": doc.get("category"),
                    "original_filename": doc.get("original_filename"),
                    "storage_path": doc.get("storage_path"),
                    "signed_url": signed_url,
                    "expiration_date": doc.get("expiration_date"),
                    "created_at": doc.get("created_at"),
                    "is_current": doc.get("is_current", True),
                })
        except Exception as e:
            logger.warning(f"Failed to fetch documents: {e}")
        
        # Get agreements with signed URLs for PDFs
        agreements = []
        try:
            agreements_res = supabase.table("agreements").select("*").eq("application_id", application_id).order("signed_at", desc=True).execute()
            for agr in (agreements_res.data or []):
                pdf_url = generate_signed_url(supabase, agr.get("pdf_storage_path"))
                agreements.append({
                    "id": agr["id"],
                    "agreement_type": agr.get("agreement_type"),
                    "signed_name": agr.get("signed_name"),
                    "signed_at": agr.get("signed_at"),
                    "pdf_storage_path": agr.get("pdf_storage_path"),
                    "pdf_url": pdf_url,
                    "ip_address": agr.get("ip_address"),
                })
        except Exception as e:
            logger.warning(f"Failed to fetch agreements: {e}")
        
        # Extract uploaded files from application steps (steps 11-17 are uploads)
        uploaded_files = []
        upload_steps = {
            11: "Work Authorization",
            12: "Photo ID (Front)",
            13: "Photo ID (Back)",
            14: "Social Security Card",
            15: "Professional Credentials",
            16: "CPR Certification",
            17: "TB Test Results",
        }
        for step in steps:
            step_num = step.get("step_number")
            if step_num in upload_steps:
                data = step.get("data") or {}
                if data.get("storage_path") or data.get("file_name"):
                    storage_path = data.get("storage_path") or ""
                    signed_url = generate_signed_url(supabase, storage_path) if storage_path else None
                    uploaded_files.append({
                        "step_number": step_num,
                        "document_name": upload_steps[step_num],
                        "file_name": data.get("file_name") or data.get("original_filename"),
                        "storage_path": storage_path,
                        "signed_url": signed_url,
                        "uploaded_at": step.get("completed_at"),
                        "skipped": data.get("skip", False),
                    })
                elif data.get("skip"):
                    uploaded_files.append({
                        "step_number": step_num,
                        "document_name": upload_steps[step_num],
                        "file_name": None,
                        "storage_path": None,
                        "signed_url": None,
                        "uploaded_at": None,
                        "skipped": True,
                    })
        
        return {
            "application": {
                "id": app["id"],
                "user_id": app["user_id"],
                "status": app["status"],
                "current_step": app.get("current_step", 1),
                "total_steps": app.get("total_steps", 22),
                "created_at": app["created_at"],
                "submitted_at": app.get("submitted_at"),
                "location_id": app.get("location_id"),
                "location_name": location_name
            },
            "profile": profile,
            "steps": steps,
            "documents": documents,
            "agreements": agreements,
            "uploaded_files": uploaded_files,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Applicant detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/applicant/{application_id}")
async def get_applicant_detail_old(
    application_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """Backward compatible endpoint."""
    return await get_applicant_detail(application_id, supabase, user)


@router.patch("/applicants/{application_id}/profile")
async def update_applicant_profile(
    application_id: str,
    updates: dict,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """Update applicant's profile information."""
    try:
        # Get application to find user_id
        app_res = supabase.table("applications").select("user_id").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        user_id = app_res.data["user_id"]
        
        # Allowed profile fields
        allowed_fields = {"first_name", "last_name", "email", "phone"}
        profile_updates = {k: v for k, v in updates.items() if k in allowed_fields and v is not None}
        
        if profile_updates:
            profile_updates["updated_at"] = datetime.utcnow().isoformat()
            supabase.table("profiles").update(profile_updates).eq("id", user_id).execute()
        
        # Update Step 2 (personal info) if address fields provided
        address_fields = {"address_line1", "address_line2", "city", "state", "zip", "date_of_birth", "gender", "ssn_last_four"}
        step2_updates = {k: v for k, v in updates.items() if k in address_fields and v is not None}
        
        if step2_updates:
            # Get current step 2 data
            step_res = supabase.table("application_steps").select("id, data").eq("application_id", application_id).eq("step_number", 2).single().execute()
            if step_res.data:
                current_data = step_res.data.get("data") or {}
                current_data.update(step2_updates)
                supabase.table("application_steps").update({
                    "data": current_data,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", step_res.data["id"]).execute()
        
        # Update Step 3 (emergency contact) if provided
        emergency_fields = {"emergency_name", "emergency_relationship", "emergency_phone"}
        step3_updates = {}
        for k, v in updates.items():
            if k.startswith("emergency_") and v is not None:
                # Map emergency_name -> name, etc.
                field_name = k.replace("emergency_", "")
                step3_updates[field_name] = v
        
        if step3_updates:
            step_res = supabase.table("application_steps").select("id, data").eq("application_id", application_id).eq("step_number", 3).single().execute()
            if step_res.data:
                current_data = step_res.data.get("data") or {}
                current_data.update(step3_updates)
                supabase.table("application_steps").update({
                    "data": current_data,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", step_res.data["id"]).execute()
        
        return {"success": True, "updated_fields": list(profile_updates.keys()) + list(step2_updates.keys()) + [f"emergency_{k}" for k in step3_updates.keys()]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/applicants/{application_id}/documents/{step_number}/url")
async def get_document_url(
    application_id: str,
    step_number: int,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """Get a signed URL for a specific uploaded document."""
    try:
        # Get the step data
        step_res = supabase.table("application_steps").select("data").eq("application_id", application_id).eq("step_number", step_number).single().execute()
        
        if not step_res.data:
            raise HTTPException(status_code=404, detail="Step not found")
        
        data = step_res.data.get("data") or {}
        storage_path = data.get("storage_path")
        
        if not storage_path:
            raise HTTPException(status_code=404, detail="No file uploaded for this step")
        
        signed_url = generate_signed_url(supabase, storage_path, expires_in=3600)
        
        if not signed_url:
            raise HTTPException(status_code=500, detail="Failed to generate signed URL")
        
        return {
            "signed_url": signed_url,
            "file_name": data.get("file_name") or data.get("original_filename"),
            "expires_in": 3600
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document URL error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/applicants/{application_id}/agreements/{agreement_id}/pdf")
async def get_agreement_pdf_url(
    application_id: str,
    agreement_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """Get a signed URL for an agreement PDF."""
    try:
        # Get the agreement
        agr_res = supabase.table("agreements").select("*").eq("id", agreement_id).eq("application_id", application_id).single().execute()
        
        if not agr_res.data:
            raise HTTPException(status_code=404, detail="Agreement not found")
        
        pdf_path = agr_res.data.get("pdf_storage_path")
        
        if not pdf_path:
            raise HTTPException(status_code=404, detail="PDF not yet generated for this agreement")
        
        signed_url = generate_signed_url(supabase, pdf_path, expires_in=3600)
        
        if not signed_url:
            raise HTTPException(status_code=500, detail="Failed to generate signed URL")
        
        return {
            "signed_url": signed_url,
            "agreement_type": agr_res.data.get("agreement_type"),
            "signed_at": agr_res.data.get("signed_at"),
            "expires_in": 3600
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Agreement PDF URL error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/applicant/{application_id}/status")
async def update_application_status(
    application_id: str,
    status_update: dict,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """Update application status."""
    try:
        new_status = status_update.get("status")
        valid_statuses = ["draft", "in_progress", "submitted", "under_review", "approved", "rejected", "hired"]
        
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        
        update_data = {
            "status": new_status,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # If approving or rejecting, record who did it
        if new_status in ("approved", "rejected"):
            update_data["reviewed_by"] = user["user_id"]
            update_data["reviewed_at"] = datetime.utcnow().isoformat()
        
        res = supabase.table("applications").update(update_data).eq("id", application_id).execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        return {"success": True, "status": new_status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
