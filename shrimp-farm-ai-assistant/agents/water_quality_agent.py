from crewai import Agent, Task

# LangChain has moved OpenAI chat models across packages over time.
# Try the modern import first, then fall back for older LangChain versions.
try:
    from langchain_openai import ChatOpenAI  # type: ignore
except Exception:  # pragma: no cover
    from langchain.chat_models import ChatOpenAI  # type: ignore
import random
from typing import List, Optional
from models import WaterQualityData, WaterQualityStatus, AlertLevel
from config import OPENAI_API_KEY, OPENAI_MODEL_NAME, OPENAI_TEMPERATURE, FARM_CONFIG, USE_MONGODB, USE_READINGS_ONLY
from datetime import datetime, timedelta

# Base values for simulation when MongoDB is not available (dashboard works without DB).
_WQ_SIM_PH = (7.6, 8.2)
_WQ_SIM_TEMP = (26.5, 29.0)
_WQ_SIM_DO = (4.5, 6.5)
_WQ_SIM_SALINITY = (17.0, 22.0)
_WQ_SIM_AMMONIA = (0.05, 0.15)
_WQ_SIM_NITRITE = (0.02, 0.08)
_WQ_SIM_NITRATE = (1.0, 3.0)
_WQ_SIM_TURBIDITY = (1.0, 3.0)


