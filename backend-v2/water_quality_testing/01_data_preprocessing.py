"""
SCRIPT 1: Data Preprocessing
==============================
This script:
- Loads your CSV dataset
- Shows basic statistics
- Handles missing values
- Detects outliers
- Saves a cleaned version ready for modeling

Run this FIRST before any other script.
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Saves plots to file instead of showing popup
import matplotlib.pyplot as plt
import seaborn as sns
import os

# ─────────────────────────────────────────────
# CONFIG — change the path if needed
# ─────────────────────────────────────────────
DATA_PATH = "data/shrimp_data.csv"
OUTPUT_DIR = "outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─────────────────────────────────────────────
# 1. LOAD DATA
# ─────────────────────────────────────────────
print("=" * 60)
print("STEP 1: Loading Dataset")
print("=" * 60)

df = pd.read_csv(DATA_PATH, parse_dates=["timestamp"])
print(f"✅ Loaded {df.shape[0]} rows × {df.shape[1]} columns")
print(f"\nColumns: {list(df.columns)}")

# ─────────────────────────────────────────────
# 2. BASIC STATISTICS
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 2: Basic Statistics")
print("=" * 60)
print(df.describe().round(3))

# ─────────────────────────────────────────────
# 3. MISSING VALUES
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 3: Missing Values")
print("=" * 60)

missing = df.isnull().sum()
missing_pct = (df.isnull().mean() * 100).round(2)
missing_df = pd.DataFrame({"Missing Count": missing, "Missing %": missing_pct})
missing_df = missing_df[missing_df["Missing Count"] > 0]

if missing_df.empty:
    print("✅ No missing values found!")
else:
    print(missing_df)

# ─────────────────────────────────────────────
# 4. FILL MISSING VALUES
# Strategy: interpolate time-series gaps, then forward-fill edges
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 4: Filling Missing Values")
print("=" * 60)

df = df.sort_values("timestamp").reset_index(drop=True)

numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

# Time-based linear interpolation (best for sensor data)
df[numeric_cols] = df[numeric_cols].interpolate(method="linear", limit_direction="both")

# If any remain at edges, use forward/backward fill
df[numeric_cols] = df[numeric_cols].ffill().bfill()

remaining_missing = df.isnull().sum().sum()
print(f"✅ Missing values after filling: {remaining_missing}")

# ─────────────────────────────────────────────
# 5. OUTLIER DETECTION (IQR method)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 5: Outlier Detection (IQR Method)")
print("=" * 60)

for col in numeric_cols:
    Q1 = df[col].quantile(0.25)
    Q3 = df[col].quantile(0.75)
    IQR = Q3 - Q1
    lower = Q1 - 3 * IQR   # Using 3×IQR (less aggressive than 1.5×)
    upper = Q3 + 3 * IQR
    outlier_count = ((df[col] < lower) | (df[col] > upper)).sum()
    if outlier_count > 0:
        print(f"  {col}: {outlier_count} outliers (range: {lower:.3f} to {upper:.3f})")
        # Cap outliers instead of removing (preserves time series integrity)
        df[col] = df[col].clip(lower=lower, upper=upper)

print("✅ Outliers capped using 3×IQR method")

# ─────────────────────────────────────────────
# 6. ADD USEFUL TIME FEATURES
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 6: Adding Time Features")
print("=" * 60)

df["hour"]        = df["timestamp"].dt.hour
df["day_of_week"] = df["timestamp"].dt.dayofweek
df["day_of_year"] = df["timestamp"].dt.dayofyear
df["month"]       = df["timestamp"].dt.month

# Cyclical encoding of hour (so hour 23 is close to hour 0)
df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)

print("✅ Added: hour, day_of_week, day_of_year, month, hour_sin, hour_cos")

# ─────────────────────────────────────────────
# 7. CREATE WATER QUALITY LABEL (for classification)
# Labels: 0=Critical, 1=Warning, 2=Good
# Based on DO (dissolved oxygen) levels
# ─────────────────────────────────────────────
def classify_water_quality(row):
    """
    Simple rule-based classification using DO and pH.
    Adjust thresholds based on your domain knowledge.
    """
    do  = row["do_mg_l"]
    ph  = row["ph"]
    tan = row["tan_mg_l"]

    score = 0
    # DO scoring (mg/L)
    if do >= 5.0:   score += 2   # Good
    elif do >= 3.0: score += 1   # Warning
    else:           score += 0   # Critical

    # pH scoring (ideal 7.5-8.5 for shrimp)
    if 7.5 <= ph <= 8.5:  score += 2
    elif 7.0 <= ph < 7.5: score += 1
    else:                 score += 0

    # TAN scoring (mg/L, lower is better)
    if tan < 0.5:  score += 2
    elif tan < 1.0: score += 1
    else:          score += 0

    # Total: 0-6 → classify into 3 groups
    if score >= 5:   return 2   # Good
    elif score >= 3: return 1   # Warning
    else:            return 0   # Critical

df["water_quality_label"] = df.apply(classify_water_quality, axis=1)
label_counts = df["water_quality_label"].value_counts().sort_index()
label_map = {0: "Critical", 1: "Warning", 2: "Good"}
print(f"\nWater Quality Labels:")
for k, v in label_counts.items():
    print(f"  {label_map[k]} ({k}): {v} samples ({v/len(df)*100:.1f}%)")

# ─────────────────────────────────────────────
# 8. PLOT DISTRIBUTIONS
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 7: Saving Plots")
print("=" * 60)

# Distribution plots
fig, axes = plt.subplots(3, 4, figsize=(16, 12))
fig.suptitle("Feature Distributions", fontsize=16, fontweight="bold")
axes = axes.flatten()

plot_cols = ["temp_c", "salinity_ppt", "ph", "do_mg_l",
             "alkalinity_mg_l_caco3", "turbidity_ntu", "secchi_cm",
             "chlorophyll_a_ug_l", "tan_mg_l", "nh3_mg_l", "no2_mg_l", "orp_mv"]

for i, col in enumerate(plot_cols):
    axes[i].hist(df[col], bins=50, color="steelblue", edgecolor="white", alpha=0.8)
    axes[i].set_title(col, fontsize=10)
    axes[i].set_xlabel("Value")
    axes[i].set_ylabel("Count")

plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/01_distributions.png", dpi=150)
print(f"  Saved: {OUTPUT_DIR}/01_distributions.png")

# Correlation heatmap
fig, ax = plt.subplots(figsize=(12, 10))
corr_cols = ["temp_c", "salinity_ppt", "ph", "do_mg_l", "alkalinity_mg_l_caco3",
             "turbidity_ntu", "tan_mg_l", "nh3_mg_l", "no2_mg_l", "orp_mv"]
corr = df[corr_cols].corr()
sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", center=0,
            linewidths=0.5, ax=ax)
ax.set_title("Correlation Heatmap", fontsize=14, fontweight="bold")
plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/01_correlation_heatmap.png", dpi=150)
print(f"  Saved: {OUTPUT_DIR}/01_correlation_heatmap.png")

# Time series of key variables
fig, axes = plt.subplots(4, 1, figsize=(14, 10), sharex=True)
plot_vars = [("do_mg_l", "Dissolved Oxygen (mg/L)", "blue"),
             ("temp_c",  "Temperature (°C)",        "red"),
             ("ph",      "pH",                       "green"),
             ("tan_mg_l","TAN (mg/L)",                "orange")]

for ax, (col, label, color) in zip(axes, plot_vars):
    ax.plot(df["timestamp"], df[col], color=color, linewidth=0.5, alpha=0.8)
    ax.set_ylabel(label, fontsize=9)
    ax.grid(True, alpha=0.3)

axes[-1].set_xlabel("Timestamp")
fig.suptitle("Key Parameters Over Time", fontsize=14, fontweight="bold")
plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/01_time_series.png", dpi=150)
print(f"  Saved: {OUTPUT_DIR}/01_time_series.png")

# ─────────────────────────────────────────────
# 9. SAVE CLEANED DATA
# ─────────────────────────────────────────────
CLEANED_PATH = "data/cleaned_data.csv"
df.to_csv(CLEANED_PATH, index=False)
print(f"\n✅ Cleaned data saved to: {CLEANED_PATH}")
print(f"   Final shape: {df.shape[0]} rows × {df.shape[1]} columns")
print("\n🎉 Preprocessing complete! Now run: python 02_regression_models.py")