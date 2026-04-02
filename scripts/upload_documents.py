"""
Document Upload Script
======================
Uploads documents from a local folder to Supabase Storage and updates application steps.
Optimizes images to reduce file size while maintaining readability.

Prerequisites:
    1. Run migrate_quickbase_users.py first (creates users + applications)
    2. Download attachments from Quickbase into a folder
    3. Have file_matching.csv (maps files to applicants)
    4. Install Pillow: pip install Pillow

Usage:
    python scripts/upload_documents.py --folder ./quickbase_files

Options:
    --folder PATH     Path to folder containing downloaded files
    --dry-run         Preview without uploading
    --limit N         Only process first N files
"""

from __future__ import annotations

import csv
import io
import mimetypes
import os
import sys
from pathlib import Path
from typing import Optional, Tuple

from dotenv import load_dotenv
from supabase import create_client, Client

# Try to import Pillow for image optimization
try:
    from PIL import Image
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    print("⚠️  Pillow not installed. Images will not be optimized.")
    print("   Install with: pip install Pillow\n")

load_dotenv()

# ============================================================================
# CONFIGURATION
# ============================================================================

FILE_MATCHING_CSV = "scripts/file_matching.csv"
DRY_RUN = "--dry-run" in sys.argv
LIMIT = None

# Image optimization settings
MAX_IMAGE_WIDTH = 1500
MAX_IMAGE_HEIGHT = 1500
JPEG_QUALITY = 85

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

# Image extensions that should be optimized
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.bmp', '.tiff', '.tif'}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_content_type(filename: str) -> str:
    """Get MIME type from filename."""
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or "application/octet-stream"


def find_file(folder: Path, filename: str) -> Optional[Path]:
    """Find a file in folder (case-insensitive)."""
    # Exact match
    exact = folder / filename
    if exact.exists():
        return exact
    
    # Case-insensitive search
    filename_lower = filename.lower()
    for f in folder.iterdir():
        if f.is_file() and f.name.lower() == filename_lower:
            return f
    
    return None


def optimize_image(file_path: Path) -> Tuple[bytes, str, str]:
    """
    Optimize an image file: resize if needed, convert to JPEG, compress.
    
    Returns:
        Tuple of (file_bytes, new_filename, content_type)
    """
    if not PILLOW_AVAILABLE:
        # No optimization, just return original
        with open(file_path, 'rb') as f:
            return f.read(), file_path.name, get_content_type(file_path.name)
    
    try:
        # Open image
        img = Image.open(file_path)
        
        # Convert to RGB if necessary (for JPEG output)
        if img.mode in ('RGBA', 'P', 'LA'):
            # Create white background for transparent images
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Auto-rotate based on EXIF orientation
        try:
            from PIL import ExifTags
            for orientation in ExifTags.TAGS.keys():
                if ExifTags.TAGS[orientation] == 'Orientation':
                    break
            exif = img._getexif()
            if exif is not None:
                orientation_value = exif.get(orientation)
                if orientation_value == 3:
                    img = img.rotate(180, expand=True)
                elif orientation_value == 6:
                    img = img.rotate(270, expand=True)
                elif orientation_value == 8:
                    img = img.rotate(90, expand=True)
        except (AttributeError, KeyError, IndexError):
            pass  # No EXIF data
        
        # Resize if larger than max dimensions
        original_size = img.size
        if img.width > MAX_IMAGE_WIDTH or img.height > MAX_IMAGE_HEIGHT:
            img.thumbnail((MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT), Image.LANCZOS)
        
        # Save to JPEG bytes
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=JPEG_QUALITY, optimize=True)
        file_bytes = buffer.getvalue()
        
        # New filename with .jpg extension
        new_filename = file_path.stem + '.jpg'
        
        return file_bytes, new_filename, 'image/jpeg'
        
    except Exception as e:
        print("    ⚠️  Optimization failed: {}".format(e))
        # Fall back to original file
        with open(file_path, 'rb') as f:
            return f.read(), file_path.name, get_content_type(file_path.name)


def process_file(file_path: Path) -> Tuple[bytes, str, str]:
    """
    Process a file for upload. Optimizes images, passes through PDFs.
    
    Returns:
        Tuple of (file_bytes, filename, content_type)
    """
    extension = file_path.suffix.lower()
    
    # PDFs - no processing needed
    if extension == '.pdf':
        with open(file_path, 'rb') as f:
            return f.read(), file_path.name, 'application/pdf'
    
    # Images - optimize
    if extension in IMAGE_EXTENSIONS:
        return optimize_image(file_path)
    
    # Other files - pass through
    with open(file_path, 'rb') as f:
        return f.read(), file_path.name, get_content_type(file_path.name)


def get_user_and_application(supabase: Client, email: str) -> Optional[Tuple[str, str]]:
    """Look up user_id and application_id by email."""
    # Get profile
    profile_res = supabase.table("profiles").select("id").eq("email", email.lower()).execute()
    if not profile_res.data:
        return None
    
    user_id = profile_res.data[0]["id"]
    
    # Get application (most recent one)
    app_res = supabase.table("applications").select("id").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
    if not app_res.data:
        return None
    
    application_id = app_res.data[0]["id"]
    
    return user_id, application_id