class WaterQualityAgent:
    def __init__(self):
        # LLM is optional; simulation mode and downstream dashboards should work without an OpenAI key.
        self.llm = None
        self.agent = None
        self.repository = None
        
        # Shrimp-farm-ai-assistant uses only MongoDB for data when USE_MONGODB is true
        if USE_MONGODB:
            from database.repository import DataRepository
            self.repository = DataRepository()

        if OPENAI_API_KEY:
            self.llm = ChatOpenAI(
                openai_api_key=OPENAI_API_KEY,
                model_name=OPENAI_MODEL_NAME,
                temperature=OPENAI_TEMPERATURE,
            )

            self.agent = Agent(
                role="Water Quality Monitoring Specialist",
                goal="Monitor and analyze water quality parameters to ensure optimal shrimp health and growth",
                backstory="""You are an expert aquaculture specialist with 15 years of experience in shrimp farming. 
                You have deep knowledge of water chemistry, biological processes, and their impact on shrimp health. 
                You can quickly identify water quality issues and provide actionable recommendations.""",
                verbose=True,
                allow_delegation=False,
                llm=self.llm,
            )
    
    def create_monitoring_task(self, pond_id: int) -> Task:
        return Task(
            description=f"""
            Monitor water quality for Pond {pond_id} and provide analysis:
            
            1. Analyze current water quality parameters:
               - pH levels (optimal: {FARM_CONFIG['optimal_ph_range'][0]}-{FARM_CONFIG['optimal_ph_range'][1]})
               - Temperature (optimal: {FARM_CONFIG['optimal_temperature_range'][0]}-{FARM_CONFIG['optimal_temperature_range'][1]}°C)
               - Dissolved oxygen (optimal: >{FARM_CONFIG['optimal_dissolved_oxygen']} mg/L)
               - Salinity (optimal: {FARM_CONFIG['optimal_salinity_range'][0]}-{FARM_CONFIG['optimal_salinity_range'][1]} ppt)
               - Ammonia, nitrite, nitrate levels
               - Turbidity
            
            2. Identify any anomalies or concerning trends
            3. Assess overall water quality status
            4. Provide specific recommendations for improvement
            5. Generate alerts for critical issues
            
            Return a comprehensive water quality report with status, alerts, and recommendations.
            """,
            agent=self.agent,
            expected_output="Detailed water quality analysis report with status, alerts, and actionable recommendations"
        )
    
    def get_water_quality_data(self, pond_id: int) -> WaterQualityData:
        """Get water quality data from MongoDB (water_quality_readings), or simulated when allowed."""
        if self.repository and self.repository.is_available:
            try:
                data = self.repository.get_latest_water_quality(pond_id)
                if data:
                    print(f"[DB] Fetched water quality data for pond {pond_id} from MongoDB")
                    return data
            except Exception as e:
                print(f"Error: Could not fetch from MongoDB: {e}")
        if USE_READINGS_ONLY:
            raise ValueError(
                f"USE_READINGS_ONLY=true: no water_quality_readings row for pond {pond_id}. "
                "Populate MongoDB or set USE_READINGS_ONLY=false."
            )
        return self._generate_simulated_water_quality(pond_id)

    def _generate_simulated_water_quality(self, pond_id: int) -> WaterQualityData:
        """Generate simulated water quality for dashboard when MongoDB is not available."""
        # Deterministic per-pond variation so dashboard is stable
        r = random.Random(pond_id)
        ph = round(r.uniform(*_WQ_SIM_PH), 2)
        temp = round(r.uniform(*_WQ_SIM_TEMP), 1)
        do = round(r.uniform(*_WQ_SIM_DO), 1)
        salinity = round(r.uniform(*_WQ_SIM_SALINITY), 1)
        ammonia = round(r.uniform(*_WQ_SIM_AMMONIA), 2)
        nitrite = round(r.uniform(*_WQ_SIM_NITRITE), 2)
        nitrate = round(r.uniform(*_WQ_SIM_NITRATE), 1)
        turbidity = round(r.uniform(*_WQ_SIM_TURBIDITY), 1)
        status = self._determine_water_quality_status(ph, temp, do, salinity, ammonia)
        alerts = self._generate_alerts(ph, temp, do, salinity, ammonia)
        return WaterQualityData(
            timestamp=datetime.now(),
            pond_id=pond_id,
            ph=ph,
            temperature=temp,
            dissolved_oxygen=do,
            salinity=salinity,
            ammonia=ammonia,
            nitrite=nitrite,
            nitrate=nitrate,
            turbidity=turbidity,
            status=status,
            alerts=alerts,
        )

    def _determine_water_quality_status(self, ph: float, temp: float, do: float, salinity: float, ammonia: float) -> WaterQualityStatus:
        """Determine overall water quality status based on parameters"""
        issues = 0
        
        if not (FARM_CONFIG['optimal_ph_range'][0] <= ph <= FARM_CONFIG['optimal_ph_range'][1]):
            issues += 1
        if not (FARM_CONFIG['optimal_temperature_range'][0] <= temp <= FARM_CONFIG['optimal_temperature_range'][1]):
            issues += 1
        if do < FARM_CONFIG['optimal_dissolved_oxygen']:
            issues += 1
        if not (FARM_CONFIG['optimal_salinity_range'][0] <= salinity <= FARM_CONFIG['optimal_salinity_range'][1]):
            issues += 1
        if ammonia > 0.2:
            issues += 1
        
        if issues == 0:
            return WaterQualityStatus.EXCELLENT
        elif issues <= 1:
            return WaterQualityStatus.GOOD
        elif issues <= 2:
            return WaterQualityStatus.FAIR
        elif issues <= 3:
            return WaterQualityStatus.POOR
        else:
            return WaterQualityStatus.CRITICAL
    
    def _generate_alerts(self, ph: float, temp: float, do: float, salinity: float, ammonia: float) -> List[str]:
        """Generate alerts based on water quality parameters"""
        alerts = []
        
        if ph < FARM_CONFIG['optimal_ph_range'][0]:
            alerts.append(f"CRITICAL: pH too low ({ph:.2f}) - immediate action required")
        elif ph > FARM_CONFIG['optimal_ph_range'][1]:
            alerts.append(f"WARNING: pH too high ({ph:.2f}) - monitor closely")
        
        if temp < FARM_CONFIG['optimal_temperature_range'][0]:
            alerts.append(f"WARNING: Temperature too low ({temp:.1f}°C) - consider heating")
        elif temp > FARM_CONFIG['optimal_temperature_range'][1]:
            alerts.append(f"WARNING: Temperature too high ({temp:.1f}°C) - consider cooling")
        
        if do < FARM_CONFIG['optimal_dissolved_oxygen']:
            alerts.append(f"CRITICAL: Low dissolved oxygen ({do:.1f} mg/L) - increase aeration")
        
        if salinity < FARM_CONFIG['optimal_salinity_range'][0]:
            alerts.append(f"WARNING: Salinity too low ({salinity:.1f} ppt) - add salt")
        elif salinity > FARM_CONFIG['optimal_salinity_range'][1]:
            alerts.append(f"WARNING: Salinity too high ({salinity:.1f} ppt) - dilute water")
        
        if ammonia > 0.2:
            alerts.append(f"CRITICAL: High ammonia levels ({ammonia:.2f} mg/L) - water change needed")
        
        return alerts
