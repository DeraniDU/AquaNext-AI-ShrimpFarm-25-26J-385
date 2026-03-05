from fastapi import APIRouter, Query
from app.database.feeding_event_repo import get_current_motor_status, save_feeding_event
from datetime import datetime

router = APIRouter(prefix="/motor", tags=["Motor"])

@router.get("/status")
async def motor_status(batchId: str = Query(None, description="Optional batch ID to get batch-specific motor status")):
    """
    Get current motor status.
    If batchId is provided, returns status for that specific batch.
    Otherwise, returns the latest global status (backward compatibility).
    """
    data = await get_current_motor_status(batchId)
    return {
        "status": "ok",
        "data": data
    }

@router.post("/stop")
async def emergency_stop_motor(batchId: str = Query(None, description="Optional batch ID to stop specific batch motor")):
    """
    Emergency stop all motors or a specific batch motor.
    Creates a motor event to stop feeding immediately.
    """
    try:
        # Create stop event
        event_data = {
            "to_state": "no",
            "state": "stopped",
            "motor_speed": 0.0,
            "confidence": 1.0,  # Manual stop is 100% confident
            "source": "manual_emergency_stop"
        }
        
        if batchId:
            event_data["batchId"] = batchId
            print(f"🚨 Emergency stop for batch: {batchId}")
        else:
            print(f"🚨 Emergency stop for ALL motors")
        
        await save_feeding_event(event_data)
        
        return {
            "status": "ok",
            "message": "Motor stopped successfully",
            "batchId": batchId
        }
    except Exception as e:
        print(f"⚠️ Error stopping motor: {e}")
        return {
            "status": "error",
            "message": str(e)
        }
