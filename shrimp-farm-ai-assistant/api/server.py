from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel
from datetime import datetime, timedelta
from collections import defaultdict
import time
import random

import numpy as np

from config import (
	PARALLEL_DATA_COLLECTION,
	DASHBOARD_CACHE_TTL_S,
	DECISION_RECO_ENABLE_LLM,
	USE_MONGODB,
)
from agents.water_quality_agent import WaterQualityAgent
from agents.feed_prediction_agent import FeedPredictionAgent
from agents.energy_optimization_agent import EnergyOptimizationAgent
from agents.labor_optimization_agent import LaborOptimizationAgent
from agents.manager_agent import ManagerAgent
from agents.decision_recommendation_agent import DecisionRecommendationAgent
from agents.forecasting_agent import ForecastingAgent
from agents.benchmarking_agent import BenchmarkingAgent
from config import FARM_CONFIG

app = FastAPI(title="Shrimp Farm Management API", version="0.1.0")

# In-memory snapshot cache so dashboard reloads are stable.
# Keyed by (ponds, seed). Values are already-serialized JSON dictionaries.
_DASHBOARD_CACHE: Dict[Tuple[int, Optional[int]], Dict[str, Any]] = {}
_DASHBOARD_CACHE_TS: Dict[Tuple[int, Optional[int]], float] = {}
_CACHE_TTL_S_DEFAULT = DASHBOARD_CACHE_TTL_S

# Reused agents for dashboard (lazy init to avoid creating per request).
_dashboard_agents: Optional[Tuple[Any, ...]] = None

_harvest_ml_predictor: Optional[Any] = None


def _get_harvest_ml_predictor():
	global _harvest_ml_predictor
	if _harvest_ml_predictor is None:
		from models.harvest_ml_predictor import HarvestMLPredictor

		_harvest_ml_predictor = HarvestMLPredictor()
	return _harvest_ml_predictor


def _get_dashboard_agents():
	"""Return shared dashboard agents (water_quality, feed, energy, labor, manager)."""
	global _dashboard_agents
	if _dashboard_agents is None:
		_dashboard_agents = (
			WaterQualityAgent(),
			FeedPredictionAgent(),
			EnergyOptimizationAgent(),
			LaborOptimizationAgent(),
			ManagerAgent(),
		)
	else:
		# After code reload, cached tuple can hold old ManagerAgent instances whose
		# class predates new methods (e.g. _generate_alerts) → AttributeError on dashboard.
		_mgr = _dashboard_agents[-1]
		if not hasattr(_mgr, "_generate_alerts"):
			_dashboard_agents = None
			return _get_dashboard_agents()
	return _dashboard_agents


def _dashboard_fetch_feed(feed_agent: Any, water_quality_data: List) -> List:
	"""Sync: fetch feed data for all ponds (for ThreadPoolExecutor)."""
	return [feed_agent.get_feed_data(i + 1, wq) for i, wq in enumerate(water_quality_data)]


def _dashboard_fetch_energy(energy_agent: Any, water_quality_data: List) -> List:
	"""Sync: fetch energy data for all ponds (for ThreadPoolExecutor)."""
	return [energy_agent.get_energy_data(i + 1, wq) for i, wq in enumerate(water_quality_data)]

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


@app.get("/api/history/hourly")
def get_hourly_history(hours: int = 24) -> Dict[str, Any]:
	"""
	Return historical hourly snapshots from MongoDB for 24h dashboard charting.
	"""
	try:
		from database.repository import DataRepository
		from config import USE_MONGODB
		
		if not USE_MONGODB:
			return {"count": 0, "items": []}
			
		repo = DataRepository()
		if not repo.is_available:
			return {"count": 0, "items": []}
			
		items = repo.get_hourly_snapshots(hours=hours)
		return {"count": len(items), "items": items}
	except Exception as e:
		print(f"[ERROR] Could not load hourly history: {e}")
		return {"count": 0, "items": []}


