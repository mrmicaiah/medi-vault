"""
Quickbase to MediVault Migration Script
=======================================
Migrates applicants from Quickbase CSV export to Supabase.

Creates:
    - Auth user (with password reset email)
    - Profile record
    - Application record
    - Application steps (all 22 steps with data from Quickbase)

Usage:
    1. Export Quickbase Applicants table to CSV
    2. Place CSV at: scripts/applicants.csv
    3. Set environment variables in .env:
       - SUPABASE_URL
       - SUPABASE_SERVICE_ROLE_KEY
    4. Run: python scripts/migrate_quickbase_users.py
    
Options:
    --dry-run     Preview without creating records
    --no-email    Skip sending password reset emails
    --limit N     Only process first N records
"""

from __future__ import annotations

import csv
import json
import os
import re
import secrets
import string
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Tuple

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# ============================================================================
# CONFIGURATION
# ============================================================================

CSV_PATH = "scripts/applicants.csv"
SEND_RESET_EMAILS = True
DRY_RUN = "--dry-run" in sys.argv
LIMIT = None

# Parse --limit N
for i, arg in enumerate(sys.argv):
    if arg == "--limit" and i + 1 < len(sys.argv):
        LIMIT = int(sys.argv[i + 1])
    if arg == "--no-email":
        SEND_RESET_EMAILS = False

# Agency ID for Eveready HomeCare
EVEREADY_AGENCY_ID = "a0000000-0000-0000-0000-000000000001"

# Location mapping
LOCATION_SLUGS = {
    "Eveready Home Care (Sterling)": "sterling",
    "Eveready Home Care (Virginia Beach)": "virginia-beach",
    "Eveready Home Care (Dumfries)": "dumfries",
    "Eveready Home Care (Arlington)": "arlington",
    "Eveready Home Care (Hampton)": "hampton",
}

# Position mapping (Quickbase -> MediVault)
POSITION_MAP = {
    "CNA": "cna",
    "HHA": "hha",
    "PCA": "pca",
    "LPN": "lpn",
    "RN": "rn",
}

# Status mapping to determine if hired
STATUS_MAP = {
    "1 New Applicant": "submitted",
    "2 Onboarding": "under_review",
    "3 Onboarding Complete (NEEDS DOCS)": "approved",
    "4 Onboarding Complete": "approved",
    "5 Hired (NEEDS DOCS)": "hired",
    "6 Hired": "hired",
}

# ============================================================================
# COLUMN MAPPINGS - Quickbase column names
# ============================================================================

# Basic info
COL_FIRST = "First"
COL_LAST = "Last"
COL_EMAIL = "Email"
COL_PHONE = "Phone"
COL_ADDRESS = "Address"
COL_CITY = "Address (Search): City"
COL_STATE = "Address (Search): State/Region"
COL_ZIP = "Address (Search): Postal Code"
COL_BIRTHDATE = "Birthdate"
COL_POSITION = "Position Applied For"
COL_STATUS = "Current Status"
COL_LOCATION = "Related Location2 - Company Name"

# Emergency contact
COL_EC_NAME = "Emergency Contact Name"
COL_EC_PHONE = "Emergency Contact Phone"
COL_EC_RELATIONSHIP = "Emergency Contact Relationship"

# References
COL_REF1_NAME = "Reference 1 Name"
COL_REF1_PHONE = "Reference 1 Phone"
COL_REF1_RELATION = "Reference 1 Relation"
COL_REF2_NAME = "Reference 2 Name"
COL_REF2_PHONE = "Reference 2 Phone"
COL_REF2_RELATION = "Reference 2 Relation"

# Employment
COL_EMPLOYER1_NAME = "Employer Name 1"
COL_EMPLOYER1_PHONE = "Employer Telephone"
COL_EMPLOYER1_SUPERVISOR = "Employer Supervisor 1"
COL_EMPLOYER1_START = "Employer 1 Start Date"
COL_EMPLOYER1_REASON = "Employer Reason for Leaving"
COL_EMPLOYER2_NAME = "Employer 2 Name"
COL_EMPLOYER2_PHONE = "Employer 2 Telephone"
COL_EMPLOYER2_SUPERVISOR = "Employer 2 Name of Supervisor"
COL_EMPLOYER2_START = "Employer 2 Start Date"
COL_EMPLOYER2_END = "Employer 2 End Date"

