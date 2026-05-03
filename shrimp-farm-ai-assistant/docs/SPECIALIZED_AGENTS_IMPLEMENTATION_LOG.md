# Implementation log: specialized agents

**Project:** `shrimp-farm-ai-assistant`  
**Scope:** CrewAI-backed domain agents, data access (MongoDB vs simulation), and LLM task definitions.  
**Log prepared:** 2026-05-03 (from current repository state; add your own dated entries below as you change code.)

---

## How to use this log

- Append a new **dated entry** under [Change log (append here)](#change-log-append-here) whenever you modify an agent.
- Keep one line per decision or merge when possible; reference PR or commit hash if you use git.

---

## Cross-cutting implementation (all domain agents)

| Step | Description | Location / notes |
|------|-------------|------------------|
| 1 | Define shared pydantic/domain models for agent I/O (water, feed, energy, labor, alerts). | `models.py` |
| 2 | Centralize API keys, farm ranges, MongoDB flags, cost constants (e.g. LKR energy/labor). | `config.py` |
| 3 | Optional MongoDB repository when `USE_MONGODB` is true; lazy import of `DataRepository`. | `database/repository.py` (used from agents) |
| 4 | Instantiate `ChatOpenAI` only when `OPENAI_API_KEY` is set; allow dashboards without LLM. | Each `agents/*.py` `__init__` |
| 5 | Register CrewAI `Agent` with role, goal, backstory, `allow_delegation=False`, `verbose=True`. | Each agent with LLM |
| 6 | Expose `create_*_task(...)` returning CrewAI `Task` with `description` and `expected_output`. | Per agent |
| 7 | Primary data method: read latest row from MongoDB when repository available; on failure fall through. | `get_*_data` methods |
| 8 | If `USE_READINGS_ONLY=true` and DB missing data: raise clear `ValueError` (no silent simulation). | Water, feed, energy, labor |
| 9 | If MongoDB unavailable and readings-only false: deterministic or rule-based **simulation** from pond id and/or water context. | `_generate_simulated_*` helpers |

---

## Agent: Water Quality Monitoring (`WaterQualityAgent`)

| Step | Implementation detail |
|------|------------------------|
| WQ-1 | Class `WaterQualityAgent` in `agents/water_quality_agent.py`. |
| WQ-2 | CrewAI role: *Water Quality Monitoring Specialist*; goal aligned to shrimp health and growth. |
| WQ-3 | `create_monitoring_task(pond_id)` embeds optimal ranges from `FARM_CONFIG` (pH, temperature, DO, salinity, nitrogen species, turbidity). |
| WQ-4 | `get_water_quality_data(pond_id)` → `repository.get_latest_water_quality(pond_id)` when DB available. |
| WQ-5 | Simulation: seeded `random.Random(pond_id)` for stable per-pond values; `_determine_water_quality_status`, `_generate_alerts`. |
| WQ-6 | Outputs `WaterQualityData` with timestamp, pond_id, chemistry fields, status, alerts. |

---

## Agent: Feed Prediction (`FeedPredictionAgent`)

| Step | Implementation detail |
|------|------------------------|
| FD-1 | Class `FeedPredictionAgent` in `agents/feed_prediction_agent.py`. |
| FD-2 | CrewAI role: *Feed Optimization Specialist*; ties nutrition to water and growth stage. |
| FD-3 | `create_feed_prediction_task(pond_id, water_quality_data, current_shrimp_data)` passes live water metrics and shrimp dict into the task text. |
| FD-4 | `get_feed_data(pond_id, water_quality_data=None)` → `get_latest_feed_data` from DB when available. |
| FD-5 | Simulation requires `water_quality_data` when not using DB (`_generate_simulated_feed`); uses `_calculate_feed_adjustment`, `_select_feed_type`, frequency from temperature. |
| FD-6 | Outputs `FeedData` (counts, weight, amount, type, frequency, predicted next feeding). |

---

## Agent: Energy Optimization (`EnergyOptimizationAgent`)

| Step | Implementation detail |
|------|------------------------|
| EN-1 | Class `EnergyOptimizationAgent` in `agents/energy_optimization_agent.py`. |
| EN-2 | CrewAI role: *Energy Efficiency Specialist*; balances cost and shrimp environment. |
| EN-3 | `create_energy_optimization_task(pond_id, water_quality_data, current_energy_data)` includes aerator/pump/heater kWh, total, LKR cost, efficiency score, water context. |
| EN-4 | `get_energy_data(pond_id, water_quality_data=None)` → `get_latest_energy_data` from DB when available. |
| EN-5 | Simulation derives usage multipliers from water quality (`_calculate_aerator_usage`, pump, heater); cost uses `ENERGY_COST_PER_KWH_LKR`. |
| EN-6 | Outputs `EnergyData` with usage breakdown, total, cost, efficiency_score. |

---

## Agent: Labor Optimization (`LaborOptimizationAgent`)

| Step | Implementation detail |
|------|------------------------|
| LB-1 | Class `LaborOptimizationAgent` in `agents/labor_optimization_agent.py`. |
| LB-2 | CrewAI role: *Labor Efficiency Specialist*; scheduling, safety, productivity. |
| LB-3 | `create_labor_optimization_task(pond_id, water_quality_data, energy_data, labor_data_list)` supports single snapshot or **multi-snapshot history** in the prompt for trend analysis. |
| LB-4 | DB path uses repository for labor readings when `USE_MONGODB` (same pattern as other agents). |
| LB-5 | Extended logic for shift schedules: JSON parsing, `_minimal_fallback_schedule` when LLM missing or invalid; references `LABOR_COST_PER_HOUR_LKR` where applicable. |
| LB-6 | Outputs / downstream structures align with `LaborData` and schedule dicts consumed by API/dashboard. |

---

## Coordinator (not a domain sensor agent, but orchestration)

| Step | Implementation detail |
|------|------------------------|
| MG-1 | `ManagerAgent` in `agents/manager_agent.py` synthesizes outputs from specialized agents (and optional decision ML path per project config). |
| MG-2 | Wired in `main.py` via `ShrimpFarmOrchestrator` together with the four domain agents. |

---

## Additional agent modules (same `agents/` package)

These extend the product beyond the original four-domain split; log them separately if your coursework scope is “core four only.”

| Module | Class | Role (short) |
|--------|--------|----------------|
| `benchmarking_agent.py` | `BenchmarkingAgent` | Comparative / KPI-style analysis for operations. |
| `forecasting_agent.py` | `ForecastingAgent` | Forecasting and simulation scenarios. |
| `decision_recommendation_agent.py` | `DecisionRecommendationAgent` | Human-readable packaging of ML/rule decisions. |
| `feeding_optimizer.py` | `FeedingOptimizerAgent` | Dedicated feeding optimization logic (parallel to feed prediction). |

---

## Verification checklist (after any agent change)

1. Run orchestrator or API with `USE_MONGODB=false` and without API key: water sim works; feed/energy sim require water context where enforced.  
2. Run with `USE_READINGS_ONLY=true`: expect explicit errors if collections lack rows for the pond.  
3. Run with MongoDB populated: agents print `[DB] Fetched ...` and return persisted structures.  
4. With `OPENAI_API_KEY` set: CrewAI `Agent` non-null; tasks can be composed into `Crew` where the app does so (`main.py`, `api/server.py`).

---

## Change log (append here)

| Date | Author | Summary |
|------|--------|---------|
| 2026-05-03 | — | Initial log document created from codebase review (`agents/*.py`, `config.py`, `models.py`). |

_Add rows above this line for each implementation or review session._
