# Shrimp Farm AI Assistant - Complete Application Workflow

## Overview

This is a **multi-agent AI system** for intelligent shrimp farm management. The system uses specialized AI agents that work in parallel to monitor, analyze, and optimize different aspects of farm operations, coordinated by a Manager Agent.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Application Entry Points                    │
│  • main.py (CLI orchestrator)                           │
│  • api/server.py (FastAPI REST API)    
                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│         ShrimpFarmOrchestrator                          │
│  • Initializes all agents                               │
│  • Coordinates data collection                          │
│  • Manages monitoring cycles                            │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Water Quality│ │ Feed         │ │ Energy       │
│ Agent        │ │ Agent        │ │ Agent        │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                 │
       └────────────────┼─────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Labor Agent    │  (outputs shift schedule: LLM or rule-based)
              └────────┬────────┘
                       │
                       ▼
        ┌───────────────────────────────┐
        │    Manager Agent              │
        │  • Synthesizes all data       │
        │  • Generates insights         │
        │  • Creates dashboard          │
        │  • Coordinates decision agent  │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Decision Agent (Optional)    │
        │  • XGBoost (ML-based)         │
        │  • AutoGluon (ML-based)       │
        │  • Simple (rule-based)        │
        │  • Tiny (minimal rules)       │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Decision Recommendation      │
        │  Agent                        │
        │  • Converts decisions to      │
        │    human-readable text        │
        └───────────────┬───────────────┘
                        │
                        ┼
                        │               
                        ▼               
                 ┌──────────────┐
                    API Server  │ 
                 │  (FastAPI)   │ 
                 └──────────────┘ 
