from pydantic import BaseModel
from datetime import date


class FeedingCreate(BaseModel):
    batchId: str


class FeedingResponse(BaseModel):
    id: str
    batchId: str
    day: int
    biomass: float
    feedRate: float
    feedAmountKg: float
    date: date
