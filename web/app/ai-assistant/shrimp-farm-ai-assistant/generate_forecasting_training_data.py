#!/usr/bin/env python3
"""
Generate Synthetic Training Data for XGBoost Forecasting Model

This script generates time series data for shrimp farm forecasting.
It creates realistic data over time with:
- Shrimp growth progression
- Water quality variations
- Feed consumption patterns
- Energy usage
- Labor data

Generates approximately 20,000 data points across multiple ponds and time periods.
"""

import json
import random
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any
from pathlib import Path


class ForecastingDataGenerator:
    """Generate synthetic time series data for forecasting model training"""
    
    def __init__(self, seed: int = 42):
        """Initialize the generator with a random seed for reproducibility"""
        random.seed(seed)
        np.random.seed(seed)
        
        # Optimal ranges for water quality
        self.optimal_ph = (7.5, 8.5)
        self.optimal_temp = (26, 30)
        self.optimal_do = 5.0
        self.optimal_salinity = (15, 25)
        self.max_ammonia = 0.2
        
        # Shrimp growth parameters
        self.initial_weight_range = (0.5, 2.0)  # grams (post-larval)
        self.max_weight = 25.0  # grams (harvest weight)
        self.growth_rate_base = 0.15  # grams per day (base growth rate)
        
    def determine_status(self, ph: float, temp: float, do: float, salinity: float, ammonia: float) -> str:
        """Determine water quality status based on parameters"""
        issues = 0
        
        if not (self.optimal_ph[0] <= ph <= self.optimal_ph[1]):
            issues += 1
        if not (self.optimal_temp[0] <= temp <= self.optimal_temp[1]):
            issues += 1
        if do < self.optimal_do:
            issues += 1
        if not (self.optimal_salinity[0] <= salinity <= self.optimal_salinity[1]):
            issues += 1
        if ammonia > self.max_ammonia:
            issues += 1
        
        if issues == 0:
            return "excellent"
        elif issues <= 1:
            return "good"
        elif issues <= 2:
            return "fair"
        elif issues <= 3:
            return "poor"
        else:
            return "critical"
    
    def generate_alerts(self, ph: float, temp: float, do: float, salinity: float, ammonia: float) -> List[str]:
        """Generate alerts based on water quality parameters"""
        alerts = []
        
        if ph < self.optimal_ph[0]:
            alerts.append(f"CRITICAL: pH too low ({ph:.2f}) - immediate action required")
        elif ph > self.optimal_ph[1]:
            alerts.append(f"WARNING: pH too high ({ph:.2f}) - monitor closely")
        
        if temp < self.optimal_temp[0]:
            alerts.append(f"WARNING: Temperature too low ({temp:.1f}°C) - consider heating")
        elif temp > self.optimal_temp[1]:
            alerts.append(f"WARNING: Temperature too high ({temp:.1f}°C) - consider cooling")
        
        if do < self.optimal_do:
            alerts.append(f"CRITICAL: Low dissolved oxygen ({do:.1f} mg/L) - increase aeration")
        
        if salinity < self.optimal_salinity[0]:
            alerts.append(f"WARNING: Salinity too low ({salinity:.1f} ppt) - add salt")
        elif salinity > self.optimal_salinity[1]:
            alerts.append(f"WARNING: Salinity too high ({salinity:.1f} ppt) - dilute water")
        
        if ammonia > self.max_ammonia:
            alerts.append(f"CRITICAL: High ammonia levels ({ammonia:.2f} mg/L) - water change needed")
        
        return alerts
    
    def calculate_growth_rate(self, current_weight: float, temperature: float, 
                             dissolved_oxygen: float, ammonia: float) -> float:
        """
        Calculate daily growth rate based on current conditions
        Growth is affected by:
        - Temperature (optimal: 28°C)
        - Dissolved oxygen (optimal: >5 mg/L)
        - Ammonia levels (optimal: <0.2 mg/L)
        - Current weight (growth slows as shrimp get larger)
        """
        base_rate = self.growth_rate_base
        
        # Temperature effect (optimal around 28°C)
        temp_factor = 1.0
        if 26 <= temperature <= 30:
            temp_factor = 1.0
        elif 24 <= temperature < 26 or 30 < temperature <= 32:
            temp_factor = 0.8
        else:
            temp_factor = 0.5
        
        # Dissolved oxygen effect
        do_factor = min(1.0, dissolved_oxygen / 6.0) if dissolved_oxygen > 0 else 0.3
        
        # Ammonia effect (high ammonia slows growth)
        ammonia_factor = max(0.3, 1.0 - (ammonia / 0.5))
        
        # Weight effect (growth slows as shrimp get larger)
        weight_factor = max(0.3, 1.0 - (current_weight / self.max_weight) * 0.5)
        
        # Apply all factors
        growth_rate = base_rate * temp_factor * do_factor * ammonia_factor * weight_factor
        
        # Add some random variation
        growth_rate *= random.uniform(0.85, 1.15)
        
        return max(0.01, growth_rate)  # Minimum growth
    
    def generate_water_quality(self, day: int, base_ph: float, base_temp: float, 
                               base_do: float, base_salinity: float, 
                               previous_ammonia: float = None) -> Dict[str, Any]:
        """
        Generate water quality data with realistic temporal variation
        """
        # Add seasonal/temporal variation
        seasonal_temp = base_temp + np.sin(day / 30.0) * 2.0  # Seasonal variation
        daily_variation = random.uniform(-0.5, 0.5)
        temp = max(22, min(32, seasonal_temp + daily_variation))
        
        # pH varies with temperature and time of day
        ph = base_ph + (temp - 28) * 0.05 + random.uniform(-0.3, 0.3)
        ph = max(6.5, min(9.0, ph))
        
        # Dissolved oxygen varies with temperature and aeration
        do_base = base_do - (temp - 28) * 0.2  # Lower DO at higher temps
        do = max(2.0, min(9.0, do_base + random.uniform(-1.0, 1.0)))
        
        # Salinity relatively stable but can drift
        salinity = base_salinity + random.uniform(-2, 2)
        salinity = max(10, min(30, salinity))
        
        # Ammonia builds up over time but can be reduced by water exchange
        if previous_ammonia is None:
            ammonia = random.uniform(0.05, 0.15)
        else:
            # Ammonia increases slightly each day, but can be reduced
            ammonia = previous_ammonia + random.uniform(0.01, 0.03)
            # Random water exchange events reduce ammonia
            if random.random() < 0.1:  # 10% chance of water exchange
                ammonia *= 0.5
            ammonia = min(0.5, max(0.0, ammonia))
        
        nitrite = random.uniform(0, 0.1)
        nitrate = random.uniform(0, 10)
        turbidity = random.uniform(0, 5)
        
        status = self.determine_status(ph, temp, do, salinity, ammonia)
        alerts = self.generate_alerts(ph, temp, do, salinity, ammonia)
        
        return {
            'ph': round(ph, 2),
            'temperature': round(temp, 1),
            'dissolved_oxygen': round(do, 1),
            'salinity': round(salinity, 1),
            'ammonia': round(ammonia, 3),
            'nitrite': round(nitrite, 3),
            'nitrate': round(nitrate, 2),
            'turbidity': round(turbidity, 2),
            'status': status,
            'alerts': alerts
        }
    
    def generate_feed_data(self, pond_id: int, shrimp_count: int, avg_weight: float,
                          water_quality: Dict[str, Any]) -> Dict[str, Any]:
        """Generate feed data based on shrimp biomass and water quality"""
        biomass_kg = (shrimp_count * avg_weight) / 1000.0
        
        # Base feed rate: 3-5% of biomass per day
        base_feed_rate = random.uniform(0.03, 0.05)
        daily_feed_grams = biomass_kg * base_feed_rate * 1000
        
        # Adjust feed based on water quality
        if water_quality['dissolved_oxygen'] < 5.0:
            daily_feed_grams *= 0.7  # Reduce feed in low DO conditions
        if water_quality['ammonia'] > 0.2:
            daily_feed_grams *= 0.6  # Reduce feed with high ammonia
        
        # Feeding frequency based on temperature
        if water_quality['temperature'] > 28:
            feeding_freq = 4
        elif water_quality['temperature'] < 26:
            feeding_freq = 2
        else:
            feeding_freq = 3
        
        feed_per_serving = daily_feed_grams / feeding_freq
        
        # Feed type based on shrimp size
        if avg_weight < 5:
            feed_type = "Starter Feed (40% protein)"
        elif avg_weight < 15:
            feed_type = "Grower Feed (35% protein)"
        else:
            feed_type = "Finisher Feed (30% protein)"
        
        return {
            'pond_id': pond_id,
            'shrimp_count': shrimp_count,
            'average_weight': round(avg_weight, 2),
            'feed_amount': round(feed_per_serving, 2),
            'feed_type': feed_type,
            'feeding_frequency': feeding_freq
        }
    
    def generate_energy_data(self, pond_id: int, water_quality: Dict[str, Any]) -> Dict[str, Any]:
        """Generate energy consumption data"""
        base_aerator = 20.0  # kWh
        base_pump = 12.0
        base_heater = 10.0
        
        # Adjust based on water quality needs
        if water_quality['dissolved_oxygen'] < 5.0:
            base_aerator *= 1.5  # Increase aeration
        if water_quality['ammonia'] > 0.2:
            base_pump *= 1.3  # Increase water exchange
        if water_quality['temperature'] < 26:
            base_heater *= 1.5  # Increase heating
        
        # Add some variation
        aerator = base_aerator * random.uniform(0.9, 1.1)
        pump = base_pump * random.uniform(0.9, 1.1)
        heater = base_heater * random.uniform(0.8, 1.2)
        
        total_energy = aerator + pump + heater
        cost = total_energy * 0.12  # LKR per kWh
        
        # Efficiency score based on water quality status
        efficiency_map = {
            'excellent': 0.95,
            'good': 0.90,
            'fair': 0.85,
            'poor': 0.75,
            'critical': 0.60
        }
        efficiency = efficiency_map.get(water_quality['status'], 0.85)
        
        return {
            'pond_id': pond_id,
            'total_energy': round(total_energy, 2),
            'cost': round(cost, 2),
            'efficiency_score': round(efficiency, 2)
        }
    
    def generate_labor_data(self, pond_id: int, water_quality: Dict[str, Any]) -> Dict[str, Any]:
        """Generate labor data"""
        base_tasks = [
            "Shrimp health monitoring",
            "Water quality testing",
            "Feed distribution",
            "Pond cleaning",
            "Data recording"
        ]
        
        # Add tasks based on water quality issues
        tasks = base_tasks.copy()
        if water_quality['status'] in ['poor', 'critical']:
            tasks.extend(["Emergency water exchange", "Equipment maintenance"])
        
        time_spent = random.uniform(2.0, 4.0)
        worker_count = random.randint(1, 2)
        
        # Efficiency based on water quality status
        efficiency_map = {
            'excellent': 1.0,
            'good': 0.95,
            'fair': 0.90,
            'poor': 0.85,
            'critical': 0.75
        }
        efficiency = efficiency_map.get(water_quality['status'], 0.90)
        
        next_tasks = [
            "Daily monitoring",
            "Feed schedule check",
            "Water quality analysis"
        ]
        
        return {
            'pond_id': pond_id,
            'tasks_completed': tasks,
            'time_spent': round(time_spent, 2),
            'worker_count': worker_count,
            'efficiency_score': round(efficiency, 2),
            'next_tasks': next_tasks
        }
    
    def generate_pond_time_series(self, pond_id: int, start_date: datetime, 
                                  num_days: int, initial_weight: float = None) -> List[Dict[str, Any]]:
        """
        Generate a complete time series for a single pond over num_days
        """
        snapshots = []
        
        # Initialize pond parameters
        if initial_weight is None:
            current_weight = random.uniform(*self.initial_weight_range)
        else:
            current_weight = initial_weight
        
        shrimp_count = random.randint(8000, 12000)
        
        # Base water quality parameters (unique per pond)
        base_ph = random.uniform(7.5, 8.5)
        base_temp = random.uniform(27, 29)
        base_do = random.uniform(5.5, 7.0)
        base_salinity = random.uniform(18, 22)
        previous_ammonia = None
        
        for day in range(num_days):
            timestamp = start_date + timedelta(days=day)
            
            # Generate water quality (with temporal dependencies)
            water_quality = self.generate_water_quality(
                day, base_ph, base_temp, base_do, base_salinity, previous_ammonia
            )
            previous_ammonia = water_quality['ammonia']
            
            # Calculate growth for this day
            growth_rate = self.calculate_growth_rate(
                current_weight,
                water_quality['temperature'],
                water_quality['dissolved_oxygen'],
                water_quality['ammonia']
            )
            current_weight += growth_rate
            current_weight = min(current_weight, self.max_weight)
            
            # Some mortality over time (realistic)
            if random.random() < 0.001:  # 0.1% daily mortality
                shrimp_count = max(int(shrimp_count * 0.99), 5000)
            
            # Generate all data for this snapshot
            feed_data = self.generate_feed_data(pond_id, shrimp_count, current_weight, water_quality)
            energy_data = self.generate_energy_data(pond_id, water_quality)
            labor_data = self.generate_labor_data(pond_id, water_quality)
            
            snapshot = {
                'timestamp': timestamp.isoformat(),
                'water_quality': [{
                    'pond_id': pond_id,
                    **water_quality
                }],
                'feed': [feed_data],
                'energy': [energy_data],
                'labor': [labor_data]
            }
            
            snapshots.append(snapshot)
        
        return snapshots
    
    def generate_training_dataset(self, num_samples: int = 20000, 
                                  output_dir: str = '.',
                                  samples_per_file: int = 100) -> None:
        """
        Generate training dataset with approximately num_samples total data points
        
        Parameters:
        - num_samples: Target number of total data points
        - output_dir: Directory to save JSON files
        - samples_per_file: Number of snapshots per JSON file
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        print("=" * 70)
        print("Generating Forecasting Training Data")
        print("=" * 70)
        print(f"Target samples: {num_samples:,}")
        print(f"Samples per file: {samples_per_file}")
        print()
        
        # Calculate number of ponds and days needed
        # We'll generate multiple ponds with different time periods
        num_ponds = 4
        days_per_pond = num_samples // (num_ponds * samples_per_file) * samples_per_file
        days_per_pond = max(30, days_per_pond)  # Minimum 30 days per pond
        
        print(f"Configuration:")
        print(f"  Number of ponds: {num_ponds}")
        print(f"  Days per pond: ~{days_per_pond}")
        print(f"  Estimated total samples: {num_ponds * days_per_pond:,}")
        print()
        
        all_snapshots = []
        file_counter = 1
        
        # Generate data for each pond
        for pond_id in range(1, num_ponds + 1):
            print(f"Generating data for Pond {pond_id}...")
            
            # Vary start dates to create diversity
            start_date = datetime(2024, 1, 1) + timedelta(days=random.randint(0, 100))
            
            # Generate time series for this pond
            pond_snapshots = self.generate_pond_time_series(
                pond_id, start_date, days_per_pond
            )
            
            all_snapshots.extend(pond_snapshots)
            
            print(f"  ✓ Generated {len(pond_snapshots)} snapshots for Pond {pond_id}")
        
        # Shuffle snapshots for better training distribution
        random.shuffle(all_snapshots)
        
        # Save to multiple files
        print(f"\nSaving {len(all_snapshots)} snapshots to files...")
        
        for i in range(0, len(all_snapshots), samples_per_file):
            batch = all_snapshots[i:i + samples_per_file]
            
            filename = output_path / f"forecasting_training_data_{file_counter:04d}.json"
            
            # Save as array of snapshots
            with open(filename, 'w') as f:
                json.dump(batch, f, indent=2)
            
            file_counter += 1
        
        print(f"✓ Saved {file_counter - 1} files")
        print(f"✓ Total samples: {len(all_snapshots):,}")
        print(f"\nFiles saved in: {output_path.absolute()}")
        print("\n" + "=" * 70)
        print("Data generation completed successfully!")
        print("=" * 70)


def main():
    """Main function to run the data generator"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Generate synthetic training data for XGBoost forecasting model'
    )
    parser.add_argument(
        '--samples',
        type=int,
        default=20000,
        help='Target number of data samples (default: 20000)'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='.',
        help='Output directory for JSON files (default: current directory)'
    )
    parser.add_argument(
        '--samples-per-file',
        type=int,
        default=100,
        help='Number of snapshots per JSON file (default: 100)'
    )
    parser.add_argument(
        '--seed',
        type=int,
        default=42,
        help='Random seed for reproducibility (default: 42)'
    )
    
    args = parser.parse_args()
    
    generator = ForecastingDataGenerator(seed=args.seed)
    generator.generate_training_dataset(
        num_samples=args.samples,
        output_dir=args.output_dir,
        samples_per_file=args.samples_per_file
    )


if __name__ == '__main__':
    main()








