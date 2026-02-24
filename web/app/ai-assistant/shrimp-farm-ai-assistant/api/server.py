from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import time
import random

import numpy as np

from agents.water_quality_agent import WaterQualityAgent
from agents.feed_prediction_agent import FeedPredictionAgent
from agents.energy_optimization_agent import EnergyOptimizationAgent
from agents.labor_optimization_agent import LaborOptimizationAgent
from agents.manager_agent import ManagerAgent
from agents.decision_recommendation_agent import DecisionRecommendationAgent
from agents.forecasting_agent import ForecastingAgent
from config import FARM_CONFIG

app = FastAPI(title="Shrimp Farm Management API", version="0.1.0")

# In-memory snapshot cache so dashboard reloads are stable.
# Keyed by (ponds, seed). Values are already-serialized JSON dictionaries.
_DASHBOARD_CACHE: Dict[Tuple[int, Optional[int]], Dict[str, Any]] = {}
_DASHBOARD_CACHE_TS: Dict[Tuple[int, Optional[int]], float] = {}
_CACHE_TTL_S_DEFAULT = 300  # 5 minutes

# Allow local dev origins (Vite default: http://localhost:5173)
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


@app.get("/api/health")
def health() -> Dict[str, Any]:
	return {"status": "ok", "time": datetime.utcnow().isoformat()}


def _load_saved_snapshots_with_time(limit: int, start_time: Optional[datetime] = None) -> List[Dict[str, Any]]:
	"""
	Load saved farm snapshots from MongoDB.
	
	This function now only uses MongoDB - JSON file fallback has been removed.
	Data must be saved to MongoDB for historical snapshots to work.
	"""
	try:
		from database.repository import DataRepository
		from config import USE_MONGODB
		
		if not USE_MONGODB:
			print("[WARN] MongoDB is not enabled. Enable USE_MONGODB in config to use historical data.")
			return []
		
		repository = DataRepository()
		if not repository.is_available:
			print("[WARN] MongoDB repository is not available. Check your MongoDB connection.")
			return []
		
		snapshots = repository.get_historical_snapshots(limit=limit, start_time=start_time)
		if snapshots:
			print(f"[DB] Loaded {len(snapshots)} historical snapshots from MongoDB")
			# Add source identifier for consistency
			return [{"source": "mongodb", **snapshot} for snapshot in snapshots]
		else:
			print("[INFO] No historical snapshots found in MongoDB")
			return []
			
	except Exception as e:
		print(f"[ERROR] Could not load from MongoDB: {e}")
		import traceback
		traceback.print_exc()
		return []

def _load_saved_snapshots(limit: int) -> List[Dict[str, Any]]:
	"""
	Load saved farm snapshots (backwards compatibility wrapper).
	"""
	return _load_saved_snapshots_with_time(limit=limit, start_time=None)


@app.get("/api/history")
def get_history(limit: int = 7, days: Optional[int] = None) -> Dict[str, Any]:
	"""
	Return historical snapshots from MongoDB for dashboard charting.
	
	Data must be saved to MongoDB for this endpoint to work. JSON file fallback has been removed.
	
	Args:
		limit: Maximum number of snapshots to return (default: 7 for one week of daily snapshots)
		days: Optional number of days to look back (uses this to calculate start_time if provided)
	"""
	from datetime import timedelta
	
	# If days is provided, calculate start_time
	start_time = None
	if days is not None:
		days = max(1, min(int(days), 90))  # Limit to 90 days
		start_time = datetime.utcnow() - timedelta(days=days)
		limit = days  # Set limit to match days for daily snapshots
	
	limit = max(0, min(int(limit), 500))
	
	# Load from MongoDB only
	items = _load_saved_snapshots_with_time(limit=limit, start_time=start_time)
	return {"count": len(items), "items": items}


@app.get("/api/forecasts")
def get_forecasts(
	ponds: int = FARM_CONFIG.get("pond_count", 4),
	forecast_days: int = 90,
	fresh: bool = False,
	seed: Optional[int] = None,
) -> Dict[str, Any]:
	"""
	Generate AI-powered forecasts for shrimp farm operations.
	
	Query params:
	- ponds: Number of ponds to forecast for
	- forecast_days: Number of days to forecast (default: 90)
	- fresh: If true, bypass cache and generate new forecasts
	- seed: Optional RNG seed for reproducible data
	"""
	# Optional deterministic seeding
	if seed is not None:
		random.seed(int(seed))
		np.random.seed(int(seed))
	
	# Generate current data
	water_quality_agent = WaterQualityAgent()
	feed_agent = FeedPredictionAgent()
	energy_agent = EnergyOptimizationAgent()
	labor_agent = LaborOptimizationAgent()
	
	water_quality_data = []
	feed_data = []
	energy_data = []
	labor_data = []
	
	for pond_id in range(1, ponds + 1):
		wq = water_quality_agent.get_water_quality_data(pond_id)
		water_quality_data.append(wq)
		
		feed = feed_agent.get_feed_data(pond_id, wq)
		feed_data.append(feed)
		
		energy = energy_agent.get_energy_data(pond_id, wq)
		energy_data.append(energy)
		
		labor = labor_agent.get_labor_data(pond_id, wq, energy)
		labor_data.append(labor)
	
	# Load historical data (from MongoDB or JSON files)
	historical_snapshots = _load_saved_snapshots(limit=30)
	
	# Generate forecasts using AI agent
	forecasting_agent = ForecastingAgent()
	forecasts = forecasting_agent.generate_forecasts(
		water_quality_data=water_quality_data,
		feed_data=feed_data,
		energy_data=energy_data,
		labor_data=labor_data,
		historical_snapshots=historical_snapshots,
		forecast_days=forecast_days
	)
	
	return {
		"forecasts": forecasts,
		"timestamp": datetime.utcnow().isoformat(),
		"forecast_days": forecast_days
	}


