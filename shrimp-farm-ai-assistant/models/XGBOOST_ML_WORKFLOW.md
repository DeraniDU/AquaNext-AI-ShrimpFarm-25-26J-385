# XGBoost Decision Model – ML Workflow

This document describes the **end-to-end ML workflow** for the XGBoost-based decision agent: from training data generation through model training, saving, loading, and inference. All diagrams use ASCII/box-drawing (no Mermaid).

---

## 1. Visual Overview: Training vs Inference

**Training** (run once; produces artifacts on disk):

```
┌─────────────────────────────────────────────────────────────────┐
│  train_xgboost_models.py                                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TrainingDataGenerator.generate_dataset(num_samples)              │
│  • Scenarios: normal, good, poor, critical                       │
│  • Output: X [n, 35], y_action (0..7), y_urgency [0..1]            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Class encoding (orig → 0..K-1), train/val split, optional noise │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│  XGBClassifier.fit(...)  │     │  XGBRegressor.fit(...)  │
│  → action type 0..K-1   │     │  → urgency [0, 1]       │
└────────────┬────────────┘     └────────────┬────────────┘
             │                               │
             ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│  action_model.pkl       │     │  urgency_model.pkl      │
└─────────────────────────┘     └─────────────────────────┘
             │
             │  (mapping saved)
             ▼
┌─────────────────────────┐
│  action_class_mapping.json   +  metrics.json            │
└─────────────────────────┘
```

**Inference** (every time a decision is requested):

```
┌─────────────────────────────────────────────────────────────────┐
│  Caller: ManagerAgent or FastAPI                                 │
│  XGBoostDecisionAgent(model_dir="models/xgboost_models")          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  __init__: load action_model.pkl, urgency_model.pkl,             │
│            action_class_mapping.json → is_trained = True           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        make_decision(...) or make_multi_pond_decisions(...)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  INPUTS: lists of WaterQualityData, FeedData, EnergyData,         │
│          LaborData (+ optional pond_id)                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FeatureExtractor.extract_features(...)  →  35-D vector [1, 35]   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│  action_model.predict(x)│     │  urgency_model.predict(x)│
│  → encoded_class        │     │  → urgency scalar       │
│  → enc_to_orig → 0..7   │     │  → clamp [0, 1]          │
│  → _map_action() → enum │     │                          │
└────────────┬────────────┘     └────────────┬────────────┘
             │                               │
             └───────────────┬───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Build DecisionOutput:                                           │
│  primary_action, urgency_score, confidence, reasoning,           │
│  affected_factors (_affected_factors + optional LLM reasoning)   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  OUTPUT: DecisionOutput  (single pond)                           │
│  or     MultiPondDecision (all ponds + priorities + urgent list)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Single-pond decision flow (detail)

```
  WaterQualityData     FeedData      EnergyData     LaborData
  (for pond_id)        (pond_id)    (pond_id)      (pond_id)
         │                  │             │              │
         └──────────────────┴──────┬──────┴──────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   FeatureExtractor      │
                    │   extract_features()    │
                    │   → 35 floats           │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   x = np.array (1, 35)  │
                    └────────────┬────────────┘
                                 │
           ┌────────────────────┼────────────────────┐
           ▼                    ▼                    ▼
  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │ action_model    │  │ urgency_model   │  │ predict_proba   │
  │ .predict(x)     │  │ .predict(x)    │  │ (for confidence) │
  │ → action_type   │  │ → urgency       │  └────────┬────────┘
  └────────┬────────┘  └────────┬────────┘           │
           │                    │                    │
           ▼                    │                    │
  ┌─────────────────┐           │                    │
  │ enc_to_orig      │           │                    │
  │ _map_action()    │           │                    │
  │ → ActionType     │           │                    │
  └────────┬────────┘           │                    │
           │                    │                    │
           └────────────────────┼────────────────────┘
                                ▼
                    ┌─────────────────────────┐
                    │  _affected_factors()    │
                    │  reasoning (LLM or     │
                    │  template fallback)     │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  DecisionOutput         │
                    │  primary_action,        │
                    │  urgency_score,         │
                    │  confidence, reasoning, │
                    │  affected_factors       │
                    └─────────────────────────┘
