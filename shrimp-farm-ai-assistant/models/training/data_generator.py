"""
Training Data Generator for Decision Model

Generates synthetic training data based on domain knowledge and rules.
"""

import random
import numpy as np
from typing import List, Tuple, Dict
from datetime import datetime, timedelta

from models import (
    WaterQualityData, WaterQualityStatus, FeedData, 
    EnergyData, LaborData
)

class TrainingDataGenerator:
    """Generates training data with labels based on domain rules"""
    
    # Action type mapping
    ACTION_TYPES = {
        0: "no_action",
        1: "increase_aeration",
        2: "decrease_aeration",
        3: "water_exchange",
        4: "adjust_feed",
        5: "emergency_response",
        6: "allocate_workers",
        7: "monitor_closely"
    }
    
    @staticmethod
    def generate_water_quality_data(pond_id: int, scenario: str = "normal") -> WaterQualityData:
        """Generate water quality data for a scenario"""
        if scenario == "critical":
            # Mix of critical drivers so training observes multiple "critical" action types.
            ph = random.uniform(6.5, 7.0)
            temp = random.uniform(24, 26)
            if random.random() < 0.5:
                # Low DO critical
                do = random.uniform(2.0, 4.0)
                ammonia = random.uniform(0.10, 0.25)
                alerts = ["CRITICAL: Low dissolved oxygen"]
            else:
                # High ammonia critical (DO is OK so water-exchange becomes learnable)
                do = random.uniform(5.2, 6.8)
                ammonia = random.uniform(0.32, 0.55)
                alerts = ["CRITICAL: High ammonia"]
            status = WaterQualityStatus.CRITICAL
        elif scenario == "poor":
            ph = random.uniform(7.0, 7.4)
            temp = random.uniform(24, 25.5)
            # Create both low-DO and high-ammonia poor cases.
            if random.random() < 0.5:
                do = random.uniform(4.0, 5.0)
                ammonia = random.uniform(0.18, 0.26)
                alerts = ["WARNING: Low dissolved oxygen"]
            else:
                do = random.uniform(5.0, 6.5)
                ammonia = random.uniform(0.22, 0.34)
                alerts = ["WARNING: High ammonia"]
            status = WaterQualityStatus.POOR
        elif scenario == "good":
            ph = random.uniform(7.5, 8.5)
            temp = random.uniform(26, 30)
            do = random.uniform(5.0, 7.0)
            ammonia = random.uniform(0.05, 0.15)
            status = WaterQualityStatus.GOOD
            alerts = []
        else:  # normal
            ph = random.uniform(7.2, 8.8)
            temp = random.uniform(25, 31)
            # Occasionally inject "ammonia event" while DO stays OK, so the model
            # learns water-exchange / feed adjustment instead of always aeration.
            if random.random() < 0.15:
                do = random.uniform(5.2, 7.5)
                ammonia = random.uniform(0.22, 0.34)
                alerts = ["WARNING: Rising ammonia"]
                status = WaterQualityStatus.FAIR
            else:
                do = random.uniform(4.5, 8.0)
                ammonia = random.uniform(0.0, 0.22)
                status = WaterQualityStatus.FAIR if random.random() > 0.5 else WaterQualityStatus.GOOD
                alerts = []
        
        return WaterQualityData(
            timestamp=datetime.now(),
            pond_id=pond_id,
            ph=ph,
            temperature=temp,
            dissolved_oxygen=do,
            salinity=random.uniform(15, 25),
            ammonia=ammonia,
            nitrite=random.uniform(0, 0.1),
            nitrate=random.uniform(0, 10),
            turbidity=random.uniform(0, 5),
            status=status,
            alerts=alerts
        )
    
    @staticmethod
    def generate_feed_data(pond_id: int, water_quality: WaterQualityData) -> FeedData:
        """Generate feed data based on water quality"""
        shrimp_count = random.randint(8000, 12000)
        avg_weight = random.uniform(8, 15)
        biomass = shrimp_count * avg_weight / 1000
        
        # Adjust feed based on water quality
        base_feed_rate = random.uniform(0.03, 0.05)
        daily_feed = biomass * base_feed_rate * 1000
        
        if water_quality.dissolved_oxygen < 5:
            daily_feed *= 0.7
        if water_quality.ammonia > 0.2:
            daily_feed *= 0.6
        
        feeding_freq = 3
        if water_quality.temperature > 28:
            feeding_freq = 4
        elif water_quality.temperature < 26:
            feeding_freq = 2
        
        feed_type = "Grower Feed (35% protein)"
        if avg_weight < 5:
            feed_type = "Starter Feed (40% protein)"
        elif avg_weight >= 15:
            feed_type = "Finisher Feed (30% protein)"
        
        return FeedData(
            timestamp=datetime.now(),
            pond_id=pond_id,
            shrimp_count=shrimp_count,
            average_weight=avg_weight,
            feed_amount=daily_feed / feeding_freq,
            feed_type=feed_type,
            feeding_frequency=feeding_freq,
            predicted_next_feeding=datetime.now() + timedelta(hours=6)
        )
    
    @staticmethod
    def generate_energy_data(pond_id: int, water_quality: WaterQualityData) -> EnergyData:
        """Generate energy data based on water quality"""
        base_aerator = 20.0
        base_pump = 12.0
        base_heater = 10.0
        
        # Adjust based on water quality
        if water_quality.dissolved_oxygen < 5:
            base_aerator *= 1.5
        if water_quality.ammonia > 0.2:
            base_pump *= 1.3
        if water_quality.temperature < 26:
            base_heater *= 1.5
        
        total_energy = base_aerator + base_pump + base_heater
        cost = total_energy * 0.12
        
        # Efficiency based on usage vs water quality
        efficiency = 0.8
        if water_quality.status.value in ['excellent', 'good']:
            efficiency = 0.9
        elif water_quality.status.value == 'critical':
            efficiency = 0.6
        
        return EnergyData(
            timestamp=datetime.now(),
            pond_id=pond_id,
            aerator_usage=base_aerator,
            pump_usage=base_pump,
            heater_usage=base_heater,
            total_energy=total_energy,
            cost=cost,
            efficiency_score=efficiency
        )
    
    @staticmethod
    def generate_labor_data(pond_id: int, water_quality: WaterQualityData, 
                           energy: EnergyData) -> LaborData:
        """Generate labor data"""
        base_tasks = ["Water quality testing", "Feed distribution", "Data recording"]
        
        if water_quality.status.value in ['poor', 'critical']:
            base_tasks.append("Emergency aeration check")
        if water_quality.ammonia > 0.2:
            base_tasks.append("Water exchange")
        if energy.efficiency_score < 0.7:
            base_tasks.append("Equipment inspection")
        
        # Random "labor pressure" injections so allocate_workers becomes learnable
        # even when water quality is stable.
        if random.random() < 0.25:
            base_tasks += ["Net cleaning", "Pond edge inspection", "Record reconciliation"]

        # Vary time and backlog so the model can learn "labor pressure" patterns.
        time_spent = len(base_tasks) * 0.5
        if water_quality.status.value == 'critical':
            time_spent *= 1.5
        
        worker_count = 1
        if len(base_tasks) > 4:
            worker_count = 2
        if water_quality.status.value == 'critical':
            worker_count = 3
        
        # Efficiency drops under high workload / stressful conditions.
        efficiency = 0.8
        if water_quality.status.value in ['excellent', 'good']:
            efficiency = 0.9
        if water_quality.status.value in ['poor', 'critical']:
            efficiency -= 0.1
        if energy.efficiency_score < 0.7:
            efficiency -= 0.1
        efficiency = max(0.4, min(0.95, efficiency))
        
        # Backlog (next tasks) varies with conditions to create labels for labor actions.
        next_tasks = ["Regular monitoring", "Scheduled maintenance"]
        if water_quality.status.value in ['poor', 'critical']:
            next_tasks += ["Extra water testing", "Aerator inspection"]
        if water_quality.ammonia > 0.2:
            next_tasks += ["Siphon waste", "Prepare partial water exchange"]
        if energy.efficiency_score < 0.7:
            next_tasks += ["Check aerator belts", "Inspect pumps"]
        # Randomly vary backlog a bit (keeps dataset diverse).
        if random.random() < 0.3:
            next_tasks += ["Inventory check"]
        if random.random() < 0.2:
            next_tasks += ["Staff briefing"]
        if random.random() < 0.25:
            next_tasks += ["Documentation cleanup", "Extra sampling run"]
        
        return LaborData(
            timestamp=datetime.now(),
            pond_id=pond_id,
            tasks_completed=base_tasks,
            time_spent=time_spent,
            worker_count=worker_count,
            efficiency_score=efficiency,
            next_tasks=next_tasks
        )
    
    def generate_training_sample(self, scenario: str = "normal") -> Tuple[List, List, Dict]:
        """
        Generate a complete training sample with labels.
        
        Returns:
            (features, labels, metadata)
        """
        pond_id = 1
        
        # Generate data
        wq = self.generate_water_quality_data(pond_id, scenario)
        feed = self.generate_feed_data(pond_id, wq)
        energy = self.generate_energy_data(pond_id, wq)
        labor = self.generate_labor_data(pond_id, wq, energy)
        
        # Extract features (using FeatureExtractor logic)
        from models.decision_model import FeatureExtractor
        features = FeatureExtractor.extract_features([wq], [feed], [energy], [labor])
        
        # Generate labels based on rules
        labels = self.generate_labels(wq, feed, energy, labor)
        
        metadata = {
            'scenario': scenario,
            'pond_id': pond_id,
            'water_quality_status': wq.status.value
        }
        
        return features, labels, metadata
    
    def generate_labels(self, wq: WaterQualityData, feed: FeedData, 
                       energy: EnergyData, labor: LaborData) -> Dict:
        """Generate labels based on domain rules"""
        
        # Action type label
        action_type = 0  # no_action
        action_intensity = 0.0
        
        # Feed pressure heuristics (used for adjust_feed labeling)
        biomass = (feed.shrimp_count * feed.average_weight) / 1000.0  # kg
        feed_per_biomass = float(feed.feed_amount / max(biomass, 0.001))  # g/kg per feeding (rough)
        
        # Priority order is chosen to ensure ammonia-driven actions are learnable:
        # DO<4 stays emergency, but high ammonia can override mild low-DO.
        if wq.dissolved_oxygen < 4.0:
            action_type = 5  # emergency_response
            action_intensity = 1.0
        elif wq.ammonia > 0.3:
            action_type = 3  # water_exchange
            action_intensity = 0.9
        elif wq.dissolved_oxygen < 5.0:
            action_type = 1  # increase_aeration
            action_intensity = 0.8
        elif wq.ammonia > 0.2:
            # Moderate ammonia: prefer reducing feeding load first; escalate to exchange when high.
            if wq.ammonia >= 0.26:
                action_type = 3  # water_exchange
                action_intensity = 0.6
            else:
                action_type = 4  # adjust_feed
                action_intensity = 0.6
        elif wq.status.value == 'critical':
            action_type = 5  # emergency_response
            action_intensity = 1.0
        elif wq.status.value == 'poor':
            action_type = 1  # increase_aeration
            action_intensity = 0.5
        # Labor capacity constraints (backlog / low efficiency)
        elif labor.efficiency_score < 0.7 or len(labor.next_tasks) >= 5:
            action_type = 6  # allocate_workers
            action_intensity = 0.5 if labor.efficiency_score < 0.6 else 0.4
        # Energy issues can also be addressed by allocating workers (maintenance/inspection).
        elif energy.efficiency_score < 0.6:
            action_type = 6  # allocate_workers
            action_intensity = 0.4
        # Feed issues under otherwise-stable conditions
        elif feed_per_biomass > 15.0 or feed_per_biomass < 7.0:
            action_type = 4  # adjust_feed
            action_intensity = 0.4
        elif wq.status.value in ['fair', 'poor']:
            action_type = 7  # monitor_closely
            action_intensity = 0.3
        
        # Priority (1 = highest)
        priority = 1
        if wq.status.value == 'critical':
            priority = 1
        elif wq.status.value == 'poor':
            priority = 2
        elif wq.status.value == 'fair':
            priority = 3
        else:
            priority = 4
        
        # Urgency score
        urgency = 0.0
        if wq.dissolved_oxygen < 4.0:
            urgency = 1.0
        elif wq.dissolved_oxygen < 5.0:
            urgency = 0.8
        elif wq.ammonia > 0.3:
            urgency = 0.9
        elif wq.status.value == 'critical':
            urgency = 1.0
        elif wq.status.value == 'poor':
            urgency = 0.6
        elif labor.efficiency_score < 0.7 or len(labor.next_tasks) >= 5:
            urgency = 0.4
        elif energy.efficiency_score < 0.6:
            urgency = 0.4
        elif action_type == 4:
            urgency = 0.3
        
        # Feed amount (normalized)
        normalized_feed = feed.feed_amount / 50.0  # Assuming max 50g per feeding
        
        # Equipment schedule
        aerator_level = 0.5
        if wq.dissolved_oxygen < 5.0:
            aerator_level = 1.0
        elif wq.dissolved_oxygen > 7.0:
            aerator_level = 0.3
        
        pump_level = 0.5
        if wq.ammonia > 0.2:
            pump_level = 0.8
        
        heater_level = 0.0
        if wq.temperature < 26:
            heater_level = 0.7
        elif wq.temperature < 27:
            heater_level = 0.4
        
        return {
            'action_type': action_type,
            'action_intensity': np.array([action_intensity] * 8),  # Same for all actions
            'priority': np.array([1.0 if i == priority-1 else 0.0 for i in range(8)]),
            'urgency': urgency,
            'feed_amount': normalized_feed,
            'equipment_schedule': np.array([aerator_level, pump_level, heater_level])
        }
    
    def generate_dataset(self, num_samples: int = 10000, 
                        scenarios: List[str] = None) -> Tuple[np.ndarray, Dict]:
        """Generate complete training dataset"""
        if scenarios is None:
            scenarios = ["normal", "good", "poor", "critical"]
        
        all_features = []
        all_labels = {
            'action_type': [],
            'action_intensity': [],
            'priority': [],
            'urgency': [],
            'feed_amount': [],
            'equipment_schedule': []
        }
        
        for i in range(num_samples):
            scenario = random.choice(scenarios)
            features, labels, _ = self.generate_training_sample(scenario)
            
            all_features.append(features)
            all_labels['action_type'].append(labels['action_type'])
            all_labels['action_intensity'].append(labels['action_intensity'])
            all_labels['priority'].append(labels['priority'])
            all_labels['urgency'].append(labels['urgency'])
            all_labels['feed_amount'].append(labels['feed_amount'])
            all_labels['equipment_schedule'].append(labels['equipment_schedule'])
        
        return np.array(all_features), {
            'action_type': np.array(all_labels['action_type']),
            'action_intensity': np.array(all_labels['action_intensity']),
            'priority': np.array(all_labels['priority']),
            'urgency': np.array(all_labels['urgency']),
            'feed_amount': np.array(all_labels['feed_amount']),
            'equipment_schedule': np.array(all_labels['equipment_schedule'])
        }

