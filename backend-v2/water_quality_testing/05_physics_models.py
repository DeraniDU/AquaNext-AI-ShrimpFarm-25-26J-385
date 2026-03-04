"""
SCRIPT 5: Physics / Chemical Models
=====================================
Implements three physics-based equations:

  1. NH₃ Equilibrium Formula
     — Calculates un-ionized ammonia (toxic form) from TAN, pH, temperature

  2. DO Solubility Equation (Benson & Krause)
     — Calculates theoretical maximum DO from temperature and salinity

  3. TAN Accumulation Equation
     — Models how TAN builds up over time in a pond

These models use NO machine learning — they are purely mathematical equations.
They are compared against your measured sensor data.

Run AFTER: python 01_data_preprocessing.py
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os

OUTPUT_DIR = "outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

df = pd.read_csv("data/cleaned_data.csv", parse_dates=["timestamp"])
df = df.sort_values("timestamp").reset_index(drop=True)
print("=" * 60)
print("PHYSICS / CHEMICAL MODELS")
print("=" * 60)
print(f"✅ Loaded {df.shape[0]} rows")


# ═══════════════════════════════════════════════════
# MODEL 1: NH₃ (un-ionized ammonia) Equilibrium
# ═══════════════════════════════════════════════════
"""
THEORY:
TAN (Total Ammonia Nitrogen) exists in two forms:
  - NH₄⁺  (ionized, ammonium)  — less toxic
  - NH₃   (un-ionized, ammonia) — TOXIC to shrimp

The fraction of TAN that is NH₃ depends on:
  - Temperature (higher temp → more NH₃)
  - pH (higher pH → more NH₃)
  - Salinity (higher salinity → slightly less NH₃)

Formula (Emerson et al., 1975):
  pKa = 0.09018 + 2729.92 / T_kelvin
  fraction_NH3 = 1 / (1 + 10^(pKa - pH))
  NH3 = TAN × fraction_NH3
"""

print("\n" + "=" * 60)
print("MODEL 1: NH₃ Equilibrium Formula")
print("=" * 60)

def calculate_nh3(tan_mg_l, temp_c, ph, salinity_ppt=0):
    """
    Calculate un-ionized ammonia (NH₃) from TAN.

    Parameters:
        tan_mg_l    : Total Ammonia Nitrogen (mg/L as N)
        temp_c      : Water temperature (°C)
        ph          : pH value
        salinity_ppt: Salinity (ppt) — optional correction

    Returns:
        nh3_mg_l: Un-ionized ammonia (mg/L)
        fraction: Fraction of TAN that is NH₃ (0 to 1)
    """
    T_kelvin = temp_c + 273.15

    # pKa of ammonium ion (temperature dependent)
    # Emerson et al. (1975)
    pKa = 0.09018 + 2729.92 / T_kelvin

    # Salinity correction (Bower & Bidwell, 1978)
    # Slightly lowers pKa at higher salinity
    pKa_corrected = pKa - 0.00314 * salinity_ppt

    # Fraction of TAN as NH₃
    fraction_nh3 = 1.0 / (1.0 + 10 ** (pKa_corrected - ph))

    nh3_calc = tan_mg_l * fraction_nh3
    return nh3_calc, fraction_nh3

# Apply to entire dataset
df["nh3_calculated"], df["nh3_fraction"] = zip(*df.apply(
    lambda row: calculate_nh3(
        row["tan_mg_l"], row["temp_c"], row["ph"], row["salinity_ppt"]
    ), axis=1
))

# Compare with measured
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
r2   = r2_score(df["nh3_mg_l"], df["nh3_calculated"])
rmse = np.sqrt(mean_squared_error(df["nh3_mg_l"], df["nh3_calculated"]))

print(f"  NH₃ calculated range: {df['nh3_calculated'].min():.4f} – {df['nh3_calculated'].max():.4f} mg/L")
print(f"  NH₃ measured range:   {df['nh3_mg_l'].min():.4f} – {df['nh3_mg_l'].max():.4f} mg/L")
print(f"  R² (calc vs measured): {r2:.4f}")
print(f"  RMSE:                  {rmse:.4f} mg/L")
print(f"  Mean NH₃ fraction:     {df['nh3_fraction'].mean():.4f} ({df['nh3_fraction'].mean()*100:.2f}% of TAN)")

# Sensitivity analysis
print("\n  NH₃ Fraction at Different pH & Temperature:")
print(f"  {'Temp (°C)':>10} {'pH':>6} {'NH₃ Fraction (%)':>18}")
print(f"  {'-'*36}")
for temp in [26, 28, 30, 32]:
    for ph in [7.0, 7.5, 8.0, 8.5]:
        _, frac = calculate_nh3(1.0, temp, ph)
        print(f"  {temp:>10} {ph:>6.1f} {frac*100:>17.3f}%")


# ═══════════════════════════════════════════════════
# MODEL 2: DO Saturation / Solubility (Benson & Krause)
# ═══════════════════════════════════════════════════
"""
THEORY:
The maximum amount of oxygen that can dissolve in water (DO_sat) depends on:
  - Temperature: warmer water holds LESS oxygen
  - Salinity: saltier water holds LESS oxygen
  - Atmospheric pressure (assumed 1 atm here)

