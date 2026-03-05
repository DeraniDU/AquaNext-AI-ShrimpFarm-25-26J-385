"""
Generate 300 water quality samples and insert them into MongoDB Atlas.
"""

import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
from config import FARM_CONFIG, MONGO_DB_NAME
from database.mongodb import get_mongo_client, get_database

# Optimal ranges from config
OPTIMAL_PH_RANGE = FARM_CONFIG['optimal_ph_range']
OPTIMAL_TEMP_RANGE = FARM_CONFIG['optimal_temperature_range']
OPTIMAL_DO = FARM_CONFIG['optimal_dissolved_oxygen']
OPTIMAL_SALINITY_RANGE = FARM_CONFIG['optimal_salinity_range']


def determine_status(ph: float, temp: float, do: float, salinity: float, ammonia: float) -> str:
    """Determine water quality status based on parameters"""
    issues = 0
    
    if not (OPTIMAL_PH_RANGE[0] <= ph <= OPTIMAL_PH_RANGE[1]):
        issues += 1
    if not (OPTIMAL_TEMP_RANGE[0] <= temp <= OPTIMAL_TEMP_RANGE[1]):
        issues += 1
    if do < OPTIMAL_DO:
        issues += 1
    if not (OPTIMAL_SALINITY_RANGE[0] <= salinity <= OPTIMAL_SALINITY_RANGE[1]):
        issues += 1
    if ammonia > 0.2:
        issues += 1
    
    if issues == 0:
        return "excellent"
    elif issues <= 1:
        return "good"
    elif issues <= 2:
        return "fair"
    elif issues <= 3:
        return "poor"
    else:
        return "critical"


def generate_alerts(ph: float, temp: float, do: float, salinity: float, ammonia: float) -> List[str]:
    """Generate alerts based on water quality parameters"""
    alerts = []
    
    if ph < OPTIMAL_PH_RANGE[0]:
        alerts.append(f"CRITICAL: pH too low ({ph:.2f}) - immediate action required")
    elif ph > OPTIMAL_PH_RANGE[1]:
        alerts.append(f"WARNING: pH too high ({ph:.2f}) - monitor closely")
    
    if temp < OPTIMAL_TEMP_RANGE[0]:
        alerts.append(f"WARNING: Temperature too low ({temp:.1f}°C) - consider heating")
    elif temp > OPTIMAL_TEMP_RANGE[1]:
        alerts.append(f"WARNING: Temperature too high ({temp:.1f}°C) - consider cooling")
    
    if do < OPTIMAL_DO:
        alerts.append(f"CRITICAL: Low dissolved oxygen ({do:.1f} mg/L) - increase aeration")
    
    if salinity < OPTIMAL_SALINITY_RANGE[0]:
        alerts.append(f"WARNING: Salinity too low ({salinity:.1f} ppt) - add salt")
    elif salinity > OPTIMAL_SALINITY_RANGE[1]:
        alerts.append(f"WARNING: Salinity too high ({salinity:.1f} ppt) - dilute water")
    
    if ammonia > 0.2:
        alerts.append(f"CRITICAL: High ammonia levels ({ammonia:.2f} mg/L) - water change needed")
    
    return alerts


def generate_water_quality_document(pond_id: int, timestamp: datetime) -> Dict[str, Any]:
    """Generate a single water quality document"""
    # Base values with realistic variation
    base_ph = 8.0
    base_temp = 28.0
    base_do = 6.0
    base_salinity = 20.0
    
    # Add random variation (some samples will be out of range for realism)
    ph = round(base_ph + random.uniform(-0.8, 0.8), 2)
    temperature = round(base_temp + random.uniform(-3, 3), 2)
    dissolved_oxygen = round(base_do + random.uniform(-2, 2), 2)
    salinity = round(base_salinity + random.uniform(-5, 5), 2)
    ammonia = round(random.uniform(0, 0.5), 2)
    nitrite = round(random.uniform(0, 0.1), 2)
    nitrate = round(random.uniform(0, 10), 2)
    turbidity = round(random.uniform(0, 5), 2)
    
    # Determine status and alerts
    status = determine_status(ph, temperature, dissolved_oxygen, salinity, ammonia)
    alerts = generate_alerts(ph, temperature, dissolved_oxygen, salinity, ammonia)
    
    return {
        "pond_id": pond_id,
        "timestamp": timestamp,
        "ph": ph,
        "temperature": temperature,
        "dissolved_oxygen": dissolved_oxygen,
        "salinity": salinity,
        "ammonia": ammonia,
        "nitrite": nitrite,
        "nitrate": nitrate,
        "turbidity": turbidity,
        "status": status,
        "alerts": alerts,
        "created_at": datetime.utcnow()
    }


