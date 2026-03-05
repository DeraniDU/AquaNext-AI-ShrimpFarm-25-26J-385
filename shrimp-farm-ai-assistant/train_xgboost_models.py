#!/usr/bin/env python3
"""
Train XGBoost Models for Decision Making

This script trains a lightweight ML decision agent using synthetic training data
generated from domain rules (same generator used by AutoGluon training).

Outputs (saved to models/xgboost_models/ by default):
- action_model.pkl   (XGBClassifier, multiclass 0..7)
- urgency_model.pkl  (XGBRegressor, regression 0..1)
"""

from __future__ import annotations

import argparse
from pathlib import Path
import json

import numpy as np


def train_xgboost_models(
    num_samples: int = 20000,
    model_dir: str = "models/xgboost_models",
    noise_level: float = 0.0,
    noise_seed: int = 42,
) -> None:
    try:
        import joblib
        import xgboost as xgb
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import r2_score
    except ImportError as e:
        raise SystemExit(
            "Missing dependencies. Install with: pip install xgboost scikit-learn joblib"
        ) from e

    from models.training.data_generator import TrainingDataGenerator

    out_dir = Path(model_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("XGBoost Model Training for Shrimp Farm Decision Making")
    print("=" * 70)
    print()

    print(f"1. Generating {num_samples} synthetic samples...")
    gen = TrainingDataGenerator()
    X, y = gen.generate_dataset(num_samples=num_samples)

    X = np.asarray(X, dtype=np.float32)
    y_action = np.asarray(y["action_type"], dtype=np.int64)
    y_urgency = np.asarray(y["urgency"], dtype=np.float32)

    print(f"   X shape: {X.shape}  y_action: {y_action.shape}  y_urgency: {y_urgency.shape}")

    # XGBoost (sklearn API) requires class labels to be contiguous 0..K-1.
    # Our synthetic generator may not produce all 0..7 actions, so we encode only
    # the observed classes and save a mapping so runtime can map predictions back.
    observed = sorted({int(v) for v in y_action.tolist()})
    orig_to_enc = {orig: i for i, orig in enumerate(observed)}
    enc_to_orig = {i: orig for orig, i in orig_to_enc.items()}
    y_action_enc = np.asarray([orig_to_enc[int(v)] for v in y_action], dtype=np.int64)

    X_train, X_val, ya_train, ya_val = train_test_split(
        X, y_action_enc, test_size=0.2, random_state=42, stratify=y_action_enc
    )
    Xu_train, Xu_val, yu_train, yu_val = train_test_split(
        X, y_urgency, test_size=0.2, random_state=42
    )

    if noise_level > 0:
        from evaluate_xgboost_models import apply_feature_noise
        print(f"\n   Applying feature noise to training data (noise_level={noise_level}, seed={noise_seed})...")
        X_train = apply_feature_noise(X_ref=X_train, X=X_train, noise_level=noise_level, seed=noise_seed)
        Xu_train = apply_feature_noise(X_ref=Xu_train, X=Xu_train, noise_level=noise_level, seed=noise_seed)

    print(f"\n2. Training action classifier ({len(observed)} observed classes out of 8)...")
    action_model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="multi:softprob",
        num_class=len(observed),
        random_state=42,
        n_jobs=-1,
    )
    action_model.fit(X_train, ya_train, eval_set=[(X_val, ya_val)], verbose=False)
    train_acc_action = float(action_model.score(X_train, ya_train)) * 100
    val_acc_action = float(action_model.score(X_val, ya_val)) * 100
    print(f"   Action classifier: train accuracy = {train_acc_action:.2f}%, val accuracy = {val_acc_action:.2f}%")

    print("\n3. Training urgency regressor...")
    urgency_model = xgb.XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=-1,
    )
    urgency_model.fit(Xu_train, yu_train, eval_set=[(Xu_val, yu_val)], verbose=False)
    train_r2_urgency = float(r2_score(yu_train, urgency_model.predict(Xu_train)))
    val_r2_urgency = float(r2_score(yu_val, urgency_model.predict(Xu_val)))
    print(f"   Urgency regressor: train R² = {train_r2_urgency:.4f}, val R² = {val_r2_urgency:.4f}")

    print("\n4. Saving models...")
    
    # Check if files are locked and provide helpful error message
    action_path = out_dir / "action_model.pkl"
    urgency_path = out_dir / "urgency_model.pkl"
    mapping_path = out_dir / "action_class_mapping.json"
    
    # Try to save with better error handling
    try:
        # Remove existing files if they exist (to avoid permission issues)
        if action_path.exists():
            try:
                action_path.unlink()
            except PermissionError:
                print(f"\n[ERROR] Cannot overwrite {action_path}")
                print("   The file is likely open in your IDE or another process.")
                print("   Please close the file in PyCharm/IDE and try again.")
                raise
        
        if urgency_path.exists():
            try:
                urgency_path.unlink()
            except PermissionError:
                print(f"\n[ERROR] Cannot overwrite {urgency_path}")
                print("   The file is likely open in your IDE or another process.")
                print("   Please close the file in PyCharm/IDE and try again.")
                raise
        
        # Save new models
        joblib.dump(action_model, action_path)
        joblib.dump(urgency_model, urgency_path)
        
        # Handle JSON file deletion if it exists
        if mapping_path.exists():
            try:
                mapping_path.unlink()
            except PermissionError:
                print(f"\n[ERROR] Cannot overwrite {mapping_path}")
                print("   The file is likely open in your IDE or another process.")
                print("   Please close the file in PyCharm/IDE and try again.")
                raise
        
        mapping_path.write_text(
            json.dumps({"enc_to_orig": enc_to_orig, "orig_to_enc": orig_to_enc}, indent=2),
            encoding="utf-8",
        )
        metrics_path = out_dir / "metrics.json"
        metrics_path.write_text(
            json.dumps({
                "train_accuracy": train_acc_action,
                "val_accuracy": val_acc_action,
                "train_r2_urgency": train_r2_urgency,
                "val_r2_urgency": val_r2_urgency,
                "noise_level": noise_level,
                "noise_seed": noise_seed,
            }, indent=2),
            encoding="utf-8",
        )
        print(f"   Saved: {action_path}")
        print(f"   Saved: {metrics_path}")
        print(f"   Saved: {urgency_path}")
        print(f"   Saved: {mapping_path}")
        print("\n[OK] XGBoost models trained successfully!")
        
    except PermissionError as e:
        print(f"\n[ERROR] Permission denied when saving models: {e}")
        print("\nTroubleshooting:")
        print("1. Close any files in your IDE (PyCharm, VS Code, etc.)")
        print("2. Make sure no other Python processes are using the models")
        print("3. Check file permissions on the models directory")
        print("4. Try running the script again after closing the files")
        raise


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--samples", type=int, default=20000, help="Number of synthetic samples to generate")
    p.add_argument("--model-dir", type=str, default="models/xgboost_models", help="Output directory for saved models")
    p.add_argument(
        "--noise-level",
        type=float,
        default=0.0,
        help="Add sensor-like noise to training features (e.g. 0.05–0.15). 0 = no noise.",
    )
    p.add_argument("--noise-seed", type=int, default=42, help="Random seed for noise (default 42)")
    return p.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    train_xgboost_models(
        num_samples=args.samples,
        model_dir=args.model_dir,
        noise_level=args.noise_level,
        noise_seed=args.noise_seed,
    )


