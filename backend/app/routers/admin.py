from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import Response, HTMLResponse
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


def get_agency_branding(supabase: Client, location_id: Optional[str]) -> Dict[str, Optional[str]]:
    """
    Fetch agency branding (logo_url, name) from the agencies table via location_id.
    Returns dict with logo_url and company_name (defaults to "Eveready HomeCare").
    """
    result = {"logo_url": None, "company_name": "Eveready HomeCare"}
    
    if not location_id:
        return result
    
    try:
        loc_res = supabase.table("locations").select("agency_id").eq("id", location_id).single().execute()
        if loc_res.data and loc_res.data.get("agency_id"):
            agency_res = supabase.table("agencies").select("logo_url, name").eq("id", loc_res.data["agency_id"]).single().execute()
            if agency_res.data:
                result["logo_url"] = agency_res.data.get("logo_url")
                if agency_res.data.get("name"):
                    result["company_name"] = agency_res.data.get("name")
    except Exception as e:
        logger.warning(f"Could not fetch agency branding: {e}")
    
    return result


def get_location_names(supabase: Client, location_ids: List[str]) -> Dict[str, str]:
    """Fetch location names for a list of location IDs."""
    if not location_ids:
        return {}
    
    unique_ids = list(set(id for id in location_ids if id))
    if not unique_ids:
        return {}
    
    try:
        res = supabase.table("locations").select("id, name").in_("id", unique_ids).execute()
        return {loc["id"]: loc["name"] for loc in (res.data or [])}
    except Exception as e:
        logger.warning(f"Could not fetch location names: {e}")
        return {}


def get_staff_location_filter(user: dict) -> Optional[str]:
    """
    Get the location_id to filter queries by.
    
    - Superadmin: Returns None (no filter, sees everything)
    - Admin/Manager: Returns their assigned location_id
    """
    role = user.get("role", "")
    profile = user.get("profile", {})
    
    # Superadmins see everything
    if role == "superadmin":
        return None
    
    # Admins and managers see only their location
    location_id = profile.get("location_id")
    return location_id


