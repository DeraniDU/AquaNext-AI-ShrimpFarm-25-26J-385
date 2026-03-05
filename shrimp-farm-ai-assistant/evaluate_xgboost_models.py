

#!/usr/bin/env python3
"""
Evaluate saved XGBoost decision models on a fresh synthetic (rule-generated) test set.

This script:
- Generates synthetic pond samples via models.training.data_generator.TrainingDataGenerator
- Extracts features using FeatureExtractor
- Splits into train/test (holdout) for evaluation
- Loads models from models/xgboost_models/*
- Computes metrics:
  - Classification: accuracy, precision, recall, F1, confusion matrix
  - Regression: RMSE, MAE, R²
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, Tuple
import json

import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support, 
    confusion_matrix, classification_report,
    mean_absolute_error, mean_squared_error, r2_score
)

from models.training.data_generator import TrainingDataGenerator
from models.xgboost_decision_agent import XGBoostDecisionAgent


def _split_data(X: np.ndarray, y_action: np.ndarray, y_urgency: np.ndarray, 
                test_size: float, seed: int) -> Tuple:
    """Split data into train/test sets"""
    if not (0.0 < test_size < 1.0):
        raise ValueError("--test-size must be between 0 and 1 (exclusive)")
    
    # Ensure X is 2D (should be from generate_dataset, but safety check)
    if X.ndim != 2:
        raise ValueError(f"Expected 2D feature array, got {X.ndim}D with shape {X.shape}")
    
    rng = np.random.default_rng(seed)
    n_samples = len(X)
    indices = np.arange(n_samples)
    rng.shuffle(indices)
    
    n_test = max(1, int(round(n_samples * test_size)))
    test_idx = indices[:n_test]
    train_idx = indices[n_test:]
    
    # Split data (numpy indexing maintains 2D shape)
    X_train = X[train_idx]
    X_test = X[test_idx]
    
    # Ensure 2D shape is maintained (important for single sample case)
    if X_test.ndim == 1:
        X_test = X_test.reshape(1, -1)
    if X_train.ndim == 1:
        X_train = X_train.reshape(1, -1)
    
    return (
        X_train, X_test,
        y_action[train_idx], y_action[test_idx],
        y_urgency[train_idx], y_urgency[test_idx]
    )


def _rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculate Root Mean Squared Error"""
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))


def _mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculate Mean Absolute Error"""
    return float(mean_absolute_error(y_true, y_pred))


def generate_synthetic_dataset(samples: int, seed: int) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Generate synthetic dataset with features and labels using the same method as training"""
    import random
    random.seed(seed)
    
    generator = TrainingDataGenerator()
    
    # Use the same generate_dataset method as training script
    X, y = generator.generate_dataset(num_samples=samples, scenarios=["normal", "good", "poor", "critical"])
    
    # Ensure X is 2D and correct dtype
    X = np.asarray(X, dtype=np.float32)
    if X.ndim != 2:
        raise ValueError(f"Expected 2D feature array from generate_dataset, got shape {X.shape}")
    
    # Extract labels
    y_action = np.asarray(y["action_type"], dtype=np.int64)
    y_urgency = np.asarray(y["urgency"], dtype=np.float32)
    
    return X, y_action, y_urgency


