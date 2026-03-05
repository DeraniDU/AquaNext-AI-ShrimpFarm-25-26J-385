"""
Decision Model - Feature Extraction and Decision Making

This module provides feature extraction from farm data for ML models.
"""

from typing import List
import numpy as np
from pathlib import Path
import importlib.util

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
else:
    raise ImportError("Could not find models.py with data model definitions")


class FeatureExtractor:
    """
    Extracts 35 features from water quality, feed, energy, and labor data.
    
    Features:
    - Water quality: 9 features (ph, temp, do, salinity, ammonia, nitrite, nitrate, turbidity, status_encoded)
    - Feed: 5 features (shrimp_count, avg_weight, feed_amount, feeding_freq, biomass)
    - Energy: 6 features (aerator, pump, heater, total_energy, cost, efficiency)
    - Labor: 5 features (time_spent, worker_count, efficiency, tasks_count, next_tasks_count)
    - Derived/Interaction: 10 features (do_status, ammonia_status, temp_status, etc.)
    Total: 35 features
    """
    
    @staticmethod
    def extract_features(
        water_quality_data: List[WaterQualityData],
        feed_data: List[FeedData],
        energy_data: List[EnergyData],
        labor_data: List[LaborData],
        pond_id: int = None
    ) -> List[float]:
        """
        Extract features for a single pond.
        
        Args:
            water_quality_data: List of WaterQualityData objects
            feed_data: List of FeedData objects
            energy_data: List of EnergyData objects
            labor_data: List of LaborData objects
            pond_id: Optional pond ID to filter (uses first item if None)
        
        Returns:
            List of 35 float features
        """
        # Get data for the specified pond (or first item)
        if pond_id is not None:
            wq = next((w for w in water_quality_data if w.pond_id == pond_id), water_quality_data[0])
            feed = next((f for f in feed_data if f.pond_id == pond_id), feed_data[0])
            energy = next((e for e in energy_data if e.pond_id == pond_id), energy_data[0])
            labor = next((l for l in labor_data if l.pond_id == pond_id), labor_data[0])
        else:
            wq = water_quality_data[0]
            feed = feed_data[0]
            energy = energy_data[0]
            labor = labor_data[0]
        
        features = []
        
        # 1-9: Water Quality Features (9 features)
        features.append(float(wq.ph))
        features.append(float(wq.temperature))
        features.append(float(wq.dissolved_oxygen))
        features.append(float(wq.salinity))
        features.append(float(wq.ammonia))
        features.append(float(wq.nitrite))
        features.append(float(wq.nitrate))
        features.append(float(wq.turbidity))
        
        # Encode status as numeric (excellent=5, good=4, fair=3, poor=2, critical=1)
        status_map = {
            WaterQualityStatus.EXCELLENT: 5.0,
            WaterQualityStatus.GOOD: 4.0,
            WaterQualityStatus.FAIR: 3.0,
            WaterQualityStatus.POOR: 2.0,
            WaterQualityStatus.CRITICAL: 1.0,
        }
        features.append(status_map.get(wq.status, 3.0))
        
        # 10-14: Feed Features (5 features)
        features.append(float(feed.shrimp_count))
        features.append(float(feed.average_weight))
        features.append(float(feed.feed_amount))
        features.append(float(feed.feeding_frequency))
        # Biomass = count * weight / 1000 (kg)
        biomass = (feed.shrimp_count * feed.average_weight) / 1000.0
        features.append(float(biomass))
        
        # 15-20: Energy Features (6 features)
        features.append(float(energy.aerator_usage))
        features.append(float(energy.pump_usage))
        features.append(float(energy.heater_usage))
        features.append(float(energy.total_energy))
        features.append(float(energy.cost))
        features.append(float(energy.efficiency_score))
        
        # 21-25: Labor Features (5 features)
        features.append(float(labor.time_spent))
        features.append(float(labor.worker_count))
        features.append(float(labor.efficiency_score))
        features.append(float(len(labor.tasks_completed)))
        features.append(float(len(labor.next_tasks)))
        
        # 26-35: Derived/Interaction Features (10 features)
        # DO status indicators
        features.append(1.0 if wq.dissolved_oxygen < 5.0 else 0.0)  # Low DO flag
        features.append(1.0 if wq.dissolved_oxygen < 4.0 else 0.0)  # Critical DO flag
        
        # Ammonia status indicators
        features.append(1.0 if wq.ammonia > 0.2 else 0.0)  # High ammonia flag
        features.append(1.0 if wq.ammonia > 0.3 else 0.0)  # Critical ammonia flag
        
        # Temperature status indicators
        features.append(1.0 if wq.temperature < 26.0 else 0.0)  # Low temp flag
        features.append(1.0 if wq.temperature > 30.0 else 0.0)  # High temp flag
        
        # pH status indicators
        features.append(1.0 if wq.ph < 7.5 or wq.ph > 8.5 else 0.0)  # pH out of range
        
        # Alert count
        features.append(float(len(wq.alerts)))
        
        # Energy efficiency relative to water quality
        # Lower efficiency when water quality is poor
        wq_score = status_map.get(wq.status, 3.0) / 5.0
        features.append(float(energy.efficiency_score * wq_score))
        
        # Feed per biomass ratio
        features.append(float(feed.feed_amount / max(biomass, 0.001)))  # Avoid division by zero
        
        assert len(features) == 35, f"Expected 35 features, got {len(features)}"
        return features


class DecisionMakingModel:
    """
    Placeholder for DecisionMakingModel class.
    
    This class was referenced in the imports but may not be fully implemented.
    If you need a decision model, consider using:
    - XGBoostDecisionAgent (models.xgboost_decision_agent)
    - AutoGluonDecisionAgent (models.autogluon_decision_agent)
    - SimpleDecisionAgent (models.simple_decision_agent)
    """
    pass