@router.get("/dashboard")
@router.get("/dashboard/")
async def get_dashboard_stats(
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    try:
        now = datetime.utcnow()
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        
        # Get location filter for this staff member
        location_filter = get_staff_location_filter(user)
        
        stats = {
            "total_applicants": 0,
            "pending_review": 0,
            "approved_this_month": 0,
            "expiring_documents": 0,
            "recent_activity": []
        }
        
        # Build queries with optional location filter
        apps_query = supabase.table("applications").select("id", count="exact")
        pending_query = supabase.table("applications").select("id", count="exact").eq("status", "submitted")
        approved_query = supabase.table("applications").select("id", count="exact").eq("status", "approved").gte("updated_at", thirty_days_ago)
        recent_query = supabase.table("applications").select("id, status, updated_at, profiles!applications_user_id_fkey(first_name, last_name)").order("updated_at", desc=True).limit(5)
        
        # Apply location filter if not superadmin
        if location_filter:
            apps_query = apps_query.eq("location_id", location_filter)
            pending_query = pending_query.eq("location_id", location_filter)
            approved_query = approved_query.eq("location_id", location_filter)
            recent_query = recent_query.eq("location_id", location_filter)
        
        apps_res = apps_query.execute()
        stats["total_applicants"] = apps_res.count or 0
        
        pending_res = pending_query.execute()
        stats["pending_review"] = pending_res.count or 0
        
        approved_res = approved_query.execute()
        stats["approved_this_month"] = approved_res.count or 0
        
        thirty_days_future = (now + timedelta(days=30)).isoformat()
        try:
            docs_res = supabase.table("documents").select("id", count="exact").lt("expiration_date", thirty_days_future).gt("expiration_date", now.isoformat()).execute()
            stats["expiring_documents"] = docs_res.count or 0
        except:
            pass
        
        recent_res = recent_query.execute()
        for app in (recent_res.data or []):
            profile = app.get("profiles") or {}
            stats["recent_activity"].append({
                "id": app.get("id"),
                "name": f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip() or "Unknown",
                "status": app.get("status"),
                "updated_at": app.get("updated_at")
            })
        
        return stats
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pipeline")
@router.get("/pipeline/")
async def get_pipeline(
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    try:
        # Get location filter for this staff member
        location_filter = get_staff_location_filter(user)
        
        query = supabase.table("applications").select(
            "id, user_id, status, created_at, submitted_at, updated_at, current_step, location_id, profiles!applications_user_id_fkey(first_name, last_name, email), locations(name)"
        ).order("created_at", desc=True)
        
        # Apply location filter if not superadmin
        if location_filter:
            query = query.eq("location_id", location_filter)
        
        res = query.execute()
        
        # Get all application IDs to fetch step 1 data (position_applied)
        app_ids = [app.get("id") for app in (res.data or []) if app.get("id")]
        
        # Fetch step 1 (Application Basics) for all applications to get position
        position_map = {}
        if app_ids:
            steps_res = supabase.table("application_steps").select(
                "application_id, data"
            ).eq("step_number", 1).in_("application_id", app_ids).execute()
            
            for step in (steps_res.data or []):
                app_id = step.get("application_id")
                data = step.get("data") or {}
                position = data.get("position_applied") or data.get("position") or ""
                if position:
                    position_map[app_id] = position
        
        applications = []
        for app in (res.data or []):
            profile = app.get("profiles") or {}
            location = app.get("locations") or {}
            app_id = app.get("id")
            applications.append({
                "id": app_id,
                "user_id": app.get("user_id"),
                "status": app.get("status"),
                "created_at": app.get("created_at"),
                "submitted_at": app.get("submitted_at"),
                "updated_at": app.get("updated_at"),
                "first_name": profile.get("first_name", ""),
                "last_name": profile.get("last_name", ""),
                "email": profile.get("email", ""),
                "location_name": location.get("name", ""),
                "location_id": app.get("location_id"),
                "position": position_map.get(app_id, ""),
            })
        
        return {"applications": applications}
    except Exception as e:
        logger.error(f"Pipeline fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/applicants/{application_id}")
async def get_applicant_detail(
    application_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    try:
        app_res = supabase.table("applications").select(
            "*, profiles!applications_user_id_fkey(first_name, last_name, email, phone), locations(name)"
        ).eq("id", application_id).single().execute()
        
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        application = app_res.data
        user_id = application.get("user_id")
        
        steps_res = supabase.table("application_steps").select(
            "step_number, data, is_completed, updated_at"
        ).eq("application_id", application_id).order("step_number").execute()
        
        documents = []
        docs_res = None
        try:
            docs_res = supabase.table("documents").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            documents = docs_res.data or []
        except Exception as e:
            logger.warning(f"Failed to fetch documents: {e}")
        
        agreements_data = []
        try:
            agreements_res = supabase.table("agreements").select("*").eq("application_id", application_id).order("signed_at", desc=True).execute()
            agreements_data = agreements_res.data or []
        except Exception as e:
            logger.warning(f"Failed to fetch agreements: {e}")
        
        ssn_last_four = None
        try:
            ssn_res = supabase.table("sensitive_data").select("ssn_last_four").eq("user_id", user_id).single().execute()
            if ssn_res.data:
                ssn_last_four = ssn_res.data.get("ssn_last_four")
        except:
            pass
        
        all_storage_paths = []
        for agr in agreements_data:
            if agr.get("pdf_storage_path"):
                all_storage_paths.append(agr["pdf_storage_path"])
        
        signed_urls_map = generate_signed_urls_batch(supabase, all_storage_paths)
        
        documents = []
        if docs_res and docs_res.data:
            for doc in docs_res.data:
                documents.append({
                    "id": doc.get("id"),
                    "document_type": doc.get("document_type"),
                    "filename": doc.get("filename"),
                    "storage_path": doc.get("storage_path"),
                    "created_at": doc.get("created_at"),
                    "expiration_date": doc.get("expiration_date")
                })
        
        agreements = []
        for agr in agreements_data:
            pdf_path = agr.get("pdf_storage_path")
            agreements.append({
                "id": agr.get("id"),
                "agreement_type": agr.get("agreement_type"),
                "signed_at": agr.get("signed_at"),
                "ip_address": agr.get("ip_address"),
                "pdf_storage_path": pdf_path,
                "pdf_url": signed_urls_map.get(pdf_path),
            })
        
        upload_step_names = {
            11: "Work Authorization",
            12: "ID Front",
            13: "ID Back",
            14: "Social Security Card",
            15: "Credentials",
            16: "CPR Certification",
            17: "TB Test"
        }
        
        uploaded_docs = []
        for step in (steps_res.data or []):
            step_num = step.get("step_number")
            if step_num in upload_step_names:
                data = step.get("data") or {}
                storage_path = data.get("storage_path")
                if storage_path:
                    uploaded_docs.append({
                        "step_number": step_num,
                        "document_name": upload_step_names[step_num],
                        "storage_path": storage_path,
                        "file_name": data.get("file_name") or data.get("original_filename"),
                        "uploaded_at": step.get("updated_at")
                    })
                elif data.get("file_url"):
                    uploaded_docs.append({
                        "step_number": step_num,
                        "document_name": upload_step_names[step_num],
                        "file_url": data.get("file_url"),
                        "file_name": data.get("file_name") or data.get("original_filename"),
                        "uploaded_at": step.get("updated_at")
                    })
        
        steps_with_status = []
        for step in (steps_res.data or []):
            step_copy = dict(step)
            step_copy["status"] = "completed" if step.get("is_completed") else "pending"
            steps_with_status.append(step_copy)
        
        return {
            "application": application,
            "profile": application.get("profiles") or {},
            "location": application.get("locations") or {},
            "steps": steps_with_status,
            "documents": documents,
            "agreements": agreements,
            "uploaded_docs": uploaded_docs,
            "ssn_last_four": ssn_last_four
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Applicant detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/applicants/{application_id}/ssn")
async def get_applicant_ssn(
    application_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    if user["role"] not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin access required to view SSN")
    
    try:
        app_res = supabase.table("applications").select("user_id").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        user_id = app_res.data.get("user_id")
        
        ssn_res = supabase.table("sensitive_data").select("ssn_encrypted").eq("user_id", user_id).single().execute()
        if not ssn_res.data or not ssn_res.data.get("ssn_encrypted"):
            raise HTTPException(status_code=404, detail="SSN not on file")
        
        ssn_raw = encryption_service.decrypt(ssn_res.data["ssn_encrypted"])
        ssn_formatted = f"{ssn_raw[:3]}-{ssn_raw[3:5]}-{ssn_raw[5:]}" if len(ssn_raw) == 9 else ssn_raw
        
        logger.info(f"SSN revealed for application {application_id} by user {user['user_id']}")
        
        return {"ssn": ssn_formatted, "ssn_raw": ssn_raw}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SSN reveal error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/applicants/{application_id}/ssn")
async def update_applicant_ssn(
    application_id: str,
    ssn_data: dict,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    if user["role"] not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin access required to update SSN")
    
    try:
        ssn = ssn_data.get("ssn", "").replace("-", "").replace(" ", "")
        if not ssn or len(ssn) != 9 or not ssn.isdigit():
            raise HTTPException(status_code=400, detail="SSN must be exactly 9 digits")
        
        app_res = supabase.table("applications").select("user_id").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        user_id = app_res.data.get("user_id")
        ssn_encrypted = encryption_service.encrypt(ssn)
        ssn_last_four = ssn[-4:]
        
        existing = supabase.table("sensitive_data").select("id").eq("user_id", user_id).execute()
        
        if existing.data:
            supabase.table("sensitive_data").update({
                "ssn_encrypted": ssn_encrypted,
                "ssn_last_four": ssn_last_four,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("user_id", user_id).execute()
        else:
            supabase.table("sensitive_data").insert({
                "user_id": user_id,
                "ssn_encrypted": ssn_encrypted,
                "ssn_last_four": ssn_last_four,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }).execute()
        
        logger.info(f"SSN updated for application {application_id} by user {user['user_id']}")
        
        return {"success": True, "ssn_last_four": ssn_last_four}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SSN update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employees")
@router.get("/employees/")
async def get_employees(
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    try:
        location_filter = get_staff_location_filter(user)
        
        # Query employees WITHOUT the locations join (no FK constraint)
        query = supabase.table("employees").select(
            "id, user_id, status, position, hire_date, termination_date, created_at, location_id, profiles(first_name, last_name, email, phone)"
        ).order("created_at", desc=True)
        
        if location_filter:
            query = query.eq("location_id", location_filter)
        
        res = query.execute()
        
        # Fetch location names separately
        location_ids = [emp.get("location_id") for emp in (res.data or []) if emp.get("location_id")]
        location_map = get_location_names(supabase, location_ids)
        
        employees = []
        for emp in (res.data or []):
            profile = emp.get("profiles") or {}
            location_id = emp.get("location_id")
            employees.append({
                "id": emp.get("id"),
                "user_id": emp.get("user_id"),
                "status": emp.get("status"),
                "position": emp.get("position"),
                "hire_date": emp.get("hire_date"),
                "termination_date": emp.get("termination_date"),
                "first_name": profile.get("first_name", ""),
                "last_name": profile.get("last_name", ""),
                "email": profile.get("email", ""),
                "phone": profile.get("phone", ""),
                "location_id": location_id,
                "location_name": location_map.get(location_id, "")
            })
        
        return {"employees": employees}
    except Exception as e:
        logger.error(f"Employees fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/applicants/{application_id}")
async def update_applicant_profile(
    application_id: str,
    updates: dict,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    try:
        app_res = supabase.table("applications").select("user_id").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        user_id = app_res.data.get("user_id")
        
        profile_updates = {}
        profile_fields = ["first_name", "last_name", "email", "phone"]
        for field in profile_fields:
            if field in updates and updates[field] is not None:
                profile_updates[field] = updates[field]
        
        if profile_updates:
            profile_updates["updated_at"] = datetime.utcnow().isoformat()
            supabase.table("profiles").update(profile_updates).eq("id", user_id).execute()
        
        step2_updates = {}
        step2_fields = ["city", "address_line1", "address_line2", "state", "zip", "date_of_birth"]
        for field in step2_fields:
            if field in updates and updates[field] is not None:
                step2_updates[field] = updates[field]
        
        if step2_updates:
            step_res = supabase.table("application_steps").select("id, data").eq("application_id", application_id).eq("step_number", 2).single().execute()
            if step_res.data:
                current_data = step_res.data.get("data") or {}
                current_data.update(step2_updates)
                supabase.table("application_steps").update({
                    "data": current_data,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", step_res.data["id"]).execute()
        
        step3_updates = {}
        for k, v in updates.items():
            if k.startswith("emergency_") and v is not None:
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
    try:
        step_res = supabase.table("application_steps").select("data").eq("application_id", application_id).eq("step_number", step_number).single().execute()
        if not step_res.data:
            raise HTTPException(status_code=404, detail="Step not found")
        
        data = step_res.data.get("data") or {}
        storage_path = data.get("storage_path")
        storage_url = data.get("storage_url")
        file_name = data.get("file_name") or data.get("original_filename")
        
        if not storage_path and not storage_url:
            raise HTTPException(status_code=404, detail="No file uploaded for this step")
        
        signed_url = None
        if storage_path:
            signed_url = generate_signed_url(supabase, storage_path, expires_in=3600)
        
        if not signed_url and storage_url:
            logger.info(f"Using stored URL for step {step_number} (fresh URL generation failed)")
            return {"signed_url": storage_url, "file_name": file_name, "expires_in": 0, "note": "Using cached URL"}
        
        if signed_url:
            return {"signed_url": signed_url, "file_name": file_name, "expires_in": 3600}
        
        raise HTTPException(
            status_code=404, 
            detail=f"File not found in storage. Path: {storage_path}. The file may have been deleted."
        )
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
    try:
        agr_res = supabase.table("agreements").select("*").eq("id", agreement_id).eq("application_id", application_id).single().execute()
        if not agr_res.data:
            raise HTTPException(status_code=404, detail="Agreement not found")
        pdf_path = agr_res.data.get("pdf_storage_path")
        if not pdf_path:
            raise HTTPException(status_code=404, detail="PDF not yet generated for this agreement")
        signed_url = generate_signed_url(supabase, pdf_path, expires_in=3600)
        if not signed_url:
            raise HTTPException(status_code=404, detail="PDF file not found in storage")
        return {"signed_url": signed_url, "agreement_type": agr_res.data.get("agreement_type"), "signed_at": agr_res.data.get("signed_at"), "expires_in": 3600}
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
    try:
        new_status = status_update.get("status")
        valid_statuses = ["draft", "in_progress", "submitted", "under_review", "approved", "rejected", "hired"]
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        update_data = {"status": new_status, "updated_at": datetime.utcnow().isoformat()}
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


@router.get("/applicants/{application_id}/agreement/{agreement_type}/preview")
async def preview_agreement_html(
    application_id: str,
    agreement_type: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    from jinja2 import Environment, FileSystemLoader
    
    try:
        app_res = supabase.table("applications").select("*").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        agreement_step_map = {
            "confidentiality": 9,
            "esignature": 10,
            "orientation": 18,
            "criminal_background": 19,
            "va_code_disclosure": 20,
            "job_description": 21,
            "final_signature": 22,
        }
        
        step_number = agreement_step_map.get(agreement_type)
        if not step_number:
            raise HTTPException(status_code=400, detail=f"Invalid agreement type: {agreement_type}")
        
        step_res = supabase.table("application_steps").select("data, is_completed, updated_at").eq("application_id", application_id).eq("step_number", step_number).single().execute()
        if not step_res.data:
            raise HTTPException(status_code=404, detail="Agreement step not found")
        
        step_data = step_res.data.get("data") or {}
        
        step2_res = supabase.table("application_steps").select("data").eq("application_id", application_id).eq("step_number", 2).single().execute()
        personal_info = step2_res.data.get("data") if step2_res.data else {}
        
        context = {
            "applicant_name": f"{personal_info.get('first_name', '')} {personal_info.get('last_name', '')}".strip() or "Applicant",
            "signature_text": step_data.get("signature", ""),
            "signed_at": step_data.get("signed_date", ""),
            "ip_address": step_data.get("ip_address", "Recorded"),
            "agreed": step_data.get("agreed", False),
            "generated_at": datetime.now().strftime("%B %d, %Y at %I:%M %p"),
            "company_name": "Eveready HomeCare",
        }
        
        template_map = {
            "confidentiality": "confidentiality_agreement.html",
            "esignature": "esignature_consent.html",
            "orientation": "orientation_acknowledgment.html",
            "criminal_background": "criminal_background_attestation.html",
            "va_code_disclosure": "va_code_disclosure.html",
            "job_description": "job_description_acknowledgment.html",
            "final_signature": "master_onboarding_consent.html",
        }
        
        template_name = template_map.get(agreement_type)
        
        templates_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        jinja_env = Environment(loader=FileSystemLoader(templates_dir), autoescape=True)
        template = jinja_env.get_template(template_name)
        html_content = template.render(**context)
        
        return HTMLResponse(content=html_content)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Agreement preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/applicants/{application_id}/application/preview")
async def preview_application_html(
    application_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    from jinja2 import Environment, FileSystemLoader
    
    try:
        app_res = supabase.table("applications").select("*").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        application = app_res.data
        
        steps_res = supabase.table("application_steps").select("step_number, data, is_completed").eq("application_id", application_id).order("step_number").execute()
        
        steps = {}
        for step in (steps_res.data or []):
            steps[step["step_number"]] = {
                "data": step.get("data") or {},
                "completed": step.get("is_completed", False)
            }
        
        branding = get_agency_branding(supabase, application.get("location_id"))
        
        context = {
            "application_id": application_id,
            "status": application.get("status", ""),
            "submitted_at": application.get("submitted_at", ""),
            "steps": steps,
            "generated_at": datetime.now().strftime("%B %d, %Y at %I:%M %p"),
            "logo_url": branding["logo_url"],
            "company_name": branding["company_name"],
        }
        
        templates_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        jinja_env = Environment(loader=FileSystemLoader(templates_dir), autoescape=True)
        template = jinja_env.get_template("employment_application.html")
        html_content = template.render(**context)
        
        return HTMLResponse(content=html_content)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Application preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/applicants/{application_id}/pdf/application")
async def generate_application_pdf(
    application_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    from ..services.pdf_service import pdf_service
    
    try:
        app_res = supabase.table("applications").select("*").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        application = app_res.data
        
        steps_res = supabase.table("application_steps").select("step_number, data, is_completed").eq("application_id", application_id).order("step_number").execute()
        
        steps = {}
        for step in (steps_res.data or []):
            steps[step["step_number"]] = {
                "data": step.get("data") or {},
                "completed": step.get("is_completed", False)
            }
        
        application_data = {
            "id": application_id,
            "status": application.get("status"),
            "submitted_at": application.get("submitted_at"),
            "steps": steps
        }
        
        pdf_bytes = pdf_service.generate_employment_application(application_data)
        
        step2 = steps.get(2, {}).get("data", {})
        first_name = step2.get("first_name", "Applicant")
        last_name = step2.get("last_name", "")
        filename = f"{first_name}_{last_name}_Application.pdf".replace(" ", "_")
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Application PDF generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/applicants/{application_id}/pdf/i9")
async def generate_i9_pdf(
    application_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    from ..services.pdf_service import pdf_service
    
    try:
        app_res = supabase.table("applications").select("*, user_id").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        application = app_res.data
        user_id = application.get("user_id")
        
        steps_res = supabase.table("application_steps").select("step_number, data, is_completed").eq("application_id", application_id).order("step_number").execute()
        
        steps = {}
        for step in (steps_res.data or []):
            steps[step["step_number"]] = {
                "data": step.get("data") or {},
                "completed": step.get("is_completed", False)
            }
        
        ssn = None
        try:
            ssn_res = supabase.table("sensitive_data").select("ssn_encrypted").eq("user_id", user_id).single().execute()
            if ssn_res.data and ssn_res.data.get("ssn_encrypted"):
                ssn = encryption_service.decrypt(ssn_res.data["ssn_encrypted"])
        except Exception as e:
            logger.warning(f"Could not decrypt SSN for I-9: {e}")
        
        application_data = {
            "id": application_id,
            "status": application.get("status"),
            "submitted_at": application.get("submitted_at"),
            "steps": steps
        }
        
        pdf_bytes = pdf_service.generate_i9_form(application_data, ssn)
        
        step2 = steps.get(2, {}).get("data", {})
        first_name = step2.get("first_name", "Applicant")
        last_name = step2.get("last_name", "")
        filename = f"{first_name}_{last_name}_I9.pdf".replace(" ", "_")
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"I-9 PDF generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/applicants/{application_id}/pdf/agreement/{agreement_type}")
async def generate_agreement_pdf(
    application_id: str,
    agreement_type: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    from jinja2 import Environment, FileSystemLoader
    from weasyprint import HTML, CSS
    
    try:
        app_res = supabase.table("applications").select("*").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        agreement_step_map = {
            "confidentiality": 9,
            "esignature": 10,
            "orientation": 18,
            "criminal_background": 19,
            "va_code_disclosure": 20,
            "job_description": 21,
            "final_signature": 22,
        }
        
        step_number = agreement_step_map.get(agreement_type)
        if not step_number:
            raise HTTPException(status_code=400, detail=f"Invalid agreement type: {agreement_type}")
        
        step_res = supabase.table("application_steps").select("data, is_completed, updated_at").eq("application_id", application_id).eq("step_number", step_number).single().execute()
        if not step_res.data:
            raise HTTPException(status_code=404, detail="Agreement step not found")
        
        step_data = step_res.data.get("data") or {}
        
        step2_res = supabase.table("application_steps").select("data").eq("application_id", application_id).eq("step_number", 2).single().execute()
        personal_info = step2_res.data.get("data") if step2_res.data else {}
        
        context = {
            "applicant_name": f"{personal_info.get('first_name', '')} {personal_info.get('last_name', '')}".strip() or "Applicant",
            "signature_text": step_data.get("signature", ""),
            "signed_at": step_data.get("signed_date", ""),
            "ip_address": step_data.get("ip_address", "Recorded"),
            "agreed": step_data.get("agreed", False),
            "generated_at": datetime.now().strftime("%B %d, %Y at %I:%M %p"),
            "company_name": "Eveready HomeCare",
        }
        
        template_map = {
            "confidentiality": "confidentiality_agreement.html",
            "esignature": "esignature_consent.html",
            "orientation": "orientation_acknowledgment.html",
            "criminal_background": "criminal_background_attestation.html",
            "va_code_disclosure": "va_code_disclosure.html",
            "job_description": "job_description_acknowledgment.html",
            "final_signature": "master_onboarding_consent.html",
        }
        
        template_name = template_map.get(agreement_type)
        
        templates_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        jinja_env = Environment(loader=FileSystemLoader(templates_dir), autoescape=True)
        template = jinja_env.get_template(template_name)
        html_content = template.render(**context)
        
        css_path = os.path.join(templates_dir, 'application_styles.css')
        stylesheets = []
        if os.path.exists(css_path):
            stylesheets.append(CSS(filename=css_path))
        
        pdf_bytes = HTML(string=html_content).write_pdf(stylesheets=stylesheets)
        
        first_name = personal_info.get('first_name', 'Applicant')
        last_name = personal_info.get('last_name', '')
        filename = f"{first_name}_{last_name}_{agreement_type}.pdf".replace(" ", "_")
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Agreement PDF generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employees/{employee_id}/documents")
async def get_employee_documents(
    employee_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    try:
        emp_res = supabase.table("employees").select("*, user_id").eq("id", employee_id).single().execute()
        if not emp_res.data:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        employee = emp_res.data
        user_id = employee.get("user_id")
        
        app_res = supabase.table("applications").select("id").eq("user_id", user_id).single().execute()
        application_id = app_res.data.get("id") if app_res.data else None
        
        documents = {
            "uploaded": [],
            "agreements": [],
            "generated": []
        }
        
        if user_id:
            docs_res = supabase.table("documents").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            for doc in (docs_res.data or []):
                documents["uploaded"].append({
                    "id": doc.get("id"),
                    "type": doc.get("document_type"),
                    "filename": doc.get("filename"),
                    "uploaded_at": doc.get("created_at"),
                    "expires_at": doc.get("expiration_date"),
                    "storage_path": doc.get("storage_path")
                })
        
        if application_id:
            documents["generated"] = [
                {"type": "application", "name": "Employment Application", "endpoint": f"/admin/applicants/{application_id}/pdf/application"},
                {"type": "i9", "name": "I-9 Form", "endpoint": f"/admin/applicants/{application_id}/pdf/i9"},
            ]
            
            agreement_steps = [
                (9, "confidentiality", "Confidentiality Agreement"),
                (10, "esignature", "E-Signature Consent"),
                (18, "orientation", "Orientation Acknowledgment"),
                (19, "criminal_background", "Criminal Background Authorization"),
                (20, "va_code_disclosure", "VA Code Disclosure"),
                (21, "job_description", "Job Description Acknowledgment"),
                (22, "final_signature", "Final Signature"),
            ]
            
            steps_res = supabase.table("application_steps").select("step_number, is_completed, data").eq("application_id", application_id).in_("step_number", [s[0] for s in agreement_steps]).execute()
            completed_steps = {s["step_number"]: s for s in (steps_res.data or [])}
            
            for step_num, agreement_type, name in agreement_steps:
                step = completed_steps.get(step_num)
                if step and step.get("is_completed"):
                    data = step.get("data") or {}
                    documents["agreements"].append({
                        "type": agreement_type,
                        "name": name,
                        "signed": bool(data.get("signature")),
                        "signed_date": data.get("signed_date"),
                        "endpoint": f"/admin/applicants/{application_id}/pdf/agreement/{agreement_type}"
                    })
        
        return {
            "employee_id": employee_id,
            "employee_name": f"{employee.get('first_name', '')} {employee.get('last_name', '')}",
            "application_id": application_id,
            "documents": documents
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Employee documents error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/applicants/{application_id}/documents-summary")
async def get_applicant_documents_summary(
    application_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    try:
        app_res = supabase.table("applications").select("*, user_id, profiles!applications_user_id_fkey(first_name, last_name)").eq("id", application_id).single().execute()
        if not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        application = app_res.data
        profile = application.get("profiles") or {}
        
        documents = {
            "uploaded": [],
            "onboarding_agreements": [],
            "generated": []
        }
        
        documents["generated"] = [
            {
                "type": "application", 
                "name": "Employment Application", 
                "endpoint": f"/admin/applicants/{application_id}/pdf/application",
                "preview_endpoint": f"/admin/applicants/{application_id}/application/preview"
            },
            {
                "type": "i9", 
                "name": "I-9 Form", 
                "endpoint": f"/admin/applicants/{application_id}/pdf/i9",
                "preview_endpoint": None
            },
        ]
        
        upload_steps = [
            (11, "work_authorization", "Work Authorization"),
            (12, "id_front", "ID Front"),
            (13, "id_back", "ID Back"),
            (14, "ssn_card", "Social Security Card"),
            (15, "credentials", "Credentials"),
            (16, "cpr", "CPR Certification"),
            (17, "tb", "TB Test"),
        ]
        
        steps_res = supabase.table("application_steps").select("step_number, data, is_completed, updated_at").eq("application_id", application_id).in_("step_number", [s[0] for s in upload_steps]).execute()
        upload_steps_data = {s["step_number"]: s for s in (steps_res.data or [])}
        
        for step_num, doc_type, name in upload_steps:
            step = upload_steps_data.get(step_num)
            if step:
                data = step.get("data") or {}
                storage_path = data.get("storage_path") or data.get("file_url")
                if storage_path:
                    documents["uploaded"].append({
                        "type": doc_type,
                        "name": name,
                        "step_number": step_num,
                        "filename": data.get("file_name") or data.get("original_filename"),
                        "uploaded_at": step.get("updated_at"),
                        "endpoint": f"/admin/applicants/{application_id}/documents/{step_num}/url"
                    })
        
        agreement_steps = [
            (9, "confidentiality", "Confidentiality Agreement"),
            (10, "esignature", "E-Signature Consent"),
            (18, "orientation", "Orientation Acknowledgment"),
            (19, "criminal_background", "Criminal Background Authorization"),
            (20, "va_code_disclosure", "VA Code Disclosure"),
            (21, "job_description", "Job Description Acknowledgment"),
            (22, "final_signature", "Final Signature"),
        ]
        
        agreement_steps_res = supabase.table("application_steps").select("step_number, is_completed, data").eq("application_id", application_id).in_("step_number", [s[0] for s in agreement_steps]).execute()
        agreement_steps_data = {s["step_number"]: s for s in (agreement_steps_res.data or [])}
        
        for step_num, agreement_type, name in agreement_steps:
            step = agreement_steps_data.get(step_num)
            if step and step.get("is_completed"):
                data = step.get("data") or {}
                documents["onboarding_agreements"].append({
                    "type": agreement_type,
                    "name": name,
                    "signed": bool(data.get("signature")),
                    "signed_date": data.get("signed_date"),
                    "endpoint": f"/admin/applicants/{application_id}/pdf/agreement/{agreement_type}",
                    "preview_endpoint": f"/admin/applicants/{application_id}/agreement/{agreement_type}/preview"
                })
        
        return {
            "application_id": application_id,
            "applicant_name": f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip(),
            "status": application.get("status"),
            "documents": documents
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Applicant documents summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/training-leads")
@router.get("/training-leads/")
async def get_training_leads(
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    try:
        apps_res = supabase.table("applications").select(
            "id, user_id, status, submitted_at, updated_at, location_id, "
            "profiles!applications_user_id_fkey(first_name, last_name, email, phone), "
            "locations(name)"
        ).order("updated_at", desc=True).execute()
        
        if not apps_res.data:
            return {
                "hha_leads": [],
                "cpr_leads": [],
                "total_hha": 0,
                "total_cpr": 0
            }
        
        app_ids = [app["id"] for app in apps_res.data]
        steps_res = supabase.table("application_steps").select(
            "application_id, data"
        ).eq("step_number", 1).in_("application_id", app_ids).execute()
        
        step_data_map = {}
        for step in (steps_res.data or []):
            step_data_map[step["application_id"]] = step.get("data") or {}
        
        hha_leads = []
        cpr_leads = []
        
        for app in apps_res.data:
            app_id = app["id"]
            profile = app.get("profiles") or {}
            location = app.get("locations") or {}
            step_data = step_data_map.get(app_id, {})
            
            interested_in_hha = step_data.get("interested_in_hha")
            interested_in_cpr = step_data.get("interested_in_cpr")
            has_cpr = step_data.get("has_cpr")
            certifications = step_data.get("certifications") or []
            
            lead_data = {
                "application_id": app_id,
                "user_id": app.get("user_id"),
                "first_name": profile.get("first_name", ""),
                "last_name": profile.get("last_name", ""),
                "email": profile.get("email", ""),
                "phone": profile.get("phone"),
                "location_name": location.get("name"),
                "interested_in_hha": interested_in_hha,
                "interested_in_cpr": interested_in_cpr,
                "has_cpr": has_cpr,
                "certifications": certifications if isinstance(certifications, list) else [],
                "application_status": app.get("status"),
                "submitted_at": app.get("submitted_at"),
                "updated_at": app.get("updated_at"),
            }
            
            if interested_in_hha in ("yes", "maybe"):
                hha_leads.append(lead_data)
            
            if interested_in_cpr in ("yes", "maybe") or has_cpr == "no":
                cpr_leads.append(lead_data)
        
        return {
            "hha_leads": hha_leads,
            "cpr_leads": cpr_leads,
            "total_hha": len(hha_leads),
            "total_cpr": len(cpr_leads)
        }
    except Exception as e:
        logger.error(f"Training leads fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unassigned-employees")
@router.get("/unassigned-employees/")
async def get_unassigned_employees(
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """
    Get active employees who don't have any active client assignments.
    These are employees ready to be assigned to clients.
    """
    try:
        location_filter = get_staff_location_filter(user)
        
        # Query WITHOUT locations join (no FK constraint in DB)
        emp_query = supabase.table("employees").select(
            "id, user_id, status, position, hire_date, location_id, "
            "profiles(first_name, last_name, email, phone)"
        ).eq("status", "active")
        
        if location_filter:
            emp_query = emp_query.eq("location_id", location_filter)
        
        emp_res = emp_query.execute()
        
        if not emp_res.data:
            return {"unassigned_employees": [], "total": 0}
        
        # Fetch location names separately
        location_ids = [emp.get("location_id") for emp in emp_res.data if emp.get("location_id")]
        location_map = get_location_names(supabase, location_ids)
        
        emp_ids = [emp["id"] for emp in emp_res.data]
        assignments_res = supabase.table("employee_client_assignments").select(
            "employee_id"
        ).eq("is_active", True).in_("employee_id", emp_ids).execute()
        
        assigned_emp_ids = set(a["employee_id"] for a in (assignments_res.data or []))
        
        unassigned = []
        for emp in emp_res.data:
            if emp["id"] not in assigned_emp_ids:
                profile = emp.get("profiles") or {}
                location_id = emp.get("location_id")
                unassigned.append({
                    "id": emp["id"],
                    "user_id": emp.get("user_id"),
                    "first_name": profile.get("first_name", ""),
                    "last_name": profile.get("last_name", ""),
                    "email": profile.get("email", ""),
                    "phone": profile.get("phone", ""),
                    "position": emp.get("position", ""),
                    "hire_date": emp.get("hire_date"),
                    "location_id": location_id,
                    "location_name": location_map.get(location_id, ""),
                })
        
        return {
            "unassigned_employees": unassigned,
            "total": len(unassigned)
        }
    except Exception as e:
        logger.error(f"Unassigned employees fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
