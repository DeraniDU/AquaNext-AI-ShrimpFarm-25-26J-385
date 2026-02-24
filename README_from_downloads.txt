SMART SHRIMP FARMING SOLUTIONS
AI-Powered Aquaculture Management Platform

A comprehensive, production-ready machine learning powered platform for intelligent shrimp pond management featuring real-time IoT monitoring, multi-agent AI systems, predictive analytics, automated control, and cloud-based decision support.

===============================================================================
SYSTEM ARCHITECTURE
===============================================================================

System architecture diagram: ./docs/system-architecture.png

+====================================================================================+
|                        SMART SHRIMP FARMING SOLUTIONS                              |
|                           System Architecture                                       |
+====================================================================================+

                         +--------------------------------+
                         |   CLOUD PROCESSING & AI ENGINE |
                         |--------------------------------|
                         | - Data Analytics               |
                         | - Predictive Models            |
                         | - Machine Learning             |
                         | - Decision Support             |
                         +---------------+----------------+
                                         |
            +------------- Real-time Data | AI Processing -------------+
            |                             |                            |
            v                             v                            v
+---------------------+  +------------------------+  +---------------------------+
| WATER QUALITY       |  | AUTOMATED FEED         |  | EHP DETECTION &           |
| MONITORING          |  | MANAGEMENT             |  | DISEASE PREVENTION        |
|---------------------|  |------------------------|  |---------------------------|
| IoT Sensors Network |  | AI-Optimized Feeding   |  | AI Image Recognition      |
|                     |  |                        |  |                           |
| +---+ +----+ +---+  |  | +--------+ +--------+  |  | +----------+ +----------+ |
| |pH | |Temp| |DO |  |  | |Schedule| |FCR     |  |  | |Smartphone| |Microscopy| |
| +---+ +----+ +---+  |  | +--------+ |Monitor |  |  | +----------+ +----------+ |
|                     |  |            +--------+  |  |                           |
| +------+ +------+   |  | +--------+ +--------+  |  | +--------+ +------------+ |
| |Salin.| |Alerts|   |  | |Invent. | |Cost    |  |  | |EHP     | |Alert       | |
| +------+ +------+   |  | +--------+ |Analysis|  |  | |Spores  | |Network     | |
+---------------------+  +------------+--------+--+  +--------+--+------------+-+
            |                         |                           |
            | Monitoring              | Control                   | Alerts
            v                         v                           v
+====================================================================================+
|                         SMART DASHBOARD INTERFACE                                   |
|------------------------------------------------------------------------------------|
|   Real-time Analytics  |  Intelligent Alerts  |  Automated Control  |  Reporting  |
+====================================================================================+
                                         |
                          Automated Control & Monitoring
                                         |
                                         v
+====================================================================================+
|                    SHRIMP FARM PHYSICAL INFRASTRUCTURE                              |
|------------------------------------------------------------------------------------|
|   +--------+    +--------+    +--------+    +--------+    +-----------+            |
|   | Pond 1 |    | Pond 2 |    | Pond 3 |    | Pond N |    |   Feed    |            |
|   |        |    |        |    |        |    |        |    |   System  |            |
|   +--------+    +--------+    +--------+    +--------+    +-----------+            |
+====================================================================================+

+---------------------------+                    +---------------------------+
| EXPECTED OUTCOMES         |                    | TECHNOLOGY STACK          |
|---------------------------|                    |---------------------------|
| - Reduced Mortality       |                    | - IoT Sensors             |
| - Increased Growth        |                    | - AI/ML Algorithms        |
| - Lower Costs             |                    | - Mobile Apps             |
| - Higher Sustainability   |                    | - Cloud Computing         |
+---------------------------+                    +---------------------------+

===============================================================================
TABLE OF CONTENTS
===============================================================================

- System Overview
- Project Modules
- Core Components
  - Water Quality Monitoring
  - Automated Feed Management
  - Disease Detection & Prevention
  - Farm Management AI Assistant
