## XGBoost Decision Agent (`models/xgboost_decision_agent.py`)

### What this file is

`XGBoostDecisionAgent` is a lightweight, model-based decision engine for shrimp-farm operations. It exposes the same **public API** expected by the manager/orchestration layer:

- `make_decision(...)` → returns a `DecisionOutput` for one pond
- `make_multi_pond_decisions(...)` → returns a `MultiPondDecision` across all ponds

Compared to the AutoGluon version, this implementation aims to be easier to deploy and faster at inference:

- **2 models** (action classifier + urgency regressor)
- **no pandas** dependency in the runtime path
- small, portable artifacts (`.pkl` + a small JSON mapping)

---

### What it predicts

This agent predicts two things for each pond:

- **Primary action** (classification): an `ActionType` chosen from an 8-action subset
- **Urgency** (regression): a float in **[0, 1]**

It then derives:

- `action_intensity`: set equal to urgency (simple, consistent control signal)
- `confidence`: usually the max predicted class probability from `predict_proba()`
- `priority_rank`: assigned in `make_multi_pond_decisions()` based on urgency
- `reasoning`: either LLM-generated (if enabled) or a template fallback
- `affected_factors`: a short list based on thresholds (DO, ammonia, etc.)

---

### Important note: supported actions (8 out of 9)

`models/decision_outputs.py` defines **9** `ActionType` values, including `EQUIPMENT_MAINTENANCE`.

This XGBoost agent intentionally maps predictions to **8** action IDs (`0..7`) and clamps out-of-range predictions back into that range. That means:

- **`EQUIPMENT_MAINTENANCE` is not produced by this agent** (by design)
- if you need maintenance recommendations, extend the training labels + `_map_action()` and retrain

Action ID mapping used at runtime:

- `0` → `NO_ACTION`
- `1` → `INCREASE_AERATION`
- `2` → `DECREASE_AERATION`
- `3` → `WATER_EXCHANGE`
- `4` → `ADJUST_FEED`
- `5` → `EMERGENCY_RESPONSE`
- `6` → `ALLOCATE_WORKERS`
- `7` → `MONITOR_CLOSELY`

---

### Inputs and feature pipeline (35 features)

`make_decision(...)` takes lists of:

- `WaterQualityData`
- `FeedData`
- `EnergyData`
- `LaborData`

For a single pond, the agent selects the matching `pond_id` entry from each list (falling back to the first element if not found).

Features are produced by `FeatureExtractor` (`models/decision_model.py`) and are always a **35-float vector**:

- **Water quality (9)**: pH, temperature, dissolved oxygen, salinity, ammonia, nitrite, nitrate, turbidity, status encoding
- **Feed (5)**: shrimp count, avg weight, feed amount, feeding frequency, biomass
- **Energy (6)**: aerator usage, pump usage, heater usage, total energy, cost, efficiency score
- **Labor (5)**: time spent, worker count, efficiency score, tasks completed count, next tasks count
- **Derived / interaction (10)**: threshold flags (low DO, high ammonia, etc.), alert count, simple interactions

---

### Model artifacts on disk

On initialization, the agent tries to load artifacts from `model_dir` (default: `models/xgboost_models`):

- `action_model.pkl`: `xgboost.XGBClassifier`
- `urgency_model.pkl`: `xgboost.XGBRegressor`
- `action_class_mapping.json`: mapping between “encoded” class IDs and the original action IDs

Why the mapping exists:

XGBoost’s sklearn classifier expects classes to be contiguous `0..K-1`. The synthetic generator may not emit all 8 action IDs in a given training run, so training encodes only the observed classes and writes a mapping so runtime can map predictions back to the original `0..7` IDs.

If these files aren’t present, `make_decision()` will raise:

- `ValueError("XGBoost models not trained/loaded...")`

---

### Training (how to produce the artifacts)

Use:

```bash
python train_xgboost_models.py --samples 20000 --model-dir models/xgboost_models
```

The training script:

- generates synthetic training data via `models/training/data_generator.py`
- trains:
  - multiclass action classifier
  - urgency regressor
- writes `action_class_mapping.json` so runtime can reverse-map predicted class IDs

#### Feed + labor actions (how they are learned)

The synthetic label rules in `models/training/data_generator.py` include explicit cases for:

- `ADJUST_FEED`: when feeding is too high/low relative to biomass under otherwise-stable conditions, and as a first response to moderate ammonia
- `ALLOCATE_WORKERS`: when labor efficiency is low or the task backlog is high (and also as a response to very low energy efficiency)

---

### OpenAI / LLM reasoning (optional)

The agent can optionally use an OpenAI-backed LLM to generate a short (2–3 sentence) explanation of the recommendation.

How it’s enabled:

- `enable_llm_explanations=True` when constructing the agent (default)
- `OPENAI_API_KEY` must be available (from `config.py`)
- `langchain_openai` (or a compatible older `langchain` import path) must be installed

If any of those are missing, the agent automatically falls back to a deterministic, template-based explanation via `_generate_fallback_reasoning(...)`.

Configuration read from `config.py` (if present):

- `OPENAI_API_KEY`
- `OPENAI_MODEL_NAME`
- `OPENAI_TEMPERATURE`

---

### Multi-pond decisions and prioritization

`make_multi_pond_decisions(...)`:

- runs `make_decision()` per pond
- sorts ponds by `urgency_score` (descending)
- assigns `priority_rank` (`1` = most urgent)
- returns:
  - `urgent_ponds`: ponds with `urgency_score >= 0.7`
  - `overall_urgency`: max urgency across ponds
  - `resource_allocation`: per-pond share proportional to urgency

To stay compatible with both Pydantic v1 and v2, the code tries `model_copy(...)` first, then `copy(...)`, then falls back to direct mutation.


