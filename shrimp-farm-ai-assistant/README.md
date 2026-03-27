# Shrimp Farm Management System

An AI-powered multi-agent system for intelligent shrimp farm management using CrewAI. This system coordinates multiple specialized AI agents to monitor water quality, predict feed needs, optimize energy usage, and manage labor efficiently.

## AI Agents

The system consists of five specialized AI agents working in parallel:

1. **Water Quality Monitoring Agent** - Monitors pH, temperature, dissolved oxygen, salinity, and other water parameters
2. **Feed Prediction Agent** - Predicts optimal feed requirements and timing based on shrimp growth and water conditions
3. **Energy Optimization Agent** - Optimizes energy consumption across aerators, pumps, and heating systems
4. **Labor Optimization Agent** - Manages task scheduling and worker allocation for maximum efficiency
5. **Manager Agent** - Coordinates all agents and synthesizes insights into actionable recommendations

## Features

- **Real-time Monitoring**: Continuous monitoring of all farm operations
- **Predictive Analytics**: AI-powered predictions for feed, energy, and labor needs
- **Automated Alerts**: Critical issue detection and immediate notifications
- **Interactive Dashboard**: Streamlit-based visualization of farm operations
- **Strategic Insights**: AI-generated recommendations for optimization
- **Multi-Pond Management**: Support for multiple shrimp ponds

## Requirements

- Python 3.8+
- OpenAI API key
- Required packages (see requirements.txt)

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd management-ai-assitant
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

4. **Set up OpenAI API key:**
   ```bash
   export OPENAI_API_KEY="your_openai_api_key_here"
   ```

## Usage

### 1. Run the Main Orchestrator
```bash
python main.py
```

This will:
- Initialize all AI agents
- Run a monitoring cycle
- Display farm status
- Optionally start continuous monitoring

### 2. Launch the Dashboard
```bash
streamlit run dashboard.py
```

This will open an interactive web dashboard showing:
- Real-time farm metrics
- Water quality charts
- Energy usage analysis
- Labor efficiency reports
- Strategic recommendations

### 2b. Launch the React Web Dashboard (Vite)

There is also a React-based dashboard in `web/` (dev server on `http://localhost:5173`).

**Terminal 1 (API backend):**

```powershell
.\venv\Scripts\python.exe -m uvicorn api.server:app --reload --port 8000
```

**Terminal 2 (React dev server):**

```powershell
cd .\web
npm install
npm run dev
```

### 3. Run Individual Agents (Optional)
```python
from agents.water_quality_agent import WaterQualityAgent

agent = WaterQualityAgent()
data = agent.simulate_water_quality_data(pond_id=1)
print(data)
```

## Dashboard Features

The Streamlit dashboard provides:

- **Farm Overview**: Key performance metrics and health scores
- **Water Quality Monitoring**: Real-time water parameter tracking
- **Feed Management**: Feed scheduling and efficiency analysis
- **Energy Management**: Energy usage optimization and cost analysis
- **Labor Management**: Task scheduling and worker efficiency
- **Alerts & Insights**: Critical notifications and AI recommendations

## Configuration

Edit `config.py` to customize:

- **Farm Settings**: Number of ponds, shrimp species, target parameters
- **Agent Settings**: Monitoring intervals, optimization parameters
- **OpenAI Settings**: Model selection, temperature, API configuration

## Data Models

The system uses structured data models for:

- **WaterQualityData**: pH, temperature, dissolved oxygen, salinity, etc.
- **FeedData**: Shrimp count, weight, feed amounts, feeding schedules
- **EnergyData**: Aerator, pump, heater usage and costs
- **LaborData**: Task completion, time tracking, worker allocation
- **FarmInsight**: Strategic insights and recommendations

## Agent Coordination

The Manager Agent coordinates all specialized agents:

1. **Data Collection**: Each agent monitors their domain
2. **Analysis**: Agents analyze their data and generate insights
3. **Synthesis**: Manager agent combines all insights
4. **Recommendations**: Strategic recommendations are generated
5. **Dashboard Update**: Real-time dashboard reflects current status

## Monitoring Cycle

The system runs continuous monitoring cycles:

1. **Water Quality Check** (every 30 minutes)
2. **Feed Prediction** (every 24 hours)
3. **Energy Optimization** (every 60 minutes)
4. **Labor Optimization** (every 120 minutes)
5. **Manager Synthesis** (every cycle)

## Logging

The system provides comprehensive logging:

- **Operations Log**: `farm_operations.log`
- **Agent Activities**: Detailed agent execution logs
- **Error Handling**: Robust error handling and recovery
- **Data Persistence**: Automatic data saving and backup

## Alerts & Notifications

The system generates alerts for:

- **Critical Water Quality**: pH, oxygen, ammonia levels
- **Energy Inefficiency**: High energy usage or costs
- **Labor Issues**: Low efficiency or task delays
- **Equipment Problems**: Maintenance needs or failures

## Future Enhancements

- **IoT Integration**: Real sensor data integration
- **Machine Learning**: Advanced predictive models
- **Mobile App**: Mobile dashboard and notifications
- **API Integration**: Third-party system integration
- **Advanced Analytics**: Historical trend analysis

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

## Support

For support and questions, please open an issue in the repository.

---

**Built with CrewAI and Streamlit**
