"""
Document Upload Script
======================
Uploads documents from a local folder to Supabase Storage and updates application steps.

Prerequisites:
    1. Run migrate_quickbase_users.py first (creates users + applications)
    2. Download attachments from Quickbase into a folder
    3. Have file_matching.csv (maps files to applicants)

Usage:
    python scripts/upload_documents.py --folder ./quickbase_files

Options:
    --folder PATH     Path to folder containing downloaded files
    --dry-run         Preview without uploading
    --limit N         Only process first N files
"""

import csv
import mimetypes
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# ============================================================================
# CONFIGURATION
# ============================================================================

FILE_MATCHING_CSV = "scripts/file_matching.csv"
DRY_RUN = "--dry-run" in sys.argv
LIMIT = None

# Parse arguments
FOLDER_PATH = None
for i, arg in enumerate(sys.argv):
    if arg == "--folder" and i + 1 < len(sys.argv):
        FOLDER_PATH = sys.argv[i + 1]
    if arg == "--limit" and i + 1 < len(sys.argv):
        LIMIT = int(sys.argv[i + 1])

# Step number to document type mapping
STEP_DOC_TYPES = {
    11: "work_authorization",
    12: "id_front",
    13: "id_back",
    14: "ssn_card",
    15: "credentials",
    16: "cpr_certification",
    17: "tb_test",
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_content_type(filename: str) -> str:
    """Get MIME type from filename."""
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or "application/octet-stream"


def find_file(folder: Path, filename: str) -> Path | None:
    """Find a file in folder (case-insensitive)."""
    # Exact match
    exact = folder / filename
    if exact.exists():
        return exact
    
    # Case-insensitive search
    filename_lower = filename.lower()
    for f in folder.iterdir():
        if f.name.lower() == filename_lower:
            return f
    
    return None


def get_user_and_application(supabase: Client, email: str) -> tuple[str, str] | None:
    """Look up user_id and application_id by email."""
    # Get profile
    profile_res = supabase.table("profiles").select("id").eq("email", email.lower()).execute()
    if not profile_res.data:
        return None
    
    user_id = profile_res.data[0]["id"]
    
    # Get application
    app_res = supabase.table("applications").select("id").eq("user_id", user_id).execute()
    if not app_res.data:
        return None
    
    application_id = app_res.data[0]["id"]
    
    return user_id, application_id


def upload_file(supabase: Client, user_id: str, file_path: Path, doc_type: str) -> str | None:
    """Upload file to Supabase Storage and return storage path."""
    storage_path = f"{user_id}/{doc_type}/{file_path.name}"
    
    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()
        
        content_type = get_content_type(file_path.name)
        
        # Upload to storage
        supabase.storage.from_("documents").upload(
            storage_path,
            file_bytes,
            {"content-type": content_type}
        )
        
        return storage_path
        
    except Exception as e:
        error_msg = str(e)
        if "already exists" in error_msg.lower() or "duplicate" in error_msg.lower():
            # File already uploaded, return path anyway
            return storage_path
        raise


def update_application_step(supabase: Client, application_id: str, step_number: int, 
                           storage_path: str, filename: str) -> bool:
    """Update application step with file info."""
    try:
        # Get current step data
        step_res = supabase.table("application_steps").select("id, data").eq(
            "application_id", application_id
        ).eq("step_number", step_number).execute()
        
        if not step_res.data:
            return False
        
        step_id = step_res.data[0]["id"]
        current_data = step_res.data[0].get("data") or {}
        
        # Update with file info
        current_data.update({
            "storage_path": storage_path,
            "file_name": filename,
            "skip": False,
        })
        
        # Remove skipped_at if present
        current_data.pop("skipped_at", None)
        
        supabase.table("application_steps").update({
            "data": current_data,
            "is_completed": True,
            "status": "completed",
        }).eq("id", step_id).execute()
        
        return True
        
    except Exception as e:
        print(f"  ⚠️  Step update error: {e}")
        return False


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("\n" + "=" * 60)
    print("MediVault Document Upload")
    print("=" * 60)
    
    if DRY_RUN:
        print("🔍 DRY RUN MODE - No changes will be made\n")
    
    # Validate environment
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Error: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
        return
    
    # Check folder
    if not FOLDER_PATH:
        print("❌ Error: Specify folder with --folder PATH")
        print("   Example: python scripts/upload_documents.py --folder ./quickbase_files")
        return
    
    folder = Path(FOLDER_PATH)
    if not folder.exists():
        print(f"❌ Error: Folder not found: {FOLDER_PATH}")
        return
    
    # Check CSV
    csv_path = Path(FILE_MATCHING_CSV)
    if not csv_path.exists():
        print(f"❌ Error: File matching CSV not found: {FILE_MATCHING_CSV}")
        return
    
    # Connect
    print(f"📡 Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Read CSV
    print(f"📂 Reading {FILE_MATCHING_CSV}...")
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    if LIMIT:
        rows = rows[:LIMIT]
        print(f"   Limited to first {LIMIT} files")
    
    print(f"   {len(rows)} files to process\n")
    
    # Scan folder
    print(f"📁 Scanning folder: {folder}")
    available_files = {f.name.lower(): f for f in folder.iterdir() if f.is_file()}
    print(f"   {len(available_files)} files found\n")
    
    # Process
    results = {"uploaded": 0, "not_found": 0, "failed": 0, "skipped": 0}
    user_cache = {}  # Cache email -> (user_id, app_id)
    
    for i, row in enumerate(rows, 1):
        email = row.get("email", "").strip().lower()
        filename = row.get("file_name", "").strip()
        step_number = int(row.get("step_number", 0))
        doc_type = STEP_DOC_TYPES.get(step_number, "unknown")
        
        print(f"[{i}/{len(rows)}] {filename}")
        
        # Find file
        file_path = find_file(folder, filename)
        if not file_path:
            print(f"  ⚠️  File not found in folder")
            results["not_found"] += 1
            continue
        
        # Look up user
        if email not in user_cache:
            user_app = get_user_and_application(supabase, email)
            user_cache[email] = user_app
        
        user_app = user_cache.get(email)
        if not user_app:
            print(f"  ⚠️  User not found: {email}")
            results["skipped"] += 1
            continue
        
        user_id, application_id = user_app
        
        if DRY_RUN:
            print(f"  🔍 Would upload to {user_id[:8]}.../{doc_type}/")
            results["uploaded"] += 1
            continue
        
        # Upload file
        try:
            storage_path = upload_file(supabase, user_id, file_path, doc_type)
            print(f"  ✅ Uploaded: {storage_path}")
            
            # Update step
            if update_application_step(supabase, application_id, step_number, storage_path, filename):
                print(f"  ✅ Step {step_number} updated")
            
            results["uploaded"] += 1
            
        except Exception as e:
            print(f"  ❌ Upload failed: {e}")
            results["failed"] += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("UPLOAD COMPLETE")
    print("=" * 60)
    print(f"✅ Uploaded: {results['uploaded']}")
    print(f"⚠️  Not found in folder: {results['not_found']}")
    print(f"⏭️  User not found: {results['skipped']}")
    print(f"❌ Failed: {results['failed']}")
    print()


if __name__ == "__main__":
    main()
