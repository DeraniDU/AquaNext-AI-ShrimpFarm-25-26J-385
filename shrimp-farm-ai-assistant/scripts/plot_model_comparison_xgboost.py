"""
Generate model comparison chart for existing system models only.

Includes the two XGBoost models in the system:
- Action classifier (train/val accuracy)
- Urgency regressor (train/val R² shown as score %)

Uses metrics.json (from training) or eval_metrics JSON. No placeholders.

Run from shrimp-farm-ai-assistant directory:
  python scripts/plot_model_comparison_xgboost.py

Output: scripts/output/model_comparison_xgboost.png, model_comparison_xgboost.json
"""

from __future__ import annotations

import json
import os
import random
import sys
import glob

# Run from repo root (shrimp-farm-ai-assistant)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

import numpy as np
import matplotlib.pyplot as plt

OUT_DIR = os.path.join(SCRIPT_DIR, "output")
DEFAULT_MODEL_DIR = os.path.join(REPO_ROOT, "models", "xgboost_models")


def _get_eval_metrics(model_dir: str):
    """Load first eval_metrics JSON without noise in path."""
    for path in sorted(glob.glob(os.path.join(model_dir, "eval_metrics_*.json"))):
        if "noise" not in path and "sensorNoise" not in path:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, TypeError):
                continue
    return None


def get_action_metrics(model_dir: str, num_samples: int = 20000, seed: int = 42):
    """Train/val accuracy for action classifier (%)."""
    metrics_path = os.path.join(model_dir, "metrics.json")
    if os.path.isfile(metrics_path):
        with open(metrics_path, "r", encoding="utf-8") as f:
            m = json.load(f)
        ta, va = m.get("train_accuracy"), m.get("val_accuracy")
        if ta is not None and va is not None:
            return ta, va
    ev = _get_eval_metrics(model_dir)
    if ev:
        acc = ev.get("action_classifier", {}).get("accuracy")
        if acc is not None:
            pct = float(acc) * 100
            return pct, pct
    # Fallback: load model and compute
    import joblib
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score
    from models.training.data_generator import TrainingDataGenerator

    action_path = os.path.join(model_dir, "action_model.pkl")
    mapping_path = os.path.join(model_dir, "action_class_mapping.json")
    if not os.path.isfile(action_path) or not os.path.isfile(mapping_path):
        return None, None
    random.seed(seed)
    np.random.seed(seed)
    gen = TrainingDataGenerator()
    X, y = gen.generate_dataset(num_samples=num_samples)
    X = np.asarray(X, dtype=np.float32)
    y_action = np.asarray(y["action_type"], dtype=np.int64)
    with open(mapping_path, "r", encoding="utf-8") as f:
        orig_to_enc = json.load(f)["orig_to_enc"]
    y_enc = np.array([orig_to_enc.get(int(a), 0) for a in y_action], dtype=np.int64)
    X_train, X_val, ya_train, ya_val = train_test_split(
        X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )
    action_model = joblib.load(action_path)
    train_acc = float(accuracy_score(ya_train, action_model.predict(X_train))) * 100
    val_acc = float(accuracy_score(ya_val, action_model.predict(X_val))) * 100
    return train_acc, val_acc


def get_urgency_metrics(model_dir: str):
    """Train/val R² for urgency regressor, returned as 0–100 score (%)."""
    metrics_path = os.path.join(model_dir, "metrics.json")
    if os.path.isfile(metrics_path):
        with open(metrics_path, "r", encoding="utf-8") as f:
            m = json.load(f)
        tr2 = m.get("train_r2_urgency")
        vr2 = m.get("val_r2_urgency")
        if tr2 is not None and vr2 is not None:
            return float(tr2) * 100, float(vr2) * 100
    ev = _get_eval_metrics(model_dir)
    if ev:
        r2 = ev.get("urgency_regressor", {}).get("r2_score")
        if r2 is not None:
            pct = min(100, max(0, float(r2) * 100))
            return pct, pct
    return None, None


def main():
    model_dir = os.environ.get("XGBOOST_MODEL_DIR", DEFAULT_MODEL_DIR)
    os.makedirs(OUT_DIR, exist_ok=True)

    models = []
    # 1. XGBoost Action Classifier
    train_acc, val_acc = get_action_metrics(model_dir)
    if train_acc is not None and val_acc is not None:
        models.append({
            "model": "XGBoost (Action Classifier)",
            "train_score": round(train_acc, 2),
            "val_score": round(val_acc, 2),
        })
        print(f"XGBoost Action: train = {train_acc:.2f}%, val = {val_acc:.2f}%")
    # 2. XGBoost Urgency Regressor (R² as score %)
    train_r2, val_r2 = get_urgency_metrics(model_dir)
    if train_r2 is not None and val_r2 is not None:
        models.append({
            "model": "XGBoost (Urgency Regressor)",
            "train_score": round(train_r2, 2),
            "val_score": round(val_r2, 2),
        })
        print(f"XGBoost Urgency: train R² = {train_r2/100:.4f}, val R² = {val_r2/100:.4f}")

    if not models:
        print("No existing models with metrics found. Train first: python train_xgboost_models.py")
        return

    names = [m["model"] for m in models]
    train_scores = [m["train_score"] for m in models]
    val_scores = [m["val_score"] for m in models]

    json_path = os.path.join(OUT_DIR, "model_comparison_xgboost.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(models, f, indent=2)
    print(f"Saved {json_path}")

    x = range(len(names))
    width = 0.35
    fig, ax = plt.subplots(figsize=(max(6, 2.2 * len(names)), 5))
    ax.bar([i - width / 2 for i in x], train_scores, width, label="Train", color="steelblue")
    ax.bar([i + width / 2 for i in x], val_scores, width, label="Validation", color="orange")
    ax.set_ylabel("Score (%)")
    ax.set_xlabel("Model")
    ax.set_title("Model comparison: XGBoost decision models (Accuracy / R²)")
    ax.set_xticks(x)
    ax.set_xticklabels(names, rotation=45, ha="right")
    ax.legend()
    ax.set_ylim(0, 100)
    plt.tight_layout()
    png_path = os.path.join(OUT_DIR, "model_comparison_xgboost.png")
    plt.savefig(png_path, dpi=150)
    plt.close()
    print(f"Saved {png_path}")


if __name__ == "__main__":
    main()
