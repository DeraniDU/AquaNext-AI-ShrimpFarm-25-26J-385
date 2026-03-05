# Shrimp Farm Management System - Complete Workflow Explanation

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Application Entry Points](#application-entry-points)
3. [Core Workflow - Monitoring Cycle](#core-workflow---monitoring-cycle)
4. [Agent Workflow Details](#agent-workflow-details)
5. [Dashboard Workflow](#dashboard-workflow)
6. [API Workflow](#api-workflow)
7. [Data Flow Architecture](#data-flow-architecture)
8. [Alert and Recommendation System](#alert-and-recommendation-system)

---

## System Architecture Overview

The application is a **multi-agent AI system** built with CrewAI that manages shrimp farm operations through specialized AI agents working in parallel. The system follows a hierarchical architecture:

```
Manager Agent (Coordinator)
├── Water Quality Monitoring Agent
├── Feed Prediction Agent
├── Energy Optimization Agent
└── Labor Optimization Agent
```

### Key Components:
- **Orchestrator** (`main.py`): Main coordination engine
- **Agents** (`agents/`): Specialized AI agents for different domains
- **Dashboard** (`dashboard.py`): Streamlit web interface
- **API Server** (`api/server.py`): REST API for external integrations
- **Data Models** (`models.py`): Structured data schemas
- **Configuration** (`config.py`): System settings and parameters

---

## Application Entry Points

### 1. Main Orchestrator (`main.py`)

**Purpose**: Runs continuous monitoring cycles and coordinates all agents.

**Workflow**:
```
1. Initialize ShrimpFarmOrchestrator
   ├── Create LLM instance (OpenAI GPT-4)
   ├── Initialize all 5 agents
   ├── Initialize data storage structures
   └── Set operation status flags

2. Run Single Cycle (for testing)
   └── execute run_single_cycle()

3. Start Continuous Monitoring (optional)
   └── execute start_monitoring_cycle()
       └── Loop every 30 minutes (configurable)
```

**Key Methods**:
- `run_monitoring_cycle()`: Executes one complete monitoring cycle
- `collect_agent_data()`: Gathers data from all specialized agents
- `generate_insights()`: Uses Manager Agent to synthesize insights
- `update_dashboard()`: Creates comprehensive dashboard object
- `save_farm_data()`: Persists data to JSON file

### 2. Dashboard Application (`dashboard.py`)

**Purpose**: Interactive web-based visualization and control interface.

**Workflow**:
```
1. Initialize ShrimpFarmDashboardApp
   ├── Create all agent instances
   └── Initialize Streamlit session state

2. Render Sidebar Controls
   ├── Update Dashboard button
   ├── Farm configuration sliders
   └── Quick action buttons

3. Update Dashboard Data (when triggered)
   ├── Generate data for each pond (1-4 ponds)
   ├── Collect from all agents
   └── Create dashboard via Manager Agent

4. Render Dashboard Sections
   ├── Key metrics (health scores, efficiencies)
   ├── Alerts and insights
   ├── Water quality charts
   ├── Feed management tables
   ├── Energy usage visualizations
   ├── Labor efficiency reports
   └── Strategic recommendations
```

### 3. API Server (`api/server.py`)

**Purpose**: REST API for external system integration.

**Endpoints**:
- `GET /api/health`: Health check
- `GET /api/dashboard`: Generate and return dashboard data

**Workflow**:
```
1. Receive API request
2. Initialize agents (if needed)
3. Generate data for specified number of ponds
4. Create dashboard via Manager Agent
5. Serialize data to JSON
6. Return response
```

---

## Core Workflow - Monitoring Cycle

The monitoring cycle is the heart of the system. Here's the detailed step-by-step process:

### Phase 1: Data Collection (`collect_agent_data()`)

**Step 1: Water Quality Monitoring**
```
For each pond (1 to pond_count):
  1. WaterQualityAgent.simulate_water_quality_data(pond_id)
     ├── Generate realistic water parameters:
     │   ├── pH (7.5-8.5 optimal)
     │   ├── Temperature (26-30°C optimal)
     │   ├── Dissolved Oxygen (>5 mg/L optimal)
     │   ├── Salinity (15-25 ppt optimal)
     │   ├── Ammonia, Nitrite, Nitrate
     │   └── Turbidity
     ├── Determine status (excellent/good/fair/poor/critical)
     └── Generate alerts for out-of-range parameters
  2. Store WaterQualityData object
```

**Step 2: Feed Prediction**
```
For each pond:
  1. FeedPredictionAgent.simulate_feed_data(pond_id, water_quality_data)
     ├── Calculate shrimp biomass (count × weight)
     ├── Determine base feed amount (3-5% of biomass)
     ├── Adjust feed based on water quality:
     │   ├── Temperature adjustments
     │   ├── Dissolved oxygen adjustments
     │   ├── pH adjustments
     │   └── Ammonia adjustments
     ├── Determine feeding frequency (2-4x/day)
     ├── Select appropriate feed type (Starter/Grower/Developer/Finisher)
     └── Predict next feeding time
  2. Store FeedData object
```

**Step 3: Energy Optimization**
```
For each pond:
  1. EnergyOptimizationAgent.simulate_energy_data(pond_id, water_quality_data)
     ├── Calculate base energy usage:
     │   ├── Aerator usage (15-25 kWh/day)
     │   ├── Pump usage (8-15 kWh/day)
     │   └── Heater usage (0-20 kWh/day, seasonal)
     ├── Adjust based on water quality:
     │   ├── Increase aeration if DO < 5 mg/L
     │   ├── Increase pumping if ammonia/nitrite high
     │   └── Increase heating if temp < 26°C
     ├── Calculate total energy and cost ($0.12/kWh)
     └── Calculate efficiency score (0-1)
  2. Store EnergyData object
```

**Step 4: Labor Optimization**
```
For each pond:
  1. LaborOptimizationAgent.simulate_labor_data(pond_id, water_quality_data, energy_data)
     ├── Identify base tasks (water testing, feeding, maintenance)
     ├── Add urgent tasks based on conditions:
     │   ├── Emergency aeration if DO low
     │   ├── Water exchange if ammonia high
     │   └── Equipment inspection if energy efficiency low
     ├── Calculate time spent (based on task count and urgency)
     ├── Determine worker count (1-3 based on urgency)
     ├── Calculate efficiency score
     └── Generate next priority tasks
  2. Store LaborData object
```

### Phase 2: Insight Generation (`generate_insights()`)

**Step 1: Manager Agent Task Creation**
```
1. ManagerAgent.create_synthesis_task()
   ├── Format water quality summary
   ├── Format feed summary
   ├── Format energy summary
   └── Format labor summary

2. Create CrewAI Task with:
   ├── All formatted summaries
   ├── Analysis requirements:
   │   ├── Assess overall farm health
   │   ├── Identify critical issues
   │   ├── Analyze correlations
   │   ├── Provide strategic recommendations
   │   └── Generate actionable alerts
   └── Expected output specification
```

**Step 2: Crew Execution**
```
1. Create Crew with Manager Agent
2. Execute crew.kickoff()
   └── Manager Agent uses LLM to analyze all data
3. Extract insights from result
   └── Parse LLM output (or use fallback basic insights)
```

**Step 3: Basic Insights Generation (Fallback)**
```
If LLM execution fails:
  1. Identify critical water quality ponds
  2. Identify low energy efficiency ponds
  3. Generate insight objects with:
     ├── Insight type
     ├── Priority level (Critical/Warning/Info)
     ├── Message
     ├── Recommendations
     └── Affected ponds
```

### Phase 3: Dashboard Creation (`update_dashboard()`)

**Step 1: Manager Agent Dashboard Creation**
```
ManagerAgent.create_dashboard():
  1. Calculate overall health score:
     ├── Water quality scores (excellent=1.0, good=0.8, etc.)
     ├── Average energy efficiency
     ├── Average labor efficiency
     └── Feed efficiency (simplified)
     └── Average all scores

  2. Create water quality summary:
     └── Map pond_id → status for all ponds

  3. Calculate efficiency metrics:
     ├── Feed efficiency (based on FCR)
     ├── Energy efficiency (average of all ponds)
     └── Labor efficiency (average of all ponds)

  4. Generate insights:
     └── Call _generate_insights() method

  5. Generate alerts:
     └── Call _generate_alerts() method
        ├── Critical water quality issues
        ├── Low energy efficiency warnings
        └── Low labor efficiency warnings

  6. Generate recommendations:
     └── Call _generate_recommendations() method
        ├── Overall farm recommendations
        ├── Water quality specific
        ├── Energy optimization
        └── Labor optimization

  7. Return ShrimpFarmDashboard object
```

**Step 2: Data Storage**
```
Store dashboard object in:
  farm_data['dashboard'] = dashboard
```

### Phase 4: Data Persistence

**Save Farm Data**:
```
1. Convert all data to serializable format:
   ├── Water quality data → JSON
   ├── Feed data → JSON
   ├── Energy data → JSON
   └── Labor data → JSON

2. Write to file: farm_data_YYYYMMDD_HHMMSS.json

3. Log operation completion
```

---

## Agent Workflow Details

### Water Quality Agent Workflow

**Initialization**:
```
1. Create ChatOpenAI instance
2. Create CrewAI Agent with:
   ├── Role: "Water Quality Monitoring Specialist"
   ├── Goal: Monitor and analyze water quality
   └── Backstory: Expert aquaculture specialist
```

**Data Simulation Process**:
```
1. Generate base parameters with random variation
2. Determine status using _determine_water_quality_status():
   ├── Count parameter issues
   ├── Map to status:
   │   ├── 0 issues → EXCELLENT
   │   ├── 1 issue → GOOD
   │   ├── 2 issues → FAIR
   │   ├── 3 issues → POOR
   │   └── 4+ issues → CRITICAL
3. Generate alerts using _generate_alerts():
   ├── Check each parameter against optimal ranges
   ├── Create CRITICAL alerts for severe issues
   └── Create WARNING alerts for minor issues
4. Return WaterQualityData object
```

### Feed Prediction Agent Workflow

**Data Simulation Process**:
```
1. Simulate shrimp population:
   ├── Count: 8000-12000 shrimp
   └── Average weight: 8-15 grams

2. Calculate biomass: count × weight / 1000 (kg)

3. Determine base feed rate: 3-5% of biomass per day

4. Adjust feed based on water quality (_calculate_feed_adjustment):
   ├── Temperature < 26°C → reduce 20%
   ├── Temperature > 30°C → reduce 10%
   ├── DO < 5 mg/L → reduce 30%
   ├── pH out of range → reduce 10%
   └── Ammonia > 0.2 → reduce 40%

5. Determine feeding frequency:
   ├── Temp > 28°C → 4x/day
   ├── Temp < 26°C → 2x/day
   └── Otherwise → 3x/day

6. Select feed type (_select_feed_type):
   ├── Weight < 5g → Starter Feed (40% protein)
   ├── Weight < 10g → Grower Feed (35% protein)
   ├── Weight < 15g → Developer Feed (32% protein)
   └── Weight ≥ 15g → Finisher Feed (30% protein)

7. Calculate per-serving amount: daily_feed / frequency

8. Predict next feeding: now + 6-8 hours

9. Return FeedData object
```

### Energy Optimization Agent Workflow

**Data Simulation Process**:
```
1. Generate base energy consumption:
   ├── Aerator: 15-25 kWh/day
   ├── Pump: 8-15 kWh/day
   └── Heater: 0-20 kWh/day (seasonal)

2. Adjust based on water quality:
   ├── Aerator (_calculate_aerator_usage):
   │   ├── DO < 4 → ×1.5
   │   ├── DO < 5 → ×1.2
   │   ├── DO > 7 → ×0.8
   │   └── Otherwise → ×1.0
   ├── Pump (_calculate_pump_usage):
   │   ├── Ammonia > 0.2 → +30%
   │   ├── Nitrite > 0.1 → +20%
   │   └── Turbidity > 3 → +10%
   └── Heater (_calculate_heater_usage):
       ├── Temp < 26°C → ×1.5
       ├── Temp < 27°C → ×1.2
       ├── Temp > 30°C → ×0.0
       └── Otherwise → ×0.5

3. Calculate total energy: aerator + pump + heater

4. Calculate cost: total_energy × $0.12/kWh

5. Calculate efficiency score (_calculate_efficiency_score):
   ├── Base score: 0.8
   ├── Add points for optimal water quality
   └── Adjust based on total usage

6. Return EnergyData object
```

### Labor Optimization Agent Workflow

**Data Simulation Process**:
```
1. Define base tasks:
   ├── Water quality testing
   ├── Feed distribution
   ├── Equipment maintenance
   ├── Pond cleaning
   ├── Shrimp health monitoring
   └── Data recording

2. Add urgent tasks based on conditions:
   ├── DO < 5 → Emergency aeration check
   ├── Ammonia > 0.2 → Water exchange
   └── Energy efficiency < 0.7 → Equipment inspection

3. Simulate completed tasks:
   ├── Random sample of 2-4 base tasks
   └── Add urgent tasks if present

4. Calculate time spent:
   ├── Base: tasks × 0.5 hours
   ├── Urgency multiplier: +30% if urgent tasks
   └── Status multiplier: +20% if poor/critical

5. Determine worker count:
   ├── Default: 1 worker
   ├── 2+ urgent tasks → 2 workers
   └── Critical status → 3 workers

6. Calculate efficiency score (_calculate_labor_efficiency):
   ├── Base: 0.8
   ├── Task completion bonus/penalty
   ├── Time efficiency bonus/penalty
   ├── Worker allocation efficiency
   └── Water quality impact

7. Generate next tasks (_generate_next_tasks):
   ├── Regular maintenance tasks
   ├── Water quality based tasks
   ├── Energy efficiency tasks
   ├── Feeding tasks
   └── Safety tasks

8. Return LaborData object
```

### Manager Agent Workflow

**Dashboard Creation Process**:
```
1. Calculate overall health score:
   ├── Convert water quality statuses to scores
   ├── Average energy efficiency scores
   ├── Average labor efficiency scores
   ├── Calculate feed efficiency
   └── Average all scores

2. Create water quality summary:
   └── Dictionary: {pond_id: status}

3. Calculate efficiency metrics:
   ├── Feed efficiency (_calculate_feed_efficiency):
   │   ├── Calculate total feed and biomass
   │   ├── Calculate FCR (Feed Conversion Ratio)
   │   └── Convert to efficiency (optimal FCR = 1.5-2.0)
   ├── Energy efficiency: average of all ponds
   └── Labor efficiency: average of all ponds

4. Generate insights (_generate_insights):
   ├── Water quality insights (critical ponds)
   ├── Energy efficiency insights (low efficiency ponds)
   └── Labor efficiency insights (low efficiency ponds)

5. Generate alerts (_generate_alerts):
   ├── Critical water quality alerts
   ├── Energy efficiency warnings
   └── Labor efficiency warnings

6. Generate recommendations (_generate_recommendations):
   ├── Overall farm recommendations
   ├── Water quality specific
   ├── Energy optimization
   └── Labor optimization

7. Return ShrimpFarmDashboard object
```

---

## Dashboard Workflow

### Initialization Phase

```
1. Create ShrimpFarmDashboardApp instance
   ├── Initialize all agent instances
   └── Initialize Streamlit session state:
       ├── dashboard_data = None
       └── last_update = None

2. Configure Streamlit page:
   ├── Page title: "Shrimp Farm Management System"
   ├── Layout: wide
   └── Sidebar: expanded
```

### User Interaction Flow

**Scenario 1: Initial Load**
```
1. User opens dashboard
2. Dashboard shows: "Click 'Update Dashboard' to load farm data"
3. User clicks "Update Dashboard" button
4. System executes update_dashboard_data()
```

**Scenario 2: Data Update**
```
1. User clicks "Update Dashboard"
2. System shows spinner: "Collecting data from all agents..."
3. For each pond (1-4):
   ├── Generate water quality data
   ├── Generate feed data (using water quality)
   ├── Generate energy data (using water quality)
   └── Generate labor data (using water quality + energy)
4. Create dashboard via Manager Agent
5. Store in session_state.dashboard_data
6. Update last_update timestamp
7. Show success message
8. Dashboard re-renders with new data
```

### Rendering Flow

**Main Dashboard Sections**:
```
1. Render Key Metrics (render_key_metrics):
   ├── Overall Health Score (with status)
   ├── Feed Efficiency
   ├── Energy Efficiency
   └── Labor Efficiency

2. Render Alerts and Insights (render_alerts_and_insights):
   ├── Display critical alerts (red)
   ├── Display warnings (yellow)
   ├── Display info alerts (blue)
   └── Display insights with expandable sections

3. Render Detailed Sections (two columns):
   Column 1:
   ├── Water Quality Section (render_water_quality_section)
   │   ├── Multi-parameter charts (pH, Temp, DO, Salinity)
   │   └── Status table
   └── Energy Section (render_energy_section)
       ├── Energy distribution pie chart
       ├── Efficiency bar chart
       └── Energy usage table

   Column 2:
   ├── Feed Section (render_feed_section)
   │   ├── Feed amount bar chart
   │   └── Feed schedule table
   └── Labor Section (render_labor_section)
       ├── Efficiency bar chart
       ├── Task completion scatter plot
       └── Labor summary table

4. Render Recommendations (render_recommendations):
   └── List all strategic recommendations
```

### Sidebar Controls

```
1. Update Dashboard Button:
   └── Triggers data collection and dashboard update

2. Force Refresh Button:
   └── Clears session state and re-renders

3. Farm Configuration:
   └── Slider for number of ponds (1-8)

4. Last Update Display:
   └── Shows timestamp of last data update

5. Quick Actions:
   ├── Generate Report button
   └── Check Alerts button
```

---

## API Workflow

### API Server Initialization

```
1. Create FastAPI app instance
2. Add CORS middleware:
   ├── Allow localhost:5173 (Vite dev server)
   └── Allow all methods and headers
```

### Endpoint: GET /api/health

```
Request: GET /api/health
Response:
{
  "status": "ok",
  "time": "2024-01-01T12:00:00"
}
```

### Endpoint: GET /api/dashboard

**Request Flow**:
```
1. Receive GET request with optional 'ponds' parameter
2. Initialize all agent instances
3. Generate data for each pond (1 to ponds):
   ├── Water quality data
   ├── Feed data (using water quality)
   ├── Energy data (using water quality)
   └── Labor data (using water quality + energy)
4. Create dashboard via Manager Agent
5. Serialize all data to JSON:
   ├── Dashboard: dashboard.model_dump(mode="json")
   ├── Water quality: [w.model_dump() for w in water_quality_data]
   ├── Feed: [f.model_dump() for f in feed_data]
   ├── Energy: [e.model_dump() for e in energy_data]
   └── Labor: [l.model_dump() for l in labor_data]
6. Return JSON response
```

**Response Structure**:
```json
{
  "dashboard": {
    "timestamp": "2024-01-01T12:00:00",
    "overall_health_score": 0.85,
    "water_quality_summary": {"1": "excellent", "2": "good", ...},
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
  "labor": [...]
}
```

---

## Data Flow Architecture

### Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Entry Point                    │
│  (main.py / dashboard.py / api/server.py)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              ShrimpFarmOrchestrator / App                   │
│  - Initializes all agents                                   │
│  - Coordinates data collection                              │
│  - Manages monitoring cycles                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Water Quality│ │ Feed         │ │ Energy       │
│ Agent        │ │ Agent        │ │ Agent        │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                 │
       │                │                 │
       ▼                ▼                 ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│WaterQuality  │ │ FeedData     │ │ EnergyData   │
│Data          │ │              │ │              │
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
              ┌─────────────────┐
              │  LaborData      │
              └────────┬────────┘
                       │
                       ▼
        ┌───────────────────────────────┐
        │    Manager Agent              │
        │  - Synthesizes all data       │
        │  - Generates insights         │
        │  - Creates dashboard          │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  ShrimpFarmDashboard          │
        │  - Overall health score       │
        │  - Efficiency metrics         │
        │  - Insights & alerts          │
        │  - Recommendations            │
        └───────────────┬───────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Dashboard   │ │  API Server  │ │  Data File   │
│  (Streamlit) │ │  (FastAPI)   │ │  (JSON)      │
└──────────────┘ └──────────────┘ └──────────────┘
```

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
                    └──► ShrimpFarmDashboard
```

---

## Alert and Recommendation System

### Alert Generation Process

**Water Quality Alerts**:
```
1. Check each parameter against optimal ranges:
   ├── pH < 7.5 or > 8.5 → Alert
   ├── Temperature < 26°C or > 30°C → Alert
   ├── Dissolved Oxygen < 5 mg/L → CRITICAL Alert
   ├── Salinity < 15 or > 25 ppt → Alert
   └── Ammonia > 0.2 mg/L → CRITICAL Alert

2. Alert Format:
   ├── CRITICAL: "CRITICAL: pH too low (7.2) - immediate action required"
   └── WARNING: "WARNING: Temperature too high (31.5°C) - monitor closely"
```

**Energy Alerts**:
```
1. Check efficiency scores:
   ├── Efficiency < 0.5 → WARNING Alert
   └── High energy usage → Optimization Alert

2. Alert Format:
   └── "WARNING: Pond 2 energy efficiency critically low"
```

**Labor Alerts**:
```
1. Check efficiency scores:
   └── Efficiency < 0.5 → WARNING Alert

2. Alert Format:
   └── "WARNING: Pond 3 labor efficiency critically low"
```

### Insight Generation Process

**Water Quality Insights**:
```
1. Identify critical/poor ponds
2. Create FarmInsight object:
   ├── Type: "Water Quality Alert"
   ├── Priority: CRITICAL
   ├── Message: "Critical water quality issues detected in X pond(s)"
   ├── Recommendations:
   │   ├── "Immediate water quality intervention required"
   │   └── "Consider emergency aeration"
   └── Affected ponds: [list of pond IDs]
```

**Energy Insights**:
```
1. Identify low efficiency ponds (efficiency < 0.7)
2. Create FarmInsight object:
   ├── Type: "Energy Optimization"
   ├── Priority: WARNING
   ├── Message: "Energy efficiency below optimal in X pond(s)"
   └── Recommendations:
       ├── "Review equipment scheduling"
       └── "Consider energy audit"
```

**Labor Insights**:
```
1. Identify low efficiency ponds (efficiency < 0.7)
2. Create FarmInsight object:
   ├── Type: "Labor Optimization"
   ├── Priority: WARNING
   ├── Message: "Labor efficiency below optimal in X pond(s)"
   └── Recommendations:
       ├── "Review task allocation"
       └── "Consider training needs"
```

### Recommendation Generation Process

**Overall Farm Recommendations**:
```
1. Always include:
   ├── "Implement automated monitoring systems"
   ├── "Establish predictive maintenance schedules"
   └── "Develop contingency plans for critical issues"
```

**Water Quality Recommendations**:
```
If critical/poor ponds exist:
   ├── "Prioritize water quality management in affected ponds"
   └── "Consider additional aeration equipment"
```

**Energy Recommendations**:
```
If total energy cost > $100:
   ├── "Conduct comprehensive energy audit"
   └── "Consider renewable energy integration"
```

**Labor Recommendations**:
```
If average labor efficiency < 0.8:
   ├── "Review and optimize labor allocation"
   └── "Implement task automation where possible"
```

---

## Continuous Monitoring Cycle

### Cycle Timing

```
Water Quality Check: Every 30 minutes
Feed Prediction: Every 24 hours
Energy Optimization: Every 60 minutes
Labor Optimization: Every 120 minutes
Manager Synthesis: Every cycle (30 minutes)
```

### Cycle Execution Flow

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

```
1. Try-except around monitoring cycle
2. On error:
   ├── Log error to farm_operations.log
   ├── Wait 60 seconds
   └── Retry cycle

3. On KeyboardInterrupt:
   └── Gracefully stop monitoring
```

---

## Data Persistence

### File Structure

```
farm_data_YYYYMMDD_HHMMSS.json
{
  "timestamp": "2024-01-01T12:00:00",
  "water_quality": [
    {
      "pond_id": 1,
      "ph": 8.0,
      "temperature": 28.5,
      "dissolved_oxygen": 6.2,
      "salinity": 20.0,
      "status": "excellent",
      "alerts": []
    },
    ...
  ],
  "feed": [...],
  "energy": [...],
  "labor": [...]
}
```

### Logging

```
farm_operations.log contains:
├── Agent initialization messages
├── Monitoring cycle start/end
├── Data collection progress
├── Insight generation status
├── Dashboard update confirmations
└── Error messages and stack traces
```

---

## Summary

The Shrimp Farm Management System workflow follows this pattern:

1. **Initialization**: All agents are created and configured
2. **Data Collection**: Specialized agents generate domain-specific data
3. **Synthesis**: Manager Agent combines all data and generates insights
4. **Visualization**: Dashboard displays comprehensive farm status
5. **Persistence**: Data is saved for historical analysis
6. **Continuous Monitoring**: Cycle repeats at configured intervals

The system is designed to be:
- **Modular**: Each agent operates independently
- **Scalable**: Can handle multiple ponds
- **Resilient**: Error handling and fallback mechanisms
- **Extensible**: Easy to add new agents or features
- **User-Friendly**: Multiple interfaces (CLI, Dashboard, API)

This architecture enables intelligent, data-driven decision-making for shrimp farm operations through coordinated multi-agent AI analysis.

