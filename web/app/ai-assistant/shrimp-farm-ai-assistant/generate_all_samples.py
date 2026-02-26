"""
Generate 300 samples each for feed, energy, and labor data and insert them into MongoDB Atlas.
"""

import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
from config import FARM_CONFIG, MONGO_DB_NAME
from database.mongodb import get_mongo_client, get_database

# Feed types based on shrimp weight
FEED_TYPES = {
    "starter": "Starter Feed (40% protein)",
    "grower": "Grower Feed (35% protein)",
    "developer": "Developer Feed (32% protein)",
    "finisher": "Finisher Feed (30% protein)"
}

# Common tasks for labor data
BASE_TASKS = [
    "Water quality testing",
    "Feed distribution",
    "Equipment maintenance",
    "Pond cleaning",
    "Shrimp health monitoring",
    "Data recording",
    "Water exchange"
]

URGENT_TASKS = [
    "Emergency aeration check",
    "Water exchange",
    "Equipment inspection",
    "Emergency feed adjustment"
]


def generate_feed_document(pond_id: int, timestamp: datetime) -> Dict[str, Any]:
    """Generate a single feed data document"""
    # Simulate shrimp population and weight
    shrimp_count = random.randint(8000, 12000)
    average_weight = random.uniform(8, 15)  # grams
    
    # Calculate biomass
    biomass = shrimp_count * average_weight / 1000  # kg
    
    # Base feed amount (3-5% of biomass per day)
    base_feed_rate = random.uniform(0.03, 0.05)
    daily_feed = biomass * base_feed_rate * 1000  # grams
    
    # Determine feeding frequency based on temperature (simulated)
    temp = random.uniform(26, 30)
    if temp > 28:
        feeding_frequency = 4  # More frequent in warm water
    elif temp < 26:
        feeding_frequency = 2  # Less frequent in cool water
    else:
        feeding_frequency = 3  # Standard frequency
    
    # Calculate per-feeding amount
    feed_per_serving = daily_feed / feeding_frequency
    
    # Select feed type based on weight
    if average_weight < 5:
        feed_type = FEED_TYPES["starter"]
    elif average_weight < 10:
        feed_type = FEED_TYPES["grower"]
    elif average_weight < 15:
        feed_type = FEED_TYPES["developer"]
    else:
        feed_type = FEED_TYPES["finisher"]
    
    # Predict next feeding (in 6-8 hours)
    next_feeding = timestamp + timedelta(hours=random.uniform(6, 8))
    
    return {
        "pond_id": pond_id,
        "timestamp": timestamp,
        "shrimp_count": shrimp_count,
        "average_weight": round(average_weight, 2),
        "feed_amount": round(feed_per_serving, 2),
        "feed_type": feed_type,
        "feeding_frequency": feeding_frequency,
        "predicted_next_feeding": next_feeding,
        "created_at": datetime.utcnow()
    }


def generate_energy_document(pond_id: int, timestamp: datetime) -> Dict[str, Any]:
    """Generate a single energy data document"""
    # Simulate water quality conditions for energy calculation
    dissolved_oxygen = random.uniform(4, 8)
    temperature = random.uniform(26, 30)
    ammonia = random.uniform(0, 0.5)
    turbidity = random.uniform(0, 5)
    
    # Base energy consumption (varies by pond size and equipment)
    base_aerator = random.uniform(15, 25)  # kWh per day
    base_pump = random.uniform(8, 15)      # kWh per day
    base_heater = random.uniform(0, 20)    # kWh per day (seasonal)
    
    # Adjust aerator based on dissolved oxygen
    if dissolved_oxygen < 4:
        aerator_multiplier = 1.5
    elif dissolved_oxygen < 5:
        aerator_multiplier = 1.2
    elif dissolved_oxygen > 7:
        aerator_multiplier = 0.8
    else:
        aerator_multiplier = 1.0
    
    aerator_usage = base_aerator * aerator_multiplier
    
    # Adjust pump based on water quality
    pump_multiplier = 1.0
    if ammonia > 0.2:
        pump_multiplier += 0.3
    if turbidity > 3:
        pump_multiplier += 0.1
    pump_multiplier = min(1.5, pump_multiplier)
    pump_usage = base_pump * pump_multiplier
    
    # Adjust heater based on temperature
    if temperature < 26:
        heater_multiplier = 1.5
    elif temperature < 27:
        heater_multiplier = 1.2
    elif temperature > 30:
        heater_multiplier = 0.0
    else:
        heater_multiplier = 0.5
    heater_usage = base_heater * heater_multiplier
    
    total_energy = aerator_usage + pump_usage + heater_usage
    
    # Calculate cost (assuming $0.12/kWh average)
    cost_per_kwh = 0.12
    cost = total_energy * cost_per_kwh
    
    # Calculate efficiency score (0.7 to 1.0)
    # Better efficiency when energy usage is appropriate for conditions
    base_efficiency = 0.85
    if dissolved_oxygen < 5 and aerator_usage > 20:
        base_efficiency += 0.05  # Good response to low oxygen
    if temperature < 26 and heater_usage > 15:
        base_efficiency += 0.05  # Good response to low temp
    if ammonia > 0.2 and pump_usage > 12:
        base_efficiency += 0.05  # Good response to poor water quality
    
    efficiency_score = min(1.0, round(base_efficiency + random.uniform(-0.1, 0.1), 2))
    
    return {
        "pond_id": pond_id,
        "timestamp": timestamp,
        "aerator_usage": round(aerator_usage, 2),
        "pump_usage": round(pump_usage, 2),
        "heater_usage": round(heater_usage, 2),
        "total_energy": round(total_energy, 2),
        "cost": round(cost, 2),
        "efficiency_score": efficiency_score,
        "created_at": datetime.utcnow()
    }