```

---

## Entry Points & Usage Modes

### 1. **Main Orchestrator** (`main.py`)
**Purpose**: Command-line interface for continuous monitoring

**Workflow**:
1. Initializes `ShrimpFarmOrchestrator`
2. Creates all 5 specialized agents + Manager Agent
3. Runs a single monitoring cycle (for testing)
4. Optionally starts continuous monitoring loop (every 30 minutes)
5. Saves data to JSON file after each cycle

**Usage**:
```bash
python main.py
```

### 2. **Streamlit Dashboard** (`dashboard.py` / `run_dashboard.py`)
**Purpose**: Interactive web-based visualization

**Workflow**:
1. User opens dashboard in browser
2. Clicks "Update Dashboard" button
3. System collects data from all agents for each pond
4. Manager Agent creates dashboard object
5. Dashboard renders with charts, tables, and recommendations

**Usage**:
```bash
streamlit run dashboard.py
# or
python run_dashboard.py
```

### 3. **FastAPI Server** (`api/server.py`)
**Purpose**: REST API for external integrations (e.g., React frontend)

**Endpoints**:
- `GET /api/health` - Health check
- `GET /api/dashboard?ponds=4&fresh=&seed=&cache_ttl_s=` - Generate dashboard data (water quality, feed, energy, labor, labor optimization with schedule, dashboard summary, optional decisions)
- `GET /api/history?limit=7&days=` - Load historical snapshots from MongoDB
- `GET /api/history/hourly?hours=24` - Load hourly snapshots from MongoDB
- `GET /api/forecasts?ponds=&forecast_days=90&fresh=&seed=` - AI-powered forecasts (ForecastingAgent)
- `GET /api/feeding-optimization` - Feeding optimization recommendations (FeedingOptimizer agent)
- `GET /api/labor-optimization?ponds=` - Labor optimization and schedule per pond
- `GET /api/benchmark?ponds=` - Benchmarking metrics (BenchmarkingAgent)
- `GET /api/water-quality?ponds=` - Water quality data only
- `GET /api/feeding-data?ponds=` - Feed data only

**Workflow**:
1. Receives HTTP request
2. Uses shared agents (lazy-initialized); when `PARALLEL_DATA_COLLECTION` is true, collects water quality then feed/energy in parallel, then labor in parallel via `ThreadPoolExecutor`
3. Labor optimization builds a **schedule** (morning/afternoon/evening shifts with tasks and workers)—optionally via LLM (`_build_schedule_with_llm`) with fallback to rule-based `_build_schedule`
4. Generates fresh data or returns cached snapshot (caching disabled by default via `cache_ttl_s=0`)
5. Includes decision agent outputs if enabled; historical data loaded from MongoDB when `USE_MONGODB` is true
6. Returns JSON response

**Usage**:
```bash
uvicorn api.server:app --reload --port 8000
# Or on a specific port, e.g. 8001 when behind an API gateway:
uvicorn api.server:app --reload --port 8001
```

### 4. **React Web Dashboard** (`web/`)
**Purpose**: Modern React-based frontend (Vite + React + TypeScript)

**Views** (selected via sidebar):
- **Dashboard** – Overall health, efficiency metrics, alerts, insights, recommendations, decision recommendations
- **Forecasting** – AI-powered forecasts (uses `/api/forecasts`)
- **Optimization** – Labor optimization and schedule (morning/afternoon/evening shifts, tasks, workers)
- **Benchmarking** – Benchmark metrics (uses `/api/benchmark`)
- **Water Quality** – Per-pond water parameters and status
- **Feeding** – Feed data and schedule
- **Disease Detection** – Disease-related insights
- **Settings** – Pond count, auto-refresh

**Workflow**:
1. App fetches dashboard data from FastAPI (`/api/dashboard`) and optional history from `/api/history` (e.g. 7 days)
2. User can set pond count and enable auto-refresh (e.g. every 15s)
3. Displays interactive charts and tables; shows labor schedule and decision recommendations
4. Each view consumes dashboard payload or dedicated endpoints (forecasts, benchmark)

**Usage**:
```bash
cd web
npm install
npm run dev  # Runs on http://localhost:5173
```

---

## Core Monitoring Cycle Workflow

The monitoring cycle is the heart of the system. Here's the step-by-step process:

### Phase 1: Data Collection (`collect_agent_data()`)

#### Step 1: Water Quality Monitoring
**Agent**: `WaterQualityAgent`

For each pond (1 to `pond_count`):
1. **Generate water parameters**:
   - pH (7.5-8.5 optimal)
   - Temperature (26-30°C optimal)
   - Dissolved Oxygen (>5 mg/L optimal)
   - Salinity (15-25 ppt optimal)
   - Ammonia, Nitrite, Nitrate
   - Turbidity

2. **Determine status**:
   - Count parameter issues
   - Map to status: EXCELLENT → GOOD → FAIR → POOR → CRITICAL

3. **Generate alerts**:
   - CRITICAL alerts for severe issues (DO < 4, ammonia > 0.3)
   - WARNING alerts for minor issues

4. **Return**: `WaterQualityData` object

#### Step 2: Feed Prediction
**Agent**: `FeedPredictionAgent`

For each pond:
1. **Simulate shrimp population**:
   - Count: 8,000-12,000 shrimp
   - Average weight: 8-15 grams

2. **Calculate biomass**: `count × weight / 1000` (kg)

3. **Determine base feed rate**: 3-5% of biomass per day

4. **Adjust feed based on water quality**:
   - Temperature < 26°C → reduce 20%
   - Temperature > 30°C → reduce 10%
   - DO < 5 mg/L → reduce 30%
   - pH out of range → reduce 10%
   - Ammonia > 0.2 → reduce 40%

5. **Determine feeding frequency**:
   - Temp > 28°C → 4x/day
   - Temp < 26°C → 2x/day
   - Otherwise → 3x/day

6. **Select feed type** based on shrimp weight:
   - < 5g → Starter Feed (40% protein)
   - < 10g → Grower Feed (35% protein)
   - < 15g → Developer Feed (32% protein)
   - ≥ 15g → Finisher Feed (30% protein)

7. **Return**: `FeedData` object

#### Step 3: Energy Optimization
**Agent**: `EnergyOptimizationAgent`

For each pond:
1. **Generate base energy consumption**:
   - Aerator: 15-25 kWh/day
   - Pump: 8-15 kWh/day
   - Heater: 0-20 kWh/day (seasonal)

2. **Adjust based on water quality**:
   - **Aerator**: 
     - DO < 4 → ×1.5
     - DO < 5 → ×1.2
     - DO > 7 → ×0.8
   - **Pump**:
     - Ammonia > 0.2 → +30%
     - Nitrite > 0.1 → +20%
     - Turbidity > 3 → +10%
   - **Heater**:
     - Temp < 26°C → ×1.5
     - Temp < 27°C → ×1.2
     - Temp > 30°C → ×0.0

3. **Calculate total energy and cost**: `total_energy × $0.12/kWh`

4. **Calculate efficiency score** (0-1 scale)

5. **Return**: `EnergyData` object

#### Step 4: Labor Optimization
**Agent**: `LaborOptimizationAgent`

For each pond:
1. **Define base tasks**:
   - Water quality testing
   - Feed distribution
   - Equipment maintenance
   - Pond cleaning
   - Shrimp health monitoring
   - Data recording

2. **Add urgent tasks based on conditions**:
   - DO < 5 → Emergency aeration check
   - Ammonia > 0.2 → Water exchange
   - Energy efficiency < 0.7 → Equipment inspection

3. **Calculate time spent**:
   - Base: tasks × 0.5 hours
   - Urgency multiplier: +30% if urgent tasks
   - Status multiplier: +20% if poor/critical

4. **Determine worker count**:
   - Default: 1 worker
   - 2+ urgent tasks → 2 workers
   - Critical status → 3 workers

5. **Calculate efficiency score**

6. **Generate next priority tasks**

7. **Return**: `LaborData` object

8. **Labor schedule** (in API/orchestrator: `optimize_all_labor` / `optimize_labor`):
   - Build a **shift schedule** (morning / afternoon / evening) with `time`, `tasks` (list of strings), and `workers` (int) per shift.
   - **LLM path** (optional): `_build_schedule_with_llm(labor_data, water_quality_data, energy_data)` — if `OPENAI_API_KEY` is set and the LLM returns valid JSON, use it; otherwise fall back to rule-based.
   - **Rule-based path**: `_build_schedule(...)` assigns tasks to shifts by keywords (e.g. feeding/morning, maintenance/afternoon, recording/evening) and fills `morning_shift` / `afternoon_shift` / `evening_shift` with default times `06:00`, `12:00`, `18:00`.
   - Schedule is included in the labor optimization result and in the dashboard payload for the React Optimization view.

### Phase 2: Decision Making (Optional)

**Agent**: Decision Agent (XGBoost/AutoGluon/Simple/Tiny)

If enabled in config:
1. **Takes all collected data** as input
2. **Makes decisions** for each pond:
   - Primary action type (EMERGENCY_RESPONSE, INCREASE_AERATION, etc.)
   - Priority rank (1 = most urgent)
   - Urgency score (0-1)
   - Confidence score (0-1)

3. **Returns**: `MultiPondDecision` object

**Decision Recommendation Agent**:
1. Converts decision outputs to human-readable recommendations
2. Formats with context (pond ID, urgency, confidence)
3. Provides action-specific guidance

### Phase 3: Insight Generation (`generate_insights()`)

**Manager Agent** synthesizes all data:

1. **Create synthesis task** (if LLM available):
   - Format summaries from all agents
   - Request analysis of:
     - Overall farm health
     - Critical issues
     - Correlations
     - Strategic recommendations

2. **Execute CrewAI task**:
   - Manager Agent uses LLM to analyze
   - Generates insights

3. **Fallback to basic insights** (if LLM unavailable):
   - Identify critical water quality ponds
   - Identify low energy efficiency ponds
   - Identify low labor efficiency ponds

### Phase 4: Dashboard Creation (`update_dashboard()`)

**Manager Agent** creates `ShrimpFarmDashboard`:

1. **Calculate overall health score**:
   - Convert water quality statuses to scores (excellent=1.0, good=0.8, etc.)
   - Average energy efficiency scores
   - Average labor efficiency scores
   - Calculate feed efficiency
   - Average all scores

2. **Create water quality summary**: `{pond_id: status}`

3. **Calculate efficiency metrics**:
   - Feed efficiency (based on FCR)
   - Energy efficiency (average)
   - Labor efficiency (average)

4. **Generate insights**: Call `_generate_insights()`

5. **Generate alerts**: Call `_generate_alerts()`
   - Critical water quality issues
   - Low energy efficiency warnings
   - Low labor efficiency warnings

6. **Generate recommendations**: Call `_generate_recommendations()`
   - Overall farm recommendations
   - Water quality specific
   - Energy optimization
   - Labor optimization

7. **Return**: `ShrimpFarmDashboard` object

### Phase 5: Data Persistence

1. **Save to JSON file** (main orchestrator):
   - Filename: `farm_data_YYYYMMDD_HHMMSS.json`
   - Contains all water quality, feed, energy, labor data
   - Includes dashboard summary

2. **MongoDB** (when `USE_MONGODB` is true):
   - Historical snapshots are saved via `DataRepository` for `/api/history` and `/api/history/hourly`
   - Enables the React dashboard to show history charts and trend data
   - No JSON file fallback for history in the API—history endpoints return data from MongoDB only

3. **Log operations**:
   - Write to `farm_operations.log`
   - Log cycle completion, errors, agent activities

---

## Decision Agent System

The system includes an optional ML-based decision-making component:

### Decision Agent Types

1. **XGBoost Decision Agent** (default, lightweight):
   - Uses trained XGBoost models
   - Predicts actions, priority, urgency, confidence
   - Falls back to SimpleDecisionAgent if models not trained

2. **AutoGluon Decision Agent**:
   - Uses AutoGluon ensemble models
   - More powerful but heavier
   - Falls back to SimpleDecisionAgent if unavailable

3. **Simple Decision Agent** (rule-based fallback):
   - Deterministic rules
   - No ML dependencies
   - Always available

4. **Tiny Decision Agent** (minimal):
   - Minimal rule set
   - Safest defaults

### Decision Workflow

1. **Input**: All collected data (water quality, feed, energy, labor)
2. **Processing**: Decision agent analyzes and predicts actions
3. **Output**: `MultiPondDecision` with:
   - Recommended actions per pond
   - Priority rankings
   - Urgency scores
   - Confidence levels
4. **Recommendation Generation**: DecisionRecommendationAgent converts to text
5. **Integration**: Included in dashboard and API responses

---

## Additional API Agents

These agents are used by the FastAPI server for dedicated endpoints and React views:

### Forecasting Agent (`ForecastingAgent`)

- **Endpoint**: `GET /api/forecasts` (query: `ponds`, `forecast_days`, `fresh`, `seed`)
- **Role**: Generates AI-powered forecasts for water quality, feed, energy, and labor over a configurable horizon (e.g. 90 days)
- **Inputs**: Current agent data for all ponds plus historical snapshots (from MongoDB or in-memory)
- **React**: Forecasting view displays forecast charts and trends

### Benchmarking Agent (`BenchmarkingAgent`)

- **Endpoint**: `GET /api/benchmark` (query: `ponds`)
- **Role**: Produces benchmarking metrics comparing current performance to targets or baselines
- **React**: Benchmarking view displays benchmark results

### Feeding Optimizer (`FeedingOptimizer`)

- **Endpoint**: `GET /api/feeding-optimization`
- **Role**: Provides feeding optimization recommendations (e.g. LLM-generated or rule-based)
- Used by the Feeding view and dashboard payload where applicable

---

## Data Flow Architecture

### Data Dependencies

```
WaterQualityData (independent)
    │
    ├──► FeedData (depends on water quality)
    │
    ├──► EnergyData (depends on water quality)
    │
    └──► LaborData (depends on water quality + energy)
            │
            └──► All data flows to Manager Agent
                    │
                    ├──► ShrimpFarmDashboard
                    │
                    └──► Decision Agent (optional)
                            │
                            └──► DecisionRecommendationAgent
                                    │
                                    └──► Human-readable recommendations
