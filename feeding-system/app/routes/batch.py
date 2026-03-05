# app/routes/batch.py
from fastapi import APIRouter, HTTPException
from app.schemas.batch_schema import BatchCreate, BatchResponse
from app.database.mongo import db
from bson import ObjectId
from datetime import datetime
from app.utils.batch_utils import update_batch_daily

router = APIRouter(prefix="/batch", tags=["Batch"])

# ==================== CREATE BATCH ====================
@router.post("/", response_model=BatchResponse)
async def create_batch(batch: BatchCreate):
    """Create a new batch in draft status"""
    batch_dict = batch.dict()
    batch_dict.update({
        "daysPassed": 0,
        "currentShrimpAge": batch_dict["shrimpAge"],
        "status": "draft",
        "feedAmount": 0,
        "createdAt": datetime.utcnow(),
        "startDate": None,
        "completedDate": None,
        "archivedDate": None,
        "reactivatedDate": None,
        "updatedAt": None,
        "daysPassedBeforeReactivation": 0  # New field to track past days
    })
    result = await db.farmerinputs.insert_one(batch_dict)
    batch_dict["id"] = str(result.inserted_id)
    return batch_dict

# ==================== GET ALL BATCHES ====================
@router.get("/", response_model=list[BatchResponse])
async def get_all_batches(status: str = None):
    """Get all batches, optionally filtered by status"""
    query = {"status": status} if status else {}
    
    batches = []
    cursor = db.farmerinputs.find(query)
    async for batch in cursor:
        batch["id"] = str(batch["_id"])
        if batch.get("status") == "active":
            batch = await update_batch_daily(batch)
        # Ensure lastFeedDate is serialized as ISO string with UTC timezone indicator
        if batch.get("lastFeedDate"):
            if isinstance(batch["lastFeedDate"], datetime):
                # Append 'Z' to indicate UTC timezone for proper frontend parsing
                iso_str = batch["lastFeedDate"].isoformat()
                if not iso_str.endswith('Z') and '+' not in iso_str and '-' not in iso_str[-6:]:
                    iso_str += 'Z'
                batch["lastFeedDate"] = iso_str
            # If it's already a string, ensure it has timezone indicator
            elif isinstance(batch["lastFeedDate"], str):
                if not batch["lastFeedDate"].endswith('Z') and '+' not in batch["lastFeedDate"] and '-' not in batch["lastFeedDate"][-6:]:
                    batch["lastFeedDate"] = batch["lastFeedDate"] + 'Z'
        batches.append(batch)
    return batches

# ==================== GET SINGLE BATCH ====================
@router.get("/{batch_id}", response_model=BatchResponse)
async def get_batch(batch_id: str):
    """Get a single batch by ID"""
    if not ObjectId.is_valid(batch_id):
        raise HTTPException(status_code=400, detail="Invalid batch ID")
    
    batch = await db.farmerinputs.find_one({"_id": ObjectId(batch_id)})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    batch["id"] = str(batch["_id"])
    if batch.get("status") == "active":
        batch = await update_batch_daily(batch)
    # Ensure lastFeedDate is serialized as ISO string with UTC timezone indicator
    if batch.get("lastFeedDate"):
        if isinstance(batch["lastFeedDate"], datetime):
            # Append 'Z' to indicate UTC timezone for proper frontend parsing
            iso_str = batch["lastFeedDate"].isoformat()
            if not iso_str.endswith('Z') and '+' not in iso_str and '-' not in iso_str[-6:]:
                iso_str += 'Z'
            batch["lastFeedDate"] = iso_str
        elif isinstance(batch["lastFeedDate"], str):
            # If it's already a string, ensure it has timezone indicator
            if not batch["lastFeedDate"].endswith('Z') and '+' not in batch["lastFeedDate"] and '-' not in batch["lastFeedDate"][-6:]:
                batch["lastFeedDate"] = batch["lastFeedDate"] + 'Z'
    return batch

