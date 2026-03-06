from fastapi import APIRouter
from datetime import datetime
from app.database.feeding_event_repo import (
    get_current_motor_status,
    save_feeding_event
)

router = APIRouter(prefix="/ai-decision", tags=["AI Decision"])

FEEDER_MAP = {
    "high": ("feeding_fast", 1.0),
    "low": ("feeding_slow", 0.4),
    "no": ("stopped", 0.0)
}

@router.post("/")
async def ai_decision(prediction: str, confidence: float):

    state, speed = FEEDER_MAP[prediction]

    last = await get_current_motor_status()

    if last and last["state"] == state and last["motor_speed"] == speed:
        return {
            "status": "ignored",
            "reason": "motor state unchanged"
        }

    event = {
        "state": state,
        "motor_speed": speed,
        "confidence": confidence,
        "source": "ai_decision",  # Mark as AI decision
        "created_at": datetime.utcnow()
    }

    await save_feeding_event(event)

    # Note: lastFeedDate is NOT updated here - only updated when real WAV file is processed via /ai-feeding/

    return {
        "status": "saved",
        "state": state,
        "motor_speed": speed,
        "confidence": confidence
    }