def upload_file(supabase: Client, user_id: str, file_bytes: bytes, filename: str, 
                content_type: str, doc_type: str) -> Optional[str]:
    """Upload file to Supabase Storage and return storage path."""
    storage_path = "{}/{}/{}".format(user_id, doc_type, filename)
    
    try:
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
        }).eq("id", step_id).execute()
        
        return True
        
    except Exception as e:
        print("  ⚠️  Step update error: {}".format(e))
        return False


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
    print("MediVault Document Upload")
    print("=" * 60)
    
    if DRY_RUN:
        print("🔍 DRY RUN MODE - No changes will be made\n")
    
    if PILLOW_AVAILABLE:
        print("🖼️  Image optimization: ENABLED")
        print("   Max size: {}x{}, Quality: {}%\n".format(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, JPEG_QUALITY))
    
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
    
    folder = Path(FOLDER_PATH).expanduser()
    if not folder.exists():
        print("❌ Error: Folder not found: {}".format(FOLDER_PATH))
        return
    
    # Check CSV
    csv_path = Path(FILE_MATCHING_CSV)
    if not csv_path.exists():
        print("❌ Error: File matching CSV not found: {}".format(FILE_MATCHING_CSV))
        print("   Download it from the outputs or regenerate it.")
        return
    
    # Connect
    print("📡 Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Read CSV
    print("📂 Reading {}...".format(FILE_MATCHING_CSV))
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    if LIMIT:
        rows = rows[:LIMIT]
        print("   Limited to first {} files".format(LIMIT))
    
    print("   {} files to process\n".format(len(rows)))
    
    # Scan folder
    print("📁 Scanning folder: {}".format(folder))
    available_files = {}
    for f in folder.iterdir():
        if f.is_file():
            available_files[f.name.lower()] = f
    print("   {} files found\n".format(len(available_files)))
    
    # Process
    results = {"uploaded": 0, "not_found": 0, "failed": 0, "skipped": 0}
    total_original_size = 0
    total_optimized_size = 0
    user_cache = {}  # Cache email -> (user_id, app_id)
    
    for i, row in enumerate(rows, 1):
        email = row.get("email", "").strip().lower()
        filename = row.get("file_name", "").strip()
        step_number = int(row.get("step_number", 0))
        doc_type = STEP_DOC_TYPES.get(step_number, "unknown")
        
        print("[{}/{}] {}".format(i, len(rows), filename))
        
        # Find file
        file_path = find_file(folder, filename)
        if not file_path:
            print("  ⚠️  File not found in folder")
            results["not_found"] += 1
            continue
        
        # Look up user
        if email not in user_cache:
            user_app = get_user_and_application(supabase, email)
            user_cache[email] = user_app
        
        user_app = user_cache.get(email)
        if not user_app:
            print("  ⚠️  User not found: {}".format(email))
            results["skipped"] += 1
            continue
        
        user_id, application_id = user_app
        
        # Process file (optimize if image)
        original_size = file_path.stat().st_size
        total_original_size += original_size
        
        file_bytes, new_filename, content_type = process_file(file_path)
        optimized_size = len(file_bytes)
        total_optimized_size += optimized_size
        
        size_info = "{} → {}".format(format_size(original_size), format_size(optimized_size))
        if optimized_size < original_size:
            savings = (1 - optimized_size / original_size) * 100
            size_info += " (-{:.0f}%)".format(savings)
        
        if DRY_RUN:
            print("  🔍 Would upload {} to {}.../{}/".format(size_info, user_id[:8], doc_type))
            results["uploaded"] += 1
            continue
        
        # Upload file
        try:
            storage_path = upload_file(supabase, user_id, file_bytes, new_filename, content_type, doc_type)
            print("  ✅ Uploaded: {} ({})".format(new_filename, size_info))
            
            # Update step
            if update_application_step(supabase, application_id, step_number, storage_path, new_filename):
                print("  ✅ Step {} updated".format(step_number))
            
            results["uploaded"] += 1
            
        except Exception as e:
            print("  ❌ Upload failed: {}".format(e))
            results["failed"] += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("UPLOAD COMPLETE")
    print("=" * 60)
    print("✅ Uploaded: {}".format(results['uploaded']))
    print("⚠️  Not found in folder: {}".format(results['not_found']))
    print("⏭️  User not found: {}".format(results['skipped']))
    print("❌ Failed: {}".format(results['failed']))
    
    if total_original_size > 0:
        print("\n📊 Storage savings:")
        print("   Original: {}".format(format_size(total_original_size)))
        print("   Optimized: {}".format(format_size(total_optimized_size)))
        savings = (1 - total_optimized_size / total_original_size) * 100
        print("   Saved: {:.0f}%".format(savings))
    
    print()


if __name__ == "__main__":
    main()
