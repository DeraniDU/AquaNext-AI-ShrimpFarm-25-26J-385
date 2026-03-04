"""
SCRIPT 3: LSTM (Long Short-Term Memory) — Time Series Model
=============================================================
LSTM is a special neural network designed for sequential/time-series data.
It learns patterns over TIME — e.g., "if DO dropped for 3 hours, it will drop again".

This script predicts the NEXT hour's DO from the past N hours of all features.

Run AFTER: python 01_data_preprocessing.py
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os, warnings
warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"   # Suppress TF messages

from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

OUTPUT_DIR = "outputs"
MODEL_DIR  = "saved_models"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MODEL_DIR,  exist_ok=True)

# ─────────────────────────────────────────────
# 1. LOAD DATA
# ─────────────────────────────────────────────
print("=" * 60)
print("LSTM MODEL — Time-Series Prediction of DO (mg/L)")
print("=" * 60)

df = pd.read_csv("data/cleaned_data.csv", parse_dates=["timestamp"])
df = df.sort_values("timestamp").reset_index(drop=True)
print(f"✅ Loaded {df.shape[0]} rows")

# Features used for LSTM
FEATURE_COLS = [
    "temp_c", "salinity_ppt", "ph", "do_mg_l",
    "alkalinity_mg_l_caco3", "turbidity_ntu",
    "tan_mg_l", "nh3_mg_l", "no2_mg_l", "orp_mv",
    "hour_sin", "hour_cos"
]
TARGET_COL = "do_mg_l"
TARGET_IDX = FEATURE_COLS.index(TARGET_COL)   # index of DO in feature list

LOOKBACK   = 24   # Use past 24 hours to predict next hour
BATCH_SIZE = 64
EPOCHS     = 30   # Increase for better results (slower)

# ─────────────────────────────────────────────
# 2. SCALE DATA
# ─────────────────────────────────────────────
data = df[FEATURE_COLS].values

scaler = MinMaxScaler(feature_range=(0, 1))
data_scaled = scaler.fit_transform(data)
joblib.dump(scaler, f"{MODEL_DIR}/lstm_scaler.pkl")

print(f"   Features: {len(FEATURE_COLS)}")
print(f"   Lookback window: {LOOKBACK} hours")

# ─────────────────────────────────────────────
# 3. CREATE SEQUENCES
# Each X sample = [lookback rows of features]
# Each y sample = [next hour's DO value]
# ─────────────────────────────────────────────
def create_sequences(data_scaled, lookback, target_idx):
    X, y = [], []
    for i in range(lookback, len(data_scaled)):
        X.append(data_scaled[i - lookback: i, :])   # past N timesteps
        y.append(data_scaled[i, target_idx])          # next DO
    return np.array(X), np.array(y)

X_seq, y_seq = create_sequences(data_scaled, LOOKBACK, TARGET_IDX)
print(f"   Sequence shape: X={X_seq.shape}, y={y_seq.shape}")
# X shape: (samples, 24, 12)  — 24 time steps, 12 features
# y shape: (samples,)

# ─────────────────────────────────────────────
# 4. TRAIN/TEST SPLIT (80/20, time-ordered)
# ─────────────────────────────────────────────
split_idx = int(len(X_seq) * 0.8)
X_train, X_test = X_seq[:split_idx], X_seq[split_idx:]
y_train, y_test = y_seq[:split_idx], y_seq[split_idx:]
print(f"   Train: {X_train.shape}, Test: {X_test.shape}")

# ─────────────────────────────────────────────
# 5. BUILD LSTM MODEL
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("Building LSTM Architecture")
print("=" * 60)

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
    print(f"  TensorFlow version: {tf.__version__}")
except ImportError:
    print("❌ TensorFlow not found!")
    print("   Install with: pip install tensorflow")
    print("   Or on Mac: pip install tensorflow-macos")
    exit(1)

model = Sequential([
    # Layer 1: LSTM with 64 units, return sequences for stacking
    LSTM(64, return_sequences=True, input_shape=(LOOKBACK, len(FEATURE_COLS))),
    Dropout(0.2),          # Prevents overfitting (randomly drops 20% connections)
    BatchNormalization(),   # Stabilizes training

    # Layer 2: LSTM with 32 units
    LSTM(32, return_sequences=False),
    Dropout(0.2),
    BatchNormalization(),

    # Dense output layers
    Dense(16, activation="relu"),
    Dense(1)               # Output: 1 value (next hour's DO)
])

model.compile(
    optimizer="adam",      # Adam = popular adaptive learning rate optimizer
    loss="mse",            # Mean Squared Error loss
    metrics=["mae"]
)

model.summary()

# ─────────────────────────────────────────────
# 6. TRAIN MODEL
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print(f"Training LSTM ({EPOCHS} epochs, batch size {BATCH_SIZE})")
print("(This may take a few minutes...)")
print("=" * 60)

# Callbacks — automatic stopping if no improvement
early_stop = EarlyStopping(
    monitor="val_loss",
    patience=8,          # Stop if no improvement for 8 epochs
    restore_best_weights=True
)
reduce_lr = ReduceLROnPlateau(
    monitor="val_loss",
    factor=0.5,          # Halve learning rate when stuck
    patience=4,
    min_lr=1e-6
)

history = model.fit(
    X_train, y_train,
    validation_split=0.1,       # Use 10% of train data for validation
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    callbacks=[early_stop, reduce_lr],
    verbose=1
)

print(f"\n  Stopped at epoch: {len(history.history['loss'])}")
model.save(f"{MODEL_DIR}/lstm_model.keras")
print(f"  ✅ Model saved to {MODEL_DIR}/lstm_model.keras")

# ─────────────────────────────────────────────
# 7. EVALUATE
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("Evaluating LSTM")
print("=" * 60)

y_pred_scaled = model.predict(X_test, verbose=0).flatten()

# Inverse transform — convert scaled values back to mg/L
# We need to reconstruct the full feature array to inverse transform
def inverse_transform_do(scaler, scaled_values, target_idx, n_features):
    """Inverse transform only the target column."""
    dummy = np.zeros((len(scaled_values), n_features))
    dummy[:, target_idx] = scaled_values
    return scaler.inverse_transform(dummy)[:, target_idx]

y_pred_actual = inverse_transform_do(scaler, y_pred_scaled, TARGET_IDX, len(FEATURE_COLS))
y_test_actual = inverse_transform_do(scaler, y_test,       TARGET_IDX, len(FEATURE_COLS))

rmse = np.sqrt(mean_squared_error(y_test_actual, y_pred_actual))
mae  = mean_absolute_error(y_test_actual, y_pred_actual)
r2   = r2_score(y_test_actual, y_pred_actual)

print(f"  R²   = {r2:.4f}")
print(f"  RMSE = {rmse:.4f} mg/L")
print(f"  MAE  = {mae:.4f} mg/L")

# ─────────────────────────────────────────────
# 8. PLOTS
# ─────────────────────────────────────────────
print("\n  Saving plots...")
n_plot = 500

fig, axes = plt.subplots(3, 1, figsize=(14, 12))

# Training loss curves
axes[0].plot(history.history["loss"],     label="Train Loss", color="steelblue")
axes[0].plot(history.history["val_loss"], label="Val Loss",   color="orange")
axes[0].set_title("LSTM Training Loss (MSE)", fontweight="bold")
axes[0].set_xlabel("Epoch")
axes[0].set_ylabel("Loss (MSE)")
axes[0].legend()
axes[0].grid(True, alpha=0.3)

# Actual vs Predicted — time series
axes[1].plot(range(n_plot), y_test_actual[:n_plot],  "k-", linewidth=1, alpha=0.7, label="Actual")
axes[1].plot(range(n_plot), y_pred_actual[:n_plot], "r-", linewidth=1, alpha=0.8, label="LSTM Predicted")
axes[1].set_title(f"LSTM Prediction vs Actual (R²={r2:.4f}, RMSE={rmse:.3f})", fontweight="bold")
axes[1].set_xlabel("Time Steps")
axes[1].set_ylabel("DO (mg/L)")
axes[1].legend()
axes[1].grid(True, alpha=0.3)

# Scatter plot
axes[2].scatter(y_test_actual[:n_plot], y_pred_actual[:n_plot],
                alpha=0.3, s=10, color="steelblue")
lims = [min(y_test_actual.min(), y_pred_actual.min()),
        max(y_test_actual.max(), y_pred_actual.max())]
axes[2].plot(lims, lims, "k--", linewidth=1.5, label="Perfect fit")
axes[2].set_title("Actual vs Predicted — Scatter", fontweight="bold")
axes[2].set_xlabel("Actual DO (mg/L)")
axes[2].set_ylabel("Predicted DO (mg/L)")
axes[2].legend()
axes[2].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/03_lstm_results.png", dpi=150)
print(f"  ✅ Saved: {OUTPUT_DIR}/03_lstm_results.png")
print("\n🎉 LSTM done! Now run: python 04_classification_models.py")