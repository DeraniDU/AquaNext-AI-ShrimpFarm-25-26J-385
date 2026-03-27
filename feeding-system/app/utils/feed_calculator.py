from typing import Dict

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
    # Validate inputs
    pl_stocked = max(0, batch.get("plStocked", 0))
    survival_rate = max(0.0, min(1.0, batch.get("survivalRate", 1.0)))  # Clamp between 0 and 1
    shrimp_age = max(0, batch.get("shrimpAge", 0))
    days_passed = max(0, batch.get("daysPassed", 0))
    
    age = shrimp_age + days_passed
    avg_weight = get_avg_weight(age)
    feed_percent, feed_times = get_feed_rule(age)
    biomass_kg = calculate_biomass(pl_stocked, survival_rate, avg_weight)
    daily_feed_kg = max(0.0, round(biomass_kg * feed_percent, 2))  # Ensure non-negative

    return {
        "age": age,
        "averageWeight_g": avg_weight,
        "biomassKg": biomass_kg,
        "dailyFeedKg": daily_feed_kg,
        "feedTimesPerDay": feed_times
    }
