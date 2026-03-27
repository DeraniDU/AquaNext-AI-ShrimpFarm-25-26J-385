# app/routes/feeding.py
from fastapi import APIRouter, HTTPException
from datetime import datetime, date
from bson import ObjectId
from uuid import uuid4

from app.database.mongo import db
from app.schemas.feeding_schema import FeedingCreate, FeedingResponse
from app.utils.feed_calculator import calculate_daily_feed

router = APIRouter(prefix="/feeding", tags=["Feeding"])

# POST /feeding/ → calculate and save feeding
@router.post("/", response_model=FeedingResponse)
async def calculate_and_save_feeding(data: FeedingCreate):
    if not ObjectId.is_valid(data.batchId):
        raise HTTPException(status_code=400, detail="Invalid batch ID")

    batch = await db.farmerinputs.find_one({"_id": ObjectId(data.batchId)})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Update batch with current daysPassed if active
    if batch.get("status") == "active":
        from app.utils.batch_utils import update_batch_daily
        batch = await update_batch_daily(batch)

    # Increment day for next feeding
    day = batch.get("daysPassed", 0) + 1

    # Standardized feed calculation using updated batch data
    feed_info = calculate_daily_feed(batch)

    # Create feeding document
    now = datetime.utcnow()
    biomass_kg = feed_info["biomassKg"]
    feed_rate = feed_info["dailyFeedKg"] / biomass_kg if biomass_kg > 0 else 0.0
    
    feeding_doc = {
        "batchId": data.batchId,
        "day": day,
        "biomass": biomass_kg,
        "feedRate": feed_rate,  # Safe division with zero check
        "feedAmountKg": feed_info["dailyFeedKg"],
        "date": now,  # Store datetime in MongoDB
        "id": str(uuid4())  # unique ID for API response
    }

    # Insert into MongoDB
    await db.feedingresults.insert_one(feeding_doc)

    # Update batch daysPassed
    await db.farmerinputs.update_one(
        {"_id": ObjectId(data.batchId)},
        {"$set": {"daysPassed": day}}
    )

    # Convert datetime to date for response
    response_doc = feeding_doc.copy()
    if isinstance(response_doc["date"], datetime):
        response_doc["date"] = response_doc["date"].date()
    
    return response_doc

# GET /feeding/{feeding_id} → get saved feeding
@router.get("/{feeding_id}", response_model=FeedingResponse)
async def get_feeding(feeding_id: str):
    if not ObjectId.is_valid(feeding_id):
        raise HTTPException(status_code=400, detail="Invalid feeding ID")

    feeding = await db.feedingresults.find_one({"id": feeding_id})
    if not feeding:
        raise HTTPException(status_code=404, detail="Feeding record not found")

    # Convert datetime to date for response
    if isinstance(feeding.get("date"), datetime):
        feeding["date"] = feeding["date"].date()

    return feeding

# GET /feeding/calculate/{batch_id} → calculate without saving
@router.get("/calculate/{batch_id}", response_model=FeedingResponse)
async def calculate_feeding(batch_id: str):
    if not ObjectId.is_valid(batch_id):
        raise HTTPException(status_code=400, detail="Invalid batch ID")

    batch = await db.farmerinputs.find_one({"_id": ObjectId(batch_id)})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Update batch with current daysPassed if active
    if batch.get("status") == "active":
        from app.utils.batch_utils import update_batch_daily
        batch = await update_batch_daily(batch)

    # Use updated batch data for calculation
    feed_info = calculate_daily_feed(batch)

    now = datetime.utcnow()
    biomass_kg = feed_info["biomassKg"]
    feed_rate = feed_info["dailyFeedKg"] / biomass_kg if biomass_kg > 0 else 0.0

    feeding_doc = {
        "id": str(uuid4()),
        "batchId": batch_id,
        "day": batch.get("daysPassed", 0) + 1,
        "biomass": biomass_kg,
        "feedRate": feed_rate,  # Safe division with zero check
        "feedAmountKg": feed_info["dailyFeedKg"],
        "date": now.date()  # Convert to date for response
    }

    return feeding_doc

# GET /feeding/batch/{batch_id} → get all feedings for a batch
@router.get("/batch/{batch_id}")
async def get_batch_feedings(batch_id: str):
    """Get all feeding records for a specific batch"""
    if not ObjectId.is_valid(batch_id):
        raise HTTPException(status_code=400, detail="Invalid batch ID")

    batch = await db.farmerinputs.find_one({"_id": ObjectId(batch_id)})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    feedings = []
    cursor = db.feedingresults.find({"batchId": batch_id}).sort("date", -1)
    async for feeding in cursor:
        # Convert MongoDB document to dict and handle serialization
        feeding_dict = dict(feeding)
        
        # Convert _id to string if present
        if "_id" in feeding_dict:
            feeding_dict["_id"] = str(feeding_dict["_id"])
        
        # Ensure id field exists
        if "id" not in feeding_dict or not feeding_dict.get("id"):
            feeding_dict["id"] = str(feeding_dict.get("_id", uuid4()))
        
        # Convert datetime to ISO string for JSON serialization
        if "date" in feeding_dict and isinstance(feeding_dict["date"], datetime):
            feeding_dict["date"] = feeding_dict["date"].isoformat()
        
        feedings.append(feeding_dict)

    return {
        "status": "ok",
        "count": len(feedings),
        "feedings": feedings
    }