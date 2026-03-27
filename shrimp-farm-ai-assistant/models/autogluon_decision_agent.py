"""
AutoGluon-based Decision Agent

Uses AutoGluon (pre-trained base model) for decision making.
This is faster to set up and often performs better than training from scratch.
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Any
from datetime import datetime
from pathlib import Path
import json

from models import (
    WaterQualityData, FeedData, EnergyData, LaborData
)
from models.decision_model import FeatureExtractor
from models.decision_outputs import DecisionOutput, MultiPondDecision, ActionType

try:
    from autogluon.tabular import TabularPredictor
    AUTOGLUON_AVAILABLE = True
except ImportError:
    AUTOGLUON_AVAILABLE = False
    print("Warning: AutoGluon not installed. Install with: pip install autogluon")


class AutoGluonDecisionAgent:
    """
    Decision Agent using AutoGluon base model.
    
    AutoGluon automatically selects and ensembles the best models,
    making it ideal for quick deployment with good performance.
    """
    
    def __init__(self, model_dir: str = 'models/autogluon_models', use_pretrained: bool = True):
        """
        Initialize AutoGluon Decision Agent.
        
        Args:
            model_dir: Directory to save/load models
            use_pretrained: Whether to use pre-trained models if available
        """
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        self.feature_extractor = FeatureExtractor()
        self.action_predictor = None
        self.urgency_predictor = None
        self.priority_predictor = None
        self.feed_amount_predictor = None
        
        self.is_trained = False
        self._check_models()
    
    def _check_models(self):
        """Check if models are already trained"""
        if not AUTOGLUON_AVAILABLE:
            self.is_trained = False
            return
        
        action_path = self.model_dir / 'action_predictor'
        urgency_path = self.model_dir / 'urgency_predictor'
        
        # Check if at least required models exist
        if action_path.exists() and urgency_path.exists():
            try:
                self.load_models()
                # Verify models loaded successfully
                if self.action_predictor and self.urgency_predictor:
                    self.is_trained = True
                    print(f"[OK] AutoGluon models loaded from {self.model_dir}")
                else:
                    self.is_trained = False
                    print(f"Warning: Models exist but failed to load properly")
            except Exception as e:
                print(f"Warning: Could not load models: {e}")
                self.is_trained = False
        else:
            self.is_trained = False
            if not action_path.exists():
                print(f"Action predictor not found at {action_path}")
            if not urgency_path.exists():
                print(f"Urgency predictor not found at {urgency_path}")
            print(f"Train models first using: python train_autogluon_models.py")
    
    def prepare_training_data(self, 
                            water_quality_data: List[WaterQualityData],
                            feed_data: List[FeedData],
                            energy_data: List[EnergyData],
                            labor_data: List[LaborData],
                            labels: Optional[Dict] = None) -> pd.DataFrame:
        """
        Prepare data in format for AutoGluon training.
        
        Args:
            water_quality_data: List of water quality data
            feed_data: List of feed data
            energy_data: List of energy data
            labor_data: List of labor data
            labels: Optional labels dict with 'action_type', 'urgency', etc.
        
        Returns:
            DataFrame ready for AutoGluon
        """
        # Extract features for each pond
        all_features = []
        all_labels = {
            'action_type': [],
            'urgency': [],
            'priority': [],
            'feed_amount': []
        }
        
        for i in range(len(water_quality_data)):
            # Extract features for this pond
            features = self.feature_extractor.extract_features(
                [water_quality_data[i]],
                [feed_data[i]],
                [energy_data[i]],
                [labor_data[i]]
            )
            
            # Convert to dict with feature names
            feature_dict = self._features_to_dict(features)
            all_features.append(feature_dict)
            
            # Add labels if provided
            if labels:
                all_labels['action_type'].append(labels.get('action_type', [0])[i] if isinstance(labels.get('action_type'), list) else labels.get('action_type', 0))
                all_labels['urgency'].append(labels.get('urgency', [0.5])[i] if isinstance(labels.get('urgency'), list) else labels.get('urgency', 0.5))
                all_labels['priority'].append(labels.get('priority', [1])[i] if isinstance(labels.get('priority'), list) else labels.get('priority', 1))
                all_labels['feed_amount'].append(labels.get('feed_amount', [10.0])[i] if isinstance(labels.get('feed_amount'), list) else labels.get('feed_amount', 10.0))
        
        # Create DataFrame
        df = pd.DataFrame(all_features)
        
        # Add labels if provided
        if labels:
            df['action_type'] = all_labels['action_type']
            df['urgency'] = all_labels['urgency']
            df['priority'] = all_labels['priority']
            df['feed_amount'] = all_labels['feed_amount']
        
        return df
    
    def _features_to_dict(self, features: np.ndarray) -> Dict[str, float]:
        """Convert feature array to dictionary with named features"""
        feature_names = [
            # Water Quality (10)
            'ph', 'temperature', 'dissolved_oxygen', 'salinity', 'ammonia',
            'nitrite', 'nitrate', 'turbidity', 'status_encoded', 'alert_count',
            # Feed (7)
            'shrimp_count', 'average_weight', 'feed_amount', 'feed_type_encoded',
            'feeding_frequency', 'biomass', 'time_since_feeding',
            # Energy (6)
            'aerator_usage', 'pump_usage', 'heater_usage', 'total_energy',
            'cost', 'energy_efficiency',
            # Labor (5)
            'time_spent', 'worker_count', 'labor_efficiency', 'tasks_completed',
            'pending_tasks',
            # Interaction (7)
            'water_quality_risk', 'feed_efficiency', 'energy_risk',
            'labor_risk', 'overall_health', 'urgency_indicator', 'resource_need'
        ]
        
        # Ensure features array matches expected length
        if len(features) != len(feature_names):
            raise ValueError(
                f"Feature count mismatch: expected {len(feature_names)} features, "
                f"got {len(features)}"
            )
        
        return {name: float(features[i]) for i, name in enumerate(feature_names)}
    
    def train_models(self, train_data: pd.DataFrame, time_limit: int = 300):
        """
        Train AutoGluon models.
        
        Args:
            train_data: DataFrame with features and labels
            time_limit: Training time limit in seconds (default 5 minutes)
        """
        if not AUTOGLUON_AVAILABLE:
            raise ImportError("AutoGluon not installed. Install with: pip install autogluon")
        
        print("Training AutoGluon models...")
        print(f"Training data shape: {train_data.shape}")
        
        # Train action type classifier
        print("\n1. Training action type classifier...")
        action_path = self.model_dir / 'action_predictor'
        self.action_predictor = TabularPredictor(
            label='action_type',
            path=str(action_path),
            problem_type='multiclass',
            eval_metric='accuracy'
        )
        self.action_predictor.fit(
            train_data.drop(columns=['urgency', 'priority', 'feed_amount'], errors='ignore'),
            time_limit=time_limit,
            presets='best_quality'  # Use best quality preset
        )
        
        # Train urgency regressor
        print("\n2. Training urgency regressor...")
        urgency_path = self.model_dir / 'urgency_predictor'
        self.urgency_predictor = TabularPredictor(
            label='urgency',
            path=str(urgency_path),
            problem_type='regression',
            eval_metric='root_mean_squared_error'
        )
        self.urgency_predictor.fit(
            train_data.drop(columns=['action_type', 'priority', 'feed_amount'], errors='ignore'),
            time_limit=time_limit,
            presets='best_quality'
        )
        
        # Train priority classifier
        print("\n3. Training priority classifier...")
        priority_path = self.model_dir / 'priority_predictor'
        self.priority_predictor = TabularPredictor(
            label='priority',
            path=str(priority_path),
            problem_type='multiclass',
            eval_metric='accuracy'
        )
        self.priority_predictor.fit(
            train_data.drop(columns=['action_type', 'urgency', 'feed_amount'], errors='ignore'),
            time_limit=time_limit // 2,  # Less time for priority
            presets='medium_quality'
        )
        
        # Train feed amount regressor
        print("\n4. Training feed amount regressor...")
        feed_path = self.model_dir / 'feed_amount_predictor'
        self.feed_amount_predictor = TabularPredictor(
            label='feed_amount',
            path=str(feed_path),
            problem_type='regression',
            eval_metric='root_mean_squared_error'
        )
        self.feed_amount_predictor.fit(
            train_data.drop(columns=['action_type', 'urgency', 'priority'], errors='ignore'),
            time_limit=time_limit // 2,
            presets='medium_quality'
        )
        
        self.is_trained = True
        print("\n[OK] All models trained successfully!")
        print(f"Models saved to: {self.model_dir}")
    
    def load_models(self):
        """Load trained models"""
        if not AUTOGLUON_AVAILABLE:
            raise ImportError("AutoGluon not installed")
        
        action_path = self.model_dir / 'action_predictor'
        urgency_path = self.model_dir / 'urgency_predictor'
        priority_path = self.model_dir / 'priority_predictor'
        feed_path = self.model_dir / 'feed_amount_predictor'
        
        if action_path.exists():
            self.action_predictor = TabularPredictor.load(str(action_path))
        if urgency_path.exists():
            self.urgency_predictor = TabularPredictor.load(str(urgency_path))
        if priority_path.exists():
            self.priority_predictor = TabularPredictor.load(str(priority_path))
        if feed_path.exists():
            self.feed_amount_predictor = TabularPredictor.load(str(feed_path))
    
    def make_decision(self,
                     water_quality_data: List[WaterQualityData],
                     feed_data: List[FeedData],
                     energy_data: List[EnergyData],
                     labor_data: List[LaborData],
                     pond_id: Optional[int] = None) -> DecisionOutput:
        """
        Make decision using AutoGluon models.
        
        Args:
            water_quality_data: List of water quality data
            feed_data: List of feed data
            energy_data: List of energy data
            labor_data: List of labor data
            pond_id: Specific pond ID
        
        Returns:
            DecisionOutput with recommendations
        """
        if not self.is_trained:
            raise ValueError("Models not trained. Call train_models() first.")
        
        # Get data for specific pond
        if pond_id is None:
            pond_id = water_quality_data[0].pond_id if water_quality_data else 1
        
        # Validate data lists are not empty
        if not water_quality_data or not feed_data or not energy_data or not labor_data:
            raise ValueError("All data lists must be non-empty")
        
        # Find data for the specified pond
        wq = next((wq for wq in water_quality_data if wq.pond_id == pond_id), None)
        feed = next((f for f in feed_data if f.pond_id == pond_id), None)
        energy = next((e for e in energy_data if e.pond_id == pond_id), None)
        labor = next((l for l in labor_data if l.pond_id == pond_id), None)
        
        # Fallback to first item if pond not found
        if wq is None:
            wq = water_quality_data[0]
        if feed is None:
            feed = feed_data[0]
        if energy is None:
            energy = energy_data[0]
        if labor is None:
            labor = labor_data[0]
        
        # Extract features
        features = self.feature_extractor.extract_features(
            [wq], [feed], [energy], [labor]
        )
        
        # Convert to DataFrame
        feature_dict = self._features_to_dict(features)
        feature_df = pd.DataFrame([feature_dict])
        
        # Make predictions
        if not self.action_predictor or not self.urgency_predictor:
            raise ValueError("Required models (action_predictor, urgency_predictor) not loaded")
        
        action_type_idx = int(self.action_predictor.predict(feature_df)[0])
        urgency = float(self.urgency_predictor.predict(feature_df)[0])
        
        # Get priority (ensure valid range 1-8)
        if self.priority_predictor:
            priority_raw = int(self.priority_predictor.predict(feature_df)[0])
            priority = max(1, min(8, priority_raw))  # Clamp to valid range
        else:
            priority = 1
        
        # Get feed amount (ensure positive)
        if self.feed_amount_predictor:
            feed_amount_raw = float(self.feed_amount_predictor.predict(feature_df)[0])
            feed_amount = max(0.0, feed_amount_raw)  # Ensure non-negative
        else:
            feed_amount = 15.0
        
        # Get prediction probabilities for confidence
        try:
            action_proba = self.action_predictor.predict_proba(feature_df)
            confidence = float(action_proba.iloc[0].max())
        except Exception as e:
            print(f"Warning: Could not get prediction probabilities: {e}")
            confidence = 0.8  # Default confidence
        
        # Map action type (ensure valid index)
        action_type_map = {
            0: ActionType.NO_ACTION,
            1: ActionType.INCREASE_AERATION,
            2: ActionType.DECREASE_AERATION,
            3: ActionType.WATER_EXCHANGE,
            4: ActionType.ADJUST_FEED,
            5: ActionType.EMERGENCY_RESPONSE,
            6: ActionType.ALLOCATE_WORKERS,
            7: ActionType.MONITOR_CLOSELY
        }
        
        # Validate action type index
        if action_type_idx < 0 or action_type_idx >= len(action_type_map):
            print(f"Warning: Invalid action type index {action_type_idx}, using NO_ACTION")
            action_type_idx = 0
        
        action_type = action_type_map.get(action_type_idx, ActionType.NO_ACTION)
        
        # Calculate equipment levels based on predictions and data
        aerator_level = 0.5
        if wq.dissolved_oxygen < 5.0:
            aerator_level = min(1.0, 0.5 + (5.0 - wq.dissolved_oxygen) / 5.0)
        elif wq.dissolved_oxygen > 7.0:
            aerator_level = max(0.3, 0.5 - (wq.dissolved_oxygen - 7.0) / 5.0)
        
        pump_level = 0.5
        if wq.ammonia > 0.2:
            pump_level = min(1.0, 0.5 + (wq.ammonia - 0.2) * 2.0)
        
        heater_level = 0.0
        if wq.temperature < 26:
            heater_level = min(1.0, (26 - wq.temperature) / 5.0)
        
        # Generate reasoning
        reasoning = self._generate_reasoning(wq, feed, energy, labor, action_type, urgency)
        affected_factors = self._identify_factors(wq, feed, energy, labor)
        
        return DecisionOutput(
            timestamp=datetime.now(),
            pond_id=pond_id,
            primary_action=action_type,
            action_intensity=min(1.0, max(0.0, urgency)),
            secondary_actions=[],
            priority_rank=priority,
            urgency_score=min(1.0, max(0.0, urgency)),
            recommended_feed_amount=max(0.0, feed_amount),  # Feed amount already in grams from training
            recommended_aerator_level=aerator_level,
            recommended_pump_level=pump_level,
            recommended_heater_level=heater_level,
            confidence=confidence,
            reasoning=reasoning,
            affected_factors=affected_factors
        )
    
    def make_multi_pond_decisions(self,
                                 water_quality_data: List[WaterQualityData],
                                 feed_data: List[FeedData],
                                 energy_data: List[EnergyData],
                                 labor_data: List[LaborData]) -> MultiPondDecision:
        """Make decisions for all ponds"""
        decisions = {}
        priorities = {}
        urgent_ponds = []
        
        for pond_id in [wq.pond_id for wq in water_quality_data]:
            decision = self.make_decision(
                water_quality_data, feed_data, energy_data, labor_data, pond_id=pond_id
            )
            decisions[pond_id] = decision
            priorities[pond_id] = decision.priority_rank
            
            if decision.urgency_score > 0.7:
                urgent_ponds.append(pond_id)
        
        sorted_priorities = dict(sorted(priorities.items(), key=lambda x: x[1]))
        overall_urgency = max([d.urgency_score for d in decisions.values()]) if decisions else 0.0
        
        total_urgency = sum([d.urgency_score for d in decisions.values()])
        resource_allocation = {}
        if total_urgency > 0:
            for pond_id, decision in decisions.items():
                resource_allocation[f"pond_{pond_id}"] = decision.urgency_score / total_urgency
        
        return MultiPondDecision(
            timestamp=datetime.now(),
            pond_priorities=sorted_priorities,
            urgent_ponds=urgent_ponds,
            recommended_actions=decisions,
            overall_urgency=overall_urgency,
            resource_allocation=resource_allocation
        )
    
    def _generate_reasoning(self, wq, feed, energy, labor, action_type, urgency):
        """Generate human-readable reasoning"""
        reasons = []
        
        if wq.status.value == 'critical':
            reasons.append("Critical water quality status detected")
        if wq.dissolved_oxygen < 5.0:
            reasons.append(f"Low dissolved oxygen ({wq.dissolved_oxygen:.1f} mg/L)")
        if wq.ammonia > 0.2:
            reasons.append(f"High ammonia levels ({wq.ammonia:.2f} mg/L)")
        if energy.efficiency_score < 0.7:
            reasons.append(f"Low energy efficiency ({energy.efficiency_score:.2f})")
        if labor.efficiency_score < 0.7:
            reasons.append(f"Low labor efficiency ({labor.efficiency_score:.2f})")
        if urgency > 0.7:
            reasons.append("High urgency situation requiring immediate attention")
        
        if not reasons:
            reasons.append("Normal operating conditions")
        
        return ". ".join(reasons) + "."
    
    def _identify_factors(self, wq, feed, energy, labor):
        """Identify factors affecting the decision"""
        factors = []
        
        if wq.status.value in ['poor', 'critical']:
            factors.append("Water Quality")
        if wq.dissolved_oxygen < 5.0:
            factors.append("Dissolved Oxygen")
        if wq.ammonia > 0.2:
            factors.append("Ammonia Levels")
        if wq.temperature < 26 or wq.temperature > 30:
            factors.append("Temperature")
        if energy.efficiency_score < 0.7:
            factors.append("Energy Efficiency")
        if labor.efficiency_score < 0.7:
            factors.append("Labor Efficiency")
        
        return factors if factors else ["Normal Operations"]

