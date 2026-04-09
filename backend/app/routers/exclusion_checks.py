"""Exclusion checks (OIG/SAM) endpoints for monthly compliance."""

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from datetime import datetime, date, timedelta
from typing import Optional, List
from pydantic import BaseModel
import logging

from ..dependencies import get_supabase
from .admin import get_staff_user, get_staff_location_filter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/exclusion-checks", tags=["exclusion-checks"])


class LogCheckRequest(BaseModel):
    employee_id: str
    check_type: str  # 'oig' or 'sam'
    check_date: str  # ISO date YYYY-MM-DD
    result: str  # 'clear', 'match_found', 'error'
    notes: Optional[str] = None


class BatchCheckRequest(BaseModel):
    employee_ids: List[str]
    check_type: str  # 'oig' or 'sam'
    check_date: str  # ISO date YYYY-MM-DD
    result: str  # 'clear', 'match_found', 'error'
    notes: Optional[str] = None


@router.get("/status")
async def get_compliance_status(
    location_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """
    Get overall compliance status for OIG/SAM checks.
    Returns counts of employees due for checks this month.
    """
    try:
        location_filter = get_staff_location_filter(user, location_id)
        
        # Get all active employees
        emp_query = supabase.table("employees").select(
            "id, user_id, location_id, profiles(first_name, last_name)"
        ).eq("status", "active")
        
        if location_filter:
            emp_query = emp_query.eq("location_id", location_filter)
        
        emp_res = emp_query.execute()
        employees = emp_res.data or []
        
        if not employees:
            return {
                "total_active": 0,
                "oig_due": 0,
                "sam_due": 0,
                "oig_clear": 0,
                "sam_clear": 0,
                "matches_found": 0,
                "employees_due": []
            }
        
        emp_ids = [e["id"] for e in employees]
        
        # Get the start of current month
        today = date.today()
        month_start = today.replace(day=1)
        
        # Get all checks from this month
        checks_res = supabase.table("exclusion_checks").select(
            "employee_id, check_type, result"
        ).in_("employee_id", emp_ids).gte(
            "check_date", month_start.isoformat()
        ).execute()
        
        checks = checks_res.data or []
        
        # Build lookup: employee_id -> {oig: result, sam: result}
        check_status = {}
        for check in checks:
            emp_id = check["employee_id"]
            if emp_id not in check_status:
                check_status[emp_id] = {}
            check_status[emp_id][check["check_type"]] = check["result"]
        
        # Calculate stats
        oig_due = 0
        sam_due = 0
        oig_clear = 0
        sam_clear = 0
        matches_found = 0
        employees_due = []
        
        for emp in employees:
            emp_id = emp["id"]
            profile = emp.get("profiles") or {}
            status = check_status.get(emp_id, {})
            
            oig_result = status.get("oig")
            sam_result = status.get("sam")
            
            needs_oig = oig_result is None
            needs_sam = sam_result is None
            
            if oig_result == "clear":
                oig_clear += 1
            elif oig_result == "match_found":
                matches_found += 1
            else:
                oig_due += 1
            
            if sam_result == "clear":
                sam_clear += 1
            elif sam_result == "match_found":
                matches_found += 1
            else:
                sam_due += 1
            
            if needs_oig or needs_sam:
                employees_due.append({
                    "id": emp_id,
                    "name": f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip(),
                    "needs_oig": needs_oig,
                    "needs_sam": needs_sam,
                    "oig_status": oig_result,
                    "sam_status": sam_result,
                })
        
        return {
            "total_active": len(employees),
            "oig_due": oig_due,
            "sam_due": sam_due,
            "oig_clear": oig_clear,
            "sam_clear": sam_clear,
            "matches_found": matches_found,
            "month": month_start.strftime("%B %Y"),
            "employees_due": employees_due[:20],  # Limit to first 20
            "total_due": len(employees_due),
        }
    except Exception as e:
        logger.error(f"Compliance status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employee/{employee_id}")
async def get_employee_checks(
    employee_id: str,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """
    Get exclusion check history for a specific employee.
    """
    try:
        # Verify employee exists
        emp_res = supabase.table("employees").select(
            "id, profiles(first_name, last_name)"
        ).eq("id", employee_id).single().execute()
        
        if not emp_res.data:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        profile = emp_res.data.get("profiles") or {}
        
        # Get check history (last 12 months)
        one_year_ago = (date.today() - timedelta(days=365)).isoformat()
        
        checks_res = supabase.table("exclusion_checks").select(
            "*, profiles!exclusion_checks_checked_by_fkey(first_name, last_name)"
        ).eq("employee_id", employee_id).gte(
            "check_date", one_year_ago
        ).order("check_date", desc=True).execute()
        
        checks = []
        for check in (checks_res.data or []):
            checker = check.get("profiles") or {}
            checks.append({
                "id": check.get("id"),
                "check_type": check.get("check_type"),
                "check_date": check.get("check_date"),
                "result": check.get("result"),
                "notes": check.get("notes"),
                "checked_by_name": f"{checker.get('first_name', '')} {checker.get('last_name', '')}".strip() or None,
                "created_at": check.get("created_at"),
            })
        
        # Get current month status
        today = date.today()
        month_start = today.replace(day=1)
        
        current_month_checks = [c for c in checks if c["check_date"] >= month_start.isoformat()]
        
        oig_this_month = next((c for c in current_month_checks if c["check_type"] == "oig"), None)
        sam_this_month = next((c for c in current_month_checks if c["check_type"] == "sam"), None)
        
        return {
            "employee_id": employee_id,
            "employee_name": f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip(),
            "current_month": {
                "month": month_start.strftime("%B %Y"),
                "oig": {
                    "completed": oig_this_month is not None,
                    "result": oig_this_month["result"] if oig_this_month else None,
                    "date": oig_this_month["check_date"] if oig_this_month else None,
                },
                "sam": {
                    "completed": sam_this_month is not None,
                    "result": sam_this_month["result"] if sam_this_month else None,
                    "date": sam_this_month["check_date"] if sam_this_month else None,
                },
            },
            "history": checks,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Employee checks error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/log")
async def log_check(
    request: LogCheckRequest,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """
    Log a single exclusion check result.
    """
    try:
        if request.check_type not in ("oig", "sam"):
            raise HTTPException(status_code=400, detail="check_type must be 'oig' or 'sam'")
        
        if request.result not in ("clear", "match_found", "error", "pending"):
            raise HTTPException(status_code=400, detail="result must be 'clear', 'match_found', 'error', or 'pending'")
        
        # Verify employee exists
        emp_res = supabase.table("employees").select("id").eq("id", request.employee_id).single().execute()
        if not emp_res.data:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Insert check record
        check_data = {
            "employee_id": request.employee_id,
            "check_type": request.check_type,
            "check_date": request.check_date,
            "result": request.result,
            "checked_by": user["user_id"],
            "notes": request.notes,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        result = supabase.table("exclusion_checks").insert(check_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to log check")
        
        logger.info(f"Exclusion check logged: {request.check_type} for employee {request.employee_id} by {user['user_id']}")
        
        return {
            "success": True,
            "check_id": result.data[0].get("id"),
            "message": f"{request.check_type.upper()} check logged successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Log check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
async def batch_log_checks(
    request: BatchCheckRequest,
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """
    Log exclusion checks for multiple employees at once.
    Used for monthly batch processing.
    """
    try:
        if request.check_type not in ("oig", "sam"):
            raise HTTPException(status_code=400, detail="check_type must be 'oig' or 'sam'")
        
        if request.result not in ("clear", "match_found", "error", "pending"):
            raise HTTPException(status_code=400, detail="result must be 'clear', 'match_found', 'error', or 'pending'")
        
        if not request.employee_ids:
            raise HTTPException(status_code=400, detail="No employees specified")
        
        # Verify all employees exist
        emp_res = supabase.table("employees").select("id").in_("id", request.employee_ids).execute()
        found_ids = set(e["id"] for e in (emp_res.data or []))
        
        if len(found_ids) != len(request.employee_ids):
            missing = set(request.employee_ids) - found_ids
            raise HTTPException(status_code=404, detail=f"Employees not found: {missing}")
        
        # Insert check records for all employees
        now = datetime.utcnow().isoformat()
        check_records = [
            {
                "employee_id": emp_id,
                "check_type": request.check_type,
                "check_date": request.check_date,
                "result": request.result,
                "checked_by": user["user_id"],
                "notes": request.notes,
                "created_at": now,
                "updated_at": now,
            }
            for emp_id in request.employee_ids
        ]
        
        result = supabase.table("exclusion_checks").insert(check_records).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to log checks")
        
        logger.info(f"Batch exclusion checks logged: {request.check_type} for {len(request.employee_ids)} employees by {user['user_id']}")
        
        return {
            "success": True,
            "count": len(result.data),
            "check_type": request.check_type,
            "message": f"{len(result.data)} {request.check_type.upper()} checks logged successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch log check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/due")
async def get_employees_due(
    check_type: str = Query(..., description="'oig' or 'sam'"),
    location_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase),
    user: dict = Depends(get_staff_user)
):
    """
    Get list of employees who need a specific check this month.
    """
    try:
        if check_type not in ("oig", "sam"):
            raise HTTPException(status_code=400, detail="check_type must be 'oig' or 'sam'")
        
        location_filter = get_staff_location_filter(user, location_id)
        
        # Get all active employees
        emp_query = supabase.table("employees").select(
            "id, user_id, position, hire_date, location_id, profiles(first_name, last_name, email)"
        ).eq("status", "active")
        
        if location_filter:
            emp_query = emp_query.eq("location_id", location_filter)
        
        emp_res = emp_query.execute()
        employees = emp_res.data or []
        
        if not employees:
            return {"employees": [], "total": 0}
        
        emp_ids = [e["id"] for e in employees]
        
        # Get checks from this month for this type
        today = date.today()
        month_start = today.replace(day=1)
        
        checks_res = supabase.table("exclusion_checks").select(
            "employee_id"
        ).eq("check_type", check_type).in_(
            "employee_id", emp_ids
        ).gte("check_date", month_start.isoformat()).execute()
        
        checked_ids = set(c["employee_id"] for c in (checks_res.data or []))
        
        # Filter to employees who haven't been checked
        due_employees = []
        for emp in employees:
            if emp["id"] not in checked_ids:
                profile = emp.get("profiles") or {}
                due_employees.append({
                    "id": emp["id"],
                    "name": f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip(),
                    "email": profile.get("email"),
                    "position": emp.get("position"),
                    "hire_date": emp.get("hire_date"),
                })
        
        return {
            "check_type": check_type,
            "month": month_start.strftime("%B %Y"),
            "employees": due_employees,
            "total": len(due_employees),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get employees due error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
