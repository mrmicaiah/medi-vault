"""
One-off script to migrate Elizabeth Asante-Asare
Run after creating her auth user in Supabase Dashboard

Usage:
    1. Create user in Supabase Auth with email: elizabethowiredua18@gmail.com
    2. Run: python3 scripts/migrate_elizabeth.py
"""

import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# Elizabeth's data from Quickbase CSV
ELIZABETH_DATA = {
    "email": "elizabethowiredua18@gmail.com",
    "first_name": "Elizabeth",
    "last_name": "Asante-Asare",
    "phone": "+1 (240) 375-1111",
    "position": "cna",
    "address": "17398 Kagera Dr",
    "city": "Dumfries",
    "state": "Virginia",
    "zip": "22025",
    "birthdate": "",
    
    # Emergency Contact
    "ec_name": "Andrew Sam",
    "ec_relationship": "Father",
    "ec_phone": "+1 (703) 380-0334",
    
    # References
    "ref1_name": "Heesoo Best",
    "ref1_phone": "+ (317) 875-2013",
    "ref1_relation": "Coworker",
    "ref2_name": "Juliet Krakue",
    "ref2_phone": "+1 (571) 285-8181",
    "ref2_relation": "Co worker",
    
    # Current Employment
    "employer_name": "Sentara",
    "supervisor_name": "Chris McCormick",
    "supervisor_phone": "+ (703) 523-2811",
    
    # Education
    "high_school": "The Royal Senior High School-Ghana",
    "graduated_hs": True,
    
    # Certifications & Skills
    "certifications": ["cna"],
    "has_cpr": True,
    "has_drivers_license": True,
    "can_do_vital_signs": True,
    "can_do_catheter": True,
    "will_work_bed_bound": True,
    "will_travel_30_min": True,
    
    # Work Preferences
    "available_days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    "shift_preferences": ["morning", "afternoon"],
    "comfortable_with_pets": True,
    "comfortable_with_smokers": True,
    "desired_hourly_rate": "24",
    
    # Agreements
    "confidentiality_agreed": True,
    "esignature_agreed": True,
    "signature": "Elizabeth Asante-Asare",
    "signed_date": "2025-11-12",
    
    # Other
    "about": "I love toy poodles cats and I love to cook and clean sometimes",
    "skills": "I can insert a Foley catheter and take it out",
}

EVEREADY_AGENCY_ID = "a0000000-0000-0000-0000-000000000001"

STEP_DEFINITIONS = [
    (1, "Application Basics", "form"),
    (2, "Personal Information", "form"),
    (3, "Emergency Contact", "form"),
    (4, "Education & Certifications", "form"),
    (5, "Reference 1", "form"),
    (6, "Reference 2", "form"),
    (7, "Employment History", "form"),
    (8, "Work Preferences", "form"),
    (9, "Confidentiality Agreement", "agreement"),
    (10, "E-Signature Consent", "agreement"),
    (11, "Work Authorization Upload", "upload"),
    (12, "ID Front Upload", "upload"),
    (13, "ID Back Upload", "upload"),
    (14, "SSN Card Upload", "upload"),
    (15, "Credentials Upload", "upload"),
    (16, "CPR Certification Upload", "upload"),
    (17, "TB Test Upload", "upload"),
    (18, "Orientation Agreement", "agreement"),
    (19, "Criminal Attestation", "agreement"),
    (20, "VA Code Disclosure", "agreement"),
    (21, "Job Description Acknowledgment", "agreement"),
    (22, "Final Signature", "agreement"),
]