def apply_feature_noise(X_ref: np.ndarray, X: np.ndarray, noise_level: float, seed: int) -> np.ndarray:
    """
    Apply *sensor-like* measurement noise to the test feature matrix.

    Important: many of the 35 features are *derived flags* (binary thresholds) and ratios.
    Adding noise directly to those derived columns is unrealistic and can overly degrade
    results. Instead we:
      1) Add Gaussian noise only to continuous "sensor-like" columns
      2) Recompute derived columns (flags/ratios/interactions) from the noised base values

    Noise std per column is:  noise_level × std(column)  computed on X_ref (train split).
    """
    nl = float(noise_level)
    if nl <= 0:
        return X
    if X_ref.ndim != 2 or X.ndim != 2:
        raise ValueError("apply_feature_noise expects 2D arrays")
    if X.shape[1] != 35 or X_ref.shape[1] != 35:
        raise ValueError("Expected 35-feature matrices")

    rng = np.random.default_rng(int(seed))
    ref_std = np.std(X_ref, axis=0).astype(np.float32)
    ref_std = np.where(ref_std > 1e-12, ref_std, 1.0).astype(np.float32)

    Xn = X.astype(np.float32).copy()

    # Feature order is defined in models/decision_model.py (FeatureExtractor.extract_features).
    # Apply noise to continuous "sensor-like" fields only.
    noise_cols = [
        # Water sensors (0..7)
        0, 1, 2, 3, 4, 5, 6, 7,
        # Feed (avg_weight, feed_amount, biomass)
        10, 11, 13,
        # Energy continuous (14..19)
        14, 15, 16, 17, 18, 19,
        # Labor continuous-ish (time_spent, efficiency)
        20, 22,
    ]

    for c in noise_cols:
        std = float(ref_std[c])
        Xn[:, c] = Xn[:, c] + rng.normal(0.0, nl * std, size=(Xn.shape[0],)).astype(np.float32)

    # Clip to plausible ranges (keeps noise realistic and prevents negative-only artifacts)
    def _clip(col: int, lo: float, hi: float | None = None) -> None:
        if hi is None:
            Xn[:, col] = np.maximum(Xn[:, col], lo).astype(np.float32)
        else:
            Xn[:, col] = np.clip(Xn[:, col], lo, hi).astype(np.float32)

    _clip(0, 5.0, 10.0)     # pH
    _clip(1, 15.0, 40.0)    # temperature (C)
    _clip(2, 0.0, 15.0)     # DO (mg/L)
    _clip(3, 0.0, 50.0)     # salinity (ppt)
    _clip(4, 0.0, 2.0)      # ammonia
    _clip(5, 0.0, 2.0)      # nitrite
    _clip(6, 0.0, 200.0)    # nitrate
    _clip(7, 0.0, 50.0)     # turbidity
    _clip(10, 0.0, 50.0)    # average_weight (g)
    _clip(11, 0.0, None)    # feed_amount
    _clip(13, 0.0, None)    # biomass
    _clip(14, 0.0, None)    # aerator_usage
    _clip(15, 0.0, None)    # pump_usage
    _clip(16, 0.0, None)    # heater_usage
    _clip(17, 0.0, None)    # total_energy
    _clip(18, 0.0, None)    # cost
    _clip(19, 0.0, 1.0)     # energy efficiency
    _clip(20, 0.0, 24.0)    # time_spent (hours)
    _clip(22, 0.0, 1.0)     # labor efficiency

    # Recompute derived / interaction features (25..34) from noised base values.
    ph = Xn[:, 0]
    temp = Xn[:, 1]
    do = Xn[:, 2]
    ammonia = Xn[:, 4]
    status_enc = Xn[:, 8]  # keep status encoding stable (represents aggregator output)
    feed_amount = Xn[:, 11]
    biomass = Xn[:, 13]
    energy_eff = Xn[:, 19]

    low_do = (do < 5.0).astype(np.float32)
    crit_do = (do < 4.0).astype(np.float32)
    high_nh3 = (ammonia > 0.2).astype(np.float32)
    crit_nh3 = (ammonia > 0.3).astype(np.float32)
    low_temp = (temp < 26.0).astype(np.float32)
    high_temp = (temp > 30.0).astype(np.float32)
    ph_out = ((ph < 7.5) | (ph > 8.5)).astype(np.float32)

    Xn[:, 25] = low_do
    Xn[:, 26] = crit_do
    Xn[:, 27] = high_nh3
    Xn[:, 28] = crit_nh3
    Xn[:, 29] = low_temp
    Xn[:, 30] = high_temp
    Xn[:, 31] = ph_out

    # "Alert count" proxy: number of threshold violations (keeps this realistic under noise).
    Xn[:, 32] = (low_do + crit_do + high_nh3 + crit_nh3 + low_temp + high_temp + ph_out).astype(np.float32)

    # Energy×water-quality interaction
    wq_score = (status_enc / 5.0).astype(np.float32)
    Xn[:, 33] = (energy_eff * wq_score).astype(np.float32)

    # Feed-per-biomass ratio
    Xn[:, 34] = (feed_amount / np.maximum(biomass, 0.001)).astype(np.float32)

    return Xn