def generate_samples(num_samples: int = 300, num_ponds: int = 4) -> List[Dict[str, Any]]:
    """Generate multiple water quality samples"""
    samples = []
    start_time = datetime.utcnow() - timedelta(days=30)  # Start 30 days ago
    
    for i in range(num_samples):
        # Distribute samples over time (every few hours)
        hours_offset = i * (24 * 30 / num_samples)  # Spread over 30 days
        timestamp = start_time + timedelta(hours=hours_offset)
        
        # Randomly assign to different ponds
        pond_id = random.randint(1, num_ponds)
        
        document = generate_water_quality_document(pond_id, timestamp)
        samples.append(document)
    
    return samples


def insert_to_mongodb(samples: List[Dict[str, Any]], collection_name: str = "water_quality_readings"):
    """Insert samples into MongoDB"""
    try:
        client = get_mongo_client()
        db = get_database(client)
        collection = db[collection_name]
        
        # Insert all documents
        result = collection.insert_many(samples)
        print(f"✓ Successfully inserted {len(result.inserted_ids)} documents into '{collection_name}'")
        
        # Create indexes for efficient queries
        collection.create_index([("timestamp", -1), ("pond_id", 1)])
        collection.create_index([("pond_id", 1), ("timestamp", -1)])
        collection.create_index("status")
        print("✓ Created indexes on timestamp, pond_id, and status")
        
        # Verify insertion
        count = collection.count_documents({})
        print(f"✓ Total documents in collection: {count}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"✗ Error inserting data: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main function to generate and insert samples"""
    print("=" * 60)
    print("MongoDB Atlas Sample Data Generator")
    print("=" * 60)
    print(f"Database: {MONGO_DB_NAME}")
    print()
    
    print("Generating 300 water quality samples...")
    samples = generate_samples(num_samples=300, num_ponds=4)
    
    print(f"Generated {len(samples)} samples")
    print()
    print("Sample distribution by pond:")
    pond_counts = {}
    for sample in samples:
        pond_id = sample["pond_id"]
        pond_counts[pond_id] = pond_counts.get(pond_id, 0) + 1
    for pond_id, count in sorted(pond_counts.items()):
        print(f"  Pond {pond_id}: {count} samples")
    
    print()
    print("Sample distribution by status:")
    status_counts = {}
    for sample in samples:
        status = sample["status"]
        status_counts[status] = status_counts.get(status, 0) + 1
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count} samples")
    
    print()
    print("=" * 60)
    print("Inserting into MongoDB Atlas...")
    print("=" * 60)
    
    success = insert_to_mongodb(samples)
    
    if success:
        print()
        print("✓ Data generation and insertion completed successfully!")
        print()
        print("Sample document structure:")
        import json
        from bson import ObjectId
        
        # Create a JSON encoder that handles ObjectId and datetime
        class JSONEncoder(json.JSONEncoder):
            def default(self, obj):
                if isinstance(obj, ObjectId):
                    return str(obj)
                if isinstance(obj, datetime):
                    return obj.isoformat()
                return super().default(obj)
        
        sample_doc = samples[0].copy()
        # Remove _id if it exists (shouldn't be in original samples, but just in case)
        sample_doc.pop("_id", None)
        sample_doc["timestamp"] = sample_doc["timestamp"].isoformat()
        sample_doc["created_at"] = sample_doc["created_at"].isoformat()
        print(json.dumps(sample_doc, indent=2, cls=JSONEncoder))
    else:
        print()
        print("✗ Failed to insert data. Please check:")
        print("  1. MongoDB Atlas connection string in .env file")
        print("  2. Network Access whitelist in Atlas")
        print("  3. Database user credentials")


if __name__ == "__main__":
    main()

