"""
Models package for Shrimp Farm Management System
"""

import sys
from pathlib import Path
import importlib.util

# Import from submodules
from models.decision_model import DecisionMakingModel, FeatureExtractor
from models.decision_outputs import DecisionOutput, MultiPondDecision, ActionType

# Import data models from root models.py (avoiding circular import)
parent_dir = Path(__file__).parent.parent
models_path = parent_dir / "models.py"
if models_path.exists():
    spec = importlib.util.spec_from_file_location("root_models", models_path)
    root_models = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(root_models)
    WaterQualityData = root_models.WaterQualityData
    FeedData = root_models.FeedData
    EnergyData = root_models.EnergyData
    LaborData = root_models.LaborData
    WaterQualityStatus = root_models.WaterQualityStatus
    AlertLevel = root_models.AlertLevel
    FarmInsight = root_models.FarmInsight
    ShrimpFarmDashboard = root_models.ShrimpFarmDashboard
else:
    raise ImportError("Could not find models.py with data model definitions")

__all__ = [
    'DecisionMakingModel',
    'FeatureExtractor',
    'DecisionOutput',
    'MultiPondDecision',
    'ActionType',
    'WaterQualityData',
    'FeedData',
    'EnergyData',
    'LaborData',
    'WaterQualityStatus',
    'AlertLevel',
    'FarmInsight',
    'ShrimpFarmDashboard'
]

