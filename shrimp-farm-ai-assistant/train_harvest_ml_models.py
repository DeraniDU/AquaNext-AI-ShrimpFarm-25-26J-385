#!/usr/bin/env python3
"""
Train XGBoost harvest models (days to harvest, harvest biomass, early-harvest risk, weight delta).

1. Generate training CSV (if missing):
     python -m models.training.generate_harvest_ml_csv --rows 25000

2. Train models:
     python train_harvest_ml_models.py
     python train_harvest_ml_models.py --csv models/training/harvest_ml_training.csv

Outputs (default models/harvest_ml/):
  days_to_harvest_regressor.pkl
  harvest_biomass_regressor.pkl
  early_harvest_classifier.pkl
  weight_delta_regressor.pkl
  feature_names.json
  metrics.json
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np


def _load_csv_arrays(csv_path: Path) -> Tuple[np.ndarray, Dict[str, np.ndarray], List[str]]:
    from models.training.harvest_ml_features import (
        HARVEST_ML_FEATURE_NAMES,
        HARVEST_ML_LABEL_BIOMASS,
        HARVEST_ML_LABEL_DAYS,
        HARVEST_ML_LABEL_DELTA,
        HARVEST_ML_LABEL_RISK,
    )

    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    if not rows:
        raise ValueError(f"Empty CSV: {csv_path}")

    feat_names = list(HARVEST_ML_FEATURE_NAMES)
    X = np.asarray([[float(r[c]) for c in feat_names] for r in rows], dtype=np.float32)
    y = {
        HARVEST_ML_LABEL_DAYS: np.asarray([float(r[HARVEST_ML_LABEL_DAYS]) for r in rows], dtype=np.float32),
        HARVEST_ML_LABEL_BIOMASS: np.asarray(
            [float(r[HARVEST_ML_LABEL_BIOMASS]) for r in rows], dtype=np.float32
        ),
        HARVEST_ML_LABEL_RISK: np.asarray([int(r[HARVEST_ML_LABEL_RISK]) for r in rows], dtype=np.int64),
        HARVEST_ML_LABEL_DELTA: np.asarray(
            [float(r[HARVEST_ML_LABEL_DELTA]) for r in rows], dtype=np.float32
        ),
    }
    return X, y, feat_names


def train_harvest_ml_models(
    csv_path: str = "models/training/harvest_ml_training.csv",
    model_dir: str = "models/harvest_ml",
    auto_generate_csv: bool = True,
    generate_rows: int = 25_000,
) -> None:
    try:
        import joblib
        import xgboost as xgb
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import mean_absolute_error, r2_score, roc_auc_score
    except ImportError as e:
        raise SystemExit(
            "Missing dependencies. Install with: pip install xgboost scikit-learn joblib"
        ) from e

    from models.training.harvest_ml_features import (
        HARVEST_ML_LABEL_BIOMASS,
        HARVEST_ML_LABEL_DAYS,
        HARVEST_ML_LABEL_DELTA,
        HARVEST_ML_LABEL_RISK,
    )

    csv_p = Path(csv_path)
    if not csv_p.exists():
        if not auto_generate_csv:
            raise SystemExit(f"CSV not found: {csv_p}. Run generate_harvest_ml_csv first.")
        print(f"CSV missing; generating {generate_rows} rows...")
        from models.training.generate_harvest_ml_csv import write_csv

        write_csv(csv_p, generate_rows, seed=42)

    X, y, feat_names = _load_csv_arrays(csv_p)
    print(f"Loaded {X.shape[0]} rows, {X.shape[1]} features from {csv_p}")

    out_dir = Path(model_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    with (out_dir / "feature_names.json").open("w", encoding="utf-8") as f:
        json.dump({"feature_names": feat_names}, f, indent=2)

    metrics: Dict[str, Any] = {}

    # --- days to harvest ---
    X_train, X_val, y_train, y_val = train_test_split(
        X, y[HARVEST_ML_LABEL_DAYS], test_size=0.2, random_state=42
    )
    days_model = xgb.XGBRegressor(
        n_estimators=400,
        max_depth=7,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=-1,
    )
    days_model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
    pred = days_model.predict(X_val)
    metrics["days_to_harvest"] = {
        "val_mae": float(mean_absolute_error(y_val, pred)),
        "val_r2": float(r2_score(y_val, pred)),
    }
    joblib.dump(days_model, out_dir / "days_to_harvest_regressor.pkl")
    print(f"days_to_harvest: val MAE={metrics['days_to_harvest']['val_mae']:.3f}")

    # --- harvest biomass ---
    X_train, X_val, y_train, y_val = train_test_split(
        X, y[HARVEST_ML_LABEL_BIOMASS], test_size=0.2, random_state=43
    )
    bio_model = xgb.XGBRegressor(
        n_estimators=400,
        max_depth=7,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=-1,
    )
    bio_model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
    pred_b = bio_model.predict(X_val)
    metrics["harvest_biomass_kg"] = {
        "val_mae": float(mean_absolute_error(y_val, pred_b)),
        "val_r2": float(r2_score(y_val, pred_b)),
    }
    joblib.dump(bio_model, out_dir / "harvest_biomass_regressor.pkl")
    print(f"harvest_biomass: val MAE={metrics['harvest_biomass_kg']['val_mae']:.3f}")

    # --- early harvest risk ---
    yr = y[HARVEST_ML_LABEL_RISK]
    if len(set(yr.tolist())) < 2:
        print("Warning: single class in early_harvest_risk; classifier may be trivial.")
    try:
        X_train, X_val, y_train, y_val = train_test_split(
            X, yr, test_size=0.2, random_state=44, stratify=yr
        )
    except ValueError:
        X_train, X_val, y_train, y_val = train_test_split(X, yr, test_size=0.2, random_state=44)
    risk_model = xgb.XGBClassifier(
        n_estimators=350,
        max_depth=6,
        learning_rate=0.06,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="binary:logistic",
        random_state=42,
        n_jobs=-1,
    )
    risk_model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
    proba = risk_model.predict_proba(X_val)[:, 1]
    try:
        auc = float(roc_auc_score(y_val, proba))
    except ValueError:
        auc = None
    metrics["early_harvest_risk"] = {
        "val_auc": auc,
        "val_accuracy": float(risk_model.score(X_val, y_val)),
    }
    joblib.dump(risk_model, out_dir / "early_harvest_classifier.pkl")
    print(f"early_harvest: val acc={metrics['early_harvest_risk']['val_accuracy']:.3f} auc={auc}")

    # --- weight delta (next day) ---
    X_train, X_val, y_train, y_val = train_test_split(
        X, y[HARVEST_ML_LABEL_DELTA], test_size=0.2, random_state=45
    )
    delta_model = xgb.XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.06,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=-1,
    )
    delta_model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
    pred_d = delta_model.predict(X_val)
    metrics["weight_delta_next"] = {
        "val_mae": float(mean_absolute_error(y_val, pred_d)),
        "val_r2": float(r2_score(y_val, pred_d)),
    }
    joblib.dump(delta_model, out_dir / "weight_delta_regressor.pkl")
    print(f"weight_delta: val MAE={metrics['weight_delta_next']['val_mae']:.4f}")

    with (out_dir / "metrics.json").open("w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n[OK] Harvest ML models saved to {out_dir.resolve()}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Train harvest XGBoost models")
    ap.add_argument("--csv", type=str, default="models/training/harvest_ml_training.csv")
    ap.add_argument("--model-dir", type=str, default="models/harvest_ml")
    ap.add_argument("--no-auto-csv", action="store_true", help="Fail if CSV missing")
    ap.add_argument("--generate-rows", type=int, default=25_000)
    args = ap.parse_args()
    train_harvest_ml_models(
        csv_path=args.csv,
        model_dir=args.model_dir,
        auto_generate_csv=not args.no_auto_csv,
        generate_rows=args.generate_rows,
    )


if __name__ == "__main__":
    main()
