## Shrimp Farm AI Assistant – End‑to‑End Workflow

This file gives a **high‑level view** of how data flows through the system, from entry points to agents, ML models, and the frontend.

---

### 1. Big‑picture architecture

At a glance, the system looks like this:

```mermaid
flowchart TD
    subgraph entry[Application Entry Points]
        A1[CLI - main.py]
        A2[FastAPI - api/server.py]
        A3[Dashboard - dashboard.py / web/]
    end

    entry --> B[ S hrimpFarmOrchestrator ]

    subgraph agents[Specialized Agents]
        WQ[WaterQualityAgent]
        FD[FeedPredictionAgent]
        EN[EnergyOptimizationAgent]
        LB[LaborOptimizationAgent]
    end

    B --> WQ
    B --> FD
    B --> EN
    B --> LB

    WQ --> M[ManagerAgent]
    FD --> M
    EN --> M
    LB --> M

    subgraph mlpath[Decision / ML Layer]
        D1[DecisionAgent (PyTorch)]
        D2[XGBoostDecisionAgent]
        D3[AutoGluonDecisionAgent]
    end

    M -->|optional| mlpath

    mlpath --> DR[DecisionRecommendationAgent]
    M --> DR

    DR --> API[FastAPI JSON Responses]
    DR --> UI[React / Streamlit UI]
```

**Key ideas**:
- `ShrimpFarmOrchestrator` coordinates **multi‑agent data collection**.
- Specialized agents compute water, feed, energy, and labor metrics per pond.
- `ManagerAgent` fuses all of that into a **farm‑level picture** (health, insights, summaries).
- Optional ML decision agents (PyTorch/XGBoost/AutoGluon) turn metrics into **concrete actions**.
- `DecisionRecommendationAgent` converts raw actions into **human‑readable recommendations** for the API/UI.

---

### 2. Step‑by‑step monitoring cycle

1. **Entry point**  
   - CLI (`main.py`) runs one cycle or a loop.  
   - FastAPI (`api/server.py`) runs a cycle on request.  
   - Dashboards call the API and just render existing results.

2. **Orchestrator starts a monitoring cycle** (`ShrimpFarmOrchestrator`)  
   - Determines pond list and configuration.  
   - Triggers data collection from all specialized agents (sequential or parallel, depending on settings).

3. **Specialized agents compute per‑pond data**  
   - `WaterQualityAgent` → `WaterQualityData` (status + alerts).  
   - `FeedPredictionAgent` → `FeedData` (biomass, feed schedule).  
   - `EnergyOptimizationAgent` → `EnergyData` (usage, costs, efficiency).  
   - `LaborOptimizationAgent` → `LaborData` plus a **shift schedule** (LLM or rule‑based).

4. **ManagerAgent fuses everything**  
   - Takes all `*Data` objects across ponds.  
   - Computes **health summaries, alerts, KPIs, and textual insights**.  
   - Builds a dashboard‑friendly structure (per‑pond + farm‑wide).

5. **Optional ML decision path**  
   - Manager or API calls a decision agent:
     - `DecisionAgent` (PyTorch model), or  
     - `XGBoostDecisionAgent`, or  
     - `AutoGluonDecisionAgent`.  
   - These agents use the 35‑feature **ML path** from `models/` (see `models/ML_PATH.md`) to:
     - Pick `primary_action` and any secondary actions.  
     - Score urgency and priority per pond.  
     - Suggest feed and equipment adjustments.

6. **DecisionRecommendationAgent formats output**  
   - Combines ManagerAgent context + ML decisions.  
   - Produces **plain‑language explanations** and ranked recommendations.

7. **Results go to API and UI**  
   - FastAPI exposes JSON endpoints (`/api/dashboard`, `/api/forecasts`, `/api/labor-optimization`, etc.).  
   - React dashboard (`web/`) and Streamlit dashboard consume these endpoints and render:
     - Charts (water quality, energy, feed).  
     - Tables (labor schedules, benchmarks).  
     - Cards with recommended actions and explanations.

---

### 3. How this connects to other docs

- **Detailed logic** for each phase (agents, endpoints, parameters) lives in `APPLICATION_WORKFLOW.md`.  
- **ML feature/decision path** (how the trained models work) is documented in `models/ML_PATH.md`.  
- This file is meant as the **quick mental model** of “who calls whom” and “how a single request flows through the system”.

