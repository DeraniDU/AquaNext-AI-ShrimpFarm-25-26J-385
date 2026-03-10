from typing import Any, Dict

from ..models.risk_model import FEATURES, RiskModelService


class RiskPredictionAgent:
    def __init__(self, model_service: RiskModelService):
        self.model_service = model_service

    def _validate(self, payload: Dict[str, Any]) -> None:
        missing = [field for field in FEATURES if field not in payload]
        if missing:
            raise ValueError(f"Missing required fields: {missing}")

    def _build_recommendations(self, supervised_prediction: str, unsupervised_prediction: str) -> Dict[str, Any]:
        final_level = supervised_prediction

        if supervised_prediction == "HIGH" or unsupervised_prediction == "HIGH":
            final_level = "HIGH"
            return {
                "final_risk_level": final_level,
                "title": "High disease/stress risk detected",
                "actions": [
                    "Check dissolved oxygen and aeration immediately.",
                    "Inspect shrimp behavior and feeding response closely.",
                    "Reduce feeding temporarily if stress signs persist.",
                    "Collect samples for confirmation testing if available.",
                ],
            }

        if supervised_prediction == "MEDIUM":
            final_level = "MEDIUM"
            return {
                "final_risk_level": final_level,
                "title": "Moderate disease/stress risk detected",
                "actions": [
                    "Increase monitoring frequency.",
                    "Compare current readings with previous baseline values.",
                    "Watch for continued behavior drop or feed response reduction.",
                ],
            }

        return {
            "final_risk_level": "LOW",
            "title": "Low disease/stress risk",
            "actions": [
                "Continue normal monitoring.",
                "Keep logging behavior, feeding, and environmental data.",
            ],
        }

    def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._validate(payload)

        result = self.model_service.predict(payload)
        recommendation = self._build_recommendations(
            result.supervised_prediction,
            result.unsupervised_prediction,
        )

        return {
            "ok": True,
            "supervised_prediction": result.supervised_prediction,
            "supervised_probabilities": result.supervised_probabilities,
            "unsupervised_prediction": result.unsupervised_prediction,
            "unsupervised_risk_score": result.unsupervised_risk_score,
            "features_used": result.features_used,
            "recommendation": recommendation,
        }