# Education & certifications
COL_HIGH_SCHOOL = "Name of High School or Location"
COL_GRADUATED_HS = "Did you graduate High School?"
COL_GRADUATED_COLLEGE = "Did you graduate college?"
COL_COLLEGE_MAJOR = "What was your college major?"
COL_CERTIFICATIONS = "Certifications (Check all that apply)"
COL_HAS_CPR = "Do you hold CPR certification?"
COL_HAS_DRIVERS_LICENSE = "Are you a licensed driver?"

# Work preferences
COL_TRANSPORT = "Do you have a relable way to get to a client?"
COL_TRAVEL_30_MIN = "Will you travel 30 minutes one way?"
COL_PETS = "Are you comfortable working with pets?"
COL_SMOKERS = "Are you comfortable around smokers?"
COL_AVAILABILITY_DAYS = "Select the days of your availability."
COL_AVAILABILITY_SHIFTS = "Select the time of day you are available."
COL_BED_BOUND = "Will you work with bed bound patients?"
COL_CATHETER = "Can you do catheter care?"
COL_VITAL_SIGNS = "Can you do vital signs?"

# Attestations/agreements
COL_IS_18 = "Are you 18 years or older?"
COL_VIOLENT_CRIME = "Have you ever been convicted of a violent crime?"
COL_BACKGROUND_CONSENT = "A background check is required."
COL_ELIGIBLE_TO_WORK = "Are you eligible to employment in the United States?"
COL_WORKED_EVEREADY = "Have you ever worked for Eveready?"

# Signatures
COL_SIGNATURE = "Full Name (Signature)"
COL_PRINT_NAME = "Print Full Name"
COL_CONFIDENTIALITY_AGREED = "I have read the confidentiality agreement"
COL_ESIGNATURE_AGREED = "I have read the Electronic Signatures Attestation"
COL_JOB_DESC_CNA = "I read and understand the Job Description"
COL_JOB_DESC_LPN = "I have read the Job Description and am capable of completing LPN tasks."
COL_JOB_DESC_RN = "I have read the Job Description and am capable of accomplishing RN tasks."
COL_ORIENTATION_AGREED = "I have been briefied on the above protocals in the Orientation Program."
COL_CRIMINAL_ATTEST = "I attest that I have not committed any of the barrier crimes listed above."

COL_DATE_CREATED = "Date Created"


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_temp_password(length: int = 20) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def clean_phone(phone: str) -> str:
    """Clean phone number to digits only."""
    if not phone:
        return ""
    return re.sub(r'[^\d]', '', phone)


