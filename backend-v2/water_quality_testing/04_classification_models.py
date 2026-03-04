"""
SCRIPT 4: Classification Models
=================================
Classifies water quality into: 0=Critical, 1=Warning, 2=Good

  1. Random Forest Classifier
  2. XGBoost Classifier
  3. MLP (Multi-Layer Perceptron — a neural network)

Run AFTER: python 01_data_preprocessing.py
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os, warnings
warnings.filterwarnings("ignore")

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, label_binarize
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix,
    accuracy_score, roc_auc_score, ConfusionMatrixDisplay
)
import xgboost as xgb
import joblib

OUTPUT_DIR = "outputs"
MODEL_DIR  = "saved_models"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MODEL_DIR,  exist_ok=True)

# ─────────────────────────────────────────────
# 1. LOAD DATA
# ─────────────────────────────────────────────
print("=" * 60)
print("CLASSIFICATION MODELS — Water Quality (Good/Warning/Critical)")
print("=" * 60)

df = pd.read_csv("data/cleaned_data.csv", parse_dates=["timestamp"])
print(f"✅ Loaded {df.shape[0]} rows")

FEATURE_COLS = [
    "temp_c", "salinity_ppt", "ph", "do_mg_l",
    "alkalinity_mg_l_caco3", "turbidity_ntu", "secchi_cm",
    "chlorophyll_a_ug_l", "tan_mg_l", "nh3_mg_l",
    "no2_mg_l", "no3_mg_l", "orp_mv",
    "hour_sin", "hour_cos", "month"
]
TARGET_COL  = "water_quality_label"
LABEL_NAMES = ["Critical (0)", "Warning (1)", "Good (2)"]

X = df[FEATURE_COLS].values
y = df[TARGET_COL].values

print(f"\nClass distribution:")
for i, name in enumerate(LABEL_NAMES):
    count = (y == i).sum()
    print(f"  {name}: {count} ({count/len(y)*100:.1f}%)")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc  = scaler.transform(X_test)
joblib.dump(scaler, f"{MODEL_DIR}/classifier_scaler.pkl")

# ─────────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────────
def evaluate_classifier(name, y_true, y_pred, y_prob=None):
    acc = accuracy_score(y_true, y_pred)
    print(f"\n  📊 {name}")
    print(f"     Accuracy: {acc:.4f} ({acc*100:.2f}%)")
    print("\n  Classification Report:")
    print(classification_report(y_true, y_pred,
                                 target_names=["Critical", "Warning", "Good"],
                                 digits=4))
    return acc

results = {}
all_preds = {}
all_probs = {}

# ─────────────────────────────────────────────
# MODEL 1: Random Forest Classifier
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("MODEL 1: Random Forest Classifier")
print("=" * 60)
print("  Ensemble of decision trees — votes for the majority class.\n")

rf_clf = RandomForestClassifier(
    n_estimators=100,
    max_depth=15,
    min_samples_split=5,
    random_state=42,
    n_jobs=-1
)
rf_clf.fit(X_train, y_train)
y_pred_rf = rf_clf.predict(X_test)
y_prob_rf = rf_clf.predict_proba(X_test)

results["Random Forest"] = evaluate_classifier("Random Forest", y_test, y_pred_rf, y_prob_rf)
all_preds["Random Forest"] = y_pred_rf
all_probs["Random Forest"] = y_prob_rf
joblib.dump(rf_clf, f"{MODEL_DIR}/rf_classifier.pkl")

# Feature importance
feat_imp = pd.DataFrame({
    "Feature": FEATURE_COLS,
    "Importance": rf_clf.feature_importances_
}).sort_values("Importance", ascending=False)
print("  Top 5 features:")
print(feat_imp.head(5).to_string(index=False))

# ─────────────────────────────────────────────
# MODEL 2: XGBoost Classifier
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("MODEL 2: XGBoost Classifier")
print("=" * 60)
print("  Gradient boosted trees — sequential learning, very accurate.\n")

xgb_clf = xgb.XGBClassifier(
    n_estimators=200,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    use_label_encoder=False,
    eval_metric="mlogloss",
    random_state=42,
    verbosity=0
)
xgb_clf.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=False
)
y_pred_xgb = xgb_clf.predict(X_test)
y_prob_xgb = xgb_clf.predict_proba(X_test)

results["XGBoost"] = evaluate_classifier("XGBoost Classifier", y_test, y_pred_xgb, y_prob_xgb)
all_preds["XGBoost"] = y_pred_xgb
all_probs["XGBoost"] = y_prob_xgb
xgb_clf.save_model(f"{MODEL_DIR}/xgb_classifier.json")

# ─────────────────────────────────────────────
# MODEL 3: MLP Classifier (Neural Network)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("MODEL 3: MLP Classifier (Multi-Layer Perceptron)")
print("=" * 60)
print("  Feedforward neural network with hidden layers.")
print("  Architecture: Input → 128 → 64 → 32 → Output\n")

mlp = MLPClassifier(
    hidden_layer_sizes=(128, 64, 32),   # 3 hidden layers
    activation="relu",
    solver="adam",
    max_iter=300,
    learning_rate_init=0.001,
    early_stopping=True,
    validation_fraction=0.1,
    random_state=42,
    verbose=False
)
mlp.fit(X_train_sc, y_train)
y_pred_mlp = mlp.predict(X_test_sc)
y_prob_mlp = mlp.predict_proba(X_test_sc)

results["MLP"] = evaluate_classifier("MLP Classifier", y_test, y_pred_mlp, y_prob_mlp)
all_preds["MLP"] = y_pred_mlp
all_probs["MLP"] = y_prob_mlp
joblib.dump(mlp, f"{MODEL_DIR}/mlp_classifier.pkl")

# ─────────────────────────────────────────────
# COMPARISON
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("CLASSIFICATION COMPARISON SUMMARY")
print("=" * 60)
for model_name, acc in sorted(results.items(), key=lambda x: x[1], reverse=True):
    print(f"  {model_name:25s}: Accuracy = {acc*100:.2f}%")

# ─────────────────────────────────────────────
# PLOTS
# ─────────────────────────────────────────────
print("\n  Saving plots...")

# Confusion matrices
fig, axes = plt.subplots(1, 3, figsize=(16, 5))
fig.suptitle("Confusion Matrices — Water Quality Classification", fontsize=13, fontweight="bold")
class_names = ["Critical", "Warning", "Good"]

for ax, (name, preds) in zip(axes, all_preds.items()):
    cm = confusion_matrix(y_test, preds)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=class_names)
    disp.plot(ax=ax, colorbar=False, cmap="Blues")
    ax.set_title(f"{name}\nAccuracy: {results[name]*100:.2f}%", fontsize=10, fontweight="bold")

plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/04_confusion_matrices.png", dpi=150)

# Accuracy comparison bar chart
fig, ax = plt.subplots(figsize=(8, 5))
model_names = list(results.keys())
accuracies = [results[m] * 100 for m in model_names]
colors = ["forestgreen", "steelblue", "darkorange"]
bars = ax.bar(model_names, accuracies, color=colors, edgecolor="white", linewidth=1.5)
for bar, acc in zip(bars, accuracies):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.3,
            f"{acc:.2f}%", ha="center", fontsize=11, fontweight="bold")
ax.set_title("Classification Model Accuracy Comparison", fontsize=13, fontweight="bold")
ax.set_ylabel("Accuracy (%)")
ax.set_ylim(0, 110)
ax.grid(axis="y", alpha=0.3)
plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/04_classifier_accuracy.png", dpi=150)

# Feature importance (RF)
fig, ax = plt.subplots(figsize=(10, 6))
top_features = feat_imp.head(12)
ax.barh(top_features["Feature"], top_features["Importance"],
        color="steelblue", edgecolor="white")
ax.set_title("Random Forest — Feature Importance (Classification)", fontweight="bold")
ax.set_xlabel("Importance Score")
ax.invert_yaxis()
ax.grid(axis="x", alpha=0.3)
plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/04_classification_feature_importance.png", dpi=150)

print(f"  ✅ Plots saved to {OUTPUT_DIR}/")
print("\n🎉 Classification models done! Now run: python 05_physics_models.py")