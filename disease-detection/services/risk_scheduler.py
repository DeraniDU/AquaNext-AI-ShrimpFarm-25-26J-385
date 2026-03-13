from datetime import datetime
from typing import Dict, Any, Optional

from agents.risk_prediction_agent import RiskPredictionAgent
from database.repository import Repository, PredictionRepository
from services.data_fusion_service import DataFusionService
from models.risk_model import FEATURES


class RiskSchedulerService:
    def __init__(
        self,
        repository: Repository,
        fusion_service: DataFusionService,
        prediction_agent: RiskPredictionAgent,
        prediction_repository: Optional[PredictionRepository] = None,
    ):
        self.repository = repository
        self.fusion_service = fusion_service
        self.prediction_agent = prediction_agent
        # Use same persistence as POST /predict-risk so background recalcs appear in GET /predictions
        self._prediction_repository = prediction_repository

    def recalculate_for_pond(self, pond_id: str) -> Optional[Dict[str, Any]]:
        fused = self.fusion_service.get_latest_fused_input(pond_id)
        if not fused:
            return None

        model_input = fused["model_input"]
        feature_payload = {k: model_input[k] for k in FEATURES}

        prediction = self.prediction_agent.run(feature_payload)

        record = {
            "pond_id": pond_id,
            "timestamp": datetime.utcnow().isoformat(),
            "input_features": feature_payload,
            "source_data": {
                "behavior": fused["behavior"],
                "feeding": fused["feeding"],
                "environment": fused["environment"],
            },
            "prediction_result": prediction,
        }

        if self._prediction_repository is not None:
            inserted_id = self._prediction_repository.save_prediction(record)
        else:
            inserted_id = self.repository.save_prediction(record)

        return {
            "saved": True,
            "record_id": inserted_id,
            "pond_id": pond_id,
            "prediction": prediction,
            "input_features": feature_payload,
        }