```

---

## 3. Multi-pond decision flow

```
  Lists of WaterQualityData, FeedData, EnergyData, LaborData
  (one entry per pond)
                              │
                              ▼
              ┌───────────────────────────────┐
              │  For each pond_id in list:     │
              │  make_decision(..., pond_id)  │
              │  → DecisionOutput per pond    │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Sort by urgency_score (desc)  │
              │  Assign priority_rank 1,2,3…  │
              │  (1 = most urgent)              │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  urgent_ponds = ponds with    │
              │  urgency_score >= 0.7         │
              │  resource_allocation =        │
              │  urgency share per pond       │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  MultiPondDecision             │
              │  pond_priorities,              │
              │  recommended_actions,           │
              │  urgent_ponds, overall_urgency │
              └───────────────────────────────┘
```

**Training** produces two models and a class mapping. **Inference** turns domain data into 35 features, runs both models, maps the action class, and builds a `DecisionOutput` (or `MultiPondDecision`).

---

## 4. Training Workflow

### 4.1 Entry point

Run from the **shrimp-farm-ai-assistant** project root (so `models/` is on the path):

```bash
python train_xgboost_models.py --samples 20000 --model-dir models/xgboost_models
```

Optional:

- `--noise-level 0.1` – add sensor-like noise to features (e.g. 0.05–0.15).
- `--noise-seed 42` – random seed for noise.

### 4.2 Step-by-step training pipeline

| Step | What happens |
|------|----------------|
| **1. Generate data** | `TrainingDataGenerator().generate_dataset(num_samples)` (from `models/training/data_generator.py`) produces synthetic (X, y) with scenarios `normal`, `good`, `poor`, `critical`. Labels come from domain rules (DO, ammonia, labor efficiency, feed per biomass, etc.). |
| **2. Feature matrix** | `X` is `np.ndarray` of shape `(num_samples, 35)` (same 35 features as in `ML_PATH.md`). `y` is a dict with at least `action_type` (int 0..7) and `urgency` (float 0..1). |
| **3. Class encoding** | Observed action IDs may not be contiguous. Script builds `orig_to_enc` / `enc_to_orig` so XGBoost sees labels `0..K-1`. `y_action_enc` is used for training; mapping is saved for inference. |
| **4. Train/val split** | 80/20 split, stratified for action labels, same random_state=42 for reproducibility. |
| **5. Optional noise** | If `--noise-level > 0`, feature noise is applied to train data only (simulates sensor noise). |
| **6. Train action model** | `XGBClassifier` (multi:softprob, n_estimators=300, max_depth=6, etc.) fits on (X_train, y_action_enc). |
| **7. Train urgency model** | `XGBRegressor` (reg:squarederror) fits on (X_train, y_urgency). |
| **8. Save artifacts** | `joblib.dump(action_model, ...)`, `joblib.dump(urgency_model, ...)`, and write `action_class_mapping.json` + `metrics.json` into `model_dir`. |

### 4.3 Training outputs (artifacts)

All written under `model_dir` (default: `models/xgboost_models/`):

| File | Description |
|------|-------------|
| `action_model.pkl` | `xgboost.XGBClassifier` – predicts encoded action class (0..K-1). |
| `urgency_model.pkl` | `xgboost.XGBRegressor` – predicts urgency in [0, 1]. |
| `action_class_mapping.json` | `enc_to_orig` and `orig_to_enc` – map encoded class index back to original action ID (0..7). |
| `metrics.json` | Train/val accuracy (action), train/val R² (urgency), noise_level, noise_seed. |

---

## 5. Inference Workflow

### 5.1 Who runs inference

- **Manager/orchestration** (e.g. `ManagerAgent`) or the **FastAPI server** instantiates `XGBoostDecisionAgent(model_dir="models/xgboost_models")` and calls `make_decision(...)` or `make_multi_pond_decisions(...)`.

### 5.2 Load phase (agent init)

1. Agent reads `action_model.pkl` and `urgency_model.pkl` with `joblib.load()`.
2. Agent reads `action_class_mapping.json` and stores `enc_to_orig` (int → int) so predicted encoded class can be mapped back to original action ID.
3. If any required file is missing, the agent does not set `is_trained`; `make_decision()` will then raise a `ValueError` asking to run `train_xgboost_models.py`.

### 5.3 Single-pond decision: `make_decision(...)`

| Step | What happens |
|------|----------------|
| **1. Inputs** | Lists of `WaterQualityData`, `FeedData`, `EnergyData`, `LaborData`; optional `pond_id` (default: first pond). |
| **2. Select pond** | For each list, select the item matching `pond_id` (or first element). |
| **3. Features** | `FeatureExtractor.extract_features([wq], [feed], [energy], [labor])` → list of 35 floats → cast to `np.float32` shape `(1, 35)`. |
| **4. Action prediction** | `action_model.predict(X)` → encoded class; map to original ID via `enc_to_orig`; clamp to 0..7; map to `ActionType` via `_map_action()`. |
| **5. Urgency prediction** | `urgency_model.predict(X)` → scalar; clamp to [0, 1]. |
| **6. Confidence** | From `action_model.predict_proba(X)` max probability, or fallback from urgency. |
| **7. Reasoning** | If LLM is enabled and configured: build context from wq/feed/energy/labor and call LLM for explanation. Else: `_generate_fallback_reasoning(...)` (template-based). |
| **8. Affected factors** | `_affected_factors(wq, energy, labor)` – threshold-based list (e.g. "Water Quality", "Dissolved Oxygen"). |
| **9. Return** | `DecisionOutput` with `primary_action`, `action_intensity` (= urgency), `urgency_score`, `confidence`, `reasoning`, `affected_factors`, etc. |

### 5.4 Multi-pond: `make_multi_pond_decisions(...)`

1. Call `make_decision(...)` for each pond (each pond_id present in the water quality list).
2. Sort ponds by `urgency_score` descending; assign `priority_rank` (1 = most urgent).
3. Build `urgent_ponds` (urgency ≥ 0.7), `overall_urgency`, and `resource_allocation` (proportional to urgency).
4. Return `MultiPondDecision` with `pond_priorities`, `recommended_actions`, etc.

---

## 6. Feature Contract (35-D)

The same **35-dimensional feature vector** is used in both training and inference. Produced by `FeatureExtractor` in `models/decision_model.py`:

| Group | Count | Examples |
|-------|-------|----------|
| Water quality | 9 | pH, temperature, dissolved_oxygen, salinity, ammonia, nitrite, nitrate, turbidity, status_encoded |
| Feed | 5 | shrimp_count, average_weight, feed_amount, feeding_frequency, biomass |
| Energy | 6 | aerator_usage, pump_usage, heater_usage, total_energy, cost, efficiency_score |
| Labor | 5 | time_spent, worker_count, efficiency_score, tasks_count, next_tasks_count |
| Derived | 10 | Low/critical DO flags, high/critical ammonia flags, temp/pH flags, alert count, energy×WQ interaction, feed per biomass |

Training data generator uses the same `FeatureExtractor` so train and inference features are aligned.

---

## 7. Action Types (8 used by XGBoost)

This agent outputs **8** of the 9 `ActionType` values (no `EQUIPMENT_MAINTENANCE`):

- `0` → NO_ACTION  
- `1` → INCREASE_AERATION  
- `2` → DECREASE_AERATION  
- `3` → WATER_EXCHANGE  
- `4` → ADJUST_FEED  
- `5` → EMERGENCY_RESPONSE  
- `6` → ALLOCATE_WORKERS  
- `7` → MONITOR_CLOSELY  

Mapping is in `XGBoostDecisionAgent._map_action()`; class mapping JSON only remaps indices to this 0..7 space when not all classes appear in training.

---

## 8. Summary (high level)

```
Training:
  data_generator.generate_dataset(n)
    → (X: [n,35], y_action, y_urgency)
  → encode classes → train XGBClassifier + XGBRegressor
  → save .pkl + action_class_mapping.json (+ metrics.json)

Inference:
  Domain data (per pond)
    → FeatureExtractor → x [1,35]
  → action_model.predict(x) → encoded_class → enc_to_orig → ActionType
  → urgency_model.predict(x) → urgency [0,1]
  → confidence, reasoning, affected_factors
  → DecisionOutput (or MultiPondDecision)
```

For more detail on the agent API and artifacts, see `models/xgboost_decision_agent.md`. For the broader ML path (features, training, all decision backends), see `models/ML_PATH.md`.
