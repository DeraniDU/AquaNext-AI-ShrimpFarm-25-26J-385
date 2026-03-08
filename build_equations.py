import pandas as pd
from sklearn.linear_model import LinearRegression

df = pd.read_csv("/Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2/water_quality_testing/data/cleaned_data.csv")
X = df[['temp_c', 'salinity_ppt', 'ph']]

targets = ['alkalinity_mg_l_caco3', 'turbidity_ntu', 'secchi_cm', 'chlorophyll_a_ug_l', 'tan_mg_l', 'no2_mg_l', 'no3_mg_l', 'orp_mv']

print("Linear Regression Coefficients (Feature = Intercept + Temp*c1 + Salinity*c2 + pH*c3)")
for t in targets:
    if t in df.columns:
        y = df[t]
        model = LinearRegression().fit(X, y)
        print(f"self.{t} = max({y.min():.1f}, min({y.max():.1f}, {model.intercept_:.2f} + (temp * {model.coef_[0]:.3f}) + (salinity * {model.coef_[1]:.3f}) + (ph * {model.coef_[2]:.3f})))")
