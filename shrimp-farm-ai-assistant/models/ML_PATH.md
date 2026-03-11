## ML decision pipeline in `models/`

This document explains how the ML “path” works for the shrimp-farm decision engine, from raw data to final actions.

### 1. Data → structured domain models

- **Source objects** (defined in `models.py` at the repo root):
  - `WaterQualityData`, `WaterQualityStatus`
  - `FeedData`
  - `EnergyData`
  - `LaborData`
- These Pydantic models are the **single schema** used by:
  - LLM agents (water, feed, energy, labor agents)
  - ML decision agents (`DecisionAgent`, `XGBoostDecisionAgent`, `AutoGluonDecisionAgent`)
  - Synthetic data generator in `training/data_generator.py`

### 2. Domain models → numeric features (`FeatureExtractor`)

- File: `decision_model.py`, class: `FeatureExtractor`
- Role: convert rich domain objects into a **fixed 35‑dimensional feature vector** per pond.
- Feature groups:
  - **Water quality (9)**: pH, temperature, DO, salinity, ammonia, nitrite, nitrate, turbidity, encoded status.
  - **Feed (5)**: shrimp count, average weight, feed amount, feeding frequency, biomass.
  - **Energy (6)**: aerator, pump, heater usage, total energy, cost, efficiency score.
  - **Labor (5)**: time spent, worker count, efficiency, `len(tasks_completed)`, `len(next_tasks)`.
  - **Derived (10)**: rule‑based flags (low/critical DO, high/critical ammonia, temp/pH out of range, alert count, energy×water‑quality interaction, feed per biomass).
- Output: `List[float]` of length 35, which is the **canonical input** for all downstream ML models.

### 3. Labeling & synthetic training data (`TrainingDataGenerator`)

- File: `training/data_generator.py`, class: `TrainingDataGenerator`
- Purpose: generate **labeled synthetic samples** using aquaculture heuristics so the model learns “good” actions before real data exists.
- Steps per sample:
  1. **Generate inputs** for a pond:
     - `generate_water_quality_data(...)` (scenarios: `normal`, `good`, `poor`, `critical`)
     - `generate_feed_data(...)`
     - `generate_energy_data(...)`
     - `generate_labor_data(...)`
  2. Run `FeatureExtractor.extract_features(...)` to get the 35‑D feature vector.
  3. Call `generate_labels(...)` to produce supervision:
     - `action_type` (0–7 mapped to `ActionType` enum)
     - `action_intensity` (per‑action intensity vector)
     - `priority` (one‑hot priority among up to 8 levels)
     - `urgency` (scalar in \[0,1\])
     - `feed_amount` (normalized)
     - `equipment_schedule` (`[aerator_level, pump_level, heater_level]`)
- `generate_dataset(num_samples, scenarios)` loops this process to yield:
  - `features: np.ndarray[num_samples, 35]`
  - `labels: Dict[str, np.ndarray]` for multi‑task training.

### 4. Core neural decision model training (`DecisionModelTrainer`)

- File: `training/trainer.py`
- Main artifacts:
  - `DecisionDataset`: wraps `features` + `labels` into a PyTorch `Dataset`.
  - `DecisionModelTrainer`: orchestrates training of `DecisionMakingModel` (from `decision_model.py`).
  - `train_decision_model(...)`: CLI entry point.
- Training flow:
  1. Generate dataset with `TrainingDataGenerator.generate_dataset(...)`.
  2. Create `DecisionDataset`, split into train/validation.
  3. Train `DecisionMakingModel` with **multi‑task losses**:
     - `CrossEntropy` for `action_type`
     - `MSE` for `action_intensity`, `priority`, `urgency`, `feed_amount`, `equipment_schedule`
  4. Early stopping and LR scheduling via `ReduceLROnPlateau`.
  5. Save artifacts:
     - Model weights: `models/decision_model.pth`
     - Training history: `models/training_history.json`

### 5. Inference & integration: how actions are produced

#### 5.1 Neural `DecisionAgent` (PyTorch model)

- File: `decision_integration.py`, class: `DecisionAgent`
- Initialization:
  - Loads `DecisionMakingModel` from `models/decision_model.pth` (or creates an untrained instance).
  - Instantiates `FeatureExtractor`.