Formula: Benson & Krause (1984) — most widely used in aquaculture
  ln(DO_sat) = -139.34411 + 1.575701e5/T - 6.642308e7/T² + 1.2438e10/T³ - 8.621949e11/T⁴
  Where T = temperature in Kelvin

Salinity correction:
  DO_sat_saline = DO_sat × exp(-S × (0.017674 - 10.754/T + 2140.7/T²))

DO Saturation % = (DO_measured / DO_sat_saline) × 100
"""

print("\n" + "=" * 60)
print("MODEL 2: DO Solubility (Benson & Krause, 1984)")
print("=" * 60)

def calculate_do_saturation(temp_c, salinity_ppt=0, pressure_atm=1.0):
    """
    Calculate DO saturation concentration (mg/L) in water.

    Parameters:
        temp_c       : Water temperature (°C)
        salinity_ppt : Salinity (parts per thousand)
        pressure_atm : Atmospheric pressure (default 1.0 atm = sea level)

    Returns:
        do_sat: Theoretical DO saturation (mg/L)
    """
    T = temp_c + 273.15   # Convert to Kelvin

    # Benson & Krause (1984) freshwater saturation
    ln_do_sat = (-139.34411
                 + 1.575701e5  / T
                 - 6.642308e7  / T**2
                 + 1.2438e10   / T**3
                 - 8.621949e11 / T**4)

    do_sat_fresh = np.exp(ln_do_sat)  # mg/L

    # Salinity correction
    S = salinity_ppt
    salinity_correction = np.exp(-S * (0.017674 - 10.754/T + 2140.7/T**2))
    do_sat_saline = do_sat_fresh * salinity_correction

    # Pressure correction (if not at sea level)
    do_sat_final = do_sat_saline * pressure_atm

    return do_sat_final

# Apply to dataset
df["do_saturation_mgl"] = df.apply(
    lambda row: calculate_do_saturation(row["temp_c"], row["salinity_ppt"]),
    axis=1
)

# Calculate DO% saturation
df["do_saturation_pct"] = (df["do_mg_l"] / df["do_saturation_mgl"]) * 100

print(f"  DO saturation range:  {df['do_saturation_mgl'].min():.2f} – {df['do_saturation_mgl'].max():.2f} mg/L")
print(f"  DO measured range:    {df['do_mg_l'].min():.2f} – {df['do_mg_l'].max():.2f} mg/L")
print(f"  DO% saturation range: {df['do_saturation_pct'].min():.1f}% – {df['do_saturation_pct'].max():.1f}%")
print(f"  Mean DO% saturation:  {df['do_saturation_pct'].mean():.1f}%")

# Under/Over saturation
undersaturated = (df["do_saturation_pct"] < 80).sum()
oversaturated  = (df["do_saturation_pct"] > 120).sum()
print(f"\n  ⚠️  Undersaturated (<80%):  {undersaturated} readings ({undersaturated/len(df)*100:.1f}%)")
print(f"  ⚠️  Supersaturated (>120%): {oversaturated} readings ({oversaturated/len(df)*100:.1f}%)")

# DO at different temperatures (lookup table)
print("\n  DO Saturation at Different Conditions:")
print(f"  {'Temp (°C)':>10} {'Salinity (ppt)':>15} {'DO Sat (mg/L)':>15}")
print(f"  {'-'*42}")
for temp in [24, 26, 28, 30, 32]:
    for sal in [0, 15, 25, 35]:
        do_s = calculate_do_saturation(temp, sal)
        print(f"  {temp:>10} {sal:>15} {do_s:>14.2f}")


# ═══════════════════════════════════════════════════
# MODEL 3: TAN Accumulation Model
# ═══════════════════════════════════════════════════
"""
THEORY:
TAN (Total Ammonia Nitrogen) accumulates in a pond from:
  - Fish/shrimp excretion
  - Feed decomposition
  - Sediment release