- Multi-Agent AI System
- Machine Learning Models
- Project Structure
- Installation
- Running the Project
- API Reference
- Configuration
- Hardware Integration
- Troubleshooting
- Contributing
- License

===============================================================================
SYSTEM OVERVIEW
===============================================================================

Smart Shrimp Farming Solutions is an end-to-end intelligent aquaculture management platform that revolutionizes shrimp farming through the integration of cutting-edge technologies including Internet of Things (IoT), Artificial Intelligence (AI), Machine Learning (ML), and Cloud Computing.

Vision
To transform traditional shrimp farming into a data-driven, sustainable, and highly efficient operation that maximizes yield while minimizing environmental impact and operational costs.

Key Benefits
- Reduced Mortality: Decreased shrimp loss through early disease detection (up to 40% reduction)
- Increased Growth: Optimized feeding and water conditions (15-25% faster growth)
- Lower Costs: Efficient resource utilization (20-30% cost savings)
- Sustainability: Reduced environmental footprint (lower water/energy usage)
- Data-Driven Decisions: Real-time insights and predictions (24/7 monitoring)

Technology Stack
- Frontend: Next.js 14, React 18, TypeScript, TailwindCSS (Landing page & marketing site)
- Dashboard: React 18, TypeScript, Vite, Chart.js (Real-time monitoring interface)
- Backend API: Python 3.9+, Flask, Flask-CORS (RESTful prediction services)
- AI Engine: Scikit-Learn, XGBoost, AutoGluon (ML model training & inference)
- Database: MongoDB Atlas, CSV storage (Data persistence & analytics)
- IoT Layer: ESP32, Arduino, MQTT (Sensor data collection)
- Cloud: Cloud computing infrastructure (Scalable processing)

===============================================================================
PROJECT MODULES
===============================================================================

This repository contains multiple integrated modules that work together to provide a complete smart farming solution:

ai-shrimp-landing-main/
|
|-- web/                    # Next.js Landing Page & AI Assistant
|   |-- app/                # Next.js 14 App Router pages
|   |-- components/         # Reusable React components
|   |-- ai-assistant/       # Multi-Agent AI System (XGBoost + AutoGluon)
|
|-- backend-v2/             # Production ML API & Dashboard
|   |-- api.py              # Flask prediction server
|   |-- web/                # React TypeScript dashboard
|   |-- train_*.py          # Model training pipelines
|
|-- backend/                # Legacy backend system
|   |-- app.py              # Original Flask API
|   |-- dashboard/          # React JavaScript dashboard
|
|-- api/                    # Experimental APIs & notebooks
|   |-- notebook/           # Jupyter notebooks & research
|   |-- dashboard/          # Alternative dashboard implementations

Module Comparison
- web/: Marketing site + AI Assistant | Next.js, XGBoost, MongoDB | Production
- backend-v2/: Main API + Dashboard | Flask, React TS, Scikit-Learn | Production
- backend/: Legacy system | Flask, React JS | Deprecated
- api/: Research & experiments | Jupyter, Python | Development

===============================================================================
CORE COMPONENTS
===============================================================================

WATER QUALITY MONITORING
IoT Sensors Network - Real-time environmental monitoring for optimal shrimp health

Sensor Network Architecture

+------------------+     +------------------+     +------------------+
|   pH Sensor      |     | Temperature      |     | DO Sensor        |
|   (0-14 range)   |     | Sensor (C)       |     | (mg/L)           |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         +------------------------+------------------------+
                                  |
                                  v
                    +-------------+-------------+
                    |      ESP32 Controller     |
                    |  (Data Aggregation Node)  |
                    +-------------+-------------+
                                  |
         +------------------------+------------------------+
         |                        |                        |
+--------+---------+     +--------+---------+     +--------+---------+
| Salinity Sensor  |     | Turbidity Sensor |     | Ammonia/Nitrite  |
| (ppt)            |     | (NTU/cm)         |     | Sensors (mg/L)   |
+------------------+     +------------------+     +------------------+

