from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class WaterQualityStatus(str, Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    CRITICAL = "critical"

class AlertLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class WaterQualityData(BaseModel):
    timestamp: datetime
    pond_id: int
    ph: float
    temperature: float
    dissolved_oxygen: float
    salinity: float
    ammonia: float
    nitrite: float
    nitrate: float
    turbidity: float
    status: WaterQualityStatus
    alerts: List[str] = []

class FeedData(BaseModel):
    timestamp: datetime
    pond_id: int
    shrimp_count: int
    average_weight: float
    feed_amount: float
    feed_type: str
    feeding_frequency: int
    predicted_next_feeding: datetime

class EnergyData(BaseModel):
    timestamp: datetime
    pond_id: int
    aerator_usage: float  # kWh
    pump_usage: float  # kWh
    heater_usage: float  # kWh
    total_energy: float  # kWh
    cost: float
    efficiency_score: float

class LaborData(BaseModel):
    timestamp: datetime
    pond_id: int
    tasks_completed: List[str]
    time_spent: float  # hours
    worker_count: int
    efficiency_score: float
    next_tasks: List[str]

class FarmInsight(BaseModel):
    timestamp: datetime
    insight_type: str
    priority: AlertLevel
    message: str
    recommendations: List[str]
    affected_ponds: List[int]
    data: Dict[str, Any]

class ShrimpFarmDashboard(BaseModel):
    timestamp: datetime
    overall_health_score: float
    water_quality_summary: Dict[int, WaterQualityStatus]
    feed_efficiency: float
    energy_efficiency: float
    labor_efficiency: float
    insights: List[FarmInsight]
    alerts: List[str]
    recommendations: List[str]
