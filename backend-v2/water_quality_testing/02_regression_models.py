"""
SCRIPT 2: Regression Models
==============================
Trains and compares 4 regression models to predict Dissolved Oxygen (do_mg_l):

  1. Multiple Linear Regression (MLR)
  2. Support Vector Regression (SVR)
  3. Random Forest Regressor
  4. XGBoost Regressor

Run AFTER: python 01_data_preprocessing.py
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os, time, warnings
warnings.filterwarnings("ignore")

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.svm import SVR
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import xgboost as xgb
import joblib

OUTPUT_DIR = "outputs"
MODEL_DIR  = "saved_models"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MODEL_DIR,  exist_ok=True)

# ─────────────────────────────────────────────
# 1. LOAD & PREPARE DATA
# ─────────────────────────────────────────────
print("=" * 60)
print("REGRESSION MODELS — Predicting Dissolved Oxygen (do_mg_l)")
print("=" * 60)

df = pd.read_csv("data/cleaned_data.csv", parse_dates=["timestamp"])
print(f"✅ Loaded cleaned data: {df.shape}")

# Feature columns (inputs) and target (output)
FEATURE_COLS = [
    "temp_c", "salinity_ppt", "ph",
    "alkalinity_mg_l_caco3", "turbidity_ntu", "secchi_cm",
    "chlorophyll_a_ug_l", "tan_mg_l", "nh3_mg_l",
    "no2_mg_l", "no3_mg_l", "orp_mv",
    "hour_sin", "hour_cos", "month"
]
TARGET_COL = "do_mg_l"

X = df[FEATURE_COLS].values
y = df[TARGET_COL].values

print(f"   Features: {len(FEATURE_COLS)}")
print(f"   Target:   {TARGET_COL}")
print(f"   Target range: {y.min():.3f} – {y.max():.3f} mg/L")

# Train / Test split (80% train, 20% test)
# Note: shuffle=False preserves time order
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, shuffle=False
)
print(f"\n   Train samples: {len(X_train)}")
print(f"   Test  samples: {len(X_test)}")

# Scale features (important for SVR and MLR)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)
joblib.dump(scaler, f"{MODEL_DIR}/regression_scaler.pkl")

# ─────────────────────────────────────────────
# HELPER: Evaluate and print metrics
# ─────────────────────────────────────────────
def evaluate(name, y_true, y_pred):
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mae  = mean_absolute_error(y_true, y_pred)
    r2   = r2_score(y_true, y_pred)
    print(f"\n  📊 {name}")
    print(f"     R²   = {r2:.4f}  (1.0 = perfect)")
    print(f"     RMSE = {rmse:.4f} mg/L")
    print(f"     MAE  = {mae:.4f} mg/L")
    return {"Model": name, "R2": r2, "RMSE": rmse, "MAE": mae}

results = []
predictions = {}

# ─────────────────────────────────────────────
# MODEL 1: Multiple Linear Regression (MLR)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("MODEL 1: Multiple Linear Regression")
print("=" * 60)
print("  Fits a straight-line relationship between features and DO.")
print("  Fast but only captures linear patterns.\n")

t0 = time.time()
mlr = LinearRegression()
mlr.fit(X_train_scaled, y_train)
elapsed = time.time() - t0

y_pred_mlr = mlr.predict(X_test_scaled)
results.append(evaluate("Multiple Linear Regression", y_test, y_pred_mlr))
predictions["MLR"] = y_pred_mlr
print(f"  ⏱️  Training time: {elapsed:.2f}s")
joblib.dump(mlr, f"{MODEL_DIR}/mlr_model.pkl")

# Feature importance (coefficients)
coef_df = pd.DataFrame({
    "Feature": FEATURE_COLS,
    "Coefficient": mlr.coef_
}).sort_values("Coefficient", key=abs, ascending=False)
print("\n  Top 5 influential features:")
print(coef_df.head(5).to_string(index=False))

# ─────────────────────────────────────────────
# MODEL 2: Support Vector Regression (SVR)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("MODEL 2: Support Vector Regression (SVR)")
print("=" * 60)
print("  Finds the best-fit 'tube' around data points.")
print("  Good for non-linear patterns. Slower on large datasets.\n")

# Using a subset for speed (SVR is slow on 10k+ rows)
MAX_SVR_SAMPLES = 3000
X_tr_svr = X_train_scaled[:MAX_SVR_SAMPLES]
y_tr_svr  = y_train[:MAX_SVR_SAMPLES]
print(f"  (Using first {MAX_SVR_SAMPLES} training samples for speed)")

t0 = time.time()
svr = SVR(kernel="rbf", C=10, epsilon=0.1, gamma="scale")
svr.fit(X_tr_svr, y_tr_svr)
elapsed = time.time() - t0

y_pred_svr = svr.predict(X_test_scaled)
results.append(evaluate("Support Vector Regression", y_test, y_pred_svr))
predictions["SVR"] = y_pred_svr
print(f"  ⏱️  Training time: {elapsed:.2f}s")
joblib.dump(svr, f"{MODEL_DIR}/svr_model.pkl")

# ─────────────────────────────────────────────
# MODEL 3: Random Forest Regressor
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("MODEL 3: Random Forest Regressor")
print("=" * 60)
print("  Builds many decision trees and averages their predictions.")
print("  Handles non-linearity, resistant to overfitting.\n")

t0 = time.time()
rf = RandomForestRegressor(
    n_estimators=100,    # Number of trees
    max_depth=15,         # Max depth of each tree
    min_samples_split=5,  # Min samples to split a node
    random_state=42,
    n_jobs=-1             # Use all CPU cores
)
rf.fit(X_train, y_train)   # RF doesn't need scaling
elapsed = time.time() - t0

y_pred_rf = rf.predict(X_test)
results.append(evaluate("Random Forest Regressor", y_test, y_pred_rf))
predictions["RF"] = y_pred_rf
print(f"  ⏱️  Training time: {elapsed:.2f}s")
joblib.dump(rf, f"{MODEL_DIR}/rf_regressor.pkl")

# Feature importance
feat_imp = pd.DataFrame({
    "Feature": FEATURE_COLS,
    "Importance": rf.feature_importances_
}).sort_values("Importance", ascending=False)
print("\n  Top 5 important features:")
print(feat_imp.head(5).to_string(index=False))

# ─────────────────────────────────────────────
# MODEL 4: XGBoost Regressor
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("MODEL 4: XGBoost Regressor")
print("=" * 60)
print("  Gradient boosting — builds trees sequentially, each fixing")
print("  errors from the previous. Usually the top performer.\n")

t0 = time.time()
xgb_reg = xgb.XGBRegressor(
    n_estimators=200,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    verbosity=0
)
xgb_reg.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=False
)
elapsed = time.time() - t0

y_pred_xgb = xgb_reg.predict(X_test)
results.append(evaluate("XGBoost Regressor", y_test, y_pred_xgb))
predictions["XGBoost"] = y_pred_xgb
print(f"  ⏱️  Training time: {elapsed:.2f}s")
xgb_reg.save_model(f"{MODEL_DIR}/xgb_regressor.json")

# ─────────────────────────────────────────────
# COMPARISON TABLE
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("MODEL COMPARISON SUMMARY")
print("=" * 60)
results_df = pd.DataFrame(results).sort_values("R2", ascending=False)
print(results_df.to_string(index=False))
results_df.to_csv(f"{OUTPUT_DIR}/regression_results.csv", index=False)

# ─────────────────────────────────────────────
# PLOTS
# ─────────────────────────────────────────────
print("\n  Saving plots...")
n_plot = 500   # plot last N test points

# Plot 1: Actual vs Predicted for each model
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle("Actual vs Predicted — Dissolved Oxygen (mg/L)", fontsize=14, fontweight="bold")
axes = axes.flatten()

colors = ["steelblue", "darkorange", "forestgreen", "crimson"]
for i, (name, color) in enumerate(zip(predictions.keys(), colors)):
    ax = axes[i]
    ax.scatter(y_test[:n_plot], predictions[name][:n_plot],
               alpha=0.4, s=10, color=color)
    lims = [min(y_test.min(), predictions[name].min()),
            max(y_test.max(), predictions[name].max())]
    ax.plot(lims, lims, "k--", linewidth=1, label="Perfect")
    r2 = r2_score(y_test, predictions[name])
    ax.set_title(f"{name}\nR² = {r2:.4f}", fontsize=10)
    ax.set_xlabel("Actual (mg/L)")
    ax.set_ylabel("Predicted (mg/L)")
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/02_regression_actual_vs_predicted.png", dpi=150)

# Plot 2: Time series comparison
fig, axes = plt.subplots(4, 1, figsize=(14, 14), sharex=True)
x_axis = range(n_plot)
for i, (name, color) in enumerate(zip(predictions.keys(), colors)):
    axes[i].plot(x_axis, y_test[:n_plot], "k-", linewidth=1, alpha=0.6, label="Actual")
    axes[i].plot(x_axis, predictions[name][:n_plot], color=color, linewidth=1, alpha=0.8, label=name)
    rmse = np.sqrt(mean_squared_error(y_test[:n_plot], predictions[name][:n_plot]))
    axes[i].set_title(f"{name} (RMSE={rmse:.3f})", fontsize=10)
    axes[i].set_ylabel("DO (mg/L)")
    axes[i].legend(loc="upper right", fontsize=8)
    axes[i].grid(True, alpha=0.3)
axes[-1].set_xlabel("Time Steps (test set)")
fig.suptitle("DO Prediction — Time Series View", fontsize=14, fontweight="bold")
plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/02_regression_time_series.png", dpi=150)

# Plot 3: Feature importance (RF)
fig, axes = plt.subplots(1, 2, figsize=(14, 6))
# RF importance
feat_imp_sorted = feat_imp.head(10)
axes[0].barh(feat_imp_sorted["Feature"], feat_imp_sorted["Importance"], color="forestgreen")
axes[0].set_title("Random Forest — Feature Importance", fontweight="bold")
axes[0].set_xlabel("Importance Score")
axes[0].invert_yaxis()

# Model comparison bar chart
metrics = results_df.set_index("Model")
axes[1].barh(metrics.index, metrics["R2"], color=["gold", "forestgreen", "steelblue", "coral"])
axes[1].set_title("Model Comparison — R² Score", fontweight="bold")
axes[1].set_xlabel("R² Score")
axes[1].set_xlim(0, 1)
axes[1].axvline(1, color="gray", linestyle="--", linewidth=0.8)
for i, v in enumerate(metrics["R2"]):
    axes[1].text(v + 0.01, i, f"{v:.3f}", va="center", fontsize=9)

plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/02_regression_feature_importance.png", dpi=150)

print(f"  ✅ Plots saved to {OUTPUT_DIR}/")
print("\n🎉 Regression models done! Now run: python 03_lstm_model.py")