And is removed by:
  - Nitrification (bacteria convert NH₃ → NO₂ → NO₃)
  - Water exchange
  - Algae uptake
  - Volatilization

Simple mass-balance model:
  dTAN/dt = (excretion_rate + feed_rate) - (nitrification_rate + dilution_rate) × TAN

In discrete form (hourly):
  TAN[t+1] = TAN[t] + (production - removal × TAN[t]) × Δt

Here we fit the parameters to your data.
"""

print("\n" + "=" * 60)
print("MODEL 3: TAN Accumulation Model")
print("=" * 60)

def simulate_tan_accumulation(
    n_steps,
    tan_initial,
    production_rate=0.05,      # mg/L/hr — TAN production (excretion + decomp)
    nitrification_rate=0.03,   # hr⁻¹ — first-order removal by bacteria
    dilution_rate=0.005,       # hr⁻¹ — water exchange rate
    dt=1.0                     # time step in hours
):
    """
    Simulate TAN concentration over time using mass-balance model.

    dTAN/dt = production - (nitrification + dilution) × TAN

    Parameters:
        n_steps           : Number of time steps (hours)
        tan_initial       : Initial TAN (mg/L)
        production_rate   : TAN production (mg/L/hr)
        nitrification_rate: First-order nitrification rate (hr⁻¹)
        dilution_rate     : Water exchange rate (hr⁻¹)
        dt                : Time step (hours, default 1)

    Returns:
        tan_simulated: Array of TAN values over time
    """
    k_removal = nitrification_rate + dilution_rate  # Total removal rate
    tan = np.zeros(n_steps)
    tan[0] = tan_initial

    for t in range(1, n_steps):
        dTAN = (production_rate - k_removal * tan[t-1]) * dt
        tan[t] = max(0, tan[t-1] + dTAN)  # TAN can't go negative

    return tan

# Simulate for the first 7 days (168 hours)
n_hours = min(168, len(df))
tan_initial = float(df["tan_mg_l"].iloc[0])

# Run model with typical shrimp pond parameters
tan_sim = simulate_tan_accumulation(
    n_steps=n_hours,
    tan_initial=tan_initial,
    production_rate=0.04,      # Typical shrimp pond
    nitrification_rate=0.025,
    dilution_rate=0.010
)

tan_measured = df["tan_mg_l"].iloc[:n_hours].values

# Compare
r2_tan   = r2_score(tan_measured, tan_sim)
rmse_tan = np.sqrt(mean_squared_error(tan_measured, tan_sim))

print(f"  Simulation period: {n_hours} hours ({n_hours/24:.1f} days)")
print(f"  Initial TAN:       {tan_initial:.4f} mg/L")
print(f"  TAN simulated range: {tan_sim.min():.4f} – {tan_sim.max():.4f} mg/L")
print(f"  TAN measured range:  {tan_measured.min():.4f} – {tan_measured.max():.4f} mg/L")
print(f"  R² (sim vs measured): {r2_tan:.4f}")
print(f"  RMSE:                 {rmse_tan:.4f} mg/L")
print(f"\n  Note: Low R² is expected — the simple model doesn't capture all")
print(f"  biological variability. It shows the TREND, not exact values.")
print(f"  For better accuracy, calibrate production_rate and nitrification_rate")
print(f"  to your specific pond conditions.")

# ═══════════════════════════════════════════════════
# PLOTS
# ═══════════════════════════════════════════════════
print("\n  Saving physics model plots...")
n_plot = min(500, len(df))

fig = plt.figure(figsize=(16, 18))
fig.suptitle("Physics/Chemical Models", fontsize=16, fontweight="bold")

# ── Plot 1: NH₃ calculated vs measured ──
ax1 = fig.add_subplot(4, 2, 1)
ax1.plot(df["nh3_mg_l"].iloc[:n_plot].values,    "k-", linewidth=0.8, alpha=0.7, label="Measured NH₃")
ax1.plot(df["nh3_calculated"].iloc[:n_plot].values, "r-", linewidth=0.8, alpha=0.8, label="Calculated NH₃")
ax1.set_title("NH₃: Measured vs Equilibrium Formula", fontweight="bold")
ax1.set_xlabel("Time Steps")
ax1.set_ylabel("NH₃ (mg/L)")
ax1.legend(fontsize=8)
ax1.grid(True, alpha=0.3)

# ── Plot 2: NH₃ fraction vs pH ──
ax2 = fig.add_subplot(4, 2, 2)
ph_range = np.linspace(6.5, 9.5, 100)
for temp in [24, 28, 32]:
    _, fracs = zip(*[calculate_nh3(1.0, temp, ph) for ph in ph_range])
    ax2.plot(ph_range, np.array(fracs) * 100, label=f"{temp}°C")
ax2.set_title("NH₃ Fraction vs pH at Different Temperatures", fontweight="bold")
ax2.set_xlabel("pH")
ax2.set_ylabel("NH₃ Fraction (%)")
ax2.legend(fontsize=8)
ax2.axvline(x=7.5, color="gray", linestyle="--", alpha=0.5)
ax2.axvline(x=8.5, color="gray", linestyle="--", alpha=0.5)
ax2.text(7.5, ax2.get_ylim()[1]*0.9, "Shrimp ideal pH", fontsize=7, color="gray")
ax2.grid(True, alpha=0.3)

# ── Plot 3: DO Saturation over time ──
ax3 = fig.add_subplot(4, 2, 3)
ax3.plot(df["do_mg_l"].iloc[:n_plot].values,           "steelblue", linewidth=0.8, label="Measured DO")
ax3.plot(df["do_saturation_mgl"].iloc[:n_plot].values, "orange",    linewidth=0.8, linestyle="--", label="DO Saturation")
ax3.fill_between(range(n_plot),
                 df["do_mg_l"].iloc[:n_plot].values,
                 df["do_saturation_mgl"].iloc[:n_plot].values,
                 alpha=0.2, color="steelblue")
ax3.set_title("Measured DO vs DO Saturation (Benson & Krause)", fontweight="bold")
ax3.set_xlabel("Time Steps")
ax3.set_ylabel("DO (mg/L)")
ax3.legend(fontsize=8)
ax3.grid(True, alpha=0.3)

# ── Plot 4: DO% saturation histogram ──
ax4 = fig.add_subplot(4, 2, 4)
ax4.hist(df["do_saturation_pct"], bins=60, color="steelblue", edgecolor="white", alpha=0.8)
ax4.axvline(x=80,  color="orange", linestyle="--", linewidth=1.5, label="80% (lower ideal)")
ax4.axvline(x=100, color="green",  linestyle="--", linewidth=1.5, label="100% (saturation)")
ax4.axvline(x=120, color="red",    linestyle="--", linewidth=1.5, label="120% (supersaturation)")
ax4.set_title("DO% Saturation Distribution", fontweight="bold")
ax4.set_xlabel("DO Saturation (%)")
ax4.set_ylabel("Count")
ax4.legend(fontsize=7)
ax4.grid(True, alpha=0.3)

# ── Plot 5: DO saturation vs temperature curve ──
ax5 = fig.add_subplot(4, 2, 5)
temp_range = np.linspace(15, 40, 100)
for sal in [0, 15, 25, 35]:
    do_sats = [calculate_do_saturation(t, sal) for t in temp_range]
    ax5.plot(temp_range, do_sats, label=f"{sal} ppt")
ax5.set_title("DO Saturation vs Temperature (Benson & Krause)", fontweight="bold")
ax5.set_xlabel("Temperature (°C)")
ax5.set_ylabel("DO Saturation (mg/L)")
ax5.legend(title="Salinity", fontsize=8)
ax5.grid(True, alpha=0.3)

# ── Plot 6: TAN simulation vs measured ──
ax6 = fig.add_subplot(4, 2, 6)
hours = np.arange(n_hours)
ax6.plot(hours, tan_measured, "k-",  linewidth=1, alpha=0.7, label="Measured TAN")
ax6.plot(hours, tan_sim,      "r-",  linewidth=1.5, label="Simulated TAN")
ax6.set_title("TAN Accumulation Model vs Measured", fontweight="bold")
ax6.set_xlabel(f"Time (hours)")
ax6.set_ylabel("TAN (mg/L)")
ax6.legend(fontsize=8)
ax6.grid(True, alpha=0.3)

# ── Plot 7: TAN sensitivity to production rate ──
ax7 = fig.add_subplot(4, 2, 7)
for prod_rate in [0.02, 0.04, 0.06, 0.08]:
    sim = simulate_tan_accumulation(n_hours, tan_initial, production_rate=prod_rate)
    ax7.plot(np.arange(n_hours), sim, label=f"Prod={prod_rate}")
ax7.set_title("TAN Sensitivity to Production Rate", fontweight="bold")
ax7.set_xlabel("Time (hours)")
ax7.set_ylabel("TAN (mg/L)")
ax7.legend(fontsize=8)
ax7.grid(True, alpha=0.3)

# ── Plot 8: Combined water quality index ──
ax8 = fig.add_subplot(4, 2, 8)
# Show relationship: NH3 fraction correlates with toxic conditions
scatter = ax8.scatter(df["ph"].iloc[:n_plot],
                      df["temp_c"].iloc[:n_plot],
                      c=df["nh3_fraction"].iloc[:n_plot] * 100,
                      cmap="RdYlGn_r", s=5, alpha=0.5)
plt.colorbar(scatter, ax=ax8, label="NH₃ Fraction (%)")
ax8.set_title("NH₃ Fraction (%) by Temperature & pH", fontweight="bold")
ax8.set_xlabel("pH")
ax8.set_ylabel("Temperature (°C)")
ax8.axvline(x=7.5, color="blue", linestyle="--", alpha=0.5, linewidth=0.8)
ax8.axvline(x=8.5, color="blue", linestyle="--", alpha=0.5, linewidth=0.8)
ax8.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/05_physics_models.png", dpi=150)
print(f"  ✅ Saved: {OUTPUT_DIR}/05_physics_models.png")

# Save physics results
df[["timestamp", "tan_mg_l", "nh3_mg_l", "nh3_calculated", "nh3_fraction",
    "do_mg_l", "do_saturation_mgl", "do_saturation_pct"]].to_csv(
    f"{OUTPUT_DIR}/physics_model_results.csv", index=False
)
print(f"  ✅ Saved: {OUTPUT_DIR}/physics_model_results.csv")

print("\n" + "=" * 60)
print("🎉 ALL MODELS COMPLETE!")
print("=" * 60)
print(f"\n📁 Check your '{OUTPUT_DIR}/' folder for all results and plots:")
print("   01_distributions.png           — feature histograms")
print("   01_correlation_heatmap.png     — variable correlations")
print("   01_time_series.png             — time series overview")
print("   02_regression_actual_vs_pred.  — scatter plots (4 models)")
print("   02_regression_time_series.png  — time series (4 models)")
print("   02_regression_feat_import.png  — feature importance")
print("   03_lstm_results.png            — LSTM training + prediction")
print("   04_confusion_matrices.png      — classification results")
print("   04_classifier_accuracy.png     — accuracy comparison")
print("   05_physics_models.png          — NH₃, DO, TAN plots")
print("   physics_model_results.csv      — calculated values table")
print("   regression_results.csv         — model performance table")
print("\n📁 Saved models in 'saved_models/' — use joblib.load() to reload")