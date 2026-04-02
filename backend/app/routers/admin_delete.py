"""Soft delete endpoint for applications."""
from datetime import datetime, timezone
from fastapi import Depends, HTTPException
from supabase import Client
import logging

from . import admin
from ..dependencies import get_supabase

logger = logging.getLogger(__name__)


@admin.router.delete("/applicants/{application_id}")
async def soft_delete_application(
    application_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(admin.get_staff_user)
):
    """
    Soft-delete an application (admin/manager).
    The application can be restored by a superadmin from the trash.
    """
    try:
        # Verify application exists
        app_res = supabase.table("applications").select("id, status").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Don't allow deleting hired applications
        if app_res.data.get("status") == "hired":
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete a hired application. The employee record must be terminated first."
            )
        
        # Soft delete by setting deleted_at
        result = supabase.table("applications").update({
            "deleted_at": datetime.now(timezone.utc).isoformat(),
            "deleted_by": user["user_id"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", application_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to delete application")
        
        logger.info(f"Application {application_id} soft-deleted by {user['user_id']}")
        return {"success": True, "message": "Application moved to trash"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Soft delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
