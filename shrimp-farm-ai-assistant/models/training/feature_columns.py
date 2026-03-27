"""
Canonical column names for the 35-dim feature vector produced by FeatureExtractor.

Order MUST match models.decision_model.FeatureExtractor.extract_features.
Used for CSV export/import so XGBoost training data is reproducible and inspectable.
"""

# Water quality (9) + Feed (5) + Energy (6) + Labor (5) + Derived (10) = 35
FEATURE_COLUMNS = [
    # 1–9 Water quality
    "ph",
    "temperature",
    "dissolved_oxygen",
    "salinity",
    "ammonia",
    "nitrite",
    "nitrate",
    "turbidity",
    "wq_status_encoded",
    # 10–14 Feed
    "shrimp_count",
    "average_weight",
    "feed_amount",
    "feeding_frequency",
    "biomass_kg",
    # 15–20 Energy
    "aerator_usage",
    "pump_usage",
    "heater_usage",
    "total_energy",
    "energy_cost",
    "energy_efficiency_score",
    # 21–25 Labor
    "labor_time_spent",
    "labor_worker_count",
    "labor_efficiency_score",
    "labor_tasks_count",
    "labor_next_tasks_count",
    # 26–35 Derived / interaction
    "flag_low_do",
    "flag_critical_do",
    "flag_high_ammonia",
    "flag_critical_ammonia",
    "flag_low_temp",
    "flag_high_temp",
    "flag_ph_out_of_range",
    "alert_count",
    "energy_wq_interaction",
    "feed_per_biomass",
]

# Targets used by train_xgboost_models.py
TARGET_ACTION_TYPE = "action_type"
TARGET_URGENCY = "urgency"

assert len(FEATURE_COLUMNS) == 35
