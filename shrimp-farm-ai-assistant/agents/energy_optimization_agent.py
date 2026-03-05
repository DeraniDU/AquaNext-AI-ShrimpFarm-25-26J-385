from crewai import Agent, Task

# LangChain has moved OpenAI chat models across packages over time.
# Try the modern import first, then fall back for older LangChain versions.
try:
    from langchain_openai import ChatOpenAI  # type: ignore
except Exception:  # pragma: no cover
    from langchain.chat_models import ChatOpenAI  # type: ignore
from models import EnergyData, WaterQualityData
from config import OPENAI_API_KEY, OPENAI_MODEL_NAME, OPENAI_TEMPERATURE, USE_MONGODB
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class EnergyOptimizationAgent:
    def __init__(self):
        # LLM is optional; simulation mode and downstream dashboards should work without an OpenAI key.
        self.llm = None
        self.agent = None
        self.repository = None
        
        # Initialize MongoDB repository if enabled
        if USE_MONGODB:
            try:
                from database.repository import DataRepository
                self.repository = DataRepository()
            except Exception as e:
                print(f"Warning: Could not initialize MongoDB repository: {e}")

        if OPENAI_API_KEY:
            self.llm = ChatOpenAI(
                openai_api_key=OPENAI_API_KEY,
                model_name=OPENAI_MODEL_NAME,
                temperature=OPENAI_TEMPERATURE,
            )

            self.agent = Agent(
                role="Energy Efficiency Specialist",
                goal="Optimize energy consumption across all farm operations while maintaining optimal conditions for shrimp growth",
                backstory="""You are an energy management expert with 10 years of experience in aquaculture and renewable energy systems. 
                You understand the energy requirements of shrimp farming operations and can identify opportunities for optimization 
                while ensuring water quality and shrimp health are not compromised.""",
                verbose=True,
                allow_delegation=False,
                llm=self.llm,
            )
    
    def create_energy_optimization_task(self, pond_id: int, water_quality_data: WaterQualityData, 
                                       current_energy_data: EnergyData) -> Task:
        return Task(
            description=f"""
            Analyze and optimize energy consumption for Pond {pond_id}:
            
            Current Energy Usage:
            - Aerator: {current_energy_data.aerator_usage:.2f} kWh
            - Pump: {current_energy_data.pump_usage:.2f} kWh  
            - Heater: {current_energy_data.heater_usage:.2f} kWh
            - Total: {current_energy_data.total_energy:.2f} kWh
            - Cost: ${current_energy_data.cost:.2f}
            - Efficiency Score: {current_energy_data.efficiency_score:.2f}
            
            Water Quality Context:
            - Temperature: {water_quality_data.temperature:.1f}°C
            - Dissolved Oxygen: {water_quality_data.dissolved_oxygen:.1f} mg/L
            - pH: {water_quality_data.ph:.2f}
            
            Optimization Analysis Required:
            1. Analyze current energy consumption patterns
            2. Identify energy waste and inefficiencies
            3. Recommend equipment scheduling optimizations
            4. Suggest renewable energy integration opportunities
            5. Calculate potential cost savings
            6. Ensure recommendations maintain water quality standards
            7. Provide implementation timeline and ROI analysis
            
            Return comprehensive energy optimization plan with specific recommendations and cost-benefit analysis.
            """,
            agent=self.agent,
            expected_output="Detailed energy optimization plan with recommendations, cost savings, and implementation strategy"
        )
    
    def get_energy_data(self, pond_id: int, water_quality_data: Optional[WaterQualityData] = None) -> EnergyData:
        """Get energy data from MongoDB"""
        if not self.repository or not self.repository.is_available:
            raise ValueError(f"MongoDB repository not available. Cannot fetch energy data for pond {pond_id}")
        
        try:
            data = self.repository.get_latest_energy_data(pond_id)
            if data:
                print(f"[DB] Fetched energy data for pond {pond_id} from MongoDB")
                return data
            else:
                raise ValueError(f"No energy data found in database for pond {pond_id}")
        except Exception as e:
            print(f"Error: Could not fetch from MongoDB: {e}")
            raise
    
    def _calculate_aerator_usage(self, water_quality_data: WaterQualityData) -> float:
        """Calculate aerator usage adjustment based on dissolved oxygen"""
        if water_quality_data.dissolved_oxygen < 4:
            return 1.5  # Increase aeration significantly
        elif water_quality_data.dissolved_oxygen < 5:
            return 1.2  # Increase aeration moderately
        elif water_quality_data.dissolved_oxygen > 7:
            return 0.8  # Reduce aeration when oxygen is high
        else:
            return 1.0  # Normal operation
    
    def _calculate_pump_usage(self, water_quality_data: WaterQualityData) -> float:
        """Calculate pump usage adjustment based on water quality"""
        adjustment = 1.0
        
        # Increase pumping if water quality is poor
        if water_quality_data.ammonia > 0.2:
            adjustment += 0.3
        if water_quality_data.nitrite > 0.1:
            adjustment += 0.2
        if water_quality_data.turbidity > 3:
            adjustment += 0.1
        
        return min(1.5, adjustment)  # Cap at 50% increase
    
    def _calculate_heater_usage(self, water_quality_data: WaterQualityData) -> float:
        """Calculate heater usage based on temperature"""
        if water_quality_data.temperature < 26:
            return 1.5  # Increase heating
        elif water_quality_data.temperature < 27:
            return 1.2  # Moderate heating
        elif water_quality_data.temperature > 30:
            return 0.0  # No heating needed
        else:
            return 0.5  # Minimal heating
    
    def _calculate_efficiency_score(self, water_quality_data: WaterQualityData, 
                                  aerator_usage: float, pump_usage: float, heater_usage: float) -> float:
        """Calculate overall energy efficiency score"""
        score = 0.8  # Base score
        
        # Water quality efficiency
        if 7.5 <= water_quality_data.ph <= 8.5:
            score += 0.05
        if 26 <= water_quality_data.temperature <= 30:
            score += 0.05
        if water_quality_data.dissolved_oxygen >= 5:
            score += 0.05
        
        # Energy usage efficiency
        total_usage = aerator_usage + pump_usage + heater_usage
        if total_usage < 30:  # Low energy usage
            score += 0.05
        elif total_usage > 50:  # High energy usage
            score -= 0.05
        
        return min(1.0, max(0.0, score))
    
    def generate_optimization_recommendations(self, energy_data: EnergyData, 
                                            water_quality_data: WaterQualityData) -> List[Dict]:
        """Generate specific energy optimization recommendations"""
        recommendations = []
        
        # Aerator optimization
        if energy_data.aerator_usage > 20:
            recommendations.append({
                "category": "Aerator Optimization",
                "priority": "High",
                "recommendation": "Consider variable speed aerators or scheduling optimization",
                "potential_savings": f"${(energy_data.aerator_usage - 15) * 0.12 * 30:.2f}/month",
                "implementation": "Medium"
            })
        
        # Pump optimization
        if energy_data.pump_usage > 12:
            recommendations.append({
                "category": "Pump Optimization", 
                "priority": "Medium",
                "recommendation": "Implement smart pumping schedules based on water quality",
                "potential_savings": f"${(energy_data.pump_usage - 10) * 0.12 * 30:.2f}/month",
                "implementation": "Low"
            })
        
        # Heater optimization
        if energy_data.heater_usage > 15:
            recommendations.append({
                "category": "Heating Optimization",
                "priority": "High", 
                "recommendation": "Consider solar heating or improved insulation",
                "potential_savings": f"${energy_data.heater_usage * 0.12 * 30:.2f}/month",
                "implementation": "High"
            })
        
        # Renewable energy
        if energy_data.total_energy > 40:
            recommendations.append({
                "category": "Renewable Energy",
                "priority": "Medium",
                "recommendation": "Consider solar panel installation for aerators",
                "potential_savings": f"${energy_data.total_energy * 0.12 * 30 * 0.6:.2f}/month",
                "implementation": "High"
            })
        
        # Smart scheduling
        recommendations.append({
            "category": "Smart Scheduling",
            "priority": "Low",
            "recommendation": "Implement IoT-based equipment scheduling",
            "potential_savings": f"${energy_data.total_energy * 0.12 * 30 * 0.15:.2f}/month",
            "implementation": "Medium"
        })
        
        return recommendations
    
    def calculate_roi(self, recommendations: List[Dict], current_monthly_cost: float) -> Dict:
        """Calculate ROI for optimization recommendations"""
        total_monthly_savings = sum(float(rec["potential_savings"].replace("$", "").replace("/month", "")) 
                                 for rec in recommendations)
        
        # Estimate implementation costs (simplified)
        implementation_costs = {
            "High": 5000,
            "Medium": 2000, 
            "Low": 500
        }
        
        total_implementation_cost = sum(
            implementation_costs.get(rec["implementation"], 1000) 
            for rec in recommendations
        )
        
        if total_monthly_savings > 0:
            payback_period = total_implementation_cost / total_monthly_savings
            annual_savings = total_monthly_savings * 12
            roi_percentage = (annual_savings - total_implementation_cost) / total_implementation_cost * 100
        else:
            payback_period = float('inf')
            roi_percentage = 0
        
        return {
            "total_monthly_savings": total_monthly_savings,
            "total_implementation_cost": total_implementation_cost,
            "payback_period_months": payback_period,
            "annual_savings": total_monthly_savings * 12,
            "roi_percentage": roi_percentage
        }
