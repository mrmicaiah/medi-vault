"""Superadmin-only endpoints for system management."""

from datetime import datetime, timezone
from typing import Optional
import logging

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.dependencies import get_supabase, require_superadmin
from app.models.user import UserProfile

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/superadmin", tags=["Superadmin"])


@router.get("/stats")
async def get_system_stats(
    admin: UserProfile = Depends(require_superadmin),
    supabase: Client = Depends(get_supabase),
):
    """Get system-wide statistics (superadmin only)."""
    try:
        stats = {
            "total_users": 0,
            "total_applications": 0,
            "total_employees": 0,
            "total_clients": 0,
            "total_agencies": 0,
            "total_locations": 0,
            "deleted_applications": 0,
        }
        
        # Count users
        users_res = supabase.table("profiles").select("id", count="exact").execute()
        stats["total_users"] = users_res.count or 0
        
        # Count applications (excluding deleted)
        apps_res = supabase.table("applications").select("id", count="exact").is_("deleted_at", "null").execute()
        stats["total_applications"] = apps_res.count or 0
        
        # Count deleted applications
        deleted_res = supabase.table("applications").select("id", count="exact").not_.is_("deleted_at", "null").execute()
        stats["deleted_applications"] = deleted_res.count or 0
        
        # Count employees
        emp_res = supabase.table("employees").select("id", count="exact").execute()
        stats["total_employees"] = emp_res.count or 0
        
        # Count clients
        clients_res = supabase.table("clients").select("id", count="exact").execute()
        stats["total_clients"] = clients_res.count or 0
        
        # Count agencies
        agencies_res = supabase.table("agencies").select("id", count="exact").execute()
        stats["total_agencies"] = agencies_res.count or 0
        
        # Count locations
        locations_res = supabase.table("locations").select("id", count="exact").execute()
        stats["total_locations"] = locations_res.count or 0
        
        return stats
    except Exception as e:
        logger.error(f"System stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trash")
async def get_deleted_applications(
    admin: UserProfile = Depends(require_superadmin),
    supabase: Client = Depends(get_supabase),
):
    """Get all soft-deleted applications (superadmin only)."""
    try:
        # Get deleted applications with profile info
        result = supabase.table("applications").select(
            "id, user_id, status, deleted_at, deleted_by, location_id, "
            "profiles!applications_user_id_fkey(first_name, last_name, email), "
            "locations(name)"
        ).not_.is_("deleted_at", "null").order("deleted_at", desc=True).execute()
        
        applications = []
        for app in (result.data or []):
            profile = app.get("profiles") or {}
            location = app.get("locations") or {}
            applications.append({
                "id": app.get("id"),
                "user_id": app.get("user_id"),
                "first_name": profile.get("first_name", ""),
                "last_name": profile.get("last_name", ""),
                "email": profile.get("email", ""),
                "status": app.get("status"),
                "deleted_at": app.get("deleted_at"),
                "deleted_by": app.get("deleted_by"),
                "location_name": location.get("name"),
            })
        
        return {"applications": applications}
    except Exception as e:
        logger.error(f"Trash fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trash/{application_id}/restore")
async def restore_application(
    application_id: str,
    admin: UserProfile = Depends(require_superadmin),
    supabase: Client = Depends(get_supabase),
):
    """Restore a soft-deleted application (superadmin only)."""
    try:
        result = supabase.table("applications").update({
            "deleted_at": None,
            "deleted_by": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", application_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        logger.info(f"Application {application_id} restored by {admin.id}")
        return {"success": True, "message": "Application restored"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Restore error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/trash/{application_id}")
async def permanently_delete_application(
    application_id: str,
    admin: UserProfile = Depends(require_superadmin),
    supabase: Client = Depends(get_supabase),
):
    """Permanently delete an application and all related data (superadmin only)."""
    try:
        # Get the application first to find user_id
        app_res = supabase.table("applications").select("user_id").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        user_id = app_res.data.get("user_id")
        
        # Delete related data in order (respecting foreign keys)
        # 1. Application steps
        supabase.table("application_steps").delete().eq("application_id", application_id).execute()
        
        # 2. Agreements
        supabase.table("agreements").delete().eq("application_id", application_id).execute()
        
        # 3. Documents for this user
        supabase.table("documents").delete().eq("user_id", user_id).execute()
        
        # 4. Sensitive data
        supabase.table("sensitive_data").delete().eq("user_id", user_id).execute()
        
        # 5. The application itself
        supabase.table("applications").delete().eq("id", application_id).execute()
        
        logger.info(f"Application {application_id} permanently deleted by {admin.id}")
        return {"success": True, "message": "Application permanently deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Permanent delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trash/purge")
async def purge_all_deleted(
    admin: UserProfile = Depends(require_superadmin),
    supabase: Client = Depends(get_supabase),
):
    """Permanently delete ALL soft-deleted applications (superadmin only)."""
    try:
        # Get all deleted applications
        deleted_res = supabase.table("applications").select("id, user_id").not_.is_("deleted_at", "null").execute()
        
        deleted_count = 0
        for app in (deleted_res.data or []):
            app_id = app.get("id")
            user_id = app.get("user_id")
            
            # Delete related data
            supabase.table("application_steps").delete().eq("application_id", app_id).execute()
            supabase.table("agreements").delete().eq("application_id", app_id).execute()
            supabase.table("documents").delete().eq("user_id", user_id).execute()
            supabase.table("sensitive_data").delete().eq("user_id", user_id).execute()
            supabase.table("applications").delete().eq("id", app_id).execute()
            deleted_count += 1
        
        logger.info(f"Purged {deleted_count} applications by {admin.id}")
        return {"success": True, "deleted_count": deleted_count}
    except Exception as e:
        logger.error(f"Purge error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activity")
async def get_activity_log(
    limit: int = 50,
    admin: UserProfile = Depends(require_superadmin),
    supabase: Client = Depends(get_supabase),
):
    """Get recent system activity (superadmin only)."""
    # For now, return empty - we can add an activity_log table later
    # This is a placeholder that shows the structure
    return {"logs": []}
