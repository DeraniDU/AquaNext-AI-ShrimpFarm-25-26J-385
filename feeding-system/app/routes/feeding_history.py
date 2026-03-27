from fastapi import APIRouter
from app.database.feeding_event_repo import get_feeding_events

router = APIRouter(prefix="/feeding-history", tags=["Feeding History"])

@router.get("/")
async def get_history(limit: int = 50):
    events = await get_feeding_events(limit)
    return {
        "status": "ok",
        "count": len(events),
        "events": events
    }
