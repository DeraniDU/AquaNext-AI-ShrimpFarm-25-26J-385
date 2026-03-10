#!/usr/bin/env python3
"""
Database Schema Inspection Script

Examines the actual structure of data in the shrimp_farm_iot database
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.mongodb import MongoDB


def inspect_collections():
    """Inspect database structure and sample data"""
    print("\n" + "="*60)
    print("DATABASE SCHEMA INSPECTION")
    print("="*60)
    
    try:
        db = MongoDB.get_db()
        collections = db.list_collection_names()
        print(f"\n📊 Collections in '{db.name}' database:")
        
        for collection_name in collections:
            collection = db[collection_name]
            count = collection.count_documents({})
            print(f"\n  ├── {collection_name}")
            print(f"  │   └── Documents: {count}")
            
            # Get sample document
            sample = collection.find_one({})
            if sample:
                print(f"  │   └── Fields: {list(sample.keys())}")
                print(f"  │   └── Sample data:")
                
                # Pretty print first few fields
                for i, (key, value) in enumerate(sample.items()):
                    if i < 8:  # Limit to first 8 fields
                        if isinstance(value, (dict, list)):
                            print(f"  │       - {key}: {type(value).__name__}")
                        else:
                            print(f"  │       - {key}: {value}")
                    else:
                        print(f"  │       - ... ({len(sample) - 8} more fields)")
                        break
        
        return collections
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None


if __name__ == "__main__":
    print("\n🔍 DATABASE SCHEMA EXPLORATION")
    inspect_collections()
