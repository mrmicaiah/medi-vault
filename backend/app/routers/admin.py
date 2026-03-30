from fastapi import APIRouter, Depends, HTTPException, Header
from supabase import Client
from datetime import datetime, timedelta
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
    """Get detailed applicant information."""
    try:
        app_res = supabase.table("applications").select("*").eq("id", application_id).single().execute()
        
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        app = app_res.data
        
        profile = {}
        try:
            profile_res = supabase.table("profiles").select("*").eq("id", app["user_id"]).single().execute()
            profile = profile_res.data or {}
        except Exception as e:
            logger.warning(f"Failed to fetch profile: {e}")
        
        location_name = None
        if app.get("location_id"):
            try:
                location_res = supabase.table("locations").select("name").eq("id", app["location_id"]).single().execute()
                location_name = location_res.data.get("name") if location_res.data else None
            except:
                pass
        
        steps = []
        try:
            steps_res = supabase.table("application_steps").select("step_number, step_name, status, data, completed_at").eq("application_id", application_id).order("step_number").execute()
            steps = steps_res.data or []
        except Exception as e:
            logger.warning(f"Failed to fetch steps: {e}")
        
        docs = []
        try:
            docs_res = supabase.table("documents").select("id, document_type, original_filename, expiration_date, created_at, storage_path").eq("user_id", app["user_id"]).execute()
            docs = docs_res.data or []
        except Exception as e:
            logger.warning(f"Failed to fetch documents: {e}")
        
        return {
            "application": {
                "id": app["id"],
                "status": app["status"],
                "created_at": app["created_at"],
                "submitted_at": app.get("submitted_at"),
                "location_id": app.get("location_id"),
                "location_name": location_name
            },
            "profile": profile,
            "steps": steps,
            "documents": docs
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
        valid_statuses = ["draft", "submitted", "under_review", "approved", "rejected", "hired"]
        
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        
        res = supabase.table("applications").update({
            "status": new_status,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", application_id).execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        return {"success": True, "status": new_status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
