from crewai import Agent, Task, Crew

# LangChain has moved OpenAI chat models across packages over time.
# Try the modern import first, then fall back for older LangChain versions.
try:
    from langchain_openai import ChatOpenAI  # type: ignore
except Exception:  # pragma: no cover
    from langchain.chat_models import ChatOpenAI  # type: ignore
from models import ShrimpFarmDashboard, FarmInsight, AlertLevel, WaterQualityData, FeedData, EnergyData, LaborData
from config import OPENAI_API_KEY, OPENAI_MODEL_NAME, OPENAI_TEMPERATURE, FARM_CONFIG, DECISION_MODEL_CONFIG
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio

class ManagerAgent:
    def __init__(self, use_decision_agent: Optional[bool] = None):
        """
        Initialize Manager Agent.
        
        Args:
            use_decision_agent: Whether to use XGBoost decision agent. 
                               If None, uses config setting.
        """
        # LLM is optional: XGBoost / rule-based dashboards should work without an OpenAI key.
        self.llm = None
        self.agent = None

        if OPENAI_API_KEY:
            self.llm = ChatOpenAI(
                openai_api_key=OPENAI_API_KEY,
                model_name=OPENAI_MODEL_NAME,
                temperature=OPENAI_TEMPERATURE,
            )

            self.agent = Agent(
                role="Shrimp Farm Operations Manager",
                goal="Coordinate all farm operations, synthesize insights from specialized agents, and provide strategic guidance for optimal shrimp production",
                backstory="""You are a senior aquaculture operations manager with 20 years of experience in large-scale shrimp farming operations. 
                You have deep expertise in all aspects of shrimp farming and can synthesize complex data from multiple sources to make 
                strategic decisions that optimize production, reduce costs, and ensure sustainable operations.""",
                verbose=True,
                allow_delegation=True,
                llm=self.llm,
            )
        
        # Initialize XGBoost decision agent if enabled
        enabled_by_config = bool(DECISION_MODEL_CONFIG.get("use_decision_model", False))
        self.use_decision_agent = use_decision_agent if use_decision_agent is not None else enabled_by_config
        self.decision_agent_type = "xgboost"
        self.decision_agent = None
        
        if self.use_decision_agent:
            try:
                from models.xgboost_decision_agent import XGBoostDecisionAgent

                self.decision_agent = XGBoostDecisionAgent()
                if getattr(self.decision_agent, "is_trained", False):
                    print("[OK] XGBoost decision agent initialized and ready")
                else:
                    print("[WARN] XGBoost models not trained. Decision agent will not be used.")
                    self.decision_agent = None
                    self.use_decision_agent = False
            except ImportError:
                print("[ERROR] XGBoost decision agent not available. Please install required dependencies.")
                self.decision_agent = None
                self.use_decision_agent = False
            except Exception as e:
                print(f"[ERROR] Error initializing XGBoost decision agent: {e}")
                self.decision_agent = None
                self.use_decision_agent = False
    
    def create_synthesis_task(self, water_quality_data: List[WaterQualityData], 
                            feed_data: List[FeedData], energy_data: List[EnergyData], 
                            labor_data: List[LaborData]) -> Task:
        if not self.agent:
            raise RuntimeError(
                "ManagerAgent LLM is not configured. Set OPENAI_API_KEY (env var or .env) to use LLM synthesis tasks."
            )
        return Task(
            description=f"""
            Synthesize farm operations data and provide strategic guidance:
            
            Water Quality Summary:
            {self._format_water_quality_summary(water_quality_data)}
            
            Feed Management Summary:
            {self._format_feed_summary(feed_data)}
            
            Energy Usage Summary:
            {self._format_energy_summary(energy_data)}
            
            Labor Efficiency Summary:
            {self._format_labor_summary(labor_data)}
            
            Analysis Required:
            1. Assess overall farm health and performance
            2. Identify critical issues requiring immediate attention
            3. Analyze correlations between different operational aspects
            4. Provide strategic recommendations for optimization
            5. Generate insights for long-term planning
            6. Create actionable alerts and priorities
            7. Calculate overall farm efficiency metrics
            
            Return comprehensive farm management dashboard with insights, alerts, and strategic recommendations.
            """,
            agent=self.agent,
            expected_output="Comprehensive farm management dashboard with insights, alerts, and strategic recommendations"
        )
    
    def _format_water_quality_summary(self, water_quality_data: List[WaterQualityData]) -> str:
        """Format water quality data for the manager task"""
        summary = []
        for data in water_quality_data:
            summary.append(f"Pond {data.pond_id}: {data.status.value.upper()} - pH:{data.ph:.2f}, Temp:{data.temperature:.1f}°C, DO:{data.dissolved_oxygen:.1f}mg/L")
            if data.alerts:
                summary.append(f"  Alerts: {', '.join(data.alerts)}")
        return "\n".join(summary)
    
    def _format_feed_summary(self, feed_data: List[FeedData]) -> str:
        """Format feed data for the manager task"""
        summary = []
        for data in feed_data:
            summary.append(f"Pond {data.pond_id}: {data.shrimp_count} shrimp, {data.average_weight:.1f}g avg, {data.feed_amount:.1f}g feed, {data.feeding_frequency}x/day")
        return "\n".join(summary)
    
    def _format_energy_summary(self, energy_data: List[EnergyData]) -> str:
        """Format energy data for the manager task"""
        summary = []
        for data in energy_data:
            summary.append(f"Pond {data.pond_id}: {data.total_energy:.1f}kWh total, ${data.cost:.2f} cost, {data.efficiency_score:.2f} efficiency")
        return "\n".join(summary)
    
    def _format_labor_summary(self, labor_data: List[LaborData]) -> str:
        """Format labor data for the manager task"""
        summary = []
        for data in labor_data:
            summary.append(f"Pond {data.pond_id}: {len(data.tasks_completed)} tasks, {data.time_spent:.1f}h, {data.worker_count} workers, {data.efficiency_score:.2f} efficiency")
        return "\n".join(summary)
    
    def create_dashboard(self, water_quality_data: List[WaterQualityData], 
                        feed_data: List[FeedData], energy_data: List[EnergyData], 
                        labor_data: List[LaborData]) -> ShrimpFarmDashboard:
        """Create comprehensive farm dashboard"""
        
        # Calculate overall health score
        overall_health_score = self._calculate_overall_health_score(
            water_quality_data, feed_data, energy_data, labor_data
        )
        
        # Create water quality summary
        water_quality_summary = {
            data.pond_id: data.status for data in water_quality_data
        }
        
        # Calculate efficiency metrics
        feed_efficiency = self._calculate_feed_efficiency(feed_data)
        energy_efficiency = self._calculate_energy_efficiency(energy_data)
        labor_efficiency = self._calculate_labor_efficiency(labor_data)
        
        # Generate insights
        insights = self._generate_insights(water_quality_data, feed_data, energy_data, labor_data)
        
        # Generate alerts
        alerts = self._generate_alerts(water_quality_data, feed_data, energy_data, labor_data)
        
        # Generate recommendations (uses XGBoost decision agent if available)
        recommendations = self._generate_recommendations(water_quality_data, feed_data, energy_data, labor_data)
        
        # Get decision bundle for other uses (e.g., insights, alerts)
        decision_bundle = None
        if self.decision_agent and getattr(self.decision_agent, "is_trained", True):
            try:
                decision_bundle = self.decision_agent.make_multi_pond_decisions(
                    water_quality_data, feed_data, energy_data, labor_data
                )
            except Exception as e:
                print(f"Warning: Could not get ML decisions: {e}")
        
        return ShrimpFarmDashboard(
            timestamp=datetime.now(),
            overall_health_score=overall_health_score,
            water_quality_summary=water_quality_summary,
            feed_efficiency=feed_efficiency,
            energy_efficiency=energy_efficiency,
            labor_efficiency=labor_efficiency,
            insights=insights,
            alerts=alerts,
            recommendations=recommendations
        )
    
    def _calculate_overall_health_score(self, water_quality_data: List[WaterQualityData], 
                                      feed_data: List[FeedData], energy_data: List[EnergyData], 
                                      labor_data: List[LaborData]) -> float:
        """Calculate overall farm health score"""
        scores = []
        
        # Water quality score
        water_scores = {"excellent": 1.0, "good": 0.8, "fair": 0.6, "poor": 0.4, "critical": 0.2}
        avg_water_score = sum(water_scores[data.status.value] for data in water_quality_data) / len(water_quality_data)
        scores.append(avg_water_score)
        
        # Energy efficiency score
        avg_energy_score = sum(data.efficiency_score for data in energy_data) / len(energy_data)
        scores.append(avg_energy_score)
        
        # Labor efficiency score
        avg_labor_score = sum(data.efficiency_score for data in labor_data) / len(labor_data)
        scores.append(avg_labor_score)
        
        # Feed efficiency (simplified calculation)
        feed_score = 0.8  # Placeholder - would need more complex calculation
        scores.append(feed_score)
        
        return sum(scores) / len(scores)
    
    def _calculate_feed_efficiency(self, feed_data: List[FeedData]) -> float:
        """Calculate overall feed efficiency"""
        if not feed_data:
            return 0.8
        
        # Simplified feed efficiency calculation
        total_feed = sum(data.feed_amount for data in feed_data)
        total_biomass = sum(data.shrimp_count * data.average_weight for data in feed_data) / 1000
        
        if total_biomass > 0:
            feed_conversion_ratio = total_feed / total_biomass
            # Optimal FCR is around 1.5-2.0, so efficiency decreases as FCR increases
            efficiency = max(0.0, 1.0 - (feed_conversion_ratio - 1.5) / 2.0)
            return min(1.0, efficiency)
        
        return 0.8
    
    def _calculate_energy_efficiency(self, energy_data: List[EnergyData]) -> float:
        """Calculate overall energy efficiency"""
        if not energy_data:
            return 0.8
        
        return sum(data.efficiency_score for data in energy_data) / len(energy_data)
    
    def _calculate_labor_efficiency(self, labor_data: List[LaborData]) -> float:
        """Calculate overall labor efficiency"""
        if not labor_data:
            return 0.8
        
        return sum(data.efficiency_score for data in labor_data) / len(labor_data)
    
    def _generate_insights(self, water_quality_data: List[WaterQualityData], 
                          feed_data: List[FeedData], energy_data: List[EnergyData], 
                          labor_data: List[LaborData]) -> List[FarmInsight]:
        """Generate strategic insights"""
        insights = []
        
        # Water quality insights
        critical_ponds = [data for data in water_quality_data if data.status.value in ["poor", "critical"]]
        if critical_ponds:
            insights.append(FarmInsight(
                timestamp=datetime.now(),
                insight_type="Water Quality Alert",
                priority=AlertLevel.CRITICAL,
                message=f"Critical water quality issues detected in {len(critical_ponds)} pond(s)",
                recommendations=["Immediate water quality intervention required", "Consider emergency aeration"],
                affected_ponds=[data.pond_id for data in critical_ponds],
                data={"critical_ponds": len(critical_ponds)}
            ))
        
        # Energy efficiency insights
        low_energy_ponds = [data for data in energy_data if data.efficiency_score < 0.7]
        if low_energy_ponds:
            insights.append(FarmInsight(
                timestamp=datetime.now(),
                insight_type="Energy Optimization",
                priority=AlertLevel.WARNING,
                message=f"Energy efficiency below optimal in {len(low_energy_ponds)} pond(s)",
                recommendations=["Review equipment scheduling", "Consider energy audit"],
                affected_ponds=[data.pond_id for data in low_energy_ponds],
                data={"low_efficiency_ponds": len(low_energy_ponds)}
            ))
        
        # Labor efficiency insights
        low_labor_ponds = [data for data in labor_data if data.efficiency_score < 0.7]
        if low_labor_ponds:
            insights.append(FarmInsight(
                timestamp=datetime.now(),
                insight_type="Labor Optimization",
                priority=AlertLevel.WARNING,
                message=f"Labor efficiency below optimal in {len(low_labor_ponds)} pond(s)",
                recommendations=["Review task allocation", "Consider training needs"],
                affected_ponds=[data.pond_id for data in low_labor_ponds],
                data={"low_efficiency_ponds": len(low_labor_ponds)}
            ))
        
        return insights
    
    def _generate_alerts(self, water_quality_data: List[WaterQualityData], 
                        feed_data: List[FeedData], energy_data: List[EnergyData], 
                        labor_data: List[LaborData]) -> List[str]:
        """Generate critical alerts"""
        alerts = []
        
        # Water quality alerts
        for data in water_quality_data:
            if data.status.value == "critical":
                alerts.append(f"CRITICAL: Pond {data.pond_id} water quality critical - immediate action required")
            elif data.alerts:
                alerts.extend([f"Pond {data.pond_id}: {alert}" for alert in data.alerts])
        
        # Energy alerts
        for data in energy_data:
            if data.efficiency_score < 0.5:
                alerts.append(f"WARNING: Pond {data.pond_id} energy efficiency critically low")
        
        # Labor alerts
        for data in labor_data:
            if data.efficiency_score < 0.5:
                alerts.append(f"WARNING: Pond {data.pond_id} labor efficiency critically low")
        
        return alerts
    
    def _generate_recommendations(self, water_quality_data: List[WaterQualityData], 
                                 feed_data: List[FeedData], energy_data: List[EnergyData], 
                                 labor_data: List[LaborData]) -> List[str]:
        """
        Generate strategic recommendations based on XGBoost decision agent outputs.
        Falls back to rule-based recommendations if XGBoost decision agent is not available.
        """
        recommendations = []
        
        # Prioritize recommendations from XGBoost decision agent
        if self.decision_agent and getattr(self.decision_agent, "is_trained", True):
            try:
                decision_bundle = self.decision_agent.make_multi_pond_decisions(
                    water_quality_data, feed_data, energy_data, labor_data
                )
                
                # Generate recommendations from decision outputs
                # Sort by priority (most urgent first)
                sorted_decisions = sorted(
                    decision_bundle.recommended_actions.items(),
                    key=lambda kv: (kv[1].priority_rank, -kv[1].urgency_score)
                )
                
                for pond_id, decision in sorted_decisions:
                    # Create recommendation text from decision output
                    action_label = decision.primary_action.value.replace("_", " ").title()
                    
                    # Use the enhanced reasoning from XGBoost (which may include OpenAI explanations)
                    if decision.reasoning:
                        # Format as: "Pond X: [Action] - [Reasoning]"
                        rec_text = f"**Pond {pond_id}**: {action_label} - {decision.reasoning}"
                    else:
                        # Fallback if no reasoning available
                        rec_text = (
                            f"**Pond {pond_id}**: {action_label} "
                            f"(Urgency: {decision.urgency_score:.2f}, "
                            f"Confidence: {decision.confidence:.2f})"
                        )
                    
                    recommendations.append(rec_text)
                    
                    # Add specific recommendations based on action type and affected factors
                    if decision.affected_factors:
                        factors_text = ", ".join(decision.affected_factors)
                        if factors_text:
                            recommendations.append(
                                f"**Pond {pond_id}** affected factors: {factors_text}"
                            )
                
                # Add overall farm-level recommendations if there are urgent ponds
                if decision_bundle.urgent_ponds:
                    urgent_count = len(decision_bundle.urgent_ponds)
                    recommendations.append(
                        f"**Farm-wide Alert**: {urgent_count} pond(s) require immediate attention. "
                        f"Overall urgency level: {decision_bundle.overall_urgency:.2f}"
                    )
                
                # Add resource allocation insights if available
                if decision_bundle.resource_allocation:
                    top_ponds = sorted(
                        decision_bundle.resource_allocation.items(),
                        key=lambda kv: kv[1],
                        reverse=True
                    )[:2]  # Top 2 ponds
                    if top_ponds:
                        allocation_text = ", ".join([
                            f"{pond.replace('pond_', 'Pond ')} ({alloc:.0%})"
                            for pond, alloc in top_ponds
                        ])
                        recommendations.append(
                            f"**Resource Priority**: Focus resources on {allocation_text}"
                        )
                
                # Return early if we have decision-based recommendations
                if recommendations:
                    return recommendations
                    
            except Exception as e:
                print(f"Warning: Could not generate recommendations from decision agent: {e}")
                # Fall through to rule-based recommendations
        
        # Fallback to rule-based recommendations if decision agent is not available or failed
        return self._generate_fallback_recommendations(water_quality_data, feed_data, energy_data, labor_data)
    
    def _generate_fallback_recommendations(self, water_quality_data: List[WaterQualityData], 
                                         feed_data: List[FeedData], energy_data: List[EnergyData], 
                                         labor_data: List[LaborData]) -> List[str]:
        """Generate rule-based recommendations as fallback"""
        recommendations = []
        
        # Overall farm recommendations
        recommendations.append("Implement automated monitoring systems for real-time data collection")
        recommendations.append("Establish predictive maintenance schedules for all equipment")
        recommendations.append("Develop contingency plans for critical water quality issues")
        
        # Water quality recommendations
        critical_ponds = [data for data in water_quality_data if data.status.value in ["poor", "critical"]]
        if critical_ponds:
            recommendations.append("Prioritize water quality management in affected ponds")
            recommendations.append("Consider additional aeration equipment for critical ponds")
        
        # Energy recommendations
        total_energy_cost = sum(data.cost for data in energy_data)
        if total_energy_cost > 100:  # High energy costs
            recommendations.append("Conduct comprehensive energy audit to identify savings opportunities")
            recommendations.append("Consider renewable energy integration")
        
        # Labor recommendations
        avg_labor_efficiency = sum(data.efficiency_score for data in labor_data) / len(labor_data)
        if avg_labor_efficiency < 0.8:
            recommendations.append("Review and optimize labor allocation across all ponds")
            recommendations.append("Implement task automation where possible")
        
        return recommendations