Monitored Parameters (Optimal Range / Sampling Rate / Alert Threshold)
- pH: 7.5 - 8.5 / every 5 min / < 7.0 or > 9.0
- Temperature (C): 26 - 30 / every 1 min / < 24 or > 32
- Dissolved Oxygen (mg/L): 5.0 - 8.0 / every 2 min / < 4.0
- Salinity (ppt): 15 - 25 / every 10 min / < 10 or > 35
- Turbidity (cm visibility): 30 - 50 / every 15 min / < 20
- Ammonia NH3 (mg/L): < 0.1 / every 30 min / > 0.2
- Nitrite NO2 (mg/L): < 0.05 / every 30 min / > 0.1

Water Quality Index (WQI) Calculation
- Weighted WQI Formula:
  WQI = (w_DO * DO_score + w_pH * pH_score + w_Temp * Temp_score +
         w_NH3 * NH3_score + w_NO2 * NO2_score) / total_weights

- Weights (importance factors):
  DO: 0.35
  pH: 0.20
  Temperature: 0.20
  Ammonia: 0.15
  Nitrite: 0.10

WQI Classification & Actions
- 85 - 100: Excellent (Green) -> Routine monitoring only
- 70 - 84: Good (Light Green) -> Continue normal operations
- 50 - 69: Medium (Yellow) -> Increase monitoring, prepare interventions
- 25 - 49: Poor (Orange) -> Immediate corrective actions needed
- 0 - 24: Critical (Red) -> Emergency response, consider harvest

Dashboard Components
- Water Quality View (WaterQualityView.tsx): Real-time gauges, trend charts, alerts
- Forecasting View (ForecastingView.tsx): 6h/12h/24h predictions, confidence intervals
- WQ Simulator (WaterQualitySimulator.tsx): What-if analysis, scenario modeling

AUTOMATED FEED MANAGEMENT
AI-Optimized Feeding - Intelligent feed scheduling and distribution for maximum efficiency

Feed Management Architecture

+------------------------------------------------------------------+
|                    AUTOMATED FEED MANAGEMENT                      |
+------------------------------------------------------------------+
|                                                                   |
|  +----------------+  +----------------+  +------------------+     |
|  |   SCHEDULE     |  |  FCR MONITOR   |  |    INVENTORY     |     |
|  |----------------|  |----------------|  |------------------|     |
|  | - Time-based   |  | - Feed:Growth  |  | - Stock levels   |     |
|  | - Event-based  |  | - Efficiency   |  | - Reorder alerts |     |
|  | - Adaptive     |  | - Trends       |  | - Cost tracking  |     |
|  +----------------+  +----------------+  +------------------+     |
|                                                                   |
|  +----------------------------------------------------------+     |
|  |                     COST ANALYSIS                         |     |
|  |----------------------------------------------------------|     |
|  | - Feed cost per kg shrimp produced                        |     |
|  | - ROI calculations                                        |     |
|  | - Budget forecasting                                      |     |
|  +----------------------------------------------------------+     |
+------------------------------------------------------------------+

Feed Conversion Ratio (FCR) Monitoring
- FCR = Total Feed Consumed (kg) / Total Weight Gain (kg)

Target FCR by Growth Stage
- Nursery (PL1-PL15): 0.8 - 1.0
- Grow-out Early:     1.2 - 1.4
- Grow-out Mid:       1.4 - 1.6
- Grow-out Late:      1.6 - 1.8
- Pre-harvest:        1.8 - 2.0

Feeding Schedule Optimization (example adjustments)
- Water Temperature: -20% feed when < 24 C
- Dissolved Oxygen:  -30% feed when < 4.5 mg/L
- Molting Period:    -50% feed when mass molting detected
- Weather (Rain):    -25% feed when heavy rainfall
- Time of Day:       variable (peak feeding dawn/dusk)
- Moon Phase:        -10% feed when full moon

