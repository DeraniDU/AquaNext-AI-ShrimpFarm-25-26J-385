# Implementation log: data and models layer

**Project:** `shrimp-farm-ai-assistant`  
**Scope:** Data structures, MongoDB data access, configuration values, ML feature extraction, and saved model files.  
**Log prepared:** 2026-05-03

---

## Simple overview

The data and models layer is the part of the system that decides:

- what farm data looks like,
- where the data comes from,
- how the agents share data,
- how farm readings are converted into machine-learning inputs,
- and where trained model files are stored and loaded from.

In simple terms, this layer is the foundation used by the agents, API, dashboard, and prediction models.

---

## Implementation steps

| Step | Work completed | Simple explanation |
|------|----------------|--------------------|
| 1 | Created shared data models | Defined one common format for water quality, feed, energy, labor, insights, and dashboard data. |
| 2 | Added water quality model | Stored pH, temperature, dissolved oxygen, salinity, ammonia, nitrite, nitrate, turbidity, status, and alerts. |
| 3 | Added feed model | Stored shrimp count, average shrimp weight, feed amount, feed type, feeding frequency, and next feeding time. |
| 4 | Added energy model | Stored aerator, pump, heater usage, total energy, cost, and efficiency score. |
| 5 | Added labor model | Stored completed tasks, time spent, worker count, efficiency score, and next tasks. |
| 6 | Added insight model | Stored AI-generated messages, priority level, recommendations, affected ponds, and related data. |
| 7 | Added dashboard model | Combined farm health score, summaries, alerts, recommendations, and insights into one dashboard response. |
| 8 | Added status enums | Used fixed values like `excellent`, `good`, `fair`, `poor`, `critical`, `info`, `warning`, and `critical` for consistent status output. |
| 9 | Centralized configuration | Stored OpenAI settings, farm target ranges, cost values, MongoDB flags, dashboard cache, and model paths in `config.py`. |
| 10 | Added environment variable support | Allowed local settings to be changed through `.env` without changing source code. |
| 11 | Added MongoDB connection module | Created helper functions to connect to MongoDB Atlas and test the connection. |
| 12 | Added optional async MongoDB support | Allowed async MongoDB access when the `motor` package is available. |
| 13 | Added MongoDB usage flags | Used `USE_MONGODB`, `USE_READINGS_ONLY`, and `DASHBOARD_MONGO_DIRECT` to control whether the app uses real database readings or simulated values. |
| 14 | Added model feature extraction | Converted water, feed, energy, and labor data into numeric features that ML models can use. |
| 15 | Encoded text/status values | Converted water status into numbers so models can understand it. |
| 16 | Added derived features | Calculated extra values such as biomass, oxygen status, ammonia status, and other condition indicators. |
| 17 | Added decision model support | Prepared feature inputs for decision agents such as XGBoost, AutoGluon, simple rules, or tiny rules. |
| 18 | Added harvest ML predictor | Loaded trained harvest models from disk for days-to-harvest, expected biomass, early harvest risk, and growth change prediction. |
| 19 | Added model availability checks | If model files or libraries are missing, the app marks the ML predictor as unavailable instead of crashing immediately. |
| 20 | Added training support files | Added training scripts and feature lists under `models/training/` for generating datasets and training model artifacts. |
| 21 | Stored model artifacts | Kept trained model metadata and saved artifacts under folders such as `models/harvest_ml/`. |
| 22 | Connected data layer to agents | Agents use these models as their input and output formats so all parts of the system speak the same data language. |
| 23 | Connected data layer to API/dashboard | API endpoints and dashboard views can use the same structured data without rewriting formats. |

---

## Main files involved

| File or folder | Purpose in simple terms |
|----------------|-------------------------|
| `models.py` | Main shared data shapes used across the app. |
| `config.py` | Central settings for farm targets, costs, database, dashboard, and ML options. |
| `database/mongodb.py` | MongoDB connection and connection test helpers. |
| `database/repository.py` | Repository layer used by agents/API to read latest farm readings. |
| `models/decision_model.py` | Converts farm readings into ML-ready feature numbers. |
| `models/harvest_ml_predictor.py` | Loads and runs trained harvest prediction models. |
| `models/decision_outputs.py` | Structures the outputs produced by decision logic. |
| `models/decision_integration.py` | Connects decision model output back into the assistant workflow. |
| `models/xgboost_decision_agent.py` | XGBoost-based decision agent. |
| `models/autogluon_decision_agent.py` | AutoGluon-based decision agent. |
| `models/training/` | Scripts and feature definitions used to generate and train ML data. |
| `models/harvest_ml/` | Saved harvest model metadata and artifacts. |

---

## Data flow in simple terms

1. Farm readings come from MongoDB or simulated data.
2. The readings are converted into shared data models such as `WaterQualityData`, `FeedData`, `EnergyData`, and `LaborData`.
3. Agents use those models to analyze farm conditions.
4. The dashboard model combines the results into one response for the UI.
5. ML modules convert the same data into numeric feature vectors.
6. Trained models use those feature vectors to make predictions or recommendations.
7. Results are sent back to the API, dashboard, and recommendation layer.

---

## Verification checklist

Use this checklist after changing the data or model layer:

1. Confirm `models.py` still imports without errors.
2. Confirm every agent can create and return its expected data model.
3. Confirm `.env` values load through `config.py`.
4. Confirm MongoDB connection test works when `MONGO_URI` is set.
5. Confirm the app still works when `USE_MONGODB=false` using simulated data.
6. Confirm `USE_READINGS_ONLY=true` gives a clear error if database readings are missing.
7. Confirm ML predictors handle missing model files safely.
8. Confirm dashboard/API responses still use the expected field names.

---

## Change log

| Date | Author | Summary |
|------|--------|---------|
| 2026-05-03 | — | Created simple implementation log for the data and models layer. |

Add new rows here whenever the data structures, database layer, training scripts, or model files are changed.
