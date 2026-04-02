"""
Bulk User Migration Script
==========================
Migrates users from Quickbase CSV export to Supabase Auth + profiles.

Usage:
    1. Export your Quickbase data to CSV
    2. Update the CSV_PATH below
    3. Set your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
    4. Run: python scripts/migrate_quickbase_users.py

What this script does:
    1. Reads the CSV file
    2. Creates each user in Supabase Auth (with temp password)
    3. Creates matching profile record
    4. Optionally sends password reset emails
    5. Outputs a mapping file for document migration
"""

import csv
import json
import os
import secrets
import string
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# ============================================================================
# CONFIGURATION - UPDATE THESE
# ============================================================================

CSV_PATH = "scripts/quickbase_export.csv"  # Path to your Quickbase export

# Expected CSV columns (adjust to match your export)
# The script will map these to MediVault fields
COLUMN_MAPPING = {
    "email": "Email",              # Required
    "first_name": "First Name",    # Required  
    "last_name": "Last Name",      # Required
    "phone": "Phone",              # Optional
    "role": "Status",              # Maps to: applicant, employee, admin
    "position": "Position",        # For employees
    "hire_date": "Hire Date",      # For employees
    "location": "Location",        # Office location name
}

# Role mapping from Quickbase status to MediVault roles
ROLE_MAPPING = {
    "applicant": "applicant",
    "pending": "applicant", 
    "active": "employee",
    "hired": "employee",
    "employee": "employee",
    "admin": "admin",
    "administrator": "admin",
}

# Location mapping from Quickbase names to MediVault slugs
LOCATION_MAPPING = {
    "Dumfries": "dumfries",
    "Arlington": "arlington", 
    "Sterling": "sterling",
    "Hampton": "hampton",
}

# Whether to send password reset emails immediately
SEND_RESET_EMAILS = True

# ============================================================================
# SCRIPT - Don't modify below unless needed
# ============================================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Agency ID for Eveready HomeCare (from migration 010)
EVEREADY_AGENCY_ID = "a0000000-0000-0000-0000-000000000001"


