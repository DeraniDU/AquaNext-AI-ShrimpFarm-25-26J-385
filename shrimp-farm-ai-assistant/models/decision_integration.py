"""
Integration of Decision Model with Existing Agents

This module provides a Decision Agent that uses the trained decision model
to make operational decisions based on farm data.
"""

import torch
import numpy as np
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path

from models import (
    WaterQualityData, FeedData, EnergyData, LaborData
)
from models.decision_model import DecisionMakingModel, FeatureExtractor
from models.decision_outputs import DecisionOutput, MultiPondDecision, ActionType


class DecisionAgent:
    """
    Agent that uses the decision model to make operational decisions.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the decision agent.
        
        Args:
            model_path: Path to trained model. If None, uses default path.
        """
        self.model_path = model_path or 'models/decision_model.pth'
        self.model = None
        self.feature_extractor = FeatureExtractor()
        self.load_model()
    
    def load_model(self):
        """Load the trained decision model"""
        try:
            if Path(self.model_path).exists():
                self.model = DecisionMakingModel.load_model(self.model_path)
                self.model.eval()
                print(f"Decision model loaded from {self.model_path}")
            else:
                print(f"Warning: Model not found at {self.model_path}")
                print("Using untrained model. Train the model first using train_decision_model()")
                self.model = DecisionMakingModel()
        except Exception as e:
            print(f"Error loading model: {e}")
            print("Using untrained model")
            self.model = DecisionMakingModel()
    
    def make_decision(self, 
                     water_quality_data: List[WaterQualityData],
                     feed_data: List[FeedData],
                     energy_data: List[EnergyData],
                     labor_data: List[LaborData],
                     pond_id: Optional[int] = None) -> DecisionOutput:
        """
        Make a decision for a specific pond or all ponds.
        
        Args:
            water_quality_data: List of water quality data
            feed_data: List of feed data
            energy_data: List of energy data
            labor_data: List of labor data
            pond_id: Specific pond ID. If None, uses first pond or averages.
            
        Returns:
            DecisionOutput with recommendations
        """
        # Extract features
        features = self.feature_extractor.extract_features(
            water_quality_data,
            feed_data,
            energy_data,
            labor_data
        )
        
        # Make prediction
        predictions = self.model.predict(features)
        
        # Get data for the specific pond or first pond
        if pond_id is None:
            pond_id = water_quality_data[0].pond_id if water_quality_data else 1
        
        # Find corresponding data
        wq = next((wq for wq in water_quality_data if wq.pond_id == pond_id), water_quality_data[0])
        feed = next((f for f in feed_data if f.pond_id == pond_id), feed_data[0])
        energy = next((e for e in energy_data if e.pond_id == pond_id), energy_data[0])
        labor = next((l for l in labor_data if l.pond_id == pond_id), labor_data[0])
        
        # Convert predictions to DecisionOutput
        action_type_idx = predictions['action_type']
        action_type = ActionType(list(ActionType)[action_type_idx].value) if action_type_idx < len(ActionType) else ActionType.NO_ACTION
        
        # Get action intensity for the primary action
        action_intensity = float(predictions['action_intensity'][action_type_idx])
        
        # Get secondary actions (other actions with intensity > 0.3)
        secondary_actions = []
        for i, intensity in enumerate(predictions['action_intensity']):
            if i != action_type_idx and intensity > 0.3:
                if i < len(ActionType):
                    secondary_actions.append(ActionType(list(ActionType)[i].value))
        
        # Priority rank (find which pond has highest priority)
        priority_scores = predictions['priority']
        priority_rank = int(np.argmax(priority_scores)) + 1
        
        # Urgency
        urgency_score = float(predictions['urgency'])
        
        # Feed amount (denormalize)
        normalized_feed = predictions['feed_amount']
        recommended_feed_amount = normalized_feed * 50.0  # Denormalize (assuming max 50g)
        
        # Equipment schedule
        equipment_schedule = predictions['equipment_schedule']
        recommended_aerator_level = float(equipment_schedule[0])
        recommended_pump_level = float(equipment_schedule[1])
        recommended_heater_level = float(equipment_schedule[2])
        
        # Confidence (based on prediction certainty)
        action_probs = predictions.get('action_type_probs', [])
        if len(action_probs) > action_type_idx:
            confidence = float(action_probs[action_type_idx])
        else:
            confidence = action_intensity
        
        # Generate reasoning
        reasoning = self._generate_reasoning(
            wq, feed, energy, labor, action_type, urgency_score
        )
        
        # Affected factors
        affected_factors = self._identify_factors(wq, feed, energy, labor)
        
        return DecisionOutput(
            timestamp=datetime.now(),
            pond_id=pond_id,
            primary_action=action_type,
            action_intensity=action_intensity,
            secondary_actions=secondary_actions,
            priority_rank=priority_rank,
            urgency_score=urgency_score,
            recommended_feed_amount=recommended_feed_amount,
            recommended_aerator_level=recommended_aerator_level,
            recommended_pump_level=recommended_pump_level,
            recommended_heater_level=recommended_heater_level,
            confidence=confidence,
            reasoning=reasoning,
            affected_factors=affected_factors
        )
    
    def make_multi_pond_decisions(self,
                                 water_quality_data: List[WaterQualityData],
                                 feed_data: List[FeedData],
                                 energy_data: List[EnergyData],
                                 labor_data: List[LaborData]) -> MultiPondDecision:
        """
        Make decisions for all ponds and prioritize them.
        
        Returns:
            MultiPondDecision with decisions for all ponds
        """
        decisions = {}
        priorities = {}
        urgent_ponds = []
        
        # Make decision for each pond
        for pond_id in [wq.pond_id for wq in water_quality_data]:
            decision = self.make_decision(
                water_quality_data,
                feed_data,
                energy_data,
                labor_data,
                pond_id=pond_id
            )
            decisions[pond_id] = decision
            priorities[pond_id] = decision.priority_rank
            
            if decision.urgency_score > 0.7:
                urgent_ponds.append(pond_id)
        
        # Sort by priority
        sorted_priorities = dict(sorted(priorities.items(), key=lambda x: x[1]))
        
        # Calculate overall urgency
        overall_urgency = max([d.urgency_score for d in decisions.values()]) if decisions else 0.0
        
        # Resource allocation (simplified - based on urgency)
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
    
    def _generate_reasoning(self, wq: WaterQualityData, feed: FeedData,
                           energy: EnergyData, labor: LaborData,
                           action_type: ActionType, urgency: float) -> str:
        """Generate human-readable reasoning for the decision"""
        reasons = []
        
        if wq.status.value == 'critical':
            reasons.append(f"Critical water quality status detected")
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
    
    def _identify_factors(self, wq: WaterQualityData, feed: FeedData,
                         energy: EnergyData, labor: LaborData) -> List[str]:
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


def create_decision_agent(model_path: Optional[str] = None) -> DecisionAgent:
    """Factory function to create a decision agent"""
    return DecisionAgent(model_path=model_path)

