from datetime import datetime
from app.database.mongo import db

feeding_events_collection = db["feeding_events"]

# ---------------- SAVE EVENT ----------------
async def save_feeding_event(event: dict):
    event["created_at"] = datetime.utcnow()
    await feeding_events_collection.insert_one(event)

# ---------------- READ EVENTS ----------------
async def get_feeding_events(limit: int = 50):
    cursor = (
        feeding_events_collection
        .find({}, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
    )

    events = []
    async for doc in cursor:
        # Normalize state for consistent display
        raw_state = doc.get("state") or doc.get("to_state")
        if raw_state:
            # Keep original fields but add normalized state for display
            doc["normalized_state"] = normalize_state_for_display(raw_state)
        events.append(doc)

    # Debug: Print first event if exists
    if events:
        first_event = events[0]
        print(f"🔍 Latest event from DB: to_state={first_event.get('to_state')}, state={first_event.get('state')}, normalized={first_event.get('normalized_state')}, created_at={first_event.get('created_at')}")

    return events


def normalize_state_for_display(state):
    """Normalize state to consistent format for display"""
    if not state:
        return "stopped"
    
    state_lower = str(state).lower().strip()
    
    # HIGH states
    if state_lower in ["high", "feeding_fast", "feedingfast"]:
        return "feeding_fast"
    
    # LOW states
    if state_lower in ["low", "feeding_slow", "feedingslow"]:
        return "feeding_slow"
    
    # NO/STOPPED states
    if state_lower in ["no", "stopped", "off"]:
        return "stopped"
    
    # Default to stopped if unrecognized
    return "stopped"

async def get_current_motor_status(batch_id: str = None):
    """
    Get current motor status.
    If batch_id is provided, returns the latest status for that specific batch.
    Otherwise, returns the latest global status (backward compatibility).
    """
    query = {}
    if batch_id:
        # Ensure batch_id is a string for comparison (MongoDB stores it as string)
        query["batchId"] = str(batch_id)
        print(f"🔍 Querying motor status for batchId: {batch_id} (as string: {str(batch_id)})")
    
    cursor = (
        feeding_events_collection
        .find(query)
        .sort("created_at", -1)
        .limit(1)
    )

    async for doc in cursor:
        # Handle both "state" and "to_state" fields for backward compatibility
        raw_state = doc.get("state") or doc.get("to_state")
        # Normalize to consistent format
        state = normalize_state_for_display(raw_state)
        
        doc_batch_id = doc.get("batchId")
        print(f"✅ Found motor status: state={state}, batchId={doc_batch_id}, created_at={doc.get('created_at')}")
        
        return {
            "state": state,
            "motor_speed": doc.get("motor_speed", 0.0),
            "updated_at": doc.get("created_at"),
            "confidence": doc.get("confidence"),  # AI confidence score
            "source": doc.get("source", "ai_feeding" if doc.get("to_state") or doc.get("confidence") else "manual"),  # AI or manual
            "batchId": doc_batch_id  # Include batchId in response
        }

    # No event found
    if batch_id:
        print(f"⚠️ No motor status found for batchId: {batch_id}")
    else:
        print(f"⚠️ No motor status found (global query)")
    
    return {
        "state": "stopped",  # Default to stopped, not "unknown"
        "motor_speed": 0.0,
        "updated_at": None,
        "confidence": None,
        "source": "unknown",
        "batchId": batch_id
    }
