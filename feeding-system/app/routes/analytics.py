# app/routes/analytics.py
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from bson import ObjectId
from typing import Optional
from collections import defaultdict

from app.database.mongo import db
from app.database.feeding_event_repo import get_feeding_events
from app.utils.feed_calculator import get_avg_weight, calculate_biomass

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/system")
async def get_system_analytics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """
    Get system-wide analytics aggregating data from all active batches.
    Returns comparison data across all tanks.
    """
    # Parse date filters
    start_dt = None
    end_dt = None
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")

    # Get all active batches
    query = {"status": "active"}
    batches = []
    async for batch in db.farmerinputs.find(query):
        batches.append(batch)

    if not batches:
        return {
            "type": "system",
            "totalBatches": 0,
            "batches": [],
            "summary": {
                "totalFeedKg": 0,
                "totalBiomassKg": 0,
                "averageABW": 0,
                "averageFCR": 0,
                "totalCycles": 0
            },
            "comparisonData": {
                "abwByWeek": [],
                "biomassByWeek": [],
                "fcrTrends": [],
                "feedDispersion": []
            }
        }

    # Aggregate data from all batches
    all_feedings = []
    all_abw_data = defaultdict(list)
    all_biomass_data = defaultdict(list)
    all_fcr_data = defaultdict(list)
    
    total_feed = 0
    total_biomass = 0
    total_abw_sum = 0
    total_abw_count = 0
    total_cycles = 0

    batch_summaries = []

    for batch in batches:
        batch_id = str(batch["_id"])
        batch_name = batch.get("batchName", "Unknown")
        
        # Get feedings for this batch
        feed_query = {"batchId": batch_id}
        if start_dt or end_dt:
            date_query = {}
            if start_dt:
                date_query["$gte"] = start_dt
            if end_dt:
                date_query["$lte"] = end_dt
            if date_query:
                feed_query["date"] = date_query

        batch_feedings = []
        async for feeding in db.feedingresults.find(feed_query).sort("day", 1):
            batch_feedings.append(feeding)
            all_feedings.append({
                **feeding,
                "batchId": batch_id,
                "batchName": batch_name
            })

        # Calculate batch-specific metrics
        pl_stocked = batch.get("plStocked", 0) or 0
        survival_rate = batch.get("survivalRate", 1.0) or 1.0
        initial_age = batch.get("shrimpAge", 0) or 0

        batch_feed_total = sum(f.get("feedAmountKg", 0) or 0 for f in batch_feedings)
        batch_biomass = 0
        batch_abw_sum = 0
        batch_abw_count = 0

        for feeding in batch_feedings:
            day = feeding.get("day", 0)
            current_age = initial_age + day
            abw_g = get_avg_weight(current_age)
            biomass_kg = feeding.get("biomass", 0) or 0
            if biomass_kg == 0:
                biomass_kg = calculate_biomass(pl_stocked, survival_rate, abw_g)
            
            week_num = (day // 7) + 1
            all_abw_data[week_num].append({
                "week": week_num,
                "abw_g": abw_g,
                "batchId": batch_id,
                "batchName": batch_name
            })
            all_biomass_data[week_num].append({
                "week": week_num,
                "biomass_kg": biomass_kg,
                "batchId": batch_id,
                "batchName": batch_name
            })

            batch_biomass = max(batch_biomass, biomass_kg)
            batch_abw_sum += abw_g
            batch_abw_count += 1

        total_feed += batch_feed_total
        total_biomass += batch_biomass
        total_abw_sum += batch_abw_sum
        total_abw_count += batch_abw_count
        total_cycles += len(batch_feedings)

        batch_summaries.append({
            "batchId": batch_id,
            "batchName": batch_name,
            "totalFeedKg": round(batch_feed_total, 2),
            "totalBiomassKg": round(batch_biomass, 2),
            "averageABW": round(batch_abw_sum / batch_abw_count, 2) if batch_abw_count > 0 else 0,
            "totalCycles": len(batch_feedings)
        })

    # Aggregate by week for comparison charts
    abw_by_week = []
    biomass_by_week = []
    
    for week_num in sorted(set(list(all_abw_data.keys()) + list(all_biomass_data.keys()))):
        week_abw = all_abw_data.get(week_num, [])
        week_biomass = all_biomass_data.get(week_num, [])
        
        if week_abw:
            avg_abw = sum(w["abw_g"] for w in week_abw) / len(week_abw)
            abw_by_week.append({
                "week": week_num,
                "week_label": f"Week {week_num}",
                "abw_g": round(avg_abw, 2)
            })
        
        if week_biomass:
            total_biomass_week = sum(w["biomass_kg"] for w in week_biomass)
            biomass_by_week.append({
                "week": week_num,
                "week_label": f"Week {week_num}",
                "biomass_kg": round(total_biomass_week, 2)
            })

    # Calculate system-wide FCR: feed-to-biomass ratio (total feed kg / total biomass kg) as proxy
    # True FCR = feed / weight gain; here we use total_feed / total_biomass when biomass > 0
    average_fcr = round(total_feed / total_biomass, 3) if total_biomass > 0 else 1.0

    system_fcr = []
    if len(batch_summaries) > 0:
        for week_num in sorted(set(w["week"] for w in abw_by_week)):
            system_fcr.append({
                "week": week_num,
                "week_label": f"Week {week_num}",
                "fcr": average_fcr
            })

    system_result = {
        "type": "system",
        "totalBatches": len(batches),
        "batches": batch_summaries,
        "summary": {
            "totalFeedKg": round(total_feed, 2),
            "totalBiomassKg": round(total_biomass, 2),
            "averageABW": round(total_abw_sum / total_abw_count, 2) if total_abw_count > 0 else 0,
            "averageFCR": average_fcr,
            "totalCycles": total_cycles
        },
        "comparisonData": {
            "abwByWeek": abw_by_week,
            "biomassByWeek": biomass_by_week,
            "fcrTrends": system_fcr,
            "feedDispersion": []  # Can be aggregated if needed
        },
        "feedShrimpCorrelation": [],  # Will be calculated below
        "cycleFeedData": [],  # Will be calculated below
        "feedSummary": {
            "totalDispensed": 0,
            "totalConsumed": 0,
            "totalWasted": 0,
            "wastePercentage": 0
        }
    }
    
    # ========== Calculate 24-Hour Feed/Shrimp Response Correlation for System View ==========
    # Get feeding events from last 24 hours for correlation chart
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    
    # Get all feeding events (not limited by batch, as motor events are global)
    all_events = await get_feeding_events(limit=1000)  # Get more events for 24h analysis
    
    # Filter events from last 24 hours
    recent_events = []
    for event in all_events:
        event_time = event.get("created_at")
        if isinstance(event_time, str):
            try:
                event_time = datetime.fromisoformat(event_time.replace('Z', '+00:00'))
            except:
                continue
        if isinstance(event_time, datetime) and event_time >= last_24h:
            recent_events.append(event)
    
    # Group by hour (05:00 to 03:00 next day)
    hourly_data = defaultdict(lambda: {"feed_rate": [], "shrimp_response": []})
    
    for event in recent_events:
        event_time = event.get("created_at")
        if isinstance(event_time, str):
            try:
                event_time = datetime.fromisoformat(event_time.replace('Z', '+00:00'))
            except:
                continue
        
        if isinstance(event_time, datetime):
            hour = event_time.hour
            motor_speed = event.get("motor_speed", 0.0)
            confidence = event.get("confidence", 0.0)
            
            # Feed rate = motor speed as percentage (0.0-1.0 -> 0-100%)
            feed_rate_pct = motor_speed * 100
            
            # Shrimp response = AI confidence as percentage (0.0-1.0 -> 0-100%)
            shrimp_response_pct = confidence * 100 if confidence else 0
            
            hourly_data[hour]["feed_rate"].append(feed_rate_pct)
            hourly_data[hour]["shrimp_response"].append(shrimp_response_pct)
    
    # Create 24-hour time series (05:00 to 03:00 next day)
    correlation_data = []
    hours_24h = list(range(5, 24)) + list(range(0, 4))  # 05:00 to 03:00
    
    for hour in hours_24h:
        if hour in hourly_data:
            avg_feed_rate = sum(hourly_data[hour]["feed_rate"]) / len(hourly_data[hour]["feed_rate"]) if hourly_data[hour]["feed_rate"] else 0
            avg_shrimp_response = sum(hourly_data[hour]["shrimp_response"]) / len(hourly_data[hour]["shrimp_response"]) if hourly_data[hour]["shrimp_response"] else 0
        else:
            avg_feed_rate = 0
            avg_shrimp_response = 0
        
        correlation_data.append({
            "hour": hour,
            "time_label": f"{hour:02d}:00",
            "feed_rate": round(avg_feed_rate, 2),
            "shrimp_response": round(avg_shrimp_response, 2)
        })
    
    system_result["feedShrimpCorrelation"] = correlation_data
    
    # ========== Calculate Cycle Feed Data for System View ==========
    # For system view, we should show cycles per batch, not aggregate by cycle number
    # Because different batches may be at different stages (Batch 1 on day 5, Batch 2 on day 2)
    # Instead, we'll show a sequential cycle count across all batches
    cycle_feed_data = []
    total_dispensed = 0
    total_consumed = 0
    total_wasted = 0
    
    # Collect all feedings from all batches, sorted by date
    all_feedings_list = []
    for batch in batches:
        batch_id = str(batch["_id"])
        batch_name = batch.get("batchName", "Unknown")
        feed_query = {"batchId": batch_id}
        if start_dt or end_dt:
            date_query = {}
            if start_dt:
                date_query["$gte"] = start_dt
            if end_dt:
                date_query["$lte"] = end_dt
            if date_query:
                feed_query["date"] = date_query
        
        async for feeding in db.feedingresults.find(feed_query).sort("date", 1):
            feeding_date = feeding.get("date")
            if isinstance(feeding_date, datetime):
                all_feedings_list.append({
                    "date": feeding_date,
                    "batchId": batch_id,
                    "batchName": batch_name,
                    "day": feeding.get("day", 0),
                    "feedAmountKg": feeding.get("feedAmountKg", 0) or 0,
                    "feedRate": feeding.get("feedRate", 0) or 0
                })
    
    # Sort all feedings by date across all batches
    all_feedings_list.sort(key=lambda x: x["date"])
    
    # Group by date (same date = same cycle across system)
    # This makes more sense for system view - shows feed on each date across all batches
    date_cycle_map = defaultdict(lambda: {"dispensed": 0, "consumed": 0, "wasted": 0, "batches": set()})
    
    for feeding in all_feedings_list:
        feed_date = feeding["date"]
        date_key = feed_date.date() if isinstance(feed_date, datetime) else feed_date
        
        dispensed = feeding["feedAmountKg"]
        feed_rate_pct = feeding["feedRate"]
        consumption_rate = min(0.95, max(0.70, feed_rate_pct * 100 / 100))  # 70-95% consumption
        consumed = dispensed * consumption_rate
        wasted = dispensed - consumed
        
        date_cycle_map[date_key]["dispensed"] += dispensed
        date_cycle_map[date_key]["consumed"] += consumed
        date_cycle_map[date_key]["wasted"] += wasted
        date_cycle_map[date_key]["batches"].add(feeding["batchName"])
    
    # Convert to array format with sequential cycle numbers
    cycle_num = 1
    for date_key in sorted(date_cycle_map.keys()):
        cycle_data = date_cycle_map[date_key]
        total_dispensed += cycle_data["dispensed"]
        total_consumed += cycle_data["consumed"]
        total_wasted += cycle_data["wasted"]
        
        cycle_feed_data.append({
            "cycle": cycle_num,
            "date": date_key.isoformat() if hasattr(date_key, 'isoformat') else str(date_key),
            "dispensed": round(cycle_data["dispensed"], 2),
            "consumed": round(cycle_data["consumed"], 2),
            "wasted": round(cycle_data["wasted"], 2),
            "batches_count": len(cycle_data["batches"])
        })
        cycle_num += 1
    
    system_result["cycleFeedData"] = cycle_feed_data
    system_result["feedSummary"] = {
        "totalDispensed": round(total_dispensed, 2),
        "totalConsumed": round(total_consumed, 2),
        "totalWasted": round(total_wasted, 2),
        "wastePercentage": round((total_wasted / total_dispensed * 100) if total_dispensed > 0 else 0, 2)
    }
    
    return system_result

@router.get("/batch/{batch_id}")
async def get_batch_analytics(
    batch_id: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """
    Get comprehensive analytics for a batch including:
    - Feed dispersion over time
    - ABW (Average Body Weight) growth
    - Biomass estimates
    - Total feed for period
    - Growth trends
    """
    if not ObjectId.is_valid(batch_id):
        raise HTTPException(status_code=400, detail="Invalid batch ID")

    # Get batch info
    batch = await db.farmerinputs.find_one({"_id": ObjectId(batch_id)})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Parse date filters
    start_dt = None
    end_dt = None
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            end_dt = end_dt.replace(hour=23, minute=59, second=59)  # Include full day
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")

    # Get all feeding records for this batch
    query = {"batchId": batch_id}
    if start_dt or end_dt:
        date_query = {}
        if start_dt:
            date_query["$gte"] = start_dt
        if end_dt:
            date_query["$lte"] = end_dt
        if date_query:
            query["date"] = date_query

    feedings = []
    cursor = db.feedingresults.find(query).sort("day", 1)  # Sort by day ascending
    
    async for feeding in cursor:
        feed_date = feeding.get("date")
        if isinstance(feed_date, datetime):
            feed_date_str = feed_date.isoformat()
        else:
            feed_date_str = str(feed_date)
        
        feedings.append({
            "day": feeding.get("day", 0),
            "date": feed_date_str,
            "biomass": float(feeding.get("biomass", 0) or 0),
            "feedAmountKg": float(feeding.get("feedAmountKg", 0) or 0),
            "feedRate": float(feeding.get("feedRate", 0) or 0)
        })

    # Batch parameters
    pl_stocked = batch.get("plStocked", 0) or 0
    survival_rate = batch.get("survivalRate", 1.0) or 1.0
    initial_age = batch.get("shrimpAge", 0) or 0
    start_date_batch = batch.get("startDate")
    
    # Calculate analytics
    analytics_data = {
        "batchId": batch_id,
        "batchName": batch.get("batchName", "Unknown"),
        "period": {
            "startDate": start_date or (start_date_batch.isoformat() if start_date_batch else None),
            "endDate": end_date or datetime.utcnow().isoformat(),
            "totalDays": len(feedings)
        },
        "feedDispersion": [],
        "growthMetrics": [],
        "biomassTrend": [],
        "feedShrimpCorrelation": [],  # Initialize new fields
        "cycleFeedData": [],
        "feedSummary": {
            "totalDispensed": 0,
            "totalConsumed": 0,
            "totalWasted": 0,
            "wastePercentage": 0
        },
        "abwByWeek": [],
        "biomassByWeek": [],
        "fcrTrends": [],
        "summary": {
            "totalFeedKg": 0,
            "averageDailyFeedKg": 0,
            "averageFeedRate": 0,
            "totalCycles": len(feedings)
        }
    }

    # Process feedings to create time series data
    total_feed = 0
    total_feed_rate = 0
    
    for feeding in feedings:
        day = feeding["day"]
        current_age = initial_age + day
        
        # Calculate ABW (Average Body Weight) for this day
        abw_g = get_avg_weight(current_age)
        
        # Calculate biomass for this day
        biomass_kg = feeding.get("biomass", 0)
        if biomass_kg == 0:
            # Recalculate if not stored
            biomass_kg = calculate_biomass(pl_stocked, survival_rate, abw_g)
        
        feed_amount = feeding.get("feedAmountKg", 0)
        feed_rate = feeding.get("feedRate", 0)
        
        total_feed += feed_amount
        total_feed_rate += feed_rate
        
        # Feed dispersion data (for each cycle/day)
        analytics_data["feedDispersion"].append({
            "day": day,
            "date": feeding["date"],
            "feedAmountKg": round(feed_amount, 2),
            "feedRate": round(feed_rate * 100, 2),  # Convert to percentage
            "cycle": day  # Each day is a cycle
        })
        
        # Growth metrics (ABW over time)
        # Always add growth metrics for each feeding record
        analytics_data["growthMetrics"].append({
            "day": day,
            "date": feeding["date"],
            "age": current_age,
            "abw_g": round(abw_g, 2),  # Average Body Weight in grams
            "abw_kg": round(abw_g / 1000, 4)  # Convert to kg
        })
        
        # Biomass trend
        analytics_data["biomassTrend"].append({
            "day": day,
            "date": feeding["date"],
            "biomassKg": round(biomass_kg, 2),
            "estimatedShrimpCount": int((biomass_kg * 1000) / abw_g) if abw_g > 0 else 0
        })

    # Calculate summary statistics
    if len(feedings) > 0:
        analytics_data["summary"]["totalFeedKg"] = round(total_feed, 2)
        analytics_data["summary"]["averageDailyFeedKg"] = round(total_feed / len(feedings), 2)
        analytics_data["summary"]["averageFeedRate"] = round((total_feed_rate / len(feedings)) * 100, 2)
    
    # Calculate growth rate (if we have multiple data points)
    if len(analytics_data["growthMetrics"]) >= 2:
        first_abw = analytics_data["growthMetrics"][0]["abw_g"]
        last_abw = analytics_data["growthMetrics"][-1]["abw_g"]
        days_span = analytics_data["growthMetrics"][-1]["day"] - analytics_data["growthMetrics"][0]["day"]
        
        if days_span > 0:
            growth_rate = ((last_abw - first_abw) / days_span) if first_abw > 0 else 0
            analytics_data["summary"]["averageGrowthRate_g_per_day"] = round(growth_rate, 3)
        else:
            analytics_data["summary"]["averageGrowthRate_g_per_day"] = 0
    else:
        analytics_data["summary"]["averageGrowthRate_g_per_day"] = 0

    # ========== NEW: 24-Hour Feed/Shrimp Response Correlation ==========
    # Get feeding events from last 24 hours for correlation chart
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    
    # Get all feeding events (not limited by batch, as motor events are global)
    all_events = await get_feeding_events(limit=1000)  # Get more events for 24h analysis
    
    # Filter events from last 24 hours
    recent_events = []
    for event in all_events:
        event_time = event.get("created_at")
        if isinstance(event_time, str):
            try:
                event_time = datetime.fromisoformat(event_time.replace('Z', '+00:00'))
            except:
                continue
        if isinstance(event_time, datetime) and event_time >= last_24h:
            recent_events.append(event)
    
    # Group by hour (05:00 to 03:00 next day)
    hourly_data = defaultdict(lambda: {"feed_rate": [], "shrimp_response": []})
    
    for event in recent_events:
        event_time = event.get("created_at")
        if isinstance(event_time, str):
            try:
                event_time = datetime.fromisoformat(event_time.replace('Z', '+00:00'))
            except:
                continue
        
        if isinstance(event_time, datetime):
            hour = event_time.hour
            motor_speed = event.get("motor_speed", 0.0)
            confidence = event.get("confidence", 0.0)
            
            # Feed rate = motor speed as percentage (0.0-1.0 -> 0-100%)
            feed_rate_pct = motor_speed * 100
            
            # Shrimp response = AI confidence as percentage (0.0-1.0 -> 0-100%)
            shrimp_response_pct = confidence * 100 if confidence else 0
            
            hourly_data[hour]["feed_rate"].append(feed_rate_pct)
            hourly_data[hour]["shrimp_response"].append(shrimp_response_pct)
    
    # Create 24-hour time series (05:00 to 03:00 next day)
    correlation_data = []
    hours_24h = list(range(5, 24)) + list(range(0, 4))  # 05:00 to 03:00
    
    for hour in hours_24h:
        if hour in hourly_data:
            avg_feed_rate = sum(hourly_data[hour]["feed_rate"]) / len(hourly_data[hour]["feed_rate"]) if hourly_data[hour]["feed_rate"] else 0
            avg_shrimp_response = sum(hourly_data[hour]["shrimp_response"]) / len(hourly_data[hour]["shrimp_response"]) if hourly_data[hour]["shrimp_response"] else 0
        else:
            avg_feed_rate = 0
            avg_shrimp_response = 0
        
        correlation_data.append({
            "hour": hour,
            "time_label": f"{hour:02d}:00",
            "feed_rate": round(avg_feed_rate, 2),
            "shrimp_response": round(avg_shrimp_response, 2)
        })
    
    analytics_data["feedShrimpCorrelation"] = correlation_data
    
    # ========== NEW: Cycle-Based Feed Data (Dispensed/Consumed/Wasted) ==========
    cycle_feed_data = []
    total_dispensed = 0
    total_consumed = 0
    total_wasted = 0
    
    # Group feeding events by cycle/day to estimate consumed feed
    # For each cycle, calculate consumed based on motor events
    for i, feeding in enumerate(feedings):
        cycle_num = i + 1
        dispensed = feeding.get("feedAmountKg", 0)
        
        # Estimate consumed: Use feed rate percentage from feeding record
        # Consumed = Dispensed * (actual feed rate / expected feed rate)
        # Simplified: Assume 90-95% consumption rate based on feed rate
        feed_rate_pct = feeding.get("feedRate", 0) * 100
        # Higher feed rate = higher consumption (but not 100%)
        consumption_rate = min(0.95, max(0.70, feed_rate_pct / 100))  # 70-95% consumption
        consumed = dispensed * consumption_rate
        wasted = dispensed - consumed
        
        total_dispensed += dispensed
        total_consumed += consumed
        total_wasted += wasted
        
        cycle_feed_data.append({
            "cycle": cycle_num,
            "dispensed": round(dispensed, 2),
            "consumed": round(consumed, 2),
            "wasted": round(wasted, 2)
        })
    
    analytics_data["cycleFeedData"] = cycle_feed_data
    analytics_data["feedSummary"] = {
        "totalDispensed": round(total_dispensed, 2),
        "totalConsumed": round(total_consumed, 2),
        "totalWasted": round(total_wasted, 2),
        "wastePercentage": round((total_wasted / total_dispensed * 100) if total_dispensed > 0 else 0, 2)
    }
    
    # ========== NEW: FCR (Feed Conversion Ratio) Trends ==========
    # FCR = Total Feed Consumed / Total Weight Gain
    # Calculate FCR for each week
    fcr_data = []
    
    if len(analytics_data["growthMetrics"]) > 0:
        # Group by week (assuming 7 days per week)
        weeks_data = defaultdict(lambda: {"feed_consumed": 0, "weight_gain": 0, "abw_start": None, "abw_end": None, "biomass_start": None, "biomass_end": None})
        
        for i, growth in enumerate(analytics_data["growthMetrics"]):
            week_num = (growth["day"] // 7) + 1  # Week 1, 2, 3, etc.
            
            # Get feed consumed for this day (from cycle feed data)
            if i < len(cycle_feed_data):
                weeks_data[week_num]["feed_consumed"] += cycle_feed_data[i]["consumed"]
            
            # Track ABW and biomass for weight gain calculation
            if weeks_data[week_num]["abw_start"] is None:
                weeks_data[week_num]["abw_start"] = growth["abw_g"]
                if i < len(analytics_data["biomassTrend"]):
                    weeks_data[week_num]["biomass_start"] = analytics_data["biomassTrend"][i]["biomassKg"]
            
            weeks_data[week_num]["abw_end"] = growth["abw_g"]
            if i < len(analytics_data["biomassTrend"]):
                weeks_data[week_num]["biomass_end"] = analytics_data["biomassTrend"][i]["biomassKg"]
        
        # Calculate FCR for each week
        for week_num in sorted(weeks_data.keys()):
            week_data = weeks_data[week_num]
            feed_consumed = week_data["feed_consumed"]
            
            # Weight gain = biomass_end - biomass_start (in kg)
            if week_data["biomass_start"] and week_data["biomass_end"]:
                weight_gain_kg = week_data["biomass_end"] - week_data["biomass_start"]
                
                # FCR = Feed Consumed / Weight Gain (lower is better)
                if weight_gain_kg > 0:
                    fcr = feed_consumed / weight_gain_kg
                else:
                    fcr = 0
                
                fcr_data.append({
                    "week": week_num,
                    "week_label": f"Week {week_num}",
                    "fcr": round(fcr, 2),
                    "feed_consumed": round(feed_consumed, 2),
                    "weight_gain_kg": round(weight_gain_kg, 2)
                })
        
        # If no weekly data, calculate cumulative FCR
        if not fcr_data and len(analytics_data["growthMetrics"]) >= 2:
            first_biomass = analytics_data["biomassTrend"][0]["biomassKg"] if analytics_data["biomassTrend"] else 0
            last_biomass = analytics_data["biomassTrend"][-1]["biomassKg"] if analytics_data["biomassTrend"] else 0
            weight_gain = last_biomass - first_biomass
            
            if weight_gain > 0:
                cumulative_fcr = total_consumed / weight_gain
                fcr_data.append({
                    "week": 1,
                    "week_label": "Overall",
                    "fcr": round(cumulative_fcr, 2),
                    "feed_consumed": round(total_consumed, 2),
                    "weight_gain_kg": round(weight_gain, 2)
                })
    
    analytics_data["fcrTrends"] = fcr_data
    
    # Convert weeks to week-based ABW and Biomass for tabbed interface
    # Group ABW and Biomass by week
    abw_by_week = defaultdict(list)
    biomass_by_week = defaultdict(list)
    
    for i, growth in enumerate(analytics_data["growthMetrics"]):
        week_num = (growth["day"] // 7) + 1
        abw_by_week[week_num].append({
            "week": week_num,
            "week_label": f"Week {week_num}",
            "abw_g": growth["abw_g"]
        })
        
        if i < len(analytics_data["biomassTrend"]):
            biomass_by_week[week_num].append({
                "week": week_num,
                "week_label": f"Week {week_num}",
                "biomass_kg": analytics_data["biomassTrend"][i]["biomassKg"]
            })
    
    # Average ABW and Biomass per week
    analytics_data["abwByWeek"] = []
    analytics_data["biomassByWeek"] = []
    
    for week_num in sorted(abw_by_week.keys()):
        week_abw = abw_by_week[week_num]
        avg_abw = sum(w["abw_g"] for w in week_abw) / len(week_abw) if week_abw else 0
        analytics_data["abwByWeek"].append({
            "week": week_num,
            "week_label": f"Week {week_num}",
            "abw_g": round(avg_abw, 2)
        })
    
    for week_num in sorted(biomass_by_week.keys()):
        week_biomass = biomass_by_week[week_num]
        total_biomass = sum(w["biomass_kg"] for w in week_biomass) if week_biomass else 0
        analytics_data["biomassByWeek"].append({
            "week": week_num,
            "week_label": f"Week {week_num}",
            "biomass_kg": round(total_biomass, 2)
        })

    # Debug: Log analytics data structure for troubleshooting
    if len(feedings) > 0:
        print(f"DEBUG Analytics for batch {batch_id}:")
        print(f"  - Feedings: {len(feedings)}")
        print(f"  - growthMetrics: {len(analytics_data['growthMetrics'])}")
        print(f"  - biomassTrend: {len(analytics_data['biomassTrend'])}")
        print(f"  - abwByWeek: {len(analytics_data['abwByWeek'])}")
        if len(analytics_data['growthMetrics']) > 0:
            print(f"  - Sample growthMetric: day={analytics_data['growthMetrics'][0].get('day')}, abw_g={analytics_data['growthMetrics'][0].get('abw_g')}")
    
    return analytics_data