@app.get("/api/dashboard")
def get_dashboard(
	ponds: int = FARM_CONFIG.get("pond_count", 4),
	fresh: bool = False,
	seed: Optional[int] = None,
	cache_ttl_s: int = _CACHE_TTL_S_DEFAULT,
) -> Dict[str, Any]:
	"""
	Generate dashboard data using simulation (no API key needed).

	By default this endpoint returns a cached snapshot so the React dashboard is
	stable across browser reloads.

	Query params:
	- fresh: if true, bypass cache and generate a new snapshot
	- seed: optional RNG seed for reproducible simulation (affects cache key)
	- cache_ttl_s: snapshot TTL in seconds (0 disables caching)
	"""
	cache_key = (int(ponds), int(seed) if seed is not None else None)
	now = time.time()

	if not fresh and cache_ttl_s > 0:
		ts = _DASHBOARD_CACHE_TS.get(cache_key)
		if ts is not None and (now - ts) <= cache_ttl_s:
			cached = _DASHBOARD_CACHE.get(cache_key)
			if cached is not None:
				return cached

	# Optional deterministic seeding for repeatable simulations.
	if seed is not None:
		random.seed(int(seed))
		np.random.seed(int(seed))

	water_quality_agent = WaterQualityAgent()
	feed_agent = FeedPredictionAgent()
	energy_agent = EnergyOptimizationAgent()
	labor_agent = LaborOptimizationAgent()
	manager_agent = ManagerAgent()

	water_quality_data = []
	feed_data = []
	energy_data = []
	labor_data = []

	for pond_id in range(1, ponds + 1):
		wq = water_quality_agent.get_water_quality_data(pond_id)
		water_quality_data.append(wq)

		feed = feed_agent.get_feed_data(pond_id, wq)
		feed_data.append(feed)

		energy = energy_agent.get_energy_data(pond_id, wq)
		energy_data.append(energy)

		labor = labor_agent.get_labor_data(pond_id, wq, energy)
		labor_data.append(labor)

	dashboard = manager_agent.create_dashboard(water_quality_data, feed_data, energy_data, labor_data)

	# Include decision-agent outputs (e.g., XGBoost) explicitly for the UI.
	decision_bundle_dump: Optional[Dict[str, Any]] = None
	decision_agent_type = getattr(manager_agent, "decision_agent_type", None)
	decision_recommendations: List[Dict[str, Any]] = []
	try:
		if getattr(manager_agent, "decision_agent", None) and getattr(manager_agent.decision_agent, "is_trained", True):
			decision_bundle = manager_agent.decision_agent.make_multi_pond_decisions(
				water_quality_data, feed_data, energy_data, labor_data
			)
			decision_bundle_dump = decision_bundle.model_dump(mode="json")

			# Human-friendly recommendations derived from decision outputs.
			# Prefer LLM-generated action-plan text (falls back only if LLM unavailable).
			reco_agent = DecisionRecommendationAgent(enable_llm=True)
			decision_recommendations = [
				{
					"pond_id": r.pond_id,
					"priority_rank": r.priority_rank,
					"urgency_score": r.urgency_score,
					"confidence": r.confidence,
					"primary_action": r.primary_action.value,
					"text": r.text,
				}
				for r in reco_agent.generate(
					decisions=decision_bundle,
					water_quality=water_quality_data,
					feed=feed_data,
					energy=energy_data,
					labor=labor_data,
					max_items=10,
				)
			]
	except Exception:
		decision_bundle_dump = None

	# Pydantic v2: use model_dump to serialize
	payload = {
		"dashboard": dashboard.model_dump(mode="json"),
		"water_quality": [w.model_dump(mode="json") for w in water_quality_data],
		"feed": [f.model_dump(mode="json") for f in feed_data],
		"energy": [e.model_dump(mode="json") for e in energy_data],
		"labor": [l.model_dump(mode="json") for l in labor_data],
		"decision_agent_type": decision_agent_type,
		"decisions": decision_bundle_dump,
		"decision_recommendations": decision_recommendations,
	}

	if cache_ttl_s > 0:
		_DASHBOARD_CACHE[cache_key] = payload
		_DASHBOARD_CACHE_TS[cache_key] = now

	return payload


@app.get("/api/feeding-optimization")
def get_feeding_optimization(
	ponds: int = FARM_CONFIG.get("pond_count", 4),
	seed: Optional[int] = None,
) -> Dict[str, Any]:
	"""
	Return an optimized per-pond feeding plan.

	Calculates recommended daily feed amounts, feeding windows, and feed
	types based on current biomass estimates and live water quality data.

	Query params:
	- ponds: Number of ponds to optimize for
	- seed: Optional RNG seed (passed through to data generators for reproducibility)
	"""
	if seed is not None:
		random.seed(int(seed))
		np.random.seed(int(seed))

	water_quality_agent = WaterQualityAgent()
	feed_agent = FeedPredictionAgent()

	water_quality_data = []
	feed_data = []

	for pond_id in range(1, ponds + 1):
		wq = water_quality_agent.get_water_quality_data(pond_id)
		water_quality_data.append(wq)

		feed = feed_agent.get_feed_data(pond_id, wq)
		feed_data.append(feed)

	from agents.feeding_optimizer import FeedingOptimizerAgent
	optimizer = FeedingOptimizerAgent()
	result = optimizer.optimize_all(feed_data, water_quality_data)

	return result.model_dump(mode="json")