def generate_labor_document(pond_id: int, timestamp: datetime) -> Dict[str, Any]:
    """Generate a single labor data document"""
    # Simulate conditions that affect labor
    dissolved_oxygen = random.uniform(4, 8)
    ammonia = random.uniform(0, 0.5)
    energy_efficiency = random.uniform(0.7, 1.0)
    
    # Determine status based on conditions
    status = "good"
    if dissolved_oxygen < 5 or ammonia > 0.2:
        status = "fair"
    if dissolved_oxygen < 4 or ammonia > 0.3:
        status = "poor"
    
    # Select completed tasks
    completed_tasks = random.sample(BASE_TASKS, random.randint(2, 5))
    
    # Add urgent tasks based on conditions
    urgent_tasks = []
    if dissolved_oxygen < 5:
        urgent_tasks.append("Emergency aeration check")
    if ammonia > 0.2:
        urgent_tasks.append("Water exchange")
    if energy_efficiency < 0.7:
        urgent_tasks.append("Equipment inspection")
    
    if urgent_tasks:
        completed_tasks.extend(random.sample(urgent_tasks, min(2, len(urgent_tasks))))
    
    # Calculate time spent
    base_time = len(completed_tasks) * 0.5  # 30 minutes per task
    urgency_multiplier = 1.0
    
    if urgent_tasks:
        urgency_multiplier += 0.3
    if status in ["poor", "critical"]:
        urgency_multiplier += 0.2
    
    time_spent = round(base_time * urgency_multiplier, 2)
    
    # Determine worker count
    worker_count = 1
    if len(urgent_tasks) > 1:
        worker_count = 2
    if status == "poor" or status == "critical":
        worker_count = random.randint(2, 3)
    
    # Calculate efficiency score
    base_score = 0.8
    if len(completed_tasks) >= 4:
        base_score += 0.1
    elif len(completed_tasks) < 2:
        base_score -= 0.1
    
    # Time efficiency
    expected_time = len(completed_tasks) * 0.5
    if time_spent <= expected_time * 1.1:
        base_score += 0.05
    elif time_spent > expected_time * 1.5:
        base_score -= 0.1
    
    efficiency_score = max(0.7, min(1.0, round(base_score + random.uniform(-0.05, 0.05), 2)))
    
    # Generate next tasks
    remaining_tasks = [t for t in BASE_TASKS if t not in completed_tasks]
    next_tasks = random.sample(remaining_tasks, min(3, len(remaining_tasks)))
    if urgent_tasks:
        next_tasks.extend([t for t in urgent_tasks if t not in completed_tasks])
    
    return {
        "pond_id": pond_id,
        "timestamp": timestamp,
        "tasks_completed": completed_tasks,
        "time_spent": time_spent,
        "worker_count": worker_count,
        "efficiency_score": efficiency_score,
        "next_tasks": next_tasks[:5],  # Limit to 5 next tasks
        "created_at": datetime.utcnow()
    }


def generate_samples(num_samples: int = 300, num_ponds: int = 4) -> tuple:
    """Generate multiple samples for feed, energy, and labor"""
    feed_samples = []
    energy_samples = []
    labor_samples = []
    
    start_time = datetime.utcnow() - timedelta(days=30)  # Start 30 days ago
    
    for i in range(num_samples):
        # Distribute samples over time
        hours_offset = i * (24 * 30 / num_samples)  # Spread over 30 days
        timestamp = start_time + timedelta(hours=hours_offset)
        
        # Randomly assign to different ponds
        pond_id = random.randint(1, num_ponds)
        
        # Generate documents
        feed_doc = generate_feed_document(pond_id, timestamp)
        energy_doc = generate_energy_document(pond_id, timestamp)
        labor_doc = generate_labor_document(pond_id, timestamp)
        
        feed_samples.append(feed_doc)
        energy_samples.append(energy_doc)
        labor_samples.append(labor_doc)
    
    return feed_samples, energy_samples, labor_samples