Feed Type by Growth Stage (Age DOC / Stage / Protein % / Size / Daily Rate)
- 0-15: Nursery / 42-45% / 0.3mm / 15-20% BW
- 16-45: Early Grow-out / 38-42% / 0.5mm / 8-12% BW
- 46-75: Mid Grow-out / 35-38% / 1.0mm / 5-8% BW
- 76-100: Late Grow-out / 32-35% / 1.5mm / 3-5% BW
- 100+: Pre-harvest / 30-32% / 2.0mm / 2-3% BW

Dashboard Components
- Feeding View (FeedingView.tsx): Daily consumption, FCR trends, pond distribution

DISEASE DETECTION & PREVENTION
AI Image Recognition - Early warning system for disease outbreaks using computer vision and sensor analytics

Disease Prevention Architecture

+------------------------------------------------------------------+
|                 EHP DETECTION & DISEASE PREVENTION                |
+------------------------------------------------------------------+
|                                                                   |
|  +--------------------+          +--------------------+           |
|  |    SMARTPHONE      |          |    MICROSCOPY      |           |
|  |--------------------|          |--------------------|           |
|  | - Field imaging    |          | - Lab analysis     |           |
|  | - Quick screening  |          | - Spore detection  |           |
|  | - GPS tagging      |          | - Quantification   |           |
|  +--------------------+          +--------------------+           |
|                                                                   |
|  +--------------------+          +--------------------+           |
|  |    EHP SPORES      |          |   ALERT NETWORK    |           |
|  |--------------------|          |--------------------|           |
|  | - AI classification|          | - SMS/Email alerts |           |
|  | - Severity scoring |          | - Dashboard notif. |           |
|  | - Treatment recs   |          | - Escalation rules |           |
|  +--------------------+          +--------------------+           |
+------------------------------------------------------------------+

Disease Risk Scoring Algorithm (example)
def calculate_disease_risk(sensor_data, history):
    risk_score = 0
    if sensor_data['DO'] < 5.0:
        risk_score += 30  # Low oxygen stress
    if sensor_data['Temperature'] < 26 or sensor_data['Temperature'] > 30:
        risk_score += 20  # Temperature stress
    if sensor_data['pH'] < 7.5 or sensor_data['pH'] > 8.5:
        risk_score += 15  # pH imbalance
    if sensor_data['Ammonia'] > 0.2:
        risk_score += 25  # Ammonia toxicity
    if sensor_data['Nitrite'] > 0.1:
        risk_score += 20  # Nitrite toxicity
    if history['recent_mortality'] > 5:
        risk_score += 15  # Elevated mortality
    if history['disease_history']:
        risk_score += 10  # Previous outbreaks
    return min(risk_score, 100)

Common Diseases Monitored
- EHP (Enterocytozoon hepatopenaei): slow growth, white feces; prevention: PCR screening, biosecurity
- WSSV (White Spot Syndrome): white spots, lethargy, rapid mortality; prevention: avoid temp fluctuations
- AHPND/EMS (Vibrio parahaemolyticus): pale hepatopancreas, empty gut; prevention: probiotics, good WQ
- Vibriosis (Vibrio species): dark gills, reduced feeding; prevention: maintain DO > 5 mg/L
- Black Gill (Environmental): darkened gills; prevention: water exchange

Alert System Levels (Score -> Response Time)
- Normal (0-29): Routine
- Watch (30-49): 24 hours
- Warning (50-69): 12 hours
- Alert (70-89): 6 hours
- Critical (90-100): Immediate

Dashboard Components
- Disease Detection View (DiseaseDetectionView.tsx): Risk assessment, alerts, recommendations

FARM MANAGEMENT AI ASSISTANT
Natural Language Interface - Conversational AI for farm management decisions

AI Assistant Architecture