def evaluate_action_classifier(agent: XGBoostDecisionAgent, X_test: np.ndarray, 
                               y_true: np.ndarray) -> Dict:
    """Evaluate action classification model"""
    if agent.action_model is None:
        raise ValueError("Action model not loaded")
    
    # Ensure X_test is 2D
    if X_test.ndim == 1:
        X_test = X_test.reshape(1, -1)
    elif X_test.ndim != 2:
        raise ValueError(f"Expected 1D or 2D array, got {X_test.ndim}D with shape {X_test.shape}")
    
    # Verify feature count matches model
    if X_test.shape[1] != 35:
        raise ValueError(
            f"Feature count mismatch: model expects 35 features, "
            f"got {X_test.shape[1]} (shape: {X_test.shape})"
        )
    
    # Get predictions
    y_pred = agent.action_model.predict(X_test)
    
    # Map encoded predictions back to original if needed
    if agent._enc_to_orig:
        y_pred = np.array([agent._enc_to_orig.get(int(p), int(p)) for p in y_pred])
    
    # Calculate metrics
    accuracy = accuracy_score(y_true, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, average=None, zero_division=0
    )
    precision_macro = precision_recall_fscore_support(
        y_true, y_pred, average='macro', zero_division=0
    )[0]
    recall_macro = precision_recall_fscore_support(
        y_true, y_pred, average='macro', zero_division=0
    )[1]
    f1_macro = precision_recall_fscore_support(
        y_true, y_pred, average='macro', zero_division=0
    )[2]
    
    cm = confusion_matrix(y_true, y_pred)
    
    # Top-2 accuracy (if prediction is in top 2 probabilities)
    try:
        proba = agent.action_model.predict_proba(X_test)
        top2_correct = 0
        for i, true_label in enumerate(y_true):
            top2_enc = np.argsort(proba[i])[-2:]
            # Map encoded indices back to original action IDs if a mapping exists.
            if agent._enc_to_orig:
                top2_preds = [agent._enc_to_orig.get(int(p), int(p)) for p in top2_enc]
            else:
                top2_preds = [int(p) for p in top2_enc]
            if int(true_label) in top2_preds:
                top2_correct += 1
        top2_accuracy = top2_correct / len(y_true)
    except:
        top2_accuracy = None
    
    return {
        'accuracy': accuracy,
        'precision_macro': precision_macro,
        'recall_macro': recall_macro,
        'f1_macro': f1_macro,
        'precision_per_class': precision.tolist(),
        'recall_per_class': recall.tolist(),
        'f1_per_class': f1.tolist(),
        'confusion_matrix': cm.tolist(),
        'top2_accuracy': top2_accuracy,
        'classification_report': classification_report(y_true, y_pred, output_dict=True)
    }


