"""
Feeding Analysis Integration for Risk Prediction

This module enhances risk prediction by incorporating feeding data analysis.
It analyzes feeding trends and correlates them with disease risk.
"""

from typing import Dict, Any, Optional
from datetime import datetime
from database.repository import Repository
from services.data_fusion_service import DataFusionService
from agents.risk_prediction_agent import RiskPredictionAgent
from models.risk_model import FEATURES


class FeedingAwareRiskAnalysis:
    """
    Risk prediction service that incorporates feeding data trends.
    Analyzes feeding patterns and integrates them into risk assessment.
    """
    
    def __init__(
        self,
        repository: Repository,
        fusion_service: DataFusionService,
        prediction_agent: RiskPredictionAgent,
    ):
        self.repository = repository
        self.fusion_service = fusion_service
        self.prediction_agent = prediction_agent

    def _get_feeding_risk_factors(self, pond_id: str) -> Dict[str, Any]:
        """
        Analyze feeding data and identify risk factors.
        
        Returns:
            Dictionary with feeding-specific risk indicators
        """
        try:
            # Get feeding trend analysis
            trend_analysis = self.fusion_service.get_feeding_trend_analysis(pond_id, hours=24)
            
            feeding_stats = trend_analysis.get("statistics", {})
            trend_data = trend_analysis.get("trend_analysis", {})
            
            # Extract risk factors from feeding trends
            consistency_score = trend_data.get("feeding_consistency", 0.0)
            response_trend = trend_data.get("response_trend", {})
            amount_variability = trend_data.get("amount_variability", {})
            
            # Calculate feeding risk level
            feeding_risk_factors = {
                "has_feeding_data": trend_data.get("has_feeding_data", False),
                "consistency_score": consistency_score,
                "consistency_risk": "HIGH" if consistency_score < 0.5 else "MEDIUM" if consistency_score < 0.75 else "LOW",
                "response_trend_value": response_trend.get("trend", 0.0),
                "response_trend_direction": response_trend.get("direction", "stable"),
                "response_trend_risk": "HIGH" if response_trend.get("direction") == "declining" else "LOW",
                "amount_variability_score": amount_variability.get("variability", 0.0),
                "amount_stability": amount_variability.get("stability", "unknown"),
                "amount_stability_risk": "HIGH" if amount_variability.get("stability") == "highly_variable" else "MEDIUM" if amount_variability.get("stability") == "variable" else "LOW",
                "avg_feed_amount": feeding_stats.get("avg_feed_amount", 0.0),
                "avg_feed_response": feeding_stats.get("avg_feed_response", 0.0),
                "feeding_frequency": feeding_stats.get("feeding_frequency", 0),
                "last_feed_time": feeding_stats.get("last_feed_time"),
            }
            
            return feeding_risk_factors
        except Exception as e:
            return {
                "has_feeding_data": False,
                "error": str(e),
                "consistency_risk": "UNKNOWN",
                "response_trend_risk": "UNKNOWN",
                "amount_stability_risk": "UNKNOWN",
            }

    def _get_current_feeding_values(self, pond_id: str) -> Dict[str, float]:
        """
        Get current feeding values for risk model input.
        
        Returns:
            Dictionary with feed_amount and feed_response
        """
        try:
            latest_feed = self.repository.get_latest_feed(pond_id)
            if latest_feed:
                return {
                    "feed_amount": float(latest_feed.get("feed_amount", 0.0)),
                    "feed_response": float(latest_feed.get("feed_response", 0.0)),
                }
        except Exception:
            pass
        
        return {
            "feed_amount": 0.0,
            "feed_response": 0.0,
        }

    def predict_with_feeding_analysis(
        self, 
        pond_id: str,
        include_feeding_trends: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Predict disease risk with comprehensive feeding data analysis.
        
        Args:
            pond_id: Pond identifier
            include_feeding_trends: Whether to include feeding trend analysis
            
        Returns:
            Dictionary with prediction, feeding analysis, and recommendations
        """
        
        # Get latest fused data (behavior + environment + latest feeding)
        fused = self.fusion_service.get_latest_fused_input(pond_id)
        if not fused:
            return None
        
        model_input = fused["model_input"]
        
        # Ensure feeding data is using latest values
        feeding_values = self._get_current_feeding_values(pond_id)
        model_input["feed_amount"] = feeding_values["feed_amount"]
        model_input["feed_response"] = feeding_values["feed_response"]
        
        # Extract features for model
        feature_payload = {k: model_input[k] for k in FEATURES}
        
        # Run base prediction
        prediction = self.prediction_agent.run(feature_payload)
        
        # Get feeding risk factors if requested
        feeding_risk_factors = {}
        if include_feeding_trends:
            feeding_risk_factors = self._get_feeding_risk_factors(pond_id)
        
        # Build comprehensive result
        result = {
            "ok": True,
            "pond_id": pond_id,
            "timestamp": datetime.utcnow().isoformat(),
            "prediction": prediction,
            "feeding_data": {
                "current_values": feeding_values,
                "risk_factors": feeding_risk_factors,
            },
            "input_features": feature_payload,
            "source_data": {
                "behavior": fused["behavior"],
                "feeding": fused["feeding"],
                "environment": fused["environment"],
            },
        }
        
        return result

    def save_prediction_with_feeding(
        self, 
        pond_id: str,
        include_feeding_trends: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Predict risk and save to database with feeding analysis.
        
        Args:
            pond_id: Pond identifier
            include_feeding_trends: Whether to include feeding trend analysis
            
        Returns:
            Dictionary with prediction, recording info, and feeding analysis
        """
        result = self.predict_with_feeding_analysis(pond_id, include_feeding_trends)
        
        if not result:
            return None
        
        # Prepare database record
        db_record = {
            "pond_id": pond_id,
            "timestamp": result["timestamp"],
            "input_features": result["input_features"],
            "prediction_result": result["prediction"],
            "feeding_analysis": result["feeding_data"],
            "source_data": result["source_data"],
        }
        
        try:
            inserted_id = self.repository.save_prediction(db_record)
            result["saved_to_db"] = True
            result["record_id"] = inserted_id
        except Exception as e:
            result["saved_to_db"] = False
            result["db_error"] = str(e)
        
        return result

    def get_feeding_enhanced_recommendation(
        self,
        prediction: Dict[str, Any],
        feeding_risk_factors: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Build recommendation that incorporates feeding analysis.
        
        Args:
            prediction: Prediction result from agent
            feeding_risk_factors: Feeding risk analysis
            
        Returns:
            Enhanced recommendation with feeding insights
        """
        base_recommendation = prediction.get("recommendation", {})
        actions = list(base_recommendation.get("actions", []))
        
        # Add feeding-specific recommendations
        if not feeding_risk_factors.get("has_feeding_data"):
            actions.append("⚠️ No recent feeding data available - ensure feeding data is being logged.")
            return {**base_recommendation, "actions": actions}
        
        # Add consistency-based recommendations
        consistency_score = feeding_risk_factors.get("consistency_score", 0.0)
        if consistency_score < 0.5:
            actions.append("🔴 FEEDING ALERT: Feeding schedule is highly inconsistent - check automated feeder system.")
        elif consistency_score < 0.75:
            actions.append("🟡 FEEDING WARNING: Feeding schedule shows some variation - monitor feeder timing.")
        
        # Add response trend-based recommendations
        response_trend = feeding_risk_factors.get("response_trend_direction", "stable")
        if response_trend == "declining":
            actions.append("🔴 FEEDING CONCERN: Feed response is declining - may indicate health issues or stress.")
            actions.append("   Consider reducing feed amount or increasing monitoring frequency.")
        elif response_trend == "improving":
            actions.append("✅ POSITIVE: Feed response is improving - recent interventions may be working.")
        
        # Add amount variability recommendations
        stability = feeding_risk_factors.get("amount_stability", "unknown")
        if stability == "highly_variable":
            actions.append("🔴 FEEDING ISSUE: Feed amounts are highly variable - standardize feeding portions.")
        elif stability == "variable":
            actions.append("🟡 FEEDING NOTE: Feed amounts show variation - consider automating feeder portions.")
        
        # Add feeding frequency insight
        freq = feeding_risk_factors.get("feeding_frequency", 0)
        avg_amount = feeding_risk_factors.get("avg_feed_amount", 0.0)
        if freq > 0:
            actions.append(f"📊 FEEDING STATS: Fed {freq} times in 24h with avg {avg_amount:.1f} units per feed.")
        
        return {
            **base_recommendation,
            "actions": actions,
            "feeding_insights_included": True,
        }