+------------------------------------------------------------------+
|                   FARM MANAGEMENT AI ASSISTANT                    |
+------------------------------------------------------------------+
|                   Natural Language Interface                      |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+  +------------------+  +------------------+ |
|  |   SMS/WhatsApp   |  |  COST TRACKING   |  |  HARVEST TIMING  | |
|  |------------------|  |------------------|  |------------------| |
|  | - Text queries   |  | - Input costs    |  | - Growth curves  | |
|  | - Voice commands |  | - Revenue track  |  | - Market prices  | |
|  | - Alert replies  |  | - P&L reports    |  | - Optimal timing | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                   |
|  +------------------+  +------------------------------------------+ |
|  |  BENCHMARKING    |  |           AI DECISION ENGINE             | |
|  |------------------|  |------------------------------------------| |
|  | - Industry comps |  | Multi-Agent System:                      | |
|  | - Best practices |  | - Water Quality Agent                    | |
|  | - Performance KPI|  | - Feed Prediction Agent                  | |
|  +------------------+  | - Energy Optimization Agent              | |
|                        | - Labor Optimization Agent               | |
|                        | - Manager Agent (Coordinator)            | |
|                        +------------------------------------------+ |
+------------------------------------------------------------------+

Dashboard Components
- Farm Management AI (FarmManagementAI.tsx): Chat interface, recommendations

===============================================================================
MULTI-AGENT AI SYSTEM
===============================================================================

Located in: web/app/ai-assistant/shrimp-farm-ai-assistant/

Agent Architecture

                         +----------------------+
                         |    MANAGER AGENT     |
                         |   (Coordinator)      |
                         +----------+-----------+
                                    |
         +--------------------------+--------------------------+
         |              |              |              |        |
         v              v              v              v        v
+----------------+ +----------+ +-----------+ +--------+ +----------+
| WATER QUALITY  | |   FEED   | |  ENERGY   | | LABOR  | |FORECASTING|
|    AGENT       | |  AGENT   | |  AGENT    | | AGENT  | |  AGENT   |
+----------------+ +----------+ +-----------+ +--------+ +----------+
| - WQ Analysis  | | - FCR    | | - Power   | | - Task | | - Trends |
| - Predictions  | | - Sched. | | - Costs   | | - Crew | | - Weather|
| - Alerts       | | - Cost   | | - Optim.  | | - Plan | | - Growth |
+----------------+ +----------+ +-----------+ +--------+ +----------+

Agent Descriptions (Purpose / ML Models Used / Output)
- Manager Agent: coordinates all agents / rule-based orchestration / final recommendations
- Water Quality Agent: WQ analysis & trend prediction / Random Forest, MLP, SVR / WQ forecasts, alerts
- Feed Prediction Agent: optimize feeding schedules / XGBoost, Linear Regression / feed amounts, timing
- Energy Optimization Agent: minimize power consumption / optimization algorithms / power schedules
- Labor Optimization Agent: schedule workforce / scheduling algorithms / task assignments
- Forecasting Agent: time-series predictions / ARIMA, LSTM, XGBoost / 24h-7d forecasts

XGBoost Integration (example params)
xgb_params = {
    'objective': 'multi:softmax',
    'num_class': 4,
    'max_depth': 6,
    'learning_rate': 0.1,
    'n_estimators': 100,
    'eval_metric': 'mlogloss'
}

AutoGluon Integration (example)
from autogluon.tabular import TabularPredictor
predictor = TabularPredictor(
    label='wqi_class',
    problem_type='multiclass',
    eval_metric='accuracy'
).fit(train_data, time_limit=600, presets='best_quality')

===============================================================================
MACHINE LEARNING MODELS
===============================================================================

Model Overview
- Classification Models: Random Forest, MLP Classifier
- Time-Series Forecasting: ANN (MLPRegressor), SVR-RBF, MLR (Linear)
- Support Models: Isolation Forest, WQI Predictor

Classification Models (Water Quality Status)
- Random Forest: 400 trees, max_depth=20, min_samples_split=2 (WQI class prediction) ~95% accuracy
- MLP Classifier: 2 hidden layers (64, 32), ReLU activation (WQI class prediction) ~93% accuracy