```

### Data Models

- **WaterQualityData**: pH, temperature, DO, salinity, ammonia, nitrite, nitrate, turbidity, status, alerts
- **FeedData**: Shrimp count, weight, feed amount, feed type, feeding frequency, next feeding time
- **EnergyData**: Aerator/pump/heater usage, total energy, cost, efficiency score
- **LaborData**: Tasks completed, time spent, worker count, efficiency score, next tasks
- **Labor schedule** (per pond): Optional `morning_shift` / `afternoon_shift` / `evening_shift`, each with `time` (e.g. `"06:00"`), `tasks` (list of strings), `workers` (int)
- **ShrimpFarmDashboard**: Health score, efficiency metrics, insights, alerts, recommendations
- **MultiPondDecision**: Recommended actions per pond with priority/urgency/confidence

---

## Continuous Monitoring

### Cycle Timing

- **Water Quality Check**: Every 30 minutes (configurable)
- **Feed Prediction**: Every 24 hours
- **Energy Optimization**: Every 60 minutes
- **Labor Optimization**: Every 120 minutes
- **Manager Synthesis**: Every cycle (30 minutes)

### Execution Flow

```
1. Start monitoring cycle
   └── Set is_running = True

2. Loop while is_running:
   ├── Execute run_monitoring_cycle()
   │   ├── collect_agent_data()
   │   ├── generate_insights()
   │   └── update_dashboard()
   ├── Sleep for water_quality_check_interval (30 min)
   └── Repeat

