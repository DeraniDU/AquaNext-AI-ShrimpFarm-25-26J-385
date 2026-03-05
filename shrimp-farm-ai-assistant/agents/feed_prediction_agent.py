from crewai import Agent, Task

# LangChain has moved OpenAI chat models across packages over time.
# Try the modern import first, then fall back for older LangChain versions.
try:
    from langchain_openai import ChatOpenAI  # type: ignore
except Exception:  # pragma: no cover
    from langchain.chat_models import ChatOpenAI  # type: ignore
from models import FeedData, WaterQualityData
from config import OPENAI_API_KEY, OPENAI_MODEL_NAME, OPENAI_TEMPERATURE, FARM_CONFIG, USE_MONGODB
from datetime import datetime, timedelta
from typing import List, Optional

class FeedPredictionAgent:
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
                role="Feed Optimization Specialist",
                goal="Predict optimal feed requirements and timing for maximum shrimp growth and feed efficiency",
                backstory="""You are a nutritionist and aquaculture expert with 12 years of experience in shrimp feed management. 
                You understand the relationship between water quality, shrimp growth stages, and nutritional requirements. 
                You can predict feed needs based on environmental conditions and shrimp development stages.""",
                verbose=True,
                allow_delegation=False,
                llm=self.llm,
            )
    
    def create_feed_prediction_task(self, pond_id: int, water_quality_data: WaterQualityData, 
                                  current_shrimp_data: dict) -> Task:
        return Task(
            description=f"""
            Analyze and predict feed requirements for Pond {pond_id}:
            
            Current Conditions:
            - Water Quality: pH={water_quality_data.ph:.2f}, Temp={water_quality_data.temperature:.1f}°C, 
              DO={water_quality_data.dissolved_oxygen:.1f} mg/L, Salinity={water_quality_data.salinity:.1f} ppt
            - Shrimp Count: {current_shrimp_data.get('count', 'Unknown')}
            - Average Weight: {current_shrimp_data.get('weight', 'Unknown')} grams
            - Current Feed Type: {current_shrimp_data.get('feed_type', 'Unknown')}
            
            Analysis Required:
            1. Assess current shrimp growth stage and nutritional needs
            2. Consider water quality impact on feeding behavior and metabolism
            3. Calculate optimal feed amount based on biomass and growth rate
            4. Determine feeding frequency based on water temperature and oxygen levels
            5. Predict next feeding time and amount
            6. Identify any feed efficiency issues or opportunities
            7. Recommend feed type adjustments if needed
            
            Return detailed feed prediction with amounts, timing, and efficiency recommendations.
            """,
            agent=self.agent,
            expected_output="Comprehensive feed prediction report with amounts, timing, and efficiency recommendations"
        )
    
    def get_feed_data(self, pond_id: int, water_quality_data: Optional[WaterQualityData] = None) -> FeedData:
        """Get feed data from MongoDB"""
        if not self.repository or not self.repository.is_available:
            raise ValueError(f"MongoDB repository not available. Cannot fetch feed data for pond {pond_id}")
        
        try:
            data = self.repository.get_latest_feed_data(pond_id)
            if data:
                print(f"[DB] Fetched feed data for pond {pond_id} from MongoDB")
                return data
            else:
                raise ValueError(f"No feed data found in database for pond {pond_id}")
        except Exception as e:
            print(f"Error: Could not fetch from MongoDB: {e}")
            raise
    
    def _calculate_feed_adjustment(self, water_quality_data: WaterQualityData) -> float:
        """Calculate feed adjustment factor based on water quality"""
        adjustment = 1.0
        
        # Temperature adjustment
        if water_quality_data.temperature < 26:
            adjustment *= 0.8  # Reduce feeding in cold water
        elif water_quality_data.temperature > 30:
            adjustment *= 0.9  # Slightly reduce in very warm water
        
        # Dissolved oxygen adjustment
        if water_quality_data.dissolved_oxygen < 5:
            adjustment *= 0.7  # Reduce feeding when oxygen is low
        
        # pH adjustment
        if water_quality_data.ph < 7.5 or water_quality_data.ph > 8.5:
            adjustment *= 0.9  # Slightly reduce when pH is off
        
        # Ammonia adjustment
        if water_quality_data.ammonia > 0.2:
            adjustment *= 0.6  # Significantly reduce when ammonia is high
        
        return max(0.5, min(1.2, adjustment))  # Keep adjustment between 0.5 and 1.2
    
    def _select_feed_type(self, average_weight: float) -> str:
        """Select appropriate feed type based on shrimp size"""
        if average_weight < 5:
            return "Starter Feed (40% protein)"
        elif average_weight < 10:
            return "Grower Feed (35% protein)"
        elif average_weight < 15:
            return "Developer Feed (32% protein)"
        else:
            return "Finisher Feed (30% protein)"
    
    def analyze_feed_efficiency(self, feed_data: FeedData, water_quality_data: WaterQualityData) -> dict:
        """Analyze feed efficiency and provide recommendations"""
        efficiency_score = self._calculate_efficiency_score(feed_data, water_quality_data)
        
        recommendations = []
        
        if efficiency_score < 0.7:
            recommendations.append("Consider reducing feed amount - low efficiency detected")
        elif efficiency_score > 0.9:
            recommendations.append("Excellent feed efficiency - maintain current practices")
        
        if water_quality_data.dissolved_oxygen < 5:
            recommendations.append("Increase aeration to improve feed conversion")
        
        if water_quality_data.temperature < 26:
            recommendations.append("Consider heating to improve metabolism and feed utilization")
        
        if water_quality_data.ammonia > 0.2:
            recommendations.append("Address water quality issues before optimizing feeding")
        
        return {
            "efficiency_score": efficiency_score,
            "recommendations": recommendations,
            "status": "Good" if efficiency_score > 0.8 else "Needs Improvement"
        }
    
    def _calculate_efficiency_score(self, feed_data: FeedData, water_quality_data: WaterQualityData) -> float:
        """Calculate feed efficiency score based on various factors"""
        score = 0.8  # Base score
        
        # Water quality factors
        if 7.5 <= water_quality_data.ph <= 8.5:
            score += 0.05
        if 26 <= water_quality_data.temperature <= 30:
            score += 0.05
        if water_quality_data.dissolved_oxygen >= 5:
            score += 0.05
        if water_quality_data.ammonia < 0.2:
            score += 0.05
        
        # Feed management factors
        if 3 <= feed_data.feeding_frequency <= 4:
            score += 0.05
        
        return min(1.0, max(0.0, score))
