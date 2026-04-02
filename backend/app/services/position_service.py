# Position title mapping for job descriptions
POSITION_TITLES = {
    "pca": "Personal Care Aide (PCA)",
    "hha": "Home Health Aide (HHA)",
    "cna": "Certified Nursing Assistant (CNA)",
    "lpn": "Licensed Practical Nurse (LPN)",
    "rn": "Registered Nurse (RN)",
}


def get_position_info(supabase, application_id: str) -> dict:
    """
    Fetch position information from Step 1 of the application.
    Returns dict with position_type and position_title.
    """
    result = {
        "position_type": "",
        "position_title": "Home Care Position"
    }
    
    try:
        step1_res = supabase.table("application_steps").select("data").eq(
            "application_id", application_id
        ).eq("step_number", 1).single().execute()
        
        if step1_res.data:
            step1_data = step1_res.data.get("data") or {}
            position_type = step1_data.get("position_applied", "")
            result["position_type"] = position_type
            result["position_title"] = POSITION_TITLES.get(
                position_type, 
                "Home Care Position"
            )
    except Exception:
        pass
    
    return result
