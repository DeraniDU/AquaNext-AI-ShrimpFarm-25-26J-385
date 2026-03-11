from dataclasses import dataclass
from typing import Dict, List

import numpy as np
from joblib import load


FEATURES: List[str] = [
    "activity_mean",
    "activity_std",
    "drop_ratio_min",
    "abnormal_rate",
    "feed_amount",
    "feed_response",
    "DO",
    "temp",
    "pH",
    "salinity",
]

LABEL_INV = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}


@dataclass
class RiskPredictionResult:
    supervised_prediction: str
    supervised_probabilities: Dict[str, float]
    unsupervised_risk_score: float
    unsupervised_prediction: str
    features_used: Dict[str, float]


class RiskModelService:
    def __init__(self, rf_model_path: str, if_model_path: str, scaler_path: str, if_threshold: float):
        self.rf_model = load(rf_model_path)
        self.if_model = load(if_model_path)
        self.scaler = load(scaler_path)
        self.if_threshold = if_threshold

    def _to_vector(self, features: Dict[str, float]) -> np.ndarray:
        return np.array([[float(features[name]) for name in FEATURES]], dtype=float)

    def predict(self, features: Dict[str, float]) -> RiskPredictionResult:
        x = self._to_vector(features)

        rf_pred = int(self.rf_model.predict(x)[0])
        rf_proba_arr = self.rf_model.predict_proba(x)[0]
        rf_proba = {
            LABEL_INV[i]: float(rf_proba_arr[i]) for i in range(len(rf_proba_arr))
        }

        xs = self.scaler.transform(x)
        unsupervised_risk_score = float(-self.if_model.decision_function(xs)[0])
        unsupervised_prediction = (
            "HIGH" if unsupervised_risk_score >= self.if_threshold else "NORMAL"
        )

        return RiskPredictionResult(
            supervised_prediction=LABEL_INV[rf_pred],
            supervised_probabilities=rf_proba,
            unsupervised_risk_score=unsupervised_risk_score,
            unsupervised_prediction=unsupervised_prediction,
            features_used={k: float(features[k]) for k in FEATURES},
        )