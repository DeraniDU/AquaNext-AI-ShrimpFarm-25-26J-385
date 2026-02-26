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
              │  Labor Agent    │
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
- `GET /api/dashboard?ponds=4` - Generate dashboard data
- `GET /api/history?limit=30` - Load historical snapshots

**Workflow**:
1. Receives HTTP request
2. Generates fresh data (or returns cached snapshot)
3. Includes decision agent outputs if enabled
4. Returns JSON response

**Usage**:
```bash
uvicorn api.server:app --reload --port 8000
```

### 4. **React Web Dashboard** (`web/`)
**Purpose**: Modern React-based frontend

**Workflow**:
1. React app fetches data from FastAPI (`/api/dashboard`)
2. Displays interactive charts and tables
3. Shows decision recommendations
4. Can load historical data from `/api/history`

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

1. **Save to JSON file**:
   - Filename: `farm_data_YYYYMMDD_HHMMSS.json`
   - Contains all water quality, feed, energy, labor data
   - Includes dashboard summary

2. **Log operations**:
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

- Fetches data from FastAPI
- Interactive charts using Plotly
- Real-time updates
- Historical data visualization
- Decision recommendations display

---

## Configuration

### Key Settings (`config.py`)

- **OpenAI Settings**: API key, model name, temperature
- **Farm Config**: Number of ponds, optimal parameter ranges
- **Agent Config**: Monitoring intervals
- **Decision Model Config**:
  - `use_decision_model`: Enable/disable decision agent
  - `agent_type`: "xgboost", "autogluon", "simple", "tiny", "none"
  - `confidence_threshold`: Minimum confidence for actions
  - `enable_auto_actions`: Auto-execute actions (future feature)

---

## Summary

The application workflow follows this pattern:

1. **Initialization**: All agents are created and configured
2. **Data Collection**: Specialized agents generate domain-specific data for each pond
3. **Decision Making** (optional): ML-based decision agent predicts actions
4. **Synthesis**: Manager Agent combines all data and generates insights
5. **Visualization**: Dashboard/API displays comprehensive farm status
6. **Persistence**: Data is saved for historical analysis
7. **Continuous Monitoring**: Cycle repeats at configured intervals

The system is designed to be:
- **Modular**: Each agent operates independently
- **Scalable**: Can handle multiple ponds
- **Resilient**: Error handling and fallback mechanisms
- **Extensible**: Easy to add new agents or features
- **User-Friendly**: Multiple interfaces (CLI, Dashboard, API, React)

This architecture enables intelligent, data-driven decision-making for shrimp farm operations through coordinated multi-agent AI analysis.

