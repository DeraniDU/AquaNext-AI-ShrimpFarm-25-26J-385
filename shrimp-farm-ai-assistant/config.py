"""
Basic configuration for the shrimp farm management system.

Values can be overridden with environment variables if desired.
"""

import os
from dotenv import load_dotenv

# Load environment variables from a local .env file when running locally.
# This keeps secrets like API keys out of the codebase and allows easy
# per-machine configuration.
load_dotenv()

# OpenAI settings
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL_NAME = os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini")
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.2"))

# Farm configuration
FARM_CONFIG = {
    # Number of ponds to simulate/monitor
    "pond_count": int(os.getenv("FARM_POND_COUNT", "4")),
    # Water quality targets
    "optimal_ph_range": (7.5, 8.5),
    "optimal_temperature_range": (26, 30),  # °C
    "optimal_dissolved_oxygen": 2.2,  # mg/L
    "optimal_salinity_range": (15, 25),  # ppt
}

# Agent scheduling configuration (minutes)
AGENT_CONFIG = {
    "water_quality_check_interval": int(os.getenv("WATER_QUALITY_CHECK_INTERVAL_MIN", "30")),
    "feed_prediction_interval": int(os.getenv("FEED_PREDICTION_INTERVAL_MIN", "24")) * 60,
    "energy_optimization_interval": int(os.getenv("ENERGY_OPTIMIZATION_INTERVAL_MIN", "60")),
    "labor_optimization_interval": int(os.getenv("LABOR_OPTIMIZATION_INTERVAL_MIN", "120")),
}

# Decision Model configuration
DECISION_MODEL_CONFIG = {
    "model_path": os.getenv("DECISION_MODEL_PATH", "models/decision_model.pth"),
    "use_decision_model": os.getenv("USE_DECISION_MODEL", "true").lower() == "true",
    # Which decision agent to use when enabled:
    # - "autogluon" (default): ML-based (requires AutoGluon + trained models)
    # - "xgboost": lightweight ML-based (requires xgboost + trained models)
    # - "tiny": minimal rule-based agent (few rules, safest defaults)
    # - "simple": deterministic rule-based baseline (no ML dependencies)
    # - "none": disable decision recommendations
    # Default to XGBoost for a lightweight, production-friendly ML baseline.
    "agent_type": os.getenv("DECISION_AGENT_TYPE", "xgboost").lower(),
    "confidence_threshold": float(os.getenv("DECISION_CONFIDENCE_THRESHOLD", "0.7")),
    "enable_auto_actions": os.getenv("ENABLE_AUTO_ACTIONS", "false").lower() == "true",
}

# MongoDB configuration
MONGO_URI = os.getenv("MONGO_URI", "")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "shrimp_farm")
USE_MONGODB = os.getenv("USE_MONGODB", "false").lower() == "true"  # Enable MongoDB data fetching

