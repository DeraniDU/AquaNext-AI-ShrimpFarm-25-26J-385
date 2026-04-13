"""
XGBoost harvest inference: days to harvest, expected biomass, rolled growth curve, early-harvest risk.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

from models import FeedData, WaterQualityData
from models.training.harvest_ml_features import HARVEST_ML_FEATURE_NAMES

try:
    import joblib

    _JOBLIB = True
except Exception:  # pragma: no cover
    _JOBLIB = False

try:
    import xgboost as xgb  # noqa: F401

    _XGB = True
except Exception:  # pragma: no cover
    _XGB = False


class HarvestMLPredictor:
    """Loads harvest ML models from disk; if missing, ``available`` is False."""

    def __init__(self, model_dir: Optional[str] = None):
        from config import HARVEST_ML_MODEL_DIR

        self.model_dir = Path(model_dir or HARVEST_ML_MODEL_DIR)
        self.feature_names: List[str] = list(HARVEST_ML_FEATURE_NAMES)
        self.days_model = None
        self.biomass_model = None
        self.risk_model = None
        self.delta_model = None
        self.available = False
        self._load_error: Optional[str] = None

        if not _JOBLIB or not _XGB:
            self._load_error = "xgboost or joblib not installed"
            return

        self._try_load()

    def _try_load(self) -> None:
        fn_path = self.model_dir / "feature_names.json"
        if fn_path.exists():
            try:
                with fn_path.open(encoding="utf-8") as f:
                    data = json.load(f)
                names = data.get("feature_names")
                if isinstance(names, list) and len(names) == len(HARVEST_ML_FEATURE_NAMES):
                    self.feature_names = [str(x) for x in names]
            except Exception:
                pass

        paths = {
            "days": self.model_dir / "days_to_harvest_regressor.pkl",
            "biomass": self.model_dir / "harvest_biomass_regressor.pkl",
            "risk": self.model_dir / "early_harvest_classifier.pkl",
            "delta": self.model_dir / "weight_delta_regressor.pkl",
        }
        for p in paths.values():
            if not p.exists():
                self._load_error = f"missing model file: {p.name}"
                return

        try:
            self.days_model = joblib.load(paths["days"])
            self.biomass_model = joblib.load(paths["biomass"])
            self.risk_model = joblib.load(paths["risk"])
            self.delta_model = joblib.load(paths["delta"])
            self.available = True
            self._load_error = None
        except Exception as e:  # pragma: no cover
            self._load_error = str(e)
            self.days_model = None
            self.biomass_model = None
            self.risk_model = None
            self.delta_model = None
            self.available = False

    def build_feature_vector(
        self,
        feed: FeedData,
        water: WaterQualityData,
        *,
        weight_lag_7d: Optional[float] = None,
        weight_lag_14d: Optional[float] = None,
        rolling_feed_kg_7d: Optional[float] = None,
        days_normalized: Optional[float] = None,
    ) -> np.ndarray:
        w = float(feed.average_weight)
        count = int(feed.shrimp_count)
        biomass_kg = count * w / 1000.0
        w7 = float(weight_lag_7d) if weight_lag_7d is not None else w
        w14 = float(weight_lag_14d) if weight_lag_14d is not None else w
        roll_f = float(rolling_feed_kg_7d) if rolling_feed_kg_7d is not None else float(feed.feed_amount) * 7.0 / 1000.0
        dn = float(days_normalized) if days_normalized is not None else 0.5

        values = [
            w,
            float(count),
            biomass_kg,
            float(feed.feed_amount),
            float(feed.feeding_frequency),
            roll_f,
            float(water.dissolved_oxygen),
            float(water.temperature),
            float(water.ammonia),
            float(water.ph),
            float(water.salinity),
            min(1.0, max(0.0, dn)),
            w7,
            w14,
        ]
        if len(values) != len(self.feature_names):
            raise ValueError("feature length mismatch")
        return np.asarray([values], dtype=np.float32)

    def _reason_codes(self, water: WaterQualityData, risk_proba: float) -> List[str]:
        codes: List[str] = []
        if risk_proba >= 0.55:
            codes.append("ml_elevated_early_harvest_risk")
        if water.dissolved_oxygen < 5.0:
            codes.append("low_dissolved_oxygen")
        if water.ammonia > 0.18:
            codes.append("elevated_ammonia")
        if water.temperature > 31.5:
            codes.append("high_temperature")
        return codes

    def predict_pond(
        self,
        feed: FeedData,
        water: WaterQualityData,
        *,
        target_weight_g: float = 22.0,
        horizon_days: int = 30,
        weight_lag_7d: Optional[float] = None,
        weight_lag_14d: Optional[float] = None,
        rolling_feed_kg_7d: Optional[float] = None,
        days_normalized: Optional[float] = None,
    ) -> Dict[str, Any]:
        if not self.available or self.days_model is None:
            return {
                "pond_id": feed.pond_id,
                "available": False,
                "detail": self._load_error or "models not loaded",
            }

        x0 = self.build_feature_vector(
            feed,
            water,
            weight_lag_7d=weight_lag_7d,
            weight_lag_14d=weight_lag_14d,
            rolling_feed_kg_7d=rolling_feed_kg_7d,
            days_normalized=days_normalized,
        )

        raw_days = float(self.days_model.predict(x0)[0])
        days_to_harvest = int(max(5, min(120, round(raw_days))))

        raw_bio = float(self.biomass_model.predict(x0)[0])
        expected_biomass_kg = max(0.0, raw_bio)

        proba_row = self.risk_model.predict_proba(x0)[0]
        if len(proba_row) > 1:
            risk_proba = float(proba_row[1])
        else:
            risk_proba = float(proba_row[0])
        early_harvest = risk_proba >= 0.5

        # Roll forward growth using delta model
        count = int(feed.shrimp_count)
        w_hist: List[float] = []
        w_cur = float(feed.average_weight)
        for _ in range(max(0, min(horizon_days, 90)) + 15):
            w_hist.append(w_cur)
            if len(w_hist) > 20:
                w_hist.pop(0)

        growth_forecast: List[Dict[str, Any]] = []
        dn_base = days_normalized if days_normalized is not None else 0.5

        for d in range(1, max(1, min(horizon_days, 90)) + 1):
            w7 = w_hist[-7] if len(w_hist) >= 7 else w_hist[0]
            w14 = w_hist[-14] if len(w_hist) >= 14 else w_hist[0]
            dn = min(1.0, dn_base + d / 120.0)

            fake_feed = feed.model_copy(
                update={
                    "average_weight": w_cur,
                }
            )
            x = self.build_feature_vector(
                fake_feed,
                water,
                weight_lag_7d=w7,
                weight_lag_14d=w14,
                rolling_feed_kg_7d=rolling_feed_kg_7d,
                days_normalized=dn,
            )
            delta = float(self.delta_model.predict(x)[0])
            w_next = w_cur + delta
            w_next = max(0.5, min(float(target_weight_g) + 3.0, w_next))
            biomass_d = count * w_next / 1000.0
            growth_forecast.append(
                {
                    "day": d,
                    "avg_weight_g": round(w_next, 4),
                    "biomass_kg": round(biomass_d, 4),
                }
            )
            w_cur = w_next
            w_hist.append(w_cur)
            if len(w_hist) > 20:
                w_hist.pop(0)

        now = datetime.utcnow()
        harvest_start = now + timedelta(days=days_to_harvest)
        harvest_end = harvest_start + timedelta(days=10)

        return {
            "pond_id": feed.pond_id,
            "available": True,
            "target_weight_g": target_weight_g,
            "days_to_harvest": days_to_harvest,
            "predicted_harvest_start": harvest_start.strftime("%Y-%m-%d"),
            "predicted_harvest_end": harvest_end.strftime("%Y-%m-%d"),
            "expected_biomass_kg": round(expected_biomass_kg, 4),
            "early_harvest": {
                "risk": bool(early_harvest),
                "probability": round(risk_proba, 4),
                "reason_codes": self._reason_codes(water, risk_proba),
            },
            "growth_forecast": growth_forecast,
        }
