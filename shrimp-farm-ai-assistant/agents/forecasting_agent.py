from crewai import Agent, Task
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json

# LangChain has moved OpenAI chat models across packages over time.
try:
    from langchain_openai import ChatOpenAI  # type: ignore
except Exception:  # pragma: no cover
    from langchain.chat_models import ChatOpenAI  # type: ignore

from models import WaterQualityData, FeedData, EnergyData, LaborData
from config import OPENAI_API_KEY, OPENAI_MODEL_NAME, OPENAI_TEMPERATURE

class ForecastingAgent:
    """AI agent for generating forecasts and predictions for shrimp farming operations"""
    
    def __init__(self):
        self.llm = None
        self.agent = None
        
        if OPENAI_API_KEY:
            self.llm = ChatOpenAI(
                openai_api_key=OPENAI_API_KEY,
                model_name=OPENAI_MODEL_NAME,
                temperature=OPENAI_TEMPERATURE,
            )
            
            self.agent = Agent(
                role="Shrimp Farm Forecasting Specialist",
                goal="Generate accurate forecasts for shrimp growth, water quality, disease risk, and profitability based on historical data and current conditions",
                backstory="""You are an expert aquaculture data scientist with 15 years of experience in predictive modeling for shrimp farming. 
                You specialize in analyzing historical farm data, environmental patterns, and biological growth curves to predict future outcomes. 
                You understand the complex relationships between water quality, feeding schedules, temperature, and shrimp growth rates. 
                You can forecast disease risks, optimal harvest windows, and profitability projections with high accuracy.""",
                verbose=True,
                allow_delegation=False,
                llm=self.llm,
            )
    
    def generate_forecasts(
        self,
        water_quality_data: List[WaterQualityData],
        feed_data: List[FeedData],
        energy_data: List[EnergyData],
        labor_data: List[LaborData],
        historical_snapshots: List[Dict[str, Any]],
        forecast_days: int = 90
    ) -> Dict[str, Any]:
        """
        Generate comprehensive forecasts for the farm.
        
        Returns:
            Dictionary containing:
            - growth_forecast: Projected shrimp weight over time
            - water_quality_forecast: Projected water quality parameters
            - disease_risk_forecast: Projected disease risk levels
            - profit_forecast: Projected profitability
            - harvest_window: Optimal harvest timing
            - ai_predictions: AI-generated insights and predictions
        """
        if not self.agent:
            # Fallback to rule-based forecasts if LLM not available
            return self._generate_rule_based_forecasts(
                water_quality_data, feed_data, energy_data, labor_data, historical_snapshots, forecast_days
            )
        
        try:
            # Create forecasting task
            task = self._create_forecasting_task(
                water_quality_data, feed_data, energy_data, labor_data, historical_snapshots, forecast_days
            )
            
            # Execute task
            from crewai import Crew
            crew = Crew(agents=[self.agent], tasks=[task], verbose=True)
            result = crew.kickoff()
            
            # Parse LLM response
            return self._parse_forecast_response(result, forecast_days)
            
        except Exception as e:
            print(f"Warning: Could not generate AI forecasts: {e}. Falling back to rule-based forecasts.")
            return self._generate_rule_based_forecasts(
                water_quality_data, feed_data, energy_data, labor_data, historical_snapshots, forecast_days
            )
    
    def _create_forecasting_task(
        self,
        water_quality_data: List[WaterQualityData],
        feed_data: List[FeedData],
        energy_data: List[EnergyData],
        labor_data: List[LaborData],
        historical_snapshots: List[Dict[str, Any]],
        forecast_days: int
    ) -> Task:
        """Create a forecasting task for the agent"""
        
        # Format current data
        current_summary = self._format_current_data(water_quality_data, feed_data, energy_data, labor_data)
        
        # Format historical data
        historical_summary = self._format_historical_data(historical_snapshots)
        
        return Task(
            description=f"""
            Generate comprehensive forecasts for shrimp farm operations over the next {forecast_days} days.
            
            Current Farm Status:
            {current_summary}
            
            Historical Data (Last {len(historical_snapshots)} snapshots):
            {historical_summary}
            
            Forecasting Requirements:
            1. **Growth Forecast**: Predict shrimp weight progression over the next {forecast_days} days
               - Consider current growth rate, feed efficiency, and water quality
               - Account for seasonal variations and growth plateaus
               - Identify optimal harvest window (target weight: 20-25g)
            
            2. **Water Quality Forecast**: Predict pH, dissolved oxygen, temperature, and salinity trends
               - Consider seasonal patterns, equipment usage, and environmental factors
               - Identify potential quality issues and their timing
               - Forecast optimal ranges for each parameter
            
            3. **Disease Risk Forecast**: Predict disease risk levels over time
               - Consider temperature, dissolved oxygen, ammonia levels
               - Identify high-risk periods
               - Account for seasonal disease patterns (e.g., WSSV, EMS, Vibriosis)
            
            4. **Profitability Forecast**: Predict revenue, costs, and profit over time
               - Consider shrimp growth, market prices, feed costs, energy costs
               - Account for harvest timing and yield
               - Identify optimal harvest windows for maximum profit
            
            5. **AI Predictions**: Generate strategic insights including:
               - Projected peak growth phases
               - Market price forecasts
               - Disease risk warnings
               - Optimal harvest recommendations
               - Environmental risk factors
            
            Return your forecasts in JSON format with the following structure:
            {{
                "growth_forecast": [
                    {{"day": 1, "avg_weight_g": 12.5, "biomass_kg": 150.0}},
                    ...
                ],
                "water_quality_forecast": [
                    {{"day": 1, "ph": 7.8, "dissolved_oxygen": 6.2, "temperature": 28.5, "salinity": 20}},
                    ...
                ],
                "disease_risk_forecast": [
                    {{"day": 1, "risk_level": 0.2, "risk_type": "low", "factors": ["normal temperature", "adequate DO"]}},
                    ...
                ],
                "profit_forecast": [
                    {{"day": 1, "revenue_lkr": 300000, "costs_lkr": 50000, "profit_lkr": 250000}},
                    ...
                ],
                "harvest_window": {{
                    "optimal_start": "2024-05-15",
                    "optimal_end": "2024-05-25",
                    "projected_yield_tons": 5.2,
                    "fcr": 1.3
                }},
                "ai_predictions": [
                    "Projected peak growth phase in late May",
                    "Stable market price forecast at Rs. 2000/kg",
                    "High risk of viral infection in mid-June due to high temperatures"
                ]
            }}
            """,
            agent=self.agent,
            expected_output="JSON-formatted forecasts with growth, water quality, disease risk, profitability, and AI predictions"
        )
    
    def _format_current_data(
        self,
        water_quality_data: List[WaterQualityData],
        feed_data: List[FeedData],
        energy_data: List[EnergyData],
        labor_data: List[LaborData]
    ) -> str:
        """Format current farm data for the agent"""
        summary = []
        
        summary.append("Water Quality:")
        for wq in water_quality_data:
            summary.append(
                f"  Pond {wq.pond_id}: pH={wq.ph:.2f}, Temp={wq.temperature:.1f}°C, "
                f"DO={wq.dissolved_oxygen:.1f}mg/L, Salinity={wq.salinity:.1f}ppt, Status={wq.status.value}"
            )
        
        summary.append("\nFeed Data:")
        for feed in feed_data:
            summary.append(
                f"  Pond {feed.pond_id}: {feed.shrimp_count} shrimp, {feed.average_weight:.1f}g avg, "
                f"{feed.feed_amount:.1f}g feed/day, {feed.feeding_frequency}x/day"
            )
        
        summary.append("\nEnergy Data:")
        for energy in energy_data:
            summary.append(
                f"  Pond {energy.pond_id}: {energy.total_energy:.1f}kWh, Rs.{energy.cost:.2f} cost, "
                f"Efficiency={energy.efficiency_score:.2f}"
            )
        
        return "\n".join(summary)
    
    def _format_historical_data(self, historical_snapshots: List[Dict[str, Any]]) -> str:
        """Format historical data for the agent"""
        if not historical_snapshots:
            return "No historical data available"
        
        summary = []
        for i, snap in enumerate(historical_snapshots[-10:]):  # Last 10 snapshots
            timestamp = snap.get("timestamp", "Unknown")
            summary.append(f"\nSnapshot {i+1} ({timestamp}):")
            
            if "feed" in snap:
                total_weight = sum(f.get("average_weight", 0) * f.get("shrimp_count", 0) for f in snap["feed"]) / 1000
                summary.append(f"  Total Biomass: {total_weight:.1f}kg")
            
            if "water_quality" in snap:
                avg_ph = sum(w.get("ph", 0) for w in snap["water_quality"]) / len(snap["water_quality"]) if snap["water_quality"] else 0
                avg_temp = sum(w.get("temperature", 0) for w in snap["water_quality"]) / len(snap["water_quality"]) if snap["water_quality"] else 0
                summary.append(f"  Avg pH: {avg_ph:.2f}, Avg Temp: {avg_temp:.1f}°C")
        
        return "\n".join(summary)
    
    def _parse_forecast_response(self, result: Any, forecast_days: int) -> Dict[str, Any]:
        """Parse LLM response into structured forecast data"""
        try:
            # Extract JSON from LLM response
            result_str = str(result)
            
            # Try to find JSON in the response
            import re
            json_match = re.search(r'\{.*\}', result_str, re.DOTALL)
            if json_match:
                forecast_data = json.loads(json_match.group())
            else:
                # If no JSON found, try to parse the entire result
                forecast_data = json.loads(result_str)
            
            # Validate and fill in missing data
            return self._validate_and_complete_forecasts(forecast_data, forecast_days)
            
        except Exception as e:
            print(f"Error parsing forecast response: {e}")
            # Return empty structure
            return self._generate_rule_based_forecasts([], [], [], [], [], forecast_days)
    
    def _validate_and_complete_forecasts(self, forecast_data: Dict[str, Any], forecast_days: int) -> Dict[str, Any]:
        """Validate and complete forecast data structure"""
        # Ensure all required fields exist
        if "growth_forecast" not in forecast_data:
            forecast_data["growth_forecast"] = []
        if "water_quality_forecast" not in forecast_data:
            forecast_data["water_quality_forecast"] = []
        if "disease_risk_forecast" not in forecast_data:
            forecast_data["disease_risk_forecast"] = []
        if "profit_forecast" not in forecast_data:
            forecast_data["profit_forecast"] = []
        if "harvest_window" not in forecast_data:
            forecast_data["harvest_window"] = {}
        if "ai_predictions" not in forecast_data:
            forecast_data["ai_predictions"] = []
        
        return forecast_data
    
    def _generate_rule_based_forecasts(
        self,
        water_quality_data: List[WaterQualityData],
        feed_data: List[FeedData],
        energy_data: List[EnergyData],
        labor_data: List[LaborData],
        historical_snapshots: List[Dict[str, Any]],
        forecast_days: int
    ) -> Dict[str, Any]:
        """Generate rule-based forecasts as fallback"""
        import random
        import math
        
        # Calculate current metrics
        current_weight = sum(f.average_weight for f in feed_data) / len(feed_data) if feed_data else 10
        avg_ph = sum(w.ph for w in water_quality_data) / len(water_quality_data) if water_quality_data else 7.8
        avg_do = sum(w.dissolved_oxygen for w in water_quality_data) / len(water_quality_data) if water_quality_data else 6.0
        avg_temp = sum(w.temperature for w in water_quality_data) / len(water_quality_data) if water_quality_data else 28
        
        # Calculate growth rate from history
        growth_rate = 0.5  # Default
        if len(historical_snapshots) >= 2:
            last = historical_snapshots[-1]
            prev = historical_snapshots[-2]
            if "feed" in last and "feed" in prev:
                last_weight = sum(f.get("average_weight", 0) for f in last["feed"]) / len(last["feed"]) if last["feed"] else current_weight
                prev_weight = sum(f.get("average_weight", 0) for f in prev["feed"]) / len(prev["feed"]) if prev["feed"] else current_weight
                days_diff = 7  # Assume weekly snapshots
                growth_rate = max(0.1, (last_weight - prev_weight) / days_diff) if days_diff > 0 else 0.5
        
        # Generate forecasts
        growth_forecast = []
        water_quality_forecast = []
        disease_risk_forecast = []
        profit_forecast = []
        
        target_weight = 22
        shrimp_price_per_kg = 2000
        feed_cost_per_kg = 400
        
        for day in range(1, forecast_days + 1):
            # Growth forecast
            projected_weight = min(target_weight, current_weight + (growth_rate * day))
            total_biomass = sum(f.shrimp_count * projected_weight / 1000 for f in feed_data) if feed_data else 0
            growth_forecast.append({
                "day": day,
                "avg_weight_g": round(projected_weight, 2),
                "biomass_kg": round(total_biomass, 2)
            })
            
            # Water quality forecast (with seasonal variation)
            seasonal = math.sin((day / forecast_days) * math.pi * 2) * 0.3
            ph = max(7.2, min(8.5, avg_ph + seasonal))
            do = max(4.5, min(8.0, avg_do + seasonal * 0.5))
            temp = max(24, min(32, avg_temp + (day / forecast_days) * 2 + seasonal * 1.5))
            salinity = 20 + seasonal * 2
            
            water_quality_forecast.append({
                "day": day,
                "ph": round(ph, 2),
                "dissolved_oxygen": round(do, 2),
                "temperature": round(temp, 1),
                "salinity": round(salinity, 1)
            })
            
            # Disease risk forecast
            temp_risk = 0.6 if temp > 30 else (0.4 if temp > 28 else 0.2)
            do_risk = 0.4 if do < 5 else 0.1
            seasonal_risk = (math.sin((day / forecast_days) * math.pi * 2 + math.pi / 2) * 0.3) + 0.3
            risk_level = min(1.0, temp_risk + do_risk + seasonal_risk)
            
            risk_type = "high" if risk_level > 0.6 else ("medium" if risk_level > 0.4 else "low")
            factors = []
            if temp > 30:
                factors.append("high temperature")
            if do < 5:
                factors.append("low dissolved oxygen")
            if risk_level < 0.4:
                factors.append("normal conditions")
            
            disease_risk_forecast.append({
                "day": day,
                "risk_level": round(risk_level, 2),
                "risk_type": risk_type,
                "factors": factors
            })
            
            # Profit forecast
            revenue = total_biomass * shrimp_price_per_kg
            feed_cost = sum(f.feed_amount / 1000 * feed_cost_per_kg for f in feed_data) if feed_data else 0
            energy_cost = sum(e.cost for e in energy_data) if energy_data else 0
            costs = feed_cost * 1.1 + energy_cost * 1.05  # Slight increase over time
            profit = revenue - costs
            
            profit_forecast.append({
                "day": day,
                "revenue_lkr": round(revenue, 0),
                "costs_lkr": round(costs, 0),
                "profit_lkr": round(profit, 0)
            })
        
        # Calculate harvest window
        days_to_harvest = max(10, min(60, int((target_weight - current_weight) / growth_rate))) if growth_rate > 0 else 30
        harvest_date = datetime.now() + timedelta(days=days_to_harvest)
        harvest_end = harvest_date + timedelta(days=10)
        
        total_yield = sum(f.shrimp_count * target_weight / 1000 for f in feed_data) / 1000 if feed_data else 0
        
        return {
            "growth_forecast": growth_forecast,
            "water_quality_forecast": water_quality_forecast,
            "disease_risk_forecast": disease_risk_forecast,
            "profit_forecast": profit_forecast,
            "harvest_window": {
                "optimal_start": harvest_date.strftime("%Y-%m-%d"),
                "optimal_end": harvest_end.strftime("%Y-%m-%d"),
                "projected_yield_tons": round(total_yield, 2),
                "fcr": 1.3
            },
            "ai_predictions": [
                f"Projected peak growth phase in late {harvest_date.strftime('%B')}",
                f"Stable market price forecast at Rs. {shrimp_price_per_kg}/kg",
                f"High risk of viral infection in mid-{harvest_date.strftime('%B')} due to high temperatures"
            ]
        }