@app.get("/api/charts/analytics")
def get_charts_analytics(
	ponds: int = FARM_CONFIG.get("pond_count", 4),
	hours: int = 24,
	feed_days: int = 7,
) -> Dict[str, Any]:
	"""
	Analytics & Trends chart payloads from MongoDB readings only (no AI agents).

	Requires USE_MONGODB=true. Water (DO/ammonia) uses water_quality_readings + water_quality;
	feed uses feed_readings; energy uses energy_readings. Each series_sources.* flag is
	independent (e.g. feed+energy can be true while water is false if no rows in the window).
	Missing buckets yield nulls; the UI may fall back to simulated series where a flag is false.

	Query params:
	- ponds: number of ponds (ids 1..ponds)
	- hours: lookback for water + energy hourly series (default 24)
	- feed_days: calendar days for daily feed totals (default 7)
	"""
	try:
		from config import USE_MONGODB
		from database.repository import DataRepository

		ponds = max(1, min(int(ponds), 24))
		hours = max(1, min(int(hours), 168))
		feed_days = max(1, min(int(feed_days), 31))

		if not USE_MONGODB:
			return {
				"detail": "MongoDB disabled",
				"charts": _empty_analytics_charts_payload(list(range(1, ponds + 1)), hours, feed_days),
			}

		repo = DataRepository()
		if not repo.is_available:
			return {
				"detail": "MongoDB unavailable",
				"charts": _empty_analytics_charts_payload(list(range(1, ponds + 1)), hours, feed_days),
			}

		pond_ids = list(range(1, ponds + 1))
		charts = repo.get_analytics_charts_from_readings(
			pond_ids=pond_ids,
			hours=hours,
			feed_days=feed_days,
		)
		return {"charts": charts, "timestamp": datetime.utcnow().isoformat()}
	except Exception as e:
		import traceback
		traceback.print_exc()
		return {
			"detail": str(e),
			"charts": _empty_analytics_charts_payload(list(range(1, max(1, min(int(ponds), 24)) + 1)), 24, 7),
		}


def _empty_analytics_charts_payload(pond_ids: List[int], hours: int, feed_days: int) -> Dict[str, Any]:
	"""Shape-compatible empty charts (source=none) for errors or Mongo off."""
	_ = hours
	weekday_short = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
	hours24 = [f"{h:02d}:00" for h in range(24)]
	return {
		"source": "none",
		"has_any_data": False,
		"series_sources": {
			"dissolved_oxygen": False,
			"ammonia": False,
			"feed": False,
			"energy": False,
		},
		"hours24": hours24,
		"pond_ids": pond_ids,
		"dissolved_oxygen_by_pond": {str(p): [None] * 24 for p in pond_ids},
		"ammonia_by_pond": {str(p): [None] * 24 for p in pond_ids},
		"feed_7d": {
			"labels": [weekday_short[i % 7] for i in range(feed_days)],
			"values_kg": [0.0] * feed_days,
		},
		"energy_kwh_24h": [0.0] * 24,
	}


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
		
		labor = labor_agent.get_or_generate_labor_data(pond_id, wq, energy)
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


