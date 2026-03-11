from datetime import datetime
from typing import Dict
from app.utils.feed_calculator import calculate_daily_feed
from app.database.mongo import db

async def update_batch_daily(batch: Dict) -> Dict:
    """
    Update batch with daysPassed, currentShrimpAge, and daily feedAmount
    Calculates days passed dynamically based on startDate or reactivatedDate
    """
    # Determine reference date
    ref_date = batch.get("reactivatedDate") or batch.get("startDate")
    if not ref_date:
        # If batch hasn't started, no update
        return batch

    # Ensure ref_date is a datetime object
    # MongoDB stores datetime objects, but handle edge cases
    if not isinstance(ref_date, datetime):
        # If it's a string, try to parse it
        if isinstance(ref_date, str):
            try:
                from dateutil import parser
                ref_date = parser.parse(ref_date)
            except (ValueError, ImportError):
                # If parsing fails, return batch unchanged
                return batch
        else:
            # Unknown type, return batch unchanged
            return batch

    # Calculate days passed since start or reactivation
    previous_days = batch.get("daysPassedBeforeReactivation", 0)
    try:
        delta_days = (datetime.utcnow() - ref_date).days
        # Ensure delta_days is not negative (in case of timezone issues)
        delta_days = max(0, delta_days)
    except (TypeError, ValueError):
        # If calculation fails, return batch unchanged
        return batch
    
    batch["daysPassed"] = previous_days + delta_days

    # Update current shrimp age
    batch["currentShrimpAge"] = batch.get("shrimpAge", 0) + batch["daysPassed"]

    # Calculate daily feed and feeding frequency (times per day)
    feed_info = calculate_daily_feed(batch)
    batch["feedAmount"] = feed_info["dailyFeedKg"]
    batch["feedTimesPerDay"] = feed_info["feedTimesPerDay"]

    # Update in MongoDB
    await db.farmerinputs.update_one(
        {"_id": batch["_id"]},
        {"$set": {
            "daysPassed": batch["daysPassed"],
            "currentShrimpAge": batch["currentShrimpAge"],
            "feedAmount": batch["feedAmount"],
            "feedTimesPerDay": batch["feedTimesPerDay"]
        }}
    )

    return batch