def generate_temp_password(length: int = 16) -> str:
    """Generate a secure temporary password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def normalize_role(quickbase_status: str) -> str:
    """Convert Quickbase status to MediVault role."""
    if not quickbase_status:
        return "applicant"
    status_lower = quickbase_status.lower().strip()
    return ROLE_MAPPING.get(status_lower, "applicant")


def get_location_id(supabase: Client, location_name: str) -> str | None:
    """Look up location UUID by name or slug."""
    if not location_name:
        return None
    
    slug = LOCATION_MAPPING.get(location_name, location_name.lower())
    
    result = supabase.table("locations").select("id").eq("slug", slug).execute()
    if result.data:
        return result.data[0]["id"]
    return None


def create_user(supabase: Client, row: dict) -> dict | None:
    """Create a single user in Supabase Auth and profiles table."""
    
    email = row.get(COLUMN_MAPPING["email"], "").strip()
    first_name = row.get(COLUMN_MAPPING["first_name"], "").strip()
    last_name = row.get(COLUMN_MAPPING["last_name"], "").strip()
    phone = row.get(COLUMN_MAPPING.get("phone", ""), "").strip()
    role = normalize_role(row.get(COLUMN_MAPPING.get("role", ""), ""))
    
    if not email or not first_name or not last_name:
        print(f"  ⚠️  Skipping row - missing required fields: {row}")
        return None
    
    temp_password = generate_temp_password()
    
    try:
        # Create user in Supabase Auth using admin API
        auth_response = supabase.auth.admin.create_user({
            "email": email,
            "password": temp_password,
            "email_confirm": True,  # Skip email verification
            "user_metadata": {
                "first_name": first_name,
                "last_name": last_name,
            }
        })
        
        if not auth_response.user:
            print(f"  ❌ Failed to create auth user for {email}")
            return None
            
        user_id = str(auth_response.user.id)
        print(f"  ✅ Created auth user: {email} ({user_id})")
        
    except Exception as e:
        error_msg = str(e)
        if "already been registered" in error_msg.lower() or "already exists" in error_msg.lower():
            print(f"  ⏭️  User already exists: {email}")
            # Try to get existing user ID
            existing = supabase.table("profiles").select("id").eq("email", email).execute()
            if existing.data:
                return {
                    "user_id": existing.data[0]["id"],
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "status": "existing"
                }
            return None
        else:
            print(f"  ❌ Error creating {email}: {error_msg}")
            return None
    
    # Create profile record
    try:
        location_name = row.get(COLUMN_MAPPING.get("location", ""), "")
        location_id = get_location_id(supabase, location_name)
        
        profile_data = {
            "id": user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "phone": phone or None,
            "role": role,
            "agency_id": EVEREADY_AGENCY_ID,
        }
        
        supabase.table("profiles").insert(profile_data).execute()
        print(f"  ✅ Created profile for {email} (role: {role})")
        
    except Exception as e:
        print(f"  ⚠️  Profile may already exist for {email}: {e}")
    
    # Create employee record if role is employee
    if role == "employee":
        try:
            position = row.get(COLUMN_MAPPING.get("position", ""), "Caregiver")
            hire_date_str = row.get(COLUMN_MAPPING.get("hire_date", ""), "")
            
            # Parse hire date or use today
            if hire_date_str:
                try:
                    hire_date = datetime.strptime(hire_date_str, "%m/%d/%Y").date()
                except:
                    hire_date = datetime.now().date()
            else:
                hire_date = datetime.now().date()
            
            employee_data = {
                "user_id": user_id,
                "position": position or "Caregiver",
                "location_id": location_id,
                "hire_date": str(hire_date),
                "status": "active",
            }
            
            supabase.table("employees").insert(employee_data).execute()
            print(f"  ✅ Created employee record for {email}")
            
        except Exception as e:
            print(f"  ⚠️  Could not create employee record: {e}")
    
    # Send password reset email if configured
    if SEND_RESET_EMAILS:
        try:
            supabase.auth.admin.generate_link({
                "type": "recovery",
                "email": email,
            })
            print(f"  📧 Queued password reset email for {email}")
        except Exception as e:
            print(f"  ⚠️  Could not send reset email: {e}")
    
    return {
        "user_id": user_id,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "role": role,
        "folder_name": f"{last_name}, {first_name}",  # For document mapping
        "status": "created"
    }


def main():
    """Main migration function."""
    
    print("\n" + "=" * 60)
    print("MediVault User Migration Script")
    print("=" * 60 + "\n")
    
    # Validate environment
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        return
    
    # Check CSV exists
    csv_path = Path(CSV_PATH)
    if not csv_path.exists():
        print(f"❌ Error: CSV file not found: {CSV_PATH}")
        print(f"   Place your Quickbase export at: {csv_path.absolute()}")
        return
    
    # Connect to Supabase
    print(f"📡 Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print(f"   URL: {SUPABASE_URL}")
    
    # Read CSV
    print(f"\n📂 Reading CSV: {CSV_PATH}")
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    print(f"   Found {len(rows)} records to migrate\n")
    
    # Process each row
    results = []
    for i, row in enumerate(rows, 1):
        email = row.get(COLUMN_MAPPING["email"], "unknown")
        print(f"[{i}/{len(rows)}] Processing: {email}")
        
        result = create_user(supabase, row)
        if result:
            results.append(result)
    
    # Summary
    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    
    created = [r for r in results if r.get("status") == "created"]
    existing = [r for r in results if r.get("status") == "existing"]
    
    print(f"✅ Created: {len(created)}")
    print(f"⏭️  Already existed: {len(existing)}")
    print(f"❌ Failed: {len(rows) - len(results)}")
    
    # Save mapping file for document migration
    mapping_file = "scripts/user_mapping.json"
    mapping = {
        r["folder_name"]: {
            "user_id": r["user_id"],
            "email": r["email"],
        }
        for r in results
        if r.get("folder_name")
    }
    
    with open(mapping_file, 'w') as f:
        json.dump(mapping, f, indent=2)
    
    print(f"\n📁 User mapping saved to: {mapping_file}")
    print("   Use this file for the document migration step.\n")


if __name__ == "__main__":
    main()