- `make_decision(...)` path:
  1. Receive lists of `WaterQualityData`, `FeedData`, `EnergyData`, `LaborData`.
  2. Use `FeatureExtractor.extract_features(...)` to build a 35‑D feature vector for a chosen `pond_id`.
  3. Call `DecisionMakingModel.predict(features)` to obtain a dictionary of outputs:
     - `action_type`, `action_intensity`, `priority`, `urgency`, `feed_amount`, `equipment_schedule`, etc.
  4. Map these tensors to a `DecisionOutput`:
     - `primary_action` and `secondary_actions` (from predicted intensities)
     - `priority_rank`, `urgency_score`
     - equipment levels and recommended feed
     - `confidence`, `reasoning`, `affected_factors`
- `make_multi_pond_decisions(...)`:
  - Calls `make_decision(...)` for each pond, builds a `MultiPondDecision` with:
    - `pond_priorities`
    - `urgent_ponds`
    - `resource_allocation` (urgency‑weighted share per pond).

#### 5.2 XGBoost path (`XGBoostDecisionAgent`)

- File: `xgboost_decision_agent.py`, class: `XGBoostDecisionAgent`
- Alternative ML “head” that **reuses** the same 35‑feature representation:
  - `FeatureExtractor` → `np.array(shape=(1, 35))`
  - `action_model: XGBClassifier` predicts `action_type` (0–7).
  - `urgency_model: XGBRegressor` predicts `urgency` in \[0,1\].
- Models and metadata live under `models/xgboost_models/`:
  - `action_model.pkl`, `urgency_model.pkl`
  - `action_class_mapping.json` to map encoded class indices back to canonical `ActionType` IDs.
- `make_decision(...)` mirrors the API of `DecisionAgent`:
  - Returns a `DecisionOutput` with `primary_action`, `urgency_score`, `confidence`, etc.
  - Optionally uses an LLM (via `langchain_openai.ChatOpenAI`) to generate richer `reasoning` based on the input context.
- `make_multi_pond_decisions(...)`:
  - Scores each pond with XGBoost, then ranks them by urgency exactly like the neural agent.

#### 5.3 AutoGluon path (`AutoGluonDecisionAgent`)

- File: `autogluon_decision_agent.py`, class: `AutoGluonDecisionAgent`
- Uses AutoGluon `TabularPredictor` models to avoid custom neural training:
  - `action_predictor` (multiclass)
  - `urgency_predictor` (regression)
  - `priority_predictor` (multiclass)
  - `feed_amount_predictor` (regression)
- Training:
  - `prepare_training_data(...)` converts 35‑D features into a named feature `DataFrame`, plus labels.
  - `train_models(train_data, time_limit=...)` fits all four predictors and saves them under `models/autogluon_models/`.
- Inference:
  - Same inputs (`WaterQualityData`, `FeedData`, `EnergyData`, `LaborData`) → 35‑D features → `DataFrame`.
  - Predicts `action_type`, `urgency`, `priority`, and `feed_amount`, computes basic equipment levels from raw data, and returns a `DecisionOutput`.

### 6. How agents choose which ML path to use

- The **public API** for decision making is unified:
  - `make_decision(water_quality_data, feed_data, energy_data, labor_data, pond_id=...)`
  - `make_multi_pond_decisions(...)`
- Different agents plug into this API:
  - `DecisionAgent` → PyTorch neural network (`decision_model.pth`)
  - `XGBoostDecisionAgent` → gradient‑boosted trees (`xgboost_models/`)
  - `AutoGluonDecisionAgent` → AutoGluon tabular ensemble (`autogluon_models/`)
- Higher‑level components (e.g., Manager Agent, dashboard API) can **swap implementations** without changing their call sites, as long as they consume `DecisionOutput` / `MultiPondDecision`.

### 7. End‑to‑end ML path summary

1. **Agents & sensors** collect pond data and construct `WaterQualityData`, `FeedData`, `EnergyData`, `LaborData`.
2. `FeatureExtractor` converts those into a 35‑feature numeric vector.
3. A chosen ML engine (neural, XGBoost, AutoGluon) consumes the features and predicts:
   - `primary_action`, `urgency_score`, `priority_rank`, feed/equipment recommendations.
4. The decision output flows back to:
   - The **Manager Agent** (LLM) for explanation / narrative.
   - The **UI / API** to show recommended actions and priorities to the user.