# ==================== UPDATE BATCH ====================
# ==================== UPDATE BATCH ====================
@router.put("/{batch_id}", response_model=BatchResponse)
async def update_batch(batch_id: str, batch: BatchCreate):
    """Update batch details (only for draft batches)"""
    if not ObjectId.is_valid(batch_id):
        raise HTTPException(status_code=400, detail="Invalid batch ID")

    existing = await db.farmerinputs.find_one({"_id": ObjectId(batch_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if existing.get("status") != "draft":
        raise HTTPException(
            status_code=403, 
            detail="Cannot edit batch after it is started. Only draft batches can be edited."
        )

    update_data = batch.dict()
    # Also update currentShrimpAge to match shrimpAge
    update_data["currentShrimpAge"] = update_data.get("shrimpAge", existing.get("currentShrimpAge"))
    update_data["updatedAt"] = datetime.utcnow()
    
    await db.farmerinputs.update_one(
        {"_id": ObjectId(batch_id)}, 
        {"$set": update_data}
    )
    
    updated_batch = await db.farmerinputs.find_one({"_id": ObjectId(batch_id)})
    updated_batch["id"] = str(updated_batch["_id"])
    return updated_batch

# ==================== START BATCH ====================
@router.post("/start/{batch_id}", response_model=BatchResponse)
async def start_batch(batch_id: str):
    """Change batch status from draft to active"""
    if not ObjectId.is_valid(batch_id):
        raise HTTPException(status_code=400, detail="Invalid batch ID")

    batch = await db.farmerinputs.find_one({"_id": ObjectId(batch_id)})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.get("status") != "draft":
        raise HTTPException(status_code=403, detail="Batch is already started or completed")

    update_data = {
        "status": "active",
        "startDate": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    await db.farmerinputs.update_one({"_id": ObjectId(batch_id)}, {"$set": update_data})
    batch.update(update_data)
    batch["id"] = str(batch["_id"])
    return batch

# ==================== COMPLETE BATCH ====================
@router.post("/complete/{batch_id}", response_model=BatchResponse)
async def complete_batch(batch_id: str):
    """Mark an active batch as completed"""
    if not ObjectId.is_valid(batch_id):
        raise HTTPException(status_code=400, detail="Invalid batch ID")

    batch = await db.farmerinputs.find_one({"_id": ObjectId(batch_id)})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.get("status") != "active":
        raise HTTPException(status_code=403, detail="Only active batches can be marked as completed")

    update_data = {
        "status": "completed",
        "completedDate": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    await db.farmerinputs.update_one({"_id": ObjectId(batch_id)}, {"$set": update_data})
    batch.update(update_data)
    batch["id"] = str(batch["_id"])
    return batch

# ==================== ARCHIVE BATCH ====================
@router.post("/archive/{batch_id}", response_model=BatchResponse)
async def archive_batch(batch_id: str):
    """Archive a completed batch"""
    if not ObjectId.is_valid(batch_id):
        raise HTTPException(status_code=400, detail="Invalid batch ID")

    batch = await db.farmerinputs.find_one({"_id": ObjectId(batch_id)})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.get("status") != "completed":
        raise HTTPException(status_code=403, detail="Only completed batches can be archived")

    update_data = {
        "status": "archived",
        "archivedDate": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    await db.farmerinputs.update_one({"_id": ObjectId(batch_id)}, {"$set": update_data})
    batch.update(update_data)
    batch["id"] = str(batch["_id"])
    return batch

# ==================== DELETE BATCH ====================
@router.delete("/{batch_id}")
async def delete_batch(batch_id: str):
    """Delete a draft batch"""
    if not ObjectId.is_valid(batch_id):
        raise HTTPException(status_code=400, detail="Invalid batch ID")

    batch = await db.farmerinputs.find_one({"_id": ObjectId(batch_id)})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.get("status") != "draft":
        raise HTTPException(status_code=403, detail="Only draft batches can be deleted")

    result = await db.farmerinputs.delete_one({"_id": ObjectId(batch_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Failed to delete batch")
    
    return {"message": "Batch deleted successfully", "batch_id": batch_id, "deleted": True}

# ==================== REACTIVATE BATCH ====================
@router.post("/reactivate/{batch_id}", response_model=BatchResponse)
async def reactivate_batch(batch_id: str):
    """Reactivate a completed or archived batch back to active"""
    if not ObjectId.is_valid(batch_id):
        raise HTTPException(status_code=400, detail="Invalid batch ID")
    
    batch = await db.farmerinputs.find_one({"_id": ObjectId(batch_id)})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.get("status") not in ["completed", "archived"]:
        raise HTTPException(status_code=403, detail="Only completed or archived batches can be reactivated")

    # Save previous daysPassed before reactivation
    previous_days = batch.get("daysPassed", 0)

    update_data = {
        "status": "active",
        "reactivatedDate": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
        "daysPassedBeforeReactivation": previous_days
    }
    
    await db.farmerinputs.update_one({"_id": ObjectId(batch_id)}, {"$set": update_data})
    batch.update(update_data)
    batch["id"] = str(batch["_id"])
    return batch