def insert_to_mongodb(feed_samples: List[Dict], energy_samples: List[Dict], 
                      labor_samples: List[Dict]):
    """Insert samples into MongoDB"""
    try:
        client = get_mongo_client()
        db = get_database(client)
        
        # Insert feed data
        feed_collection = db["feed_readings"]
        feed_result = feed_collection.insert_many(feed_samples)
        print(f"✓ Successfully inserted {len(feed_result.inserted_ids)} feed documents")
        feed_collection.create_index([("timestamp", -1), ("pond_id", 1)])
        feed_collection.create_index([("pond_id", 1), ("timestamp", -1)])
        
        # Insert energy data
        energy_collection = db["energy_readings"]
        energy_result = energy_collection.insert_many(energy_samples)
        print(f"✓ Successfully inserted {len(energy_result.inserted_ids)} energy documents")
        energy_collection.create_index([("timestamp", -1), ("pond_id", 1)])
        energy_collection.create_index([("pond_id", 1), ("timestamp", -1)])
        energy_collection.create_index("efficiency_score")
        
        # Insert labor data
        labor_collection = db["labor_readings"]
        labor_result = labor_collection.insert_many(labor_samples)
        print(f"✓ Successfully inserted {len(labor_result.inserted_ids)} labor documents")
        labor_collection.create_index([("timestamp", -1), ("pond_id", 1)])
        labor_collection.create_index([("pond_id", 1), ("timestamp", -1)])
        labor_collection.create_index("efficiency_score")
        
        # Verify insertions
        print()
        print("Collection counts:")
        print(f"  feed_readings: {feed_collection.count_documents({}):,} documents")
        print(f"  energy_readings: {energy_collection.count_documents({}):,} documents")
        print(f"  labor_readings: {labor_collection.count_documents({}):,} documents")
        
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
    print("MongoDB Atlas Sample Data Generator - Feed, Energy, Labor")
    print("=" * 60)
    print(f"Database: {MONGO_DB_NAME}")
    print()
    
    print("Generating 300 samples each for feed, energy, and labor...")
    feed_samples, energy_samples, labor_samples = generate_samples(num_samples=300, num_ponds=4)
    
    print(f"Generated {len(feed_samples)} feed samples")
    print(f"Generated {len(energy_samples)} energy samples")
    print(f"Generated {len(labor_samples)} labor samples")
    print()
    
    # Show distribution
    print("Sample distribution by pond:")
    for data_type, samples in [("Feed", feed_samples), ("Energy", energy_samples), ("Labor", labor_samples)]:
        pond_counts = {}
        for sample in samples:
            pond_id = sample["pond_id"]
            pond_counts[pond_id] = pond_counts.get(pond_id, 0) + 1
        print(f"  {data_type}:")
        for pond_id, count in sorted(pond_counts.items()):
            print(f"    Pond {pond_id}: {count} samples")
    print()
    
    print("=" * 60)
    print("Inserting into MongoDB Atlas...")
    print("=" * 60)
    
    success = insert_to_mongodb(feed_samples, energy_samples, labor_samples)
    
    if success:
        print()
        print("✓ Data generation and insertion completed successfully!")
        print()
        print("Sample document structures:")
        print()
        
        import json
        from bson import ObjectId
        
        class JSONEncoder(json.JSONEncoder):
            def default(self, obj):
                if isinstance(obj, ObjectId):
                    return str(obj)
                if isinstance(obj, datetime):
                    return obj.isoformat()
                return super().default(obj)
        
        # Show sample feed document
        feed_sample = feed_samples[0].copy()
        feed_sample.pop("_id", None)
        feed_sample["timestamp"] = feed_sample["timestamp"].isoformat()
        feed_sample["predicted_next_feeding"] = feed_sample["predicted_next_feeding"].isoformat()
        feed_sample["created_at"] = feed_sample["created_at"].isoformat()
        print("Feed Sample:")
        print(json.dumps(feed_sample, indent=2, cls=JSONEncoder))
        print()
        
        # Show sample energy document
        energy_sample = energy_samples[0].copy()
        energy_sample.pop("_id", None)
        energy_sample["timestamp"] = energy_sample["timestamp"].isoformat()
        energy_sample["created_at"] = energy_sample["created_at"].isoformat()
        print("Energy Sample:")
        print(json.dumps(energy_sample, indent=2, cls=JSONEncoder))
        print()
        
        # Show sample labor document
        labor_sample = labor_samples[0].copy()
        labor_sample.pop("_id", None)
        labor_sample["timestamp"] = labor_sample["timestamp"].isoformat()
        labor_sample["created_at"] = labor_sample["created_at"].isoformat()
        print("Labor Sample:")
        print(json.dumps(labor_sample, indent=2, cls=JSONEncoder))
    else:
        print()
        print("✗ Failed to insert data. Please check:")
        print("  1. MongoDB Atlas connection string in .env file")
        print("  2. Network Access whitelist in Atlas")
        print("  3. Database user credentials")


if __name__ == "__main__":
    main()








