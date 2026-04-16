"""
Fixed feature order for harvest ML training and inference.
Must match CSV columns and HarvestMLPredictor.build_feature_vector().
"""

from typing import Tuple

HARVEST_ML_FEATURE_NAMES: Tuple[str, ...] = (
    "avg_weight_g",
    "shrimp_count",
    "biomass_kg",
    "feed_amount",
    "feeding_frequency",
    "rolling_feed_kg_7d",
    "dissolved_oxygen",
    "temperature",
    "ammonia",
    "ph",
    "salinity",
    "days_normalized",
    "weight_lag_7d",
    "weight_lag_14d",
)

HARVEST_ML_LABEL_DAYS = "days_to_harvest"
HARVEST_ML_LABEL_BIOMASS = "harvest_biomass_kg"
HARVEST_ML_LABEL_RISK = "early_harvest_risk"
HARVEST_ML_LABEL_DELTA = "weight_delta_next"