@app.get("/api/harvest-ml")
def get_harvest_ml(
	ponds: int = FARM_CONFIG.get("pond_count", 4),
	target_weight_g: float = 22.0,
	horizon_days: int = 30,
	seed: Optional[int] = None,
) -> Dict[str, Any]:
	"""
	XGBoost harvest inference: days to target weight, expected harvest biomass, rolled growth curve,
	early-harvest risk. Requires trained artifacts under models/harvest_ml/ (see train_harvest_ml_models.py).

	Uses **MongoDB readings only** — latest water quality + latest feed per pond from the repository.
	Does **not** fall back to simulated WaterQualityAgent / FeedPredictionAgent data.
	"""
	ts = datetime.utcnow().isoformat()

	if seed is not None:
		random.seed(int(seed))
		np.random.seed(int(seed))

	predictor = _get_harvest_ml_predictor()
	if not predictor.available:
		return {
			"source": "unavailable",
			"input_source": "n/a",
			"detail": getattr(predictor, "_load_error", None) or "models not loaded",
			"ponds": [],
			"timestamp": ts,
			"target_weight_g": target_weight_g,
			"horizon_days": horizon_days,
		}

	pond_ids = list(range(1, max(1, int(ponds)) + 1))
	extras: Dict[int, Dict[str, float]] = {}
	repo = None
	if USE_MONGODB:
		try:
			from database.repository import DataRepository

			repo = DataRepository()
			if repo.is_available:
				extras = repo.get_harvest_ml_feed_extras(pond_ids)
		except Exception as e:
			print(f"[harvest-ml] Mongo: {e}")
			repo = None

	mongo_ok = repo is not None and getattr(repo, "is_available", False)
	pond_results: List[Dict[str, Any]] = []

	if not USE_MONGODB or not mongo_ok:
		block_detail = (
			"Harvest ML requires USE_MONGODB=true and a working MongoDB connection (no simulated agent inputs)."
			if not USE_MONGODB
			else "Harvest ML requires MongoDB (repository unavailable or not connected); no simulated agent inputs."
		)
		for pond_id in pond_ids:
			pond_results.append(
				{
					"pond_id": pond_id,
					"available": False,
					"detail": block_detail,
				}
			)
		return {
			"source": "xgboost",
			"input_source": "n/a",
			"detail": block_detail,
			"ponds": pond_results,
			"timestamp": ts,
			"target_weight_g": target_weight_g,
			"horizon_days": horizon_days,
		}

	any_available = False
	for pond_id in pond_ids:
		db_wq = repo.get_latest_water_quality(pond_id)
		db_feed = repo.get_latest_feed_data(pond_id)
		if db_wq is None or db_feed is None:
			missing: List[str] = []
			if db_wq is None:
				missing.append("water quality")
			if db_feed is None:
				missing.append("feed")
			pond_results.append(
				{
					"pond_id": pond_id,
					"available": False,
					"detail": f"No latest {' and '.join(missing)} reading in MongoDB for this pond",
				}
			)
			continue

		ex = extras.get(pond_id, {})
		kw: Dict[str, Any] = {
			"target_weight_g": target_weight_g,
			"horizon_days": horizon_days,
		}
		if ex:
			kw["weight_lag_7d"] = ex.get("weight_lag_7d")
			kw["weight_lag_14d"] = ex.get("weight_lag_14d")
			kw["rolling_feed_kg_7d"] = ex.get("rolling_feed_kg_7d")
			kw["days_normalized"] = ex.get("days_normalized")
		pond_results.append(predictor.predict_pond(db_feed, db_wq, **kw))
		any_available = True

	top_detail: Optional[str] = None
	if not any_available:
		top_detail = "No ponds had both latest water quality and feed readings in MongoDB."

	return {
		"source": "xgboost",
		"input_source": "mongodb" if any_available else "n/a",
		**({"detail": top_detail} if top_detail else {}),
		"ponds": pond_results,
		"timestamp": ts,
		"target_weight_g": target_weight_g,
		"horizon_days": horizon_days,
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

	Default cache TTL comes from env DASHBOARD_CACHE_TTL_S (0 = no cache). Use cache_ttl_s on the
	request to override. Set DECISION_RECO_ENABLE_LLM=false to skip OpenAI on recommendation text.

	Query params:
	- fresh: if true, bypass cache and generate a new snapshot
	- seed: optional RNG seed for reproducible simulation (affects cache key)
	- cache_ttl_s: snapshot TTL in seconds (0 disables caching)

	When USE_READINGS_ONLY=true (config/env), water/feed/energy/labor for each pond
	must exist in MongoDB *_readings collections or the request fails with 500 detail.
	"""
	# Prevent browser from caching so Refresh always gets latest KPIs
	_dashboard_headers = {"Cache-Control": "no-store"}

	cache_key = (int(ponds), int(seed) if seed is not None else None)
	now = time.time()

	if not fresh and cache_ttl_s > 0:
		ts = _DASHBOARD_CACHE_TS.get(cache_key)
		if ts is not None and (now - ts) <= cache_ttl_s:
			cached = _DASHBOARD_CACHE.get(cache_key)
			if cached is not None:
				return JSONResponse(content=cached, headers=_dashboard_headers)

	try:
		# Optional deterministic seeding for repeatable simulations.
		if seed is not None:
			random.seed(int(seed))
			np.random.seed(int(seed))

		water_quality_agent, feed_agent, energy_agent, labor_agent, manager_agent = _get_dashboard_agents()

		if PARALLEL_DATA_COLLECTION and ponds >= 1:
			max_workers = min(8, max(2, ponds * 2))
			with ThreadPoolExecutor(max_workers=max_workers) as executor:
				# Phase 1: water quality for all ponds in parallel
				water_quality_data = list(
					executor.map(
						lambda pid: water_quality_agent.get_water_quality_data(pid),
						range(1, ponds + 1),
					)
				)
				# Phase 2: feed and energy in parallel (each over all ponds)
				feed_fut = executor.submit(_dashboard_fetch_feed, feed_agent, water_quality_data)
				energy_fut = executor.submit(_dashboard_fetch_energy, energy_agent, water_quality_data)
				feed_data = feed_fut.result()
				energy_data = energy_fut.result()
				# Phase 3: labor for all ponds in parallel
				labor_data = list(
					executor.map(
						lambda i: labor_agent.get_or_generate_labor_data(
							i + 1, water_quality_data[i], energy_data[i]
						),
						range(ponds),
					)
				)
			labor_optimization = labor_agent.optimize_all_labor(
				water_quality_data, energy_data, labor_data
			)
		else:
			water_quality_data = []
			feed_data = []
			energy_data = []
			labor_data = []
			for pond_id in range(1, ponds + 1):
				wq = water_quality_agent.get_water_quality_data(pond_id)
				water_quality_data.append(wq)
				feed_data.append(feed_agent.get_feed_data(pond_id, wq))
				energy_data.append(energy_agent.get_energy_data(pond_id, wq))
				labor_data.append(
					labor_agent.get_or_generate_labor_data(
						pond_id, wq, energy_data[-1]
					)
				)
			labor_optimization = labor_agent.optimize_all_labor(
				water_quality_data, energy_data, labor_data
			)

		# Persist only energy readings to MongoDB (includes cost). Do not save feed/water/labor here.
		try:
			from config import USE_MONGODB
			if USE_MONGODB:
				from database.repository import DataRepository
				_repo = DataRepository()
				if _repo.is_available:
					for _e in energy_data:
						_repo.save_energy_data(_e)
		except Exception as _save_ex:
			print(f"[WARN] Could not save energy data to DB: {_save_ex}")

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
				reco_agent = DecisionRecommendationAgent(enable_llm=DECISION_RECO_ENABLE_LLM)
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
			"labor_optimization": labor_optimization,
			"decision_agent_type": decision_agent_type,
			"decisions": decision_bundle_dump,
			"decision_recommendations": decision_recommendations,
		}

		if cache_ttl_s > 0:
			_DASHBOARD_CACHE[cache_key] = payload
			_DASHBOARD_CACHE_TS[cache_key] = now

		return JSONResponse(content=payload, headers=_dashboard_headers)
	except AttributeError as e:
		# Stale cached agents after ManagerAgent API change — drop cache and retry once.
		global _dashboard_agents
		if "_generate_alerts" in str(e) and _dashboard_agents is not None:
			_dashboard_agents = None
			try:
				return get_dashboard(ponds=ponds, fresh=fresh, seed=seed, cache_ttl_s=cache_ttl_s)
			except Exception:
				pass
		import traceback
		err_msg = f"{type(e).__name__}: {e}"
		traceback.print_exc()
		return JSONResponse(
			content={"detail": err_msg},
			status_code=500,
			headers=_dashboard_headers,
		)
	except Exception as e:
		import traceback
		err_msg = f"{type(e).__name__}: {e}"
		traceback.print_exc()
		return JSONResponse(
			content={"detail": err_msg},
			status_code=500,
			headers=_dashboard_headers,
		)


class FeedingOptimizationRequest(BaseModel):
	"""Request body: use real dashboard data for recommendations."""
	water_quality: List[Dict[str, Any]] = []
	feed: List[Dict[str, Any]] = []


def _parse_dashboard_data_for_optimization(
	water_quality: List[Dict[str, Any]],
	feed: List[Dict[str, Any]],
) -> Tuple[List[Any], List[Any]]:
	"""Parse dashboard JSON into WaterQualityData and FeedData for the optimizer."""
	from models import WaterQualityData, FeedData
	from models import WaterQualityStatus

	wq_list = []
	for w in water_quality:
		try:
			# Normalize status to enum (frontend sends lowercase e.g. "good")
			status = w.get("status", "good")
			if isinstance(status, str):
				try:
					status = WaterQualityStatus(status)
				except ValueError:
					status = WaterQualityStatus.GOOD
			wq_list.append(WaterQualityData(
				timestamp=datetime.fromisoformat(w["timestamp"].replace("Z", "+00:00")) if isinstance(w.get("timestamp"), str) else w.get("timestamp", datetime.utcnow()),
				pond_id=int(w["pond_id"]),
				ph=float(w["ph"]),
				temperature=float(w["temperature"]),
				dissolved_oxygen=float(w["dissolved_oxygen"]),
				salinity=float(w.get("salinity", 0)),
				ammonia=float(w["ammonia"]),
				nitrite=float(w.get("nitrite", 0)),
				nitrate=float(w.get("nitrate", 0)),
				turbidity=float(w.get("turbidity", 0)),
				status=status,
				alerts=list(w.get("alerts", [])),
			))
		except (KeyError, TypeError, ValueError):
			continue

	feed_list = []
	for f in feed:
		try:
			ts = f.get("timestamp")
			if isinstance(ts, str):
				ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
			next_ts = f.get("predicted_next_feeding")
			if isinstance(next_ts, str):
				next_ts = datetime.fromisoformat(next_ts.replace("Z", "+00:00"))
			feed_list.append(FeedData(
				timestamp=ts or datetime.utcnow(),
				pond_id=int(f["pond_id"]),
				shrimp_count=int(f["shrimp_count"]),
				average_weight=float(f["average_weight"]),
				feed_amount=float(f["feed_amount"]),
				feed_type=str(f.get("feed_type", "Standard Feed")),
				feeding_frequency=int(f.get("feeding_frequency", 3)),
				predicted_next_feeding=next_ts or datetime.utcnow(),
			))
		except (KeyError, TypeError, ValueError):
			continue

	return wq_list, feed_list


@app.post("/api/feeding-optimization")
def post_feeding_optimization(body: FeedingOptimizationRequest = Body(...)) -> Dict[str, Any]:
	"""
	Return an optimized per-pond feeding plan using real dashboard data.

	Send water_quality and feed arrays (same shape as /api/dashboard) to get
	recommendations based on your current DB/live data instead of simulated data.
	"""
	water_quality_data, feed_data = _parse_dashboard_data_for_optimization(
		body.water_quality, body.feed
	)
	if not water_quality_data or not feed_data:
		# Not enough valid data: return empty result so frontend can fall back to GET
		return {
			"plans": [],
			"overall_fcr": 1.2,
			"potential_savings_pct": 0.0,
			"top_recommendation": "Provide water quality and feed data for recommendations.",
			"timestamp": datetime.utcnow().isoformat() + "Z",
		}

	from agents.feeding_optimizer import FeedingOptimizerAgent
	optimizer = FeedingOptimizerAgent()
	result = optimizer.optimize_all(feed_data, water_quality_data)
	return result.model_dump(mode="json")


@app.get("/api/feeding-optimization")
def get_feeding_optimization(
	ponds: int = FARM_CONFIG.get("pond_count", 4),
	seed: Optional[int] = None,
) -> Dict[str, Any]:
	"""
	Return an optimized per-pond feeding plan.

	Calculates recommended daily feed amounts, feeding windows, and feed
	types based on current biomass estimates and live water quality data.
	When possible, use POST with water_quality and feed from your dashboard for real data.

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


# Default chart hours for feeding activity (7 AM–6 PM)
_FEEDING_ACTIVITY_HOURS = [7, 9, 11, 13, 15, 17, 18]
_FEEDING_ACTIVITY_LABELS = ["7 AM", "9 AM", "11 AM", "1 PM", "3 PM", "5 PM", "6 PM"]


@app.get("/api/feeding-activity")
def get_feeding_activity(
	pond_id: Optional[int] = None,
	hours: int = 24,
) -> Dict[str, Any]:
	"""
	Return feeding activity by hour from MongoDB (feed_readings) for the Shrimp Feeding Behavior chart.
	Buckets feed events by hour (7 AM–6 PM). When MongoDB is disabled or has no data, returns zeros
	so the frontend can use a fallback.
	"""
	try:
		from config import USE_MONGODB
		if not USE_MONGODB:
			return {
				"labels": _FEEDING_ACTIVITY_LABELS,
				"data": [0] * len(_FEEDING_ACTIVITY_LABELS),
				"source": "none",
			}
		from database.repository import DataRepository
		repo = DataRepository()
		if not repo.is_available:
			return {
				"labels": _FEEDING_ACTIVITY_LABELS,
				"data": [0] * len(_FEEDING_ACTIVITY_LABELS),
				"source": "none",
			}
		end_time = datetime.utcnow()
		start_time = end_time - timedelta(hours=hours)
		feed_list = repo.get_feed_data(
			pond_id=pond_id,
			start_time=start_time,
			end_time=end_time,
			limit=500,
		)
		by_hour: Dict[int, int] = defaultdict(int)
		for f in feed_list:
			h = f.timestamp.hour
			by_hour[h] += 1
		data = [by_hour[h] for h in _FEEDING_ACTIVITY_HOURS]
		return {
			"labels": _FEEDING_ACTIVITY_LABELS,
			"data": data,
			"source": "mongodb",
		}
	except Exception as e:
		return {
			"labels": _FEEDING_ACTIVITY_LABELS,
			"data": [0] * len(_FEEDING_ACTIVITY_LABELS),
			"source": "error",
			"error": str(e),
		}


@app.get("/api/labor-optimization")
def get_labor_optimization(
	ponds: int = FARM_CONFIG.get("pond_count", 4),
	seed: Optional[int] = None,
) -> Dict[str, Any]:
	"""
	Return AI-powered labor optimization per pond: schedules, recommendations, metrics, and optional LLM plan.

	Uses LaborOptimizationAgent (CrewAI + LLM when OPENAI_API_KEY is set) plus rule-based schedules
	and recommendations. Labor data is generated from water quality and energy when not in MongoDB.

	Query params:
	- ponds: Number of ponds to optimize for
	- seed: Optional RNG seed for reproducible simulation
	"""
	if seed is not None:
		random.seed(int(seed))
		np.random.seed(int(seed))

	water_quality_agent = WaterQualityAgent()
	energy_agent = EnergyOptimizationAgent()
	labor_agent = LaborOptimizationAgent()

	water_quality_data = []
	energy_data = []
	labor_data = []

	for pond_id in range(1, ponds + 1):
		wq = water_quality_agent.get_water_quality_data(pond_id)
		water_quality_data.append(wq)
		energy = energy_agent.get_energy_data(pond_id, wq)
		energy_data.append(energy)
		labor = labor_agent.get_or_generate_labor_data(pond_id, wq, energy)
		labor_data.append(labor)

	labor_optimization = labor_agent.optimize_all_labor(
		water_quality_data, energy_data, labor_data
	)

	return {
		"labor_optimization": labor_optimization,
		"timestamp": datetime.utcnow().isoformat(),
		"ponds": ponds,
	}


@app.get("/api/benchmark")
def get_benchmark(
	ponds: int = FARM_CONFIG.get("pond_count", 4),
	seed: Optional[int] = None,
) -> Dict[str, Any]:
	"""
	Run AI-powered benchmarking: compare farm performance against targets and best practices.

	Returns computed scores (water quality, feed, energy, labor, overall), current vs target
	comparisons, and optional AI-generated analysis and recommendations when OPENAI_API_KEY is set.

	Query params:
	- ponds: Number of ponds to benchmark
	- seed: Optional RNG seed for reproducible simulation
	"""
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
		labor = labor_agent.get_or_generate_labor_data(pond_id, wq, energy)
		labor_data.append(labor)

	dashboard = manager_agent.create_dashboard(
		water_quality_data, feed_data, energy_data, labor_data
	)
	historical_snapshots = _load_saved_snapshots(limit=14)

	benchmarking_agent = BenchmarkingAgent()
	benchmark_result = benchmarking_agent.run_benchmark(
		dashboard=dashboard,
		water_quality_data=water_quality_data,
		feed_data=feed_data,
		energy_data=energy_data,
		labor_data=labor_data,
		historical_snapshots=historical_snapshots,
	)

	return {
		"benchmark": benchmark_result,
		"timestamp": datetime.utcnow().isoformat(),
		"ponds": ponds,
	}

@app.get("/api/water-quality")
def get_water_quality(
	ponds: int = FARM_CONFIG.get("pond_count", 4),
	seed: Optional[int] = None,
) -> Dict[str, Any]:
	if seed is not None:
		random.seed(int(seed))
		np.random.seed(int(seed))

	water_quality_agent = WaterQualityAgent()
	water_quality_data = []

	for pond_id in range(1, ponds + 1):
		wq = water_quality_agent.get_water_quality_data(pond_id)
		water_quality_data.append(wq)

	return {
		"water_quality": [w.model_dump(mode="json") for w in water_quality_data],
		"timestamp": datetime.utcnow().isoformat(),
	}

@app.get("/api/feeding-data")
def get_feeding_data(
	ponds: int = FARM_CONFIG.get("pond_count", 4),
	seed: Optional[int] = None,
) -> Dict[str, Any]:
	if seed is not None:
		random.seed(int(seed))
		np.random.seed(int(seed))

	water_quality_agent = WaterQualityAgent()
	feed_agent = FeedPredictionAgent()
	manager_agent = ManagerAgent()

	feed_data = []

	for pond_id in range(1, ponds + 1):
		wq = water_quality_agent.get_water_quality_data(pond_id)
		feed = feed_agent.get_feed_data(pond_id, wq)
		feed_data.append(feed)

	feed_efficiency = manager_agent._calculate_feed_efficiency(feed_data)

	return {
		"feed": [f.model_dump(mode="json") for f in feed_data],
		"feed_efficiency": feed_efficiency,
		"timestamp": datetime.utcnow().isoformat(),
	}