3. On KeyboardInterrupt:
   └── Set is_running = False
   └── Exit loop
```

### Error Handling

- Try-except around monitoring cycle
- On error: Log to `farm_operations.log`, wait 60 seconds, retry
- Graceful shutdown on KeyboardInterrupt

---

## Output Interfaces

### 1. Streamlit Dashboard

**Sections**:
- **Key Metrics**: Health score, feed/energy/labor efficiency
- **Alerts & Insights**: Critical alerts, warnings, info messages
- **Water Quality**: Multi-parameter charts, status table
- **Feed Management**: Feed amount charts, schedule table
- **Energy Usage**: Distribution pie chart, efficiency bar chart
- **Labor Efficiency**: Efficiency charts, task completion scatter plot
- **Recommendations**: Strategic recommendations list

### 2. FastAPI REST API

**Response Structure**:
```json
{
  "dashboard": {
    "timestamp": "2024-01-01T12:00:00",
    "overall_health_score": 0.85,
    "water_quality_summary": {"1": "excellent", "2": "good"},
    "feed_efficiency": 0.82,
    "energy_efficiency": 0.78,
    "labor_efficiency": 0.80,
    "insights": [...],
    "alerts": [...],
    "recommendations": [...]
  },
  "water_quality": [...],
  "feed": [...],
  "energy": [...],
  "labor": [...],
  "decision_agent_type": "xgboost",
  "decisions": {...},
  "decision_recommendations": [...]
}
```

### 3. React Web Dashboard

- Fetches data from FastAPI (`/api/dashboard`, `/api/history`, and view-specific endpoints like `/api/forecasts`, `/api/benchmark`)
- Views: Dashboard, Forecasting, Optimization (labor schedule), Benchmarking, Water Quality, Feeding, Disease Detection, Settings
- Interactive charts; optional auto-refresh; pond filter and history (e.g. 7 days from MongoDB)
- Labor schedule displayed in Optimization view (morning/afternoon/evening shifts)
- Decision recommendations display

---

## Configuration

### Key Settings (`config.py`)

- **OpenAI Settings**: API key, model name, temperature
- **Farm Config**: Number of ponds, optimal parameter ranges
- **Agent Config**: Monitoring intervals (water quality, feed, energy, labor)
- **Decision Model Config**:
  - `use_decision_model`: Enable/disable decision agent
  - `agent_type`: "xgboost", "autogluon", "simple", "tiny", "none"
  - `confidence_threshold`: Minimum confidence for actions
  - `enable_auto_actions`: Auto-execute actions (future feature)
- **MongoDB**: `USE_MONGODB` (default false), `MONGO_URI`, `MONGO_DB_NAME` — when true, history and optional labor data use MongoDB
- **Orchestration**: `PARALLEL_DATA_COLLECTION` (default true) — use parallel phases in API dashboard generation; `RUN_MANAGER_SYNTHESIS` (default false) — run heavy Manager Agent LLM synthesis

---

## Summary

The application workflow follows this pattern:

1. **Initialization**: All agents are created and configured (or lazy-initialized in the API)
2. **Data Collection**: Specialized agents generate domain-specific data for each pond; the API can run water quality, then feed/energy, then labor in parallel when `PARALLEL_DATA_COLLECTION` is true
3. **Labor schedule**: Labor agent (or API) builds morning/afternoon/evening shift schedule via LLM (if available) or rule-based logic
4. **Decision Making** (optional): ML-based decision agent predicts actions
5. **Synthesis**: Manager Agent combines all data and generates insights (optional when `RUN_MANAGER_SYNTHESIS` is true)
6. **Visualization**: Dashboard/API/React views display comprehensive farm status, forecasts, benchmarking, and labor schedule
7. **Persistence**: Data is saved to JSON (main orchestrator) and/or MongoDB for historical analysis and history endpoints
8. **Continuous Monitoring**: Cycle repeats at configured intervals (CLI); API generates data on demand

The system is designed to be:
- **Modular**: Each agent operates independently
- **Scalable**: Can handle multiple ponds
- **Resilient**: Error handling and fallback mechanisms
- **Extensible**: Easy to add new agents or features
- **User-Friendly**: Multiple interfaces (CLI, Dashboard, API, React)

This architecture enables intelligent, data-driven decision-making for shrimp farm operations through coordinated multi-agent AI analysis.

