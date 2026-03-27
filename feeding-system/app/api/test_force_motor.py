from fastapi import APIRouter
from datetime import datetime
from app.database.feeding_event_repo import save_feeding_event

router = APIRouter(prefix="/test", tags=["TEST"])

@router.post("/force-motor")
async def force_motor():
    event = {
        "state": "high",
        "motor_speed": 1.0,
        "source": "force_test",
        "created_at": datetime.utcnow()
    }

    await save_feeding_event(event)

    return {
    "status": "ok",
    "message": "Motor event FORCED",
    "state": event["state"],
    "motor_speed": event["motor_speed"]
}

