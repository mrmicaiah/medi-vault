"""
Background Check Upload Script
==============================
Uploads background check PDFs from a folder to Supabase.
Matches files to users by name extracted from filename.

File naming convention expected:
    - "BG CK Badu Stephen.pdf" → matches user Stephen Badu
    - "BG CK Yeboah-Shackleford Doris.pdf" → matches user Doris Yeboah-Shackleford

Usage:
    python scripts/upload_background_checks.py --folder ~/Desktop/bgc

Options:
    --folder PATH     Path to folder containing background check PDFs
    --dry-run         Preview without uploading
"""

from __future__ import annotations

import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple, List

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# ============================================================================
# CONFIGURATION
# ============================================================================

DRY_RUN = "--dry-run" in sys.argv

# Parse arguments
FOLDER_PATH = None
for i, arg in enumerate(sys.argv):
    if arg == "--folder" and i + 1 < len(sys.argv):
        FOLDER_PATH = sys.argv[i + 1]


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def extract_name_from_filename(filename: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract first and last name from background check filename.
    
    Examples:
        "BG CK Badu Stephen.pdf" → ("Stephen", "Badu")
        "BG CK Yeboah-Shackleford Doris.pdf" → ("Doris", "Yeboah-Shackleford")
        "Daniel Akweh BG Check.pdf" → ("Daniel", "Akweh")
        "Michelle Ortega BG Check.pdf" → ("Michelle", "Ortega")
    """
    # Remove extension
    name = Path(filename).stem
    
    # Remove common prefixes/suffixes
    name = re.sub(r'^BG\s*C[HK]\s*', '', name, flags=re.IGNORECASE)  # BG CK, BG CHK, BG CH
    name = re.sub(r'\s*BG\s*Check\s*$', '', name, flags=re.IGNORECASE)  # BG Check at end
    name = re.sub(r'\s*BG\s*C[HK]\s*$', '', name, flags=re.IGNORECASE)  # BG CK at end
    
    name = name.strip()
    
    if not name:
        return None, None
    
    parts = name.split()
    
    if len(parts) == 1:
        return None, parts[0]  # Just last name
    elif len(parts) == 2:
        # Could be "First Last" or "Last First"
        # We'll try both when matching
        return parts[0], parts[1]
    else:
        # Multiple parts - assume last part is first name, rest is last name
        # "Yeboah-Shackleford Doris" → first="Doris", last="Yeboah-Shackleford"
        return parts[-1], " ".join(parts[:-1])


def find_user_by_name(supabase: Client, name1: str, name2: str) -> Optional[Tuple[str, str, str]]:
    """
    Find user by name, trying different combinations.
    Returns (user_id, first_name, last_name) or None.
    """
    # Try name1 as first, name2 as last
    result = supabase.table("profiles").select("id, first_name, last_name").ilike(
        "first_name", name1
    ).ilike("last_name", name2).execute()
    
    if result.data:
        row = result.data[0]
        return row["id"], row["first_name"], row["last_name"]
    
    # Try name2 as first, name1 as last
    result = supabase.table("profiles").select("id, first_name, last_name").ilike(
        "first_name", name2
    ).ilike("last_name", name1).execute()
    
    if result.data:
        row = result.data[0]
        return row["id"], row["first_name"], row["last_name"]
    
    # Try partial match on last name (for hyphenated names)
    result = supabase.table("profiles").select("id, first_name, last_name").or_(
        "last_name.ilike.%{}%,last_name.ilike.%{}%".format(name1, name2)
    ).execute()
    
    if result.data:
        # Check if first name matches
        for row in result.data:
            first = row["first_name"].lower() if row["first_name"] else ""
            if first == name1.lower() or first == name2.lower():
                return row["id"], row["first_name"], row["last_name"]
    
    return None


def get_application_id(supabase: Client, user_id: str) -> Optional[str]:
    """Get most recent application for user."""
    result = supabase.table("applications").select("id").eq(
        "user_id", user_id
    ).order("created_at", desc=True).limit(1).execute()
    
    if result.data:
        return result.data[0]["id"]
    return None


def upload_background_check(supabase: Client, user_id: str, application_id: str, 
                           file_path: Path) -> Optional[str]:
    """Upload background check PDF to Supabase Storage and documents table."""
    
    storage_path = "{}/background_check/{}".format(user_id, file_path.name)
    
    # Read file
    with open(file_path, "rb") as f:
        file_bytes = f.read()
    
    # Upload to storage
    try:
        supabase.storage.from_("documents").upload(
            storage_path,
            file_bytes,
            {"content-type": "application/pdf"}
        )
    except Exception as e:
        error_msg = str(e)
        if "already exists" not in error_msg.lower() and "duplicate" not in error_msg.lower():
            raise
        # File already exists, continue
    
    # Insert into documents table
    try:
        doc_data = {
            "user_id": user_id,
            "application_id": application_id,
            "category": "background",
            "document_type": "background_check",
            "original_filename": file_path.name,
            "storage_path": storage_path,
            "file_size": len(file_bytes),
            "mime_type": "application/pdf",
            "is_current": True,
            "version": 1,
        }
        
        supabase.table("documents").insert(doc_data).execute()
        
    except Exception as e:
        print("    ⚠️  Document record error: {}".format(e))
    
    return storage_path


def format_size(size_bytes: int) -> str:
    """Format bytes as human-readable string."""
    if size_bytes < 1024:
        return "{}B".format(size_bytes)
    elif size_bytes < 1024 * 1024:
        return "{:.1f}KB".format(size_bytes / 1024)
    else:
        return "{:.1f}MB".format(size_bytes / (1024 * 1024))


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("\n" + "=" * 60)
    print("MediVault Background Check Upload")
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
        print("   Example: python scripts/upload_background_checks.py --folder ~/Desktop/bgc")
        return
    
    folder = Path(FOLDER_PATH).expanduser()
    if not folder.exists():
        print("❌ Error: Folder not found: {}".format(FOLDER_PATH))
        return
    
    # Connect
    print("📡 Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Find PDF files
    print("📁 Scanning folder: {}".format(folder))
    pdf_files = list(folder.glob("*.pdf")) + list(folder.glob("*.PDF"))
    print("   {} PDF files found\n".format(len(pdf_files)))
    
    if not pdf_files:
        print("❌ No PDF files found in folder")
        return
    
    # Process
    results = {"uploaded": 0, "not_matched": 0, "failed": 0}
    
    for i, file_path in enumerate(pdf_files, 1):
        print("[{}/{}] {}".format(i, len(pdf_files), file_path.name))
        
        # Extract name from filename
        name1, name2 = extract_name_from_filename(file_path.name)
        
        if not name1 or not name2:
            print("  ⚠️  Could not extract name from filename")
            results["not_matched"] += 1
            continue
        
        # Find user
        user_info = find_user_by_name(supabase, name1, name2)
        
        if not user_info:
            print("  ⚠️  No user found for: {} {}".format(name1, name2))
            results["not_matched"] += 1
            continue
        
        user_id, first_name, last_name = user_info
        print("  👤 Matched: {} {}".format(first_name, last_name))
        
        # Get application
        application_id = get_application_id(supabase, user_id)
        if not application_id:
            print("  ⚠️  No application found for user")
            results["not_matched"] += 1
            continue
        
        file_size = file_path.stat().st_size
        
        if DRY_RUN:
            print("  🔍 Would upload {} ({})".format(file_path.name, format_size(file_size)))
            results["uploaded"] += 1
            continue
        
        # Upload
        try:
            storage_path = upload_background_check(supabase, user_id, application_id, file_path)
            print("  ✅ Uploaded: {} ({})".format(file_path.name, format_size(file_size)))
            results["uploaded"] += 1
            
        except Exception as e:
            print("  ❌ Upload failed: {}".format(e))
            results["failed"] += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("UPLOAD COMPLETE")
    print("=" * 60)
    print("✅ Uploaded: {}".format(results['uploaded']))
    print("⚠️  Not matched: {}".format(results['not_matched']))
    print("❌ Failed: {}".format(results['failed']))
    print()


if __name__ == "__main__":
    main()
