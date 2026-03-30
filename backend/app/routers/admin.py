from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from datetime import datetime, timedelta
import logging

from ..dependencies import get_supabase, require_staff

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
async def get_dashboard_stats(
    supabase: Client = Depends(get_supabase),
    _user: dict = Depends(require_staff)
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
            "recent_applications": [],
            "expiring_docs": []
        }
        
        # Total applicants
        try:
            apps_res = supabase.table("applications").select("id", count="exact").execute()
            stats["total_applicants"] = apps_res.count or 0
        except Exception as e:
            logger.warning(f"Failed to get total applicants: {e}")
        
        # Pending review
        try:
            pending_res = supabase.table("applications").select("id", count="exact").in_("status", ["submitted", "under_review"]).execute()
            stats["pending_review"] = pending_res.count or 0
        except Exception as e:
            logger.warning(f"Failed to get pending review count: {e}")
        
        # Approved this month
        try:
            approved_res = supabase.table("applications").select("id", count="exact").eq("status", "approved").gte("updated_at", thirty_days_ago).execute()
            stats["approved_this_month"] = approved_res.count or 0
        except Exception as e:
            logger.warning(f"Failed to get approved count: {e}")
        
        # Expiring documents (next 30 days)
        try:
            thirty_days_future = (now + timedelta(days=30)).isoformat()
            docs_res = supabase.table("documents").select("id", count="exact").lt("expiration_date", thirty_days_future).gt("expiration_date", now.isoformat()).execute()
            stats["expiring_documents"] = docs_res.count or 0
        except Exception as e:
            logger.warning(f"Failed to get expiring docs count: {e}")
        
        # Recent applications (last 7 days)
        try:
            recent_res = supabase.table("applications").select("*").gte("created_at", seven_days_ago).order("created_at", desc=True).limit(10).execute()
            
            for app in (recent_res.data or []):
                # Get profile separately
                profile_res = supabase.table("profiles").select("first_name, last_name, email").eq("id", app["user_id"]).single().execute()
                profile = profile_res.data or {}
                
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
    _user: dict = Depends(require_staff)
):
    """Get applicant pipeline for admin users."""
    try:
        logger.info("Fetching pipeline applications...")
        
        # Get all applications first
        res = supabase.table("applications").select("*").order("created_at", desc=True).execute()
        
        logger.info(f"Found {len(res.data or [])} applications")
        
        applications = []
        for app in (res.data or []):
            # Get profile separately to avoid join issues
            profile = {}
            location = {}
            
            try:
                profile_res = supabase.table("profiles").select("first_name, last_name, email").eq("id", app["user_id"]).single().execute()
                profile = profile_res.data or {}
            except Exception as e:
                logger.warning(f"Failed to get profile for {app['user_id']}: {e}")
            
            if app.get("location_id"):
                try:
                    location_res = supabase.table("locations").select("name").eq("id", app["location_id"]).single().execute()
                    location = location_res.data or {}
                except Exception as e:
                    logger.warning(f"Failed to get location for {app['location_id']}: {e}")
            
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
        
        logger.info(f"Returning {len(applications)} applications")
        return {"applications": applications}
        
    except Exception as e:
        logger.error(f"Pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/applicant/{application_id}")
