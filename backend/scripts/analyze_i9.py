#!/usr/bin/env python3
"""
Quick script to analyze the I-9 PDF and show all fillable field names.

Run from the backend directory:
    python -m scripts.analyze_i9

Or directly:
    python scripts/analyze_i9.py
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.pdf_service import pdf_service


def main():
    print("=" * 60)
    print("I-9 FORM FIELD ANALYSIS")
    print("=" * 60)
    
    try:
        # Get field info
        info = pdf_service.get_i9_field_info()
        
        print(f"\nPDF Path: {info.get('pdf_path')}")
        print(f"Pages: {info.get('page_count')}")
        print(f"Is Fillable: {info.get('is_fillable')}")
        print(f"Total Fields: {len(info.get('fields', []))}")
        
        if not info.get('is_fillable'):
            print("\n⚠️  This PDF does not have fillable form fields!")
            print("   You'll need a fillable version of the I-9 from USCIS.")
            return
        
        print("\n" + "-" * 60)
        print("DISCOVERED FIELDS:")
        print("-" * 60)
        
        current_page = 0
        for field in info.get('fields', []):
            page = field.get('page', 0)
            if page != current_page:
                current_page = page
                print(f"\n📄 PAGE {page}")
            
            field_id = field.get('field_id', 'unknown')
            field_type = field.get('type', 'unknown')
            print(f"  • {field_id}")
            print(f"    Type: {field_type}")
            
            if field.get('checked_value'):
                print(f"    Checked Value: {field['checked_value']}")
            if field.get('radio_options'):
                opts = [o['value'] for o in field['radio_options']]
                print(f"    Radio Options: {opts}")
        
        print("\n" + "-" * 60)
        print("AUTO-GENERATED FIELD MAPPING:")
        print("-" * 60)
        
        mapping = info.get('field_mapping', {})
        if mapping:
            for semantic_name, field_id in sorted(mapping.items()):
                print(f"  {semantic_name}: {field_id}")
        else:
            print("  No mappings could be auto-generated.")
            print("  You may need to manually map the fields.")
        
        print("\n" + "=" * 60)
        print("NEXT STEPS:")
        print("=" * 60)
        print("""
1. Review the field IDs above
2. Check if the auto-mapping looks correct
3. If not, update the patterns in pdf_service._auto_map_i9_fields()
4. Test with: GET /documents/download/i9
""")
        
    except FileNotFoundError as e:
        print(f"\n❌ ERROR: {e}")
        print("\nMake sure i-9.pdf is in backend/app/assets/")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
