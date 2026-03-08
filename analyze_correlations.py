import pandas as pd
import numpy as np

# Load the dataset
df = pd.read_csv("/Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2/water_quality_testing/data/cleaned_data.csv")

# Columns we HAVE or can simulate well:
core_cols = ['temp_c', 'salinity_ppt', 'ph', 'do_mg_l', 'nh3_mg_l']

# Columns we NEED to predict/proxy:
target_cols = ['alkalinity_mg_l_caco3', 'turbidity_ntu', 'secchi_cm', 'chlorophyll_a_ug_l', 'tan_mg_l', 'no2_mg_l', 'no3_mg_l', 'orp_mv']

print("--- Data Ranges ---")
for col in core_cols + target_cols:
    if col in df.columns:
        print(f"{col}: Min {df[col].min():.2f}, Max {df[col].max():.2f}, Mean {df[col].mean():.2f}")

print("\n--- Correlations with Core Variables ---")
corr = df[core_cols + target_cols].corr()
for target in target_cols:
    if target in corr.columns:
        print(f"\nTarget: {target}")
        target_corr = corr.loc[target, core_cols].sort_values(ascending=False)
        print(target_corr)