Input Features (14 sensor parameters)
FEATURE_COLUMNS = [
    'Temperature', 'Turbidity', 'DO', 'BOD', 'CO2', 'pH', 'Alkalinity',
    'Hardness', 'Calcium', 'Ammonia', 'Nitrite', 'Phosphorus', 'H2S', 'Plankton'
]

Output Classes
- Good: 75 - 100 (Optimal conditions for shrimp)
- Medium: 50 - 74 (Acceptable with monitoring)
- Bad: 25 - 49 (Intervention required)
- Very Bad: 0 - 24 (Critical conditions)

Time-Series Regression Models (Forecasting)
- ANN (MLPRegressor): 2 layers (128, 64), ReLU, Adam optimizer | horizons: 6h, 12h, 24h
- SVR-RBF: RBF kernel, C=100, gamma=scale | horizons: 6h, 12h, 24h
- MLR (Linear Regression): OLS baseline | horizons: 6h, 12h, 24h

Predicted Parameters (example)
- Dissolved Oxygen (mg/L): night safety, aerator control
- pH: water treatment planning
- Temperature (C): environmental forecasting

Feature Engineering (example)
- LAG_STEPS = 6
- Generated lag features: DO_lag_1..6, pH_lag_1..6, Temperature_lag_1..6

Anomaly Detection (example)
IsolationForest(n_estimators=100, contamination=0.05, random_state=42)

Model Performance Metrics (example)
- Classification Accuracy: RF 95.2%, MLP 93.1%
- Classification F1 (Macro): RF 0.948, MLP 0.921
- Time-Series R2: 6h (0.92/0.89/0.82), 12h (0.87/0.84/0.76), 24h (0.81/0.78/0.69)

===============================================================================
PROJECT STRUCTURE (REFERENCE)
===============================================================================

See the original README.md for the full expanded tree and descriptions.

===============================================================================
INSTALLATION (SUMMARY)
===============================================================================

Prerequisites
- Python 3.9+ (recommended 3.11+)
- Node.js 18.0+ (recommended 20.0+)
- npm 9.0+ (recommended 10.0+)
- RAM 4 GB+ (recommended 8 GB+)

Example setup (backend-v2)
- git clone <repo>
- cd ai-shrimp-landing-main/backend-v2
- python -m venv venv
- Activate venv:
  - Windows: venv\Scripts\activate
  - Linux/Mac: source venv/bin/activate
- pip install -r requirements.txt

Frontend dashboard
- cd backend-v2/web
- npm install

===============================================================================
RUNNING THE PROJECT (SUMMARY)
===============================================================================

Quick start (example)
- Terminal 1:
  - cd backend-v2
  - python train_shrimp_water_quality_models.py
  - python api.py
- Terminal 2:
  - cd backend-v2/web
  - npm run dev

===============================================================================
API REFERENCE (SUMMARY)
===============================================================================

Base URL (example): http://localhost:5001

Common endpoints (example)
- GET  /api/health
- POST /api/predict
- POST /api/predict/batch
- POST /api/sensor-data
- GET  /api/simulate?ponds=4
- POST /api/trigger

===============================================================================
CONFIGURATION (SUMMARY)
===============================================================================

Environment variables (examples)
- FLASK_PORT (default 5001)
- FLASK_DEBUG (default False)
- MODEL_DIR (default exported_models/)
- DATA_DIR (default Data set/)
- CORS_ORIGINS (default *)
- LOG_LEVEL (default INFO)

===============================================================================
TROUBLESHOOTING (SUMMARY)
===============================================================================

- Models not loading: ensure exported models exist; retrain if missing
- CORS errors: ensure Flask-CORS is installed and enabled
- Port already in use: find process using the port and terminate it
- Training takes too long: reduce dataset size, simplify model configs, increase RAM
- Dashboard not updating: check API connection, verify API running, check CORS

===============================================================================
CONTRIBUTING / LICENSE / SUPPORT
===============================================================================

See the original README.md for the full details.


