"""
Decision Output Models for the Decision-Making System

These models represent the structured outputs from the decision model.
"""

from pydantic import BaseModel
from typing import List, Dict, Optional
from enum import Enum
from datetime import datetime

class ActionType(str, Enum):
    """Types of actions the system can recommend"""
    NO_ACTION = "no_action"
    INCREASE_AERATION = "increase_aeration"
    DECREASE_AERATION = "decrease_aeration"
    WATER_EXCHANGE = "water_exchange"
    ADJUST_FEED = "adjust_feed"
    EMERGENCY_RESPONSE = "emergency_response"
    ALLOCATE_WORKERS = "allocate_workers"
    EQUIPMENT_MAINTENANCE = "equipment_maintenance"
    MONITOR_CLOSELY = "monitor_closely"

class DecisionOutput(BaseModel):
    """Complete decision output from the decision model"""
    timestamp: datetime
    pond_id: int
    
    # Action decisions
    primary_action: ActionType
    action_intensity: float  # 0-1 scale
    secondary_actions: List[ActionType] = []
    
    # Priority and urgency
    priority_rank: int  # 1 = highest priority
    urgency_score: float  # 0-1 scale
    
    # Optimization values
    recommended_feed_amount: Optional[float] = None
    recommended_aerator_level: Optional[float] = None  # 0-1 scale
    recommended_pump_level: Optional[float] = None  # 0-1 scale
    recommended_heater_level: Optional[float] = None  # 0-1 scale
    
    # Confidence
    confidence: float  # 0-1 scale
    
    # Reasoning
    reasoning: str = ""
    affected_factors: List[str] = []

class MultiPondDecision(BaseModel):
    """Decisions for multiple ponds"""
    timestamp: datetime
    pond_priorities: Dict[int, int]  # pond_id -> priority rank
    urgent_ponds: List[int]
    recommended_actions: Dict[int, DecisionOutput]  # pond_id -> decision
    overall_urgency: float
    resource_allocation: Dict[str, float]  # resource -> allocation percentage

