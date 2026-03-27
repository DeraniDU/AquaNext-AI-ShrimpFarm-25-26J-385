# app/schemas/batch_schema.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BatchCreate(BaseModel):
    batchName: str
    shrimpAge: int
    plStocked: int
    pondSize: float
    pondSizeUnit: str
    cultivationType: str
    species: str
    survivalRate: float
    feedBrand: str

class BatchResponse(BatchCreate):
    id: str
    status: str = "draft"  # ✅ draft, active, completed
    daysPassed: Optional[int] = 0
    currentShrimpAge: Optional[int] = None  # dynamically calculated
    createdAt: Optional[datetime] = None
    feedAmount: Optional[float] = 0
    feedTimesPerDay: Optional[int] = None  # feeding frequency (times per day) from feed calculator
    lastFeedDate: Optional[str] = None  # ISO string format - last time AI feeding was processed