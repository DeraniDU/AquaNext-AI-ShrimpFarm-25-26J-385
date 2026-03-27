"""
Pydantic models for the Feeding Optimization feature.
"""

from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel


class FeedingScheduleEntry(BaseModel):
    """A single feeding event within a day."""
    time: str           # "07:00"
    amount_kg: float    # kilograms
    amount_g: float     # grams (convenience)
    notes: str = ""     # human-readable context


class FeedingPlan(BaseModel):
    """Optimized feeding plan for one pond."""
    pond_id: int
    daily_feed_kg: float            # recommended total daily feed
    current_daily_feed_kg: float    # what is currently being fed
    current_biomass_kg: float       # shrimp biomass estimate
    feed_type: str                  # selected based on average weight
    fcr_current: float              # feed conversion ratio before optimization
    fcr_target: float               # projected FCR after following plan
    schedule: List[FeedingScheduleEntry]
    adjustment_factor: float        # combined water-quality multiplier (0.5–1.2)
    adjustment_reason: str          # plain-English explanation


class FeedingOptimizationResult(BaseModel):
    """Aggregated optimization result across all ponds."""
    timestamp: datetime
    plans: List[FeedingPlan]
    overall_fcr: float
    potential_savings_pct: float    # % reduction vs current feeding
    top_recommendation: str         # most urgent single recommendation
