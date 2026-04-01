from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import Response
from supabase import Client
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import logging
import os

from ..dependencies import get_supabase
from ..services.encryption_service import encryption_service

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
    if not storage_path:
        return None
    try:
        result = supabase.storage.from_("documents").create_signed_url(storage_path, expires_in)
        return result.get("signedURL") or result.get("signedUrl")
    except Exception as e:
        logger.warning(f"Failed to generate signed URL for {storage_path}: {e}")
        return None


def generate_signed_urls_batch(supabase: Client, storage_paths: List[str], expires_in: int = 3600) -> Dict[str, str]:
    result = {}
    valid_paths = [p for p in storage_paths if p]
    if not valid_paths:
        return result
    try:
        batch_result = supabase.storage.from_("documents").create_signed_urls(valid_paths, expires_in)
        for item in (batch_result or []):
            path = item.get("path")
            url = item.get("signedURL") or item.get("signedUrl")
            if path and url:
                result[path] = url
    except Exception as e:
        logger.warning(f"Batch signed URL failed, falling back: {e}")
        for path in valid_paths:
            url = generate_signed_url(supabase, path, expires_in)
            if url:
                result[path] = url
    return result


@router.get("/dashboard")
async def get_dashboard_stats(
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    try:
        now = datetime.utcnow()
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        
        stats = {
            "total_applicants": 0,
            "pending_review": 0,
            "approved_this_month": 0,
            "expiring_documents": 0,
            "recent_activity": []
        }
        
        apps_res = supabase.table("applications").select("id", count="exact").execute()
        stats["total_applicants"] = apps_res.count or 0
        
        pending_res = supabase.table("applications").select("id", count="exact").eq("status", "submitted").execute()
        stats["pending_review"] = pending_res.count or 0
        
        approved_res = supabase.table("applications").select("id", count="exact").eq("status", "approved").gte("updated_at", thirty_days_ago).execute()
        stats["approved_this_month"] = approved_res.count or 0
        
        thirty_days_future = (now + timedelta(days=30)).isoformat()
        try:
            docs_res = supabase.table("documents").select("id", count="exact").lt("expiration_date", thirty_days_future).gt("expiration_date", now.isoformat()).execute()
            stats["expiring_documents"] = docs_res.count or 0
        except: