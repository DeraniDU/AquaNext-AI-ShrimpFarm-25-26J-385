# app/routes/motor_control.py
from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.database.feeding_event_repo import save_feeding_event

router = APIRouter(prefix="/motor", tags=["Motor Control"])

@router.post("/start")
async def start_feeding():
    """
    Manual START feeding - Sets motor to feeding_fast (speed 1.0)
    Critical for farmers to manually start feeding when needed.
    """
    try:
        event = {
            "state": "feeding_fast",
            "motor_speed": 1.0,
            "source": "manual_start",
            "created_at": datetime.utcnow()
        }
        
        await save_feeding_event(event)
        
        return {
            "status": "success",
            "message": "Feeding started",
            "state": "feeding_fast",
            "motor_speed": 1.0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start feeding: {str(e)}")

@router.post("/stop")
async def stop_feeding():
    """
    Manual STOP feeding - IMMEDIATELY stops motor (speed 0.0)
    CRITICAL: Prevents overfeeding, saves feed, stops when shrimp stop eating.
    """
    try:
        event = {
            "state": "stopped",
            "motor_speed": 0.0,
            "source": "manual_stop",
            "created_at": datetime.utcnow()
        }
        
        await save_feeding_event(event)
        
        return {
            "status": "success",
            "message": "Feeding stopped immediately",
            "state": "stopped",
            "motor_speed": 0.0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop feeding: {str(e)}")

@router.post("/slow")
async def slow_feeding():
    """
    Manual SLOW feeding - Sets motor to feeding_slow (speed 0.4)
    For gradual feeding when needed.
    """
    try:
        event = {
            "state": "feeding_slow",
            "motor_speed": 0.4,
            "source": "manual_slow",
            "created_at": datetime.utcnow()
        }
        
        await save_feeding_event(event)
        
        return {
            "status": "success",
            "message": "Feeding set to slow",
            "state": "feeding_slow",
            "motor_speed": 0.4
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set slow feeding: {str(e)}")





