def parse_date(date_str: str) -> Optional[str]:
    """Parse various date formats to YYYY-MM-DD."""
    if not date_str:
        return None
    
    formats = [
        "%m/%d/%Y",
        "%Y-%m-%d",
        "%m-%d-%Y",
        "%B %d, %Y",
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def parse_bool(val: str) -> bool:
    """Parse yes/no/true/false to boolean."""
    if not val:
        return False
    return val.strip().upper() in ("YES", "TRUE", "1", "Y")


def parse_certifications(cert_str: str) -> List[str]:
    """Parse certification string to list."""
    if not cert_str:
        return []
    
    certs = []
    cert_lower = cert_str.lower()
    
    if "cna" in cert_lower:
        certs.append("cna")
    if "hha" in cert_lower or "home health" in cert_lower:
        certs.append("hha")
    if "pca" in cert_lower or "personal care" in cert_lower:
        certs.append("pca")
    if "lpn" in cert_lower:
        certs.append("lpn")
    if "rn" in cert_lower and "lpn" not in cert_lower:
        certs.append("rn")
    if "cpr" in cert_lower or "bls" in cert_lower:
        certs.append("cpr")
    if "first aid" in cert_lower:
        certs.append("first_aid")
    
    return certs


def parse_days(days_str: str) -> List[str]:
    """Parse availability days string to list."""
    if not days_str:
        return []
    
    days = []
    days_lower = days_str.lower()
    
    day_map = {
        "monday": "monday",
        "tuesday": "tuesday", 
        "wednesday": "wednesday",
        "thursday": "thursday",
        "friday": "friday",
        "saturday": "saturday",
        "sunday": "sunday",
    }
    
    for key, val in day_map.items():
        if key in days_lower:
            days.append(val)
    
    return days


def parse_shifts(shifts_str: str) -> List[str]:
    """Parse shift preferences to list."""
    if not shifts_str:
        return []
    
    shifts = []
    shifts_lower = shifts_str.lower()
    
    if "morning" in shifts_lower or "am" in shifts_lower:
        shifts.append("morning")
    if "afternoon" in shifts_lower:
        shifts.append("afternoon")
    if "evening" in shifts_lower or "night" in shifts_lower or "pm" in shifts_lower:
        shifts.append("evening")
    if "overnight" in shifts_lower:
        shifts.append("overnight")
    
    return shifts or ["morning", "afternoon", "evening"]


def split_name(full_name: str) -> Tuple[str, str]:
    """Split full name into first and last."""
    if not full_name:
        return "", ""
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def get_location_id(supabase: Client, location_name: str) -> Optional[str]:
    """Look up location UUID by name."""
    if not location_name:
        return None
    
    slug = LOCATION_SLUGS.get(location_name)
    if not slug:
        return None
    
    result = supabase.table("locations").select("id").eq("slug", slug).execute()
    if result.data:
        return result.data[0]["id"]
    return None


# ============================================================================
# STEP DATA BUILDERS
# ============================================================================

def build_step1_data(row: Dict) -> Dict:
    """Step 1: Application Basics"""
    position = POSITION_MAP.get(row.get(COL_POSITION, "").upper(), "pca")
    
    return {
        "position_applied": position,
        "employment_type": "part_time",
        "desired_hourly_rate": "",
        "desired_start_date": "",
        "is_18_or_older": "yes" if parse_bool(row.get(COL_IS_18, "yes")) else "no",
        "convicted_violent_crime": "yes" if parse_bool(row.get(COL_VIOLENT_CRIME, "")) else "no",
        "background_check_consent": "consent" if parse_bool(row.get(COL_BACKGROUND_CONSENT, "yes")) else "no_consent",
        "citizenship_status": "citizen",
        "eligible_to_work": "yes" if parse_bool(row.get(COL_ELIGIBLE_TO_WORK, "yes")) else "no",
        "speaks_other_languages": "no",
        "worked_for_eveready_before": "yes" if parse_bool(row.get(COL_WORKED_EVEREADY, "")) else "no",
    }


def build_step2_data(row: Dict) -> Dict:
    """Step 2: Personal Information"""
    return {
        "first_name": row.get(COL_FIRST, "").strip(),
        "middle_name": "",
        "last_name": row.get(COL_LAST, "").strip(),
        "date_of_birth": parse_date(row.get(COL_BIRTHDATE, "")) or "",
        "address_line1": row.get(COL_ADDRESS, "").strip(),
        "address_line2": "",
        "city": row.get(COL_CITY, "").strip(),
        "state": row.get(COL_STATE, "Virginia").strip(),
        "zip": row.get(COL_ZIP, "").strip(),
        "phone": row.get(COL_PHONE, "").strip(),
        "email": row.get(COL_EMAIL, "").strip().lower(),
    }


def build_step3_data(row: Dict) -> Dict:
    """Step 3: Emergency Contact"""
    ec_name = row.get(COL_EC_NAME, "").strip()
    ec_first, ec_last = split_name(ec_name)
    
    return {
        "ec_first_name": ec_first,
        "ec_last_name": ec_last,
        "ec_relationship": row.get(COL_EC_RELATIONSHIP, "").strip(),
        "ec_phone": row.get(COL_EC_PHONE, "").strip(),
        "ec_email": "",
    }


def build_step4_data(row: Dict) -> Dict:
    """Step 4: Education & Certifications"""
    return {
        "graduated_high_school": "yes" if parse_bool(row.get(COL_GRADUATED_HS, "")) else "no",
        "highest_education": "high_school",
        "school_name": row.get(COL_HIGH_SCHOOL, "").strip(),
        "certifications": parse_certifications(row.get(COL_CERTIFICATIONS, "")),
        "has_cpr_certification": "yes" if parse_bool(row.get(COL_HAS_CPR, "")) else "no",
        "has_drivers_license": "yes" if parse_bool(row.get(COL_HAS_DRIVERS_LICENSE, "")) else "no",
        "will_travel_30_min": "yes" if parse_bool(row.get(COL_TRAVEL_30_MIN, "")) else "no",
        "can_do_catheter_care": "yes" if parse_bool(row.get(COL_CATHETER, "")) else "no",
        "can_do_vital_signs": "yes" if parse_bool(row.get(COL_VITAL_SIGNS, "")) else "no",
        "will_work_bed_bound": "yes" if parse_bool(row.get(COL_BED_BOUND, "")) else "no",
    }


def build_step5_data(row: Dict) -> Dict:
    """Step 5: Reference 1"""
    return {
        "ref1_name": row.get(COL_REF1_NAME, "").strip(),
        "ref1_relationship": row.get(COL_REF1_RELATION, "Professional").strip() or "Professional",
        "ref1_phone": row.get(COL_REF1_PHONE, "").strip(),
        "ref1_email": "",
    }


def build_step6_data(row: Dict) -> Dict:
    """Step 6: Reference 2"""
    return {
        "ref2_name": row.get(COL_REF2_NAME, "").strip(),
        "ref2_relationship": row.get(COL_REF2_RELATION, "Professional").strip() or "Professional",
        "ref2_phone": row.get(COL_REF2_PHONE, "").strip(),
        "ref2_email": "",
    }


def build_step7_data(row: Dict) -> Dict:
    """Step 7: Employment History"""
    employers = []
    
    emp1_name = row.get(COL_EMPLOYER1_NAME, "").strip()
    if emp1_name:
        employers.append({
            "employer_name": emp1_name,
            "supervisor_name": row.get(COL_EMPLOYER1_SUPERVISOR, "").strip(),
            "phone": row.get(COL_EMPLOYER1_PHONE, "").strip(),
            "start_date": parse_date(row.get(COL_EMPLOYER1_START, "")) or "",
            "end_date": "",
            "reason_for_leaving": row.get(COL_EMPLOYER1_REASON, "").strip(),
        })
    
    emp2_name = row.get(COL_EMPLOYER2_NAME, "").strip()
    if emp2_name:
        employers.append({
            "employer_name": emp2_name,
            "supervisor_name": row.get(COL_EMPLOYER2_SUPERVISOR, "").strip(),
            "phone": row.get(COL_EMPLOYER2_PHONE, "").strip(),
            "start_date": parse_date(row.get(COL_EMPLOYER2_START, "")) or "",
            "end_date": parse_date(row.get(COL_EMPLOYER2_END, "")) or "",
            "reason_for_leaving": "",
        })
    
    return {
        "employers": employers,
        "no_experience": len(employers) == 0,
    }


def build_step8_data(row: Dict) -> Dict:
    """Step 8: Work Preferences"""
    return {
        "has_transportation": "yes" if parse_bool(row.get(COL_TRANSPORT, "yes")) else "no",
        "comfortable_with_pets": "yes" if parse_bool(row.get(COL_PETS, "")) else "no",
        "comfortable_with_smokers": "yes" if parse_bool(row.get(COL_SMOKERS, "")) else "no",
        "available_days": parse_days(row.get(COL_AVAILABILITY_DAYS, "")),
        "shift_preferences": parse_shifts(row.get(COL_AVAILABILITY_SHIFTS, "")),
    }


def build_agreement_step(row: Dict, agreed_col: str, signature_col: str = COL_SIGNATURE) -> Dict:
    """Build data for agreement steps (9, 10, 18, 19, 20, 21, 22)"""
    signature = row.get(signature_col, "").strip() or row.get(COL_PRINT_NAME, "").strip()
    if not signature:
        signature = "{} {}".format(row.get(COL_FIRST, ''), row.get(COL_LAST, '')).strip()
    
    agreed = parse_bool(row.get(agreed_col, "yes"))
    
    return {
        "agreed": agreed,
        "signature": signature,
        "signed_date": parse_date(row.get(COL_DATE_CREATED, "")) or datetime.now().strftime("%Y-%m-%d"),
    }


def build_upload_step() -> Dict:
    """Build placeholder data for upload steps (11-17)"""
    return {
        "skip": True,
        "skipped_at": datetime.now().isoformat(),
    }


# ============================================================================
# MAIN MIGRATION LOGIC
# ============================================================================

def migrate_applicant(supabase: Client, row: Dict, index: int) -> Optional[Dict]:
    """Migrate a single applicant from Quickbase to MediVault."""
    
    email = row.get(COL_EMAIL, "").strip().lower()
    first_name = row.get(COL_FIRST, "").strip()
    last_name = row.get(COL_LAST, "").strip()
    
    if not email or not first_name or not last_name:
        print("  ⚠️  Skipping - missing required fields")
        return None
    
    print("[{}] {} {} <{}>".format(index, first_name, last_name, email))
    
    if DRY_RUN:
        print("  🔍 DRY RUN - would create user and application")
        return {"email": email, "status": "dry_run"}
    
    # 1. Create Auth User
    temp_password = generate_temp_password()
    
    try:
        auth_response = supabase.auth.admin.create_user({
            "email": email,
            "password": temp_password,
            "email_confirm": True,
            "user_metadata": {
                "first_name": first_name,
                "last_name": last_name,
            }
        })
        
        if not auth_response.user:
            print("  ❌ Failed to create auth user")
            return None
        
        user_id = str(auth_response.user.id)
        print("  ✅ Created auth user: {}...".format(user_id[:8]))
        
    except Exception as e:
        error_msg = str(e)
        if "already" in error_msg.lower():
            print("  ⏭️  User already exists, looking up...")
            existing = supabase.table("profiles").select("id").eq("email", email).execute()
            if existing.data:
                user_id = existing.data[0]["id"]
                print("  📎 Found existing user: {}...".format(user_id[:8]))
            else:
                print("  ❌ User exists in auth but not profiles - manual fix needed")
                return None
        else:
            print("  ❌ Auth error: {}".format(error_msg[:60]))
            return None
    
    # 2. Create/Update Profile
    location_id = get_location_id(supabase, row.get(COL_LOCATION, ""))
    
    try:
        profile_data = {
            "id": user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "phone": row.get(COL_PHONE, "").strip() or None,
            "role": "applicant",
            "agency_id": EVEREADY_AGENCY_ID,
            "location_id": location_id,
        }
        
        supabase.table("profiles").upsert(profile_data).execute()
        print("  ✅ Profile created/updated")
        
    except Exception as e:
        print("  ⚠️  Profile error: {}".format(str(e)[:60]))
    
    # 3. Create Application
    qb_status = row.get(COL_STATUS, "").strip()
    app_status = STATUS_MAP.get(qb_status, "submitted")
    
    try:
        app_data = {
            "user_id": user_id,
            "status": app_status,
            "current_step": 22,
            "agency_id": EVEREADY_AGENCY_ID,
            "location_id": location_id,
            "created_at": parse_date(row.get(COL_DATE_CREATED, "")) or datetime.now().strftime("%Y-%m-%d"),
            "submitted_at": datetime.now().isoformat(),
        }
        
        app_result = supabase.table("applications").insert(app_data).execute()
        application_id = app_result.data[0]["id"]
        print("  ✅ Application created: {}...".format(application_id[:8]))
        
    except Exception as e:
        print("  ❌ Application error: {}".format(str(e)[:60]))
        return None
    
    # 4. Create Application Steps
    position = row.get(COL_POSITION, "").upper()
    
    # Determine which job description column applies
    if position in ("LPN",):
        jd_col = COL_JOB_DESC_LPN
    elif position in ("RN",):
        jd_col = COL_JOB_DESC_RN
    else:
        jd_col = COL_JOB_DESC_CNA
    
    steps_data = [
        (1, build_step1_data(row)),
        (2, build_step2_data(row)),
        (3, build_step3_data(row)),
        (4, build_step4_data(row)),
        (5, build_step5_data(row)),
        (6, build_step6_data(row)),
        (7, build_step7_data(row)),
        (8, build_step8_data(row)),
        (9, build_agreement_step(row, COL_CONFIDENTIALITY_AGREED)),
        (10, build_agreement_step(row, COL_ESIGNATURE_AGREED)),
        (11, build_upload_step()),  # Work Authorization
        (12, build_upload_step()),  # ID Front
        (13, build_upload_step()),  # ID Back
        (14, build_upload_step()),  # SSN Card
        (15, build_upload_step()),  # Credentials
        (16, build_upload_step()),  # CPR
        (17, build_upload_step()),  # TB Test
        (18, build_agreement_step(row, COL_ORIENTATION_AGREED)),
        (19, build_agreement_step(row, COL_CRIMINAL_ATTEST)),
        (20, build_agreement_step(row, COL_CRIMINAL_ATTEST)),  # VA Code Disclosure
        (21, build_agreement_step(row, jd_col)),
        (22, build_agreement_step(row, COL_ESIGNATURE_AGREED)),  # Final Signature
    ]
    
    try:
        for step_num, data in steps_data:
            is_upload = step_num in (11, 12, 13, 14, 15, 16, 17)
            is_completed = not is_upload or data.get("skip", False)
            
            step_record = {
                "application_id": application_id,
                "step_number": step_num,
                "data": data,
                "is_completed": is_completed,
                "status": "completed" if is_completed else "pending",
            }
            
            supabase.table("application_steps").insert(step_record).execute()
        
        print("  ✅ All 22 steps created")
        
    except Exception as e:
        print("  ⚠️  Steps error: {}".format(str(e)[:60]))
    
    # 5. Send Password Reset Email
    if SEND_RESET_EMAILS:
        try:
            supabase.auth.admin.generate_link({
                "type": "recovery",
                "email": email,
                "options": {
                    "redirect_to": "https://medisvault.com/auth/reset-callback"
                }
            })
            print("  📧 Password reset email queued")
        except Exception as e:
            print("  ⚠️  Email error: {}".format(str(e)[:40]))
    
    return {
        "user_id": user_id,
        "application_id": application_id,
        "email": email,
        "name": "{} {}".format(first_name, last_name),
        "status": "created",
    }


def main():
    print("\n" + "=" * 60)
    print("MediVault Quickbase Migration")
    print("=" * 60)
    
    if DRY_RUN:
        print("🔍 DRY RUN MODE - No changes will be made\n")
    
    # Validate environment
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Error: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
        return
    
    # Check CSV
    csv_path = Path(CSV_PATH)
    if not csv_path.exists():
        print("❌ Error: CSV not found at {}".format(CSV_PATH))
        print("   Place your Quickbase export there and try again.")
        return
    
    # Connect
    print("📡 Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Read CSV
    print("📂 Reading {}...".format(CSV_PATH))
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    if LIMIT:
        rows = rows[:LIMIT]
        print("   Limited to first {} records".format(LIMIT))
    
    print("   Found {} applicants to migrate\n".format(len(rows)))
    
    # Migrate
    results = []
    for i, row in enumerate(rows, 1):
        result = migrate_applicant(supabase, row, i)
        if result:
            results.append(result)
    
    # Summary
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE")
    print("=" * 60)
    
    created = [r for r in results if r.get("status") == "created"]
    dry_run = [r for r in results if r.get("status") == "dry_run"]
    
    print("✅ Created: {}".format(len(created)))
    if dry_run:
        print("🔍 Dry run: {}".format(len(dry_run)))
    print("❌ Failed: {}".format(len(rows) - len(results)))
    
    # Save mapping
    if results and not DRY_RUN:
        mapping_file = "scripts/migration_results.json"
        with open(mapping_file, 'w') as f:
            json.dump(results, f, indent=2)
        print("\n📁 Results saved to: {}".format(mapping_file))
    
    print()


if __name__ == "__main__":
    main()