def build_step_data(step_num):
    d = ELIZABETH_DATA
    
    if step_num == 1:
        return {
            "position_applied": d["position"],
            "employment_type": "full_time",
            "desired_hourly_rate": d["desired_hourly_rate"],
            "desired_start_date": "",
            "is_18_or_older": "yes",
            "convicted_violent_crime": "no",
            "background_check_consent": "consent",
            "citizenship_status": "citizen",
            "eligible_to_work": "yes",
            "speaks_other_languages": "no",
            "worked_for_eveready_before": "no",
        }
    elif step_num == 2:
        return {
            "first_name": d["first_name"],
            "middle_name": "",
            "last_name": d["last_name"],
            "date_of_birth": d["birthdate"],
            "address_line1": d["address"],
            "address_line2": "",
            "city": d["city"],
            "state": d["state"],
            "zip": d["zip"],
            "phone": d["phone"],
            "email": d["email"],
        }
    elif step_num == 3:
        return {
            "ec_first_name": "Andrew",
            "ec_last_name": "Sam",
            "ec_relationship": d["ec_relationship"],
            "ec_phone": d["ec_phone"],
            "ec_email": "",
        }
    elif step_num == 4:
        return {
            "graduated_high_school": "yes",
            "highest_education": "high_school",
            "school_name": d["high_school"],
            "certifications": d["certifications"],
            "has_cpr_certification": "yes",
            "has_drivers_license": "yes",
            "will_travel_30_min": "yes",
            "can_do_catheter_care": "yes",
            "can_do_vital_signs": "yes",
            "will_work_bed_bound": "yes",
        }
    elif step_num == 5:
        return {
            "ref1_name": d["ref1_name"],
            "ref1_relationship": d["ref1_relation"],
            "ref1_phone": d["ref1_phone"],
            "ref1_email": "",
        }
    elif step_num == 6:
        return {
            "ref2_name": d["ref2_name"],
            "ref2_relationship": d["ref2_relation"],
            "ref2_phone": d["ref2_phone"],
            "ref2_email": "",
        }
    elif step_num == 7:
        return {
            "employers": [{
                "employer_name": d["employer_name"],
                "supervisor_name": d["supervisor_name"],
                "phone": d["supervisor_phone"],
                "start_date": "",
                "end_date": "",
                "reason_for_leaving": "",
            }],
            "no_experience": False,
        }
    elif step_num == 8:
        return {
            "has_transportation": "yes",
            "comfortable_with_pets": "yes",
            "comfortable_with_smokers": "yes",
            "available_days": d["available_days"],
            "shift_preferences": d["shift_preferences"],
        }
    elif step_num in (9, 10, 18, 19, 20, 21, 22):
        return {
            "agreed": True,
            "signature": d["signature"],
            "signed_date": d["signed_date"],
        }
    elif step_num in (11, 12, 13, 14, 15, 16, 17):
        return {
            "skip": True,
            "skipped_at": datetime.now().isoformat(),
        }
    else:
        return {}


def main():
    print("\n" + "=" * 60)
    print("Migrating Elizabeth Asante-Asare")
    print("=" * 60 + "\n")
    
    # Connect to Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
        return
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Look up her user ID
    print("🔍 Looking up user...")
    email = ELIZABETH_DATA["email"]
    
    # Try profiles first
    result = supabase.table("profiles").select("id").eq("email", email).execute()
    
    if result.data:
        user_id = result.data[0]["id"]
        print(f"  📎 Found existing profile: {user_id[:8]}...")
    else:
        # Look up in auth
        users = supabase.auth.admin.list_users()
        user_id = None
        for user in users:
            if user.email == email:
                user_id = str(user.id)
                break
        
        if not user_id:
            print(f"  ❌ User not found! Create her in Supabase Auth first:")
            print(f"     Email: {email}")
            print(f"     Then re-run this script.")
            return
        
        print(f"  ✅ Found auth user: {user_id[:8]}...")
    
    # 2. Create/Update Profile
    print("📝 Creating profile...")
    try:
        profile_data = {
            "id": user_id,
            "email": email,
            "first_name": ELIZABETH_DATA["first_name"],
            "last_name": ELIZABETH_DATA["last_name"],
            "phone": ELIZABETH_DATA["phone"],
            "role": "applicant",
            "agency_id": EVEREADY_AGENCY_ID,
        }
        supabase.table("profiles").upsert(profile_data).execute()
        print("  ✅ Profile created/updated")
    except Exception as e:
        print(f"  ⚠️ Profile error: {e}")
    
    # 3. Create Application
    print("📋 Creating application...")
    try:
        app_data = {
            "user_id": user_id,
            "status": "submitted",
            "current_step": 22,
            "agency_id": EVEREADY_AGENCY_ID,
            "created_at": "2025-12-09",
            "submitted_at": datetime.now().isoformat(),
        }
        app_result = supabase.table("applications").insert(app_data).execute()
        application_id = app_result.data[0]["id"]
        print(f"  ✅ Application created: {application_id[:8]}...")
    except Exception as e:
        print(f"  ❌ Application error: {e}")
        return
    
    # 4. Create all 22 steps
    print("📄 Creating application steps...")
    try:
        for step_num, step_name, step_type in STEP_DEFINITIONS:
            data = build_step_data(step_num)
            is_upload = step_type == "upload"
            is_completed = not is_upload or data.get("skip", False)
            
            step_record = {
                "application_id": application_id,
                "step_number": step_num,
                "step_name": step_name,
                "step_type": step_type,
                "data": data,
                "is_completed": is_completed,
                "completed_at": datetime.now().isoformat() if is_completed else None,
            }
            supabase.table("application_steps").insert(step_record).execute()
        
        print("  ✅ All 22 steps created")
    except Exception as e:
        print(f"  ⚠️ Steps error: {e}")
    
    print("\n" + "=" * 60)
    print("✅ ELIZABETH MIGRATION COMPLETE")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