def evaluate_urgency_regressor(agent: XGBoostDecisionAgent, X_test: np.ndarray,
                               y_true: np.ndarray) -> Dict:
    """Evaluate urgency regression model"""
    if agent.urgency_model is None:
        raise ValueError("Urgency model not loaded")
    
    # Ensure X_test is 2D
    if X_test.ndim == 1:
        X_test = X_test.reshape(1, -1)
    elif X_test.ndim != 2:
        raise ValueError(f"Expected 1D or 2D array, got {X_test.ndim}D with shape {X_test.shape}")
    
    # Verify feature count matches model
    if X_test.shape[1] != 35:
        raise ValueError(
            f"Feature count mismatch: model expects 35 features, "
            f"got {X_test.shape[1]} (shape: {X_test.shape})"
        )
    
    y_pred = agent.urgency_model.predict(X_test)
    y_pred = np.clip(y_pred, 0.0, 1.0)  # Ensure in [0, 1] range
    
    rmse = _rmse(y_true, y_pred)
    mae = _mae(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    
    # NOTE: MAPE is unstable when y_true has many zeros (common for urgency in [0,1]).
    # We therefore report MAPE only on non-zero targets, plus coverage.
    eps = 1e-6
    mask = np.abs(y_true) > eps
    if np.any(mask):
        mape_nonzero = float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / (y_true[mask] + eps))) * 100.0)
        mape_coverage = float(np.mean(mask))
    else:
        mape_nonzero = None
        mape_coverage = 0.0
    
    return {
        'rmse': rmse,
        'mae': mae,
        'r2_score': r2,
        'mape_nonzero': mape_nonzero,
        'mape_coverage': mape_coverage,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Evaluate saved XGBoost models on synthetic holdout data"
    )
    parser.add_argument(
        "--samples", type=int, default=5000,
        help="Number of synthetic samples to generate (default: 5000)"
    )
    parser.add_argument(
        "--test-size", type=float, default=0.2,
        help="Holdout fraction for test (default: 0.2)"
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Random seed (default: 42)"
    )
    parser.add_argument(
        "--model-dir", type=str, default="models/xgboost_models",
        help="Directory containing trained models (default: models/xgboost_models)"
    )
    parser.add_argument(
        "--noise-level", type=float, default=0.0,
        help=(
            "Optional feature noise level (default: 0.0). "
            "Noise std per feature = noise_level × std(feature) computed on training split. "
            "Use 0.05–0.25 to simulate sensor noise / distribution shift."
        ),
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Optional: Save detailed metrics to JSON file"
    )
    args = parser.parse_args()
    
    model_dir = Path(args.model_dir)
    if not (model_dir / "action_model.pkl").exists():
        raise SystemExit(
            f"Missing {model_dir / 'action_model.pkl'}. "
            f"Train models first: python train_xgboost_models.py"
        )
    
    print("=" * 70)
    print("XGBoost Model Evaluation (Holdout)")
    print("=" * 70)
    print(f"samples={args.samples}  test_size={args.test_size}  seed={args.seed}")
    
    # Generate dataset
    print("\n1. Generating synthetic dataset...")
    X, y_action, y_urgency = generate_synthetic_dataset(samples=args.samples, seed=args.seed)
    print(f"   Dataset shape: X={X.shape}, y_action={y_action.shape}, y_urgency={y_urgency.shape}")
    
    # Split data
    print("\n2. Splitting into train/test...")
    X_train, X_test, ya_train, ya_test, yu_train, yu_test = _split_data(
        X, y_action, y_urgency, test_size=args.test_size, seed=args.seed
    )
    print(f"   Train: {X_train.shape[0]} samples, Test: {X_test.shape[0]} samples")
    print(f"   Feature dimensions: Train={X_train.shape[1]}, Test={X_test.shape[1]}")

    # Optional: apply noise to test features (simulates sensor noise / domain shift).
    if float(args.noise_level) > 0:
        X_test = apply_feature_noise(X_ref=X_train, X=X_test, noise_level=float(args.noise_level), seed=args.seed)
        print(f"   Applied feature noise: noise_level={float(args.noise_level):.3f}")
    
    # Load agent
    print("\n3. Loading XGBoost models...")
    agent = XGBoostDecisionAgent(model_dir=str(model_dir), enable_llm_explanations=False)
    if not agent.is_trained:
        raise SystemExit("Failed to load models")
    print("   [OK] Models loaded successfully")
    
    # Evaluate action classifier
    print("\n4. Evaluating Action Classifier...")
    action_metrics = evaluate_action_classifier(agent, X_test, ya_test)
    print(f"   Accuracy: {action_metrics['accuracy']:.4f}")
    print(f"   Precision (macro): {action_metrics['precision_macro']:.4f}")
    print(f"   Recall (macro): {action_metrics['recall_macro']:.4f}")
    print(f"   F1-score (macro): {action_metrics['f1_macro']:.4f}")
    if action_metrics['top2_accuracy']:
        print(f"   Top-2 Accuracy: {action_metrics['top2_accuracy']:.4f}")
    print("\n   Per-class metrics:")
    for i, (p, r, f) in enumerate(zip(
        action_metrics['precision_per_class'],
        action_metrics['recall_per_class'],
        action_metrics['f1_per_class']
    )):
        print(f"     Class {i}: Precision={p:.4f}, Recall={r:.4f}, F1={f:.4f}")
    
    # Evaluate urgency regressor
    print("\n5. Evaluating Urgency Regressor...")
    urgency_metrics = evaluate_urgency_regressor(agent, X_test, yu_test)
    print(f"   RMSE: {urgency_metrics['rmse']:.4f}")
    print(f"   MAE: {urgency_metrics['mae']:.4f}")
    print(f"   R² Score: {urgency_metrics['r2_score']:.4f}")
    if urgency_metrics.get("mape_nonzero") is not None:
        print(f"   MAPE (non-zero targets): {urgency_metrics['mape_nonzero']:.2f}% (coverage={urgency_metrics['mape_coverage']:.2f})")
    else:
        print("   MAPE (non-zero targets): n/a (no non-zero urgency targets in test set)")
    
    # Save results if requested
    if args.output:
        results = {
            'action_classifier': action_metrics,
            'urgency_regressor': urgency_metrics,
            'test_samples': len(X_test),
            'seed': args.seed,
            'noise_level': float(args.noise_level),
        }
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n6. Detailed metrics saved to {output_path}")
    
    print("\n" + "=" * 70)
    print("Evaluation Summary:")
    print(f"  Action Classification Accuracy: {action_metrics['accuracy']:.2%}")
    print(f"  Urgency Prediction MAE: {urgency_metrics['mae']:.4f}")
    print("=" * 70)
    print("\nTip: These are synthetic-rule labels; use real labeled farm data for real accuracy.")
    
    return 0


if __name__ == "__main__":
    raise SystemExit(main())