async def get_applicant_detail(
    application_id: str,
    supabase: Client = Depends(get_supabase),
    _user: dict = Depends(require_staff)
):
    """Get detailed applicant information."""
    try:
        # Get application
        app_res = supabase.table("applications").select("*").eq("id", application_id).single().execute()
        
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        app = app_res.data
        
        # Get profile separately
        profile = {}
        try:
            profile_res = supabase.table("profiles").select("*").eq("id", app["user_id"]).single().execute()
            profile = profile_res.data or {}
        except:
            pass
        
        # Get location separately
        location_name = None
        if app.get("location_id"):
            try:
                location_res = supabase.table("locations").select("name").eq("id", app["location_id"]).single().execute()
                location_name = location_res.data.get("name") if location_res.data else None
            except:
                pass
        
        # Get all application steps
        steps_res = supabase.table("application_steps").select(
            "step_number, step_name, status, data, completed_at"
        ).eq("application_id", application_id).order("step_number").execute()
        
        # Get documents
        docs_res = supabase.table("documents").select(
            "id, document_type, original_filename, expiration_date, created_at, storage_path"
        ).eq("user_id", app["user_id"]).execute()
        
        return {
            "application": {
                "id": app["id"],
                "status": app["status"],
                "created_at": app["created_at"],
                "submitted_at": app.get("submitted_at"),
                "location_name": location_name
            },
            "profile": profile,
            "steps": steps_res.data or [],
            "documents": docs_res.data or []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Applicant detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/applicant/{application_id}/status")
async def update_application_status(
    application_id: str,
    status_update: dict,
    supabase: Client = Depends(get_supabase),
    _user: dict = Depends(require_staff)
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


@router.get("/training-leads")
async def get_training_leads(
    supabase: Client = Depends(get_supabase),
    _user: dict = Depends(require_staff)
):
    """Get certification training program leads from applications."""
    try:
        # Get step 4 (Education) data which contains certification interest
        steps_res = supabase.table("application_steps").select(
            "application_id, data"
        ).eq("step_number", 4).execute()
        
        if not steps_res.data:
            return {
                "hha_leads": [],
                "cpr_leads": [],
                "total_hha": 0,
                "total_cpr": 0
            }
        
        # Filter for leads who expressed interest
        hha_app_ids = []
        cpr_app_ids = []
        step_data_map = {}
        
        for step in steps_res.data:
            data = step.get("data") or {}
            app_id = step["application_id"]
            step_data_map[app_id] = data
            
            if data.get("interested_in_hha_certification") in ["yes", "maybe"]:
                hha_app_ids.append(app_id)
            
            if data.get("interested_in_cpr_certification") in ["yes", "maybe"]:
                cpr_app_ids.append(app_id)
        
        all_app_ids = list(set(hha_app_ids + cpr_app_ids))
        
        if not all_app_ids:
            return {
                "hha_leads": [],
                "cpr_leads": [],
                "total_hha": 0,
                "total_cpr": 0
            }
        
        # Get applications
        apps_res = supabase.table("applications").select("*").in_("id", all_app_ids).execute()
        
        # Get phone numbers from step 2
        personal_steps_res = supabase.table("application_steps").select(
            "application_id, data"
        ).eq("step_number", 2).in_("application_id", all_app_ids).execute()
        
        phone_map = {}
        for step in (personal_steps_res.data or []):
            data = step.get("data") or {}
            phone_map[step["application_id"]] = data.get("phone")
        
        def build_lead(app):
            # Get profile separately
            profile = {}
            location_name = None
            
            try:
                profile_res = supabase.table("profiles").select("first_name, last_name, email").eq("id", app["user_id"]).single().execute()
                profile = profile_res.data or {}
            except:
                pass
            
            if app.get("location_id"):
                try:
                    location_res = supabase.table("locations").select("name").eq("id", app["location_id"]).single().execute()
                    location_name = location_res.data.get("name") if location_res.data else None
                except:
                    pass
            
            edu_data = step_data_map.get(app["id"]) or {}
            
            return {
                "application_id": app["id"],
                "user_id": app["user_id"],
                "first_name": profile.get("first_name") or "",
                "last_name": profile.get("last_name") or "",
                "email": profile.get("email") or "",
                "phone": phone_map.get(app["id"]),
                "location_name": location_name,
                "interested_in_hha": edu_data.get("interested_in_hha_certification"),
                "interested_in_cpr": edu_data.get("interested_in_cpr_certification"),
                "has_cpr": edu_data.get("has_cpr_certification"),
                "certifications": edu_data.get("certifications") or [],
                "application_status": app["status"],
                "submitted_at": app.get("submitted_at"),
                "updated_at": app["updated_at"]
            }
        
        hha_leads = []
        cpr_leads = []
        
        for app in (apps_res.data or []):
            lead = build_lead(app)
            if app["id"] in hha_app_ids:
                hha_leads.append(lead)
            if app["id"] in cpr_app_ids:
                cpr_leads.append(lead)
        
        return {
            "hha_leads": hha_leads,
            "cpr_leads": cpr_leads,
            "total_hha": len(hha_leads),
            "total_cpr": len(cpr_leads)
        }
        
    except Exception as e:
        logger.error(f"Training leads error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
