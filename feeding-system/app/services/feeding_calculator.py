# app/utils/feed_calculator.py
from typing import Dict
from datetime import datetime
from uuid import uuid4
from app.database.mongo import db

def get_avg_weight(age: int) -> float:
    """
    Returns average shrimp weight (g) based on age (days)
    """
    if age <= 15:
        return 1
    elif age <= 30:
        return 5
    elif age <= 60:
        return 12
    elif age <= 90:
        return 20
    else:
        return 25

def get_feed_rule(age: int):
    """
    Returns feed percent and feeding frequency per day based on age
    """
    if age <= 15:
        return 0.10, 5
    elif age <= 30:
        return 0.06, 4
    elif age <= 60:
        return 0.04, 4
    elif age <= 90:
        return 0.03, 3
    else:
        return 0.02, 3

def calculate_biomass(pl_stocked: int, survival_rate: float, avg_weight: float) -> float:
    """
    Calculates biomass in kg
    """
    live_shrimp = pl_stocked * survival_rate
    biomass_kg = (live_shrimp * avg_weight) / 1000
    return round(biomass_kg, 2)

def calculate_daily_feed(batch: Dict) -> Dict:
    """
    Standardized daily feed calculation based on batch info
    batch = {
        'plStocked': int,
        'survivalRate': float,
        'shrimpAge': int,
        'daysPassed': int
    }
    """
    age = batch.get("shrimpAge", 0) + batch.get("daysPassed", 0)
    avg_weight = get_avg_weight(age)
    feed_percent, feed_times = get_feed_rule(age)
    biomass_kg = calculate_biomass(batch["plStocked"], batch["survivalRate"], avg_weight)
    daily_feed_kg = round(biomass_kg * feed_percent, 2)

    return {
        "age": age,
        "averageWeight_g": avg_weight,
        "biomassKg": biomass_kg,
        "dailyFeedKg": daily_feed_kg,
        "feedTimesPerDay": feed_times
    }

async def update_batch_daily(batch: Dict) -> Dict:
    """
    Update batch with daysPassed, currentShrimpAge, and daily feedAmount
    """
    # Increment daysPassed
    batch["daysPassed"] = batch.get("daysPassed", 0) + 1

    # Calculate current shrimp age
    batch["currentShrimpAge"] = batch.get("shrimpAge", 0) + batch["daysPassed"]

    # Calculate feed amount using standardized function
    feed_info = calculate_daily_feed(batch)
    batch["feedAmount"] = feed_info["dailyFeedKg"]

    # Update MongoDB document
    await db.farmerinputs.update_one(
        {"_id": batch["_id"]},
        {"$set": {
            "daysPassed": batch["daysPassed"],
            "currentShrimpAge": batch["currentShrimpAge"],
            "feedAmount": batch["feedAmount"]
        }}
    )

    return batch
