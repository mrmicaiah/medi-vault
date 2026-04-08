from fastapi import APIRouter, Depends, HTTPException, Header
from supabase import Client
from datetime import datetime
from typing import Optional
import logging

from ..dependencies import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/applicant-messages", tags=["applicant-messages"])


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
    
    # Get location name if manager has a location
    location_name = None
    location_id = profile.get("location_id")
    if location_id:
        try:
            loc_res = supabase.table("locations").select("name").eq("id", location_id).single().execute()
            if loc_res.data:
                location_name = loc_res.data.get("name")
        except:
            pass
    
    return {
        "user_id": str(auth_user.id), 
        "role": role, 
        "profile": profile,
        "location_name": location_name
    }


async def get_any_user(
    authorization: str = Header(None),
    supabase: Client = Depends(get_supabase),
) -> dict:
    """Validate JWT for any authenticated user. Returns user dict."""
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
    
    return {"user_id": str(auth_user.id), "role": profile.get("role", "applicant"), "profile": profile}


@router.get("/{application_id}")
async def get_message_for_application(
    application_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_any_user)
):
    """Get the message for an application (if any). Applicants can only see their own."""
    try:
        # If applicant, verify they own this application
        if user["role"] == "applicant":
            app_res = supabase.table("applications").select("user_id").eq("id", application_id).single().execute()
            if not app_res.data or app_res.data.get("user_id") != user["user_id"]:
                raise HTTPException(status_code=403, detail="Not authorized to view this message")
        
        # Get the latest message for this application
        msg_res = supabase.table("applicant_messages").select("*").eq(
            "application_id", application_id
        ).order("created_at", desc=True).limit(1).execute()
        
        if msg_res.data and len(msg_res.data) > 0:
            return {"message": msg_res.data[0]}
        
        return {"message": None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get message error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{application_id}")
async def create_or_update_message(
    application_id: str,
    body: dict,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """Create or update a message for an application. Only staff can do this."""
    try:
        message_text = body.get("message", "").strip()
        if not message_text:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Verify application exists
        app_res = supabase.table("applications").select("id").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        profile = user["profile"]
        # Store first name only for display, and location
        posted_by_first_name = profile.get('first_name', '') or 'Manager'
        posted_by_name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip() or "Manager"
        location_name = user.get("location_name") or ""
        
        # Check if message already exists for this application
        existing = supabase.table("applicant_messages").select("id").eq(
            "application_id", application_id
        ).execute()
        
        if existing.data and len(existing.data) > 0:
            # Update existing message - reset read_at since it's a new message
            msg_id = existing.data[0]["id"]
            update_res = supabase.table("applicant_messages").update({
                "message": message_text,
                "posted_by": user["user_id"],
                "posted_by_name": posted_by_name,
                "posted_by_first_name": posted_by_first_name,
                "location_name": location_name,
                "read_at": None,  # Reset read status when message is updated
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", msg_id).execute()
            
            return {"success": True, "message": update_res.data[0] if update_res.data else None, "action": "updated"}
        else:
            # Create new message
            insert_res = supabase.table("applicant_messages").insert({
                "application_id": application_id,
                "message": message_text,
                "posted_by": user["user_id"],
                "posted_by_name": posted_by_name,
                "posted_by_first_name": posted_by_first_name,
                "location_name": location_name,
                "read_at": None,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }).execute()
            
            return {"success": True, "message": insert_res.data[0] if insert_res.data else None, "action": "created"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create/update message error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{application_id}/read")
async def mark_message_as_read(
    application_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_any_user)
):
    """Mark a message as read. Only the applicant who owns the application can do this."""
    try:
        # Verify applicant owns this application
        app_res = supabase.table("applications").select("user_id").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        if app_res.data.get("user_id") != user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized to mark this message as read")
        
        # Update the message with read_at timestamp
        update_res = supabase.table("applicant_messages").update({
            "read_at": datetime.utcnow().isoformat()
        }).eq("application_id", application_id).execute()
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mark read error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{application_id}")
async def delete_message(
    application_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """Delete the message for an application. Only staff can do this."""
    try:
        # Delete all messages for this application
        supabase.table("applicant_messages").delete().eq(
            "application_id", application_id
        ).execute()
        
        return {"success": True}
    except Exception as e:
        logger.error(f"Delete message error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
