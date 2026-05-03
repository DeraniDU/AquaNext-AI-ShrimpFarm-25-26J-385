from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel
from datetime import datetime, timedelta
from collections import defaultdict
import time
import random
import json
from urllib.parse import urlencode
from urllib.request import urlopen
from urllib.error import URLError, HTTPError

import numpy as np

from config import (
	PARALLEL_DATA_COLLECTION,
	DASHBOARD_CACHE_TTL_S,
	DASHBOARD_MONGO_DIRECT,
	DECISION_RECO_ENABLE_LLM,
	API_CORS_ORIGINS,
	USE_MONGODB,
	FARM_LATITUDE,
	FARM_LONGITUDE,
	ENERGY_COST_PER_KWH_LKR,
	FEED_COST_PER_KG_LKR,
	LABOR_COST_PER_HOUR_LKR,
	SHRIMP_PRICE_PER_KG_LKR,
	MEDICINE_COST_PER_POND_LKR,
	MAINTENANCE_COST_PER_POND_LKR,
	WEEKLY_FEED_BUDGET_LKR,
	WEEKLY_ENERGY_BUDGET_LKR,
	WEEKLY_LABOR_BUDGET_LKR,
	CYCLE_BUDGET_LKR,
)
from agents.water_quality_agent import WaterQualityAgent
from agents.feed_prediction_agent import FeedPredictionAgent
from agents.energy_optimization_agent import EnergyOptimizationAgent
from agents.labor_optimization_agent import LaborOptimizationAgent
from agents.manager_agent import ManagerAgent
from agents.decision_recommendation_agent import DecisionRecommendationAgent
from agents.forecasting_agent import ForecastingAgent
from agents.benchmarking_agent import BenchmarkingAgent
from agents.feeding_optimizer import FeedingOptimizer
from config import FARM_CONFIG

app = FastAPI(title="Shrimp Farm Management API", version="0.1.0")

# In-memory snapshot cache so dashboard reloads are stable.
# Keyed by the dashboard request shape (ponds, seed, economic settings, budget settings).
_DASHBOARD_CACHE: Dict[Tuple[Any, ...], Dict[str, Any]] = {}
_DASHBOARD_CACHE_TS: Dict[Tuple[Any, ...], float] = {}
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


def _load_dashboard_readings_from_mongodb(ponds: int) -> Tuple[List[Any], List[Any], List[Any], List[Any]]:
	"""
	Latest per-pond rows from MongoDB *_readings collections only.

	Bypasses WaterQualityAgent / FeedPredictionAgent / EnergyOptimizationAgent for snapshot
	data so /api/dashboard reflects stored readings, not simulated agent output.
	"""
	if not USE_MONGODB:
		raise HTTPException(
			status_code=503,
			detail={
				"error": "mongo_direct_disabled",
				"hint": "Set USE_MONGODB=true or set DASHBOARD_MONGO_DIRECT=false to use agent collection.",
			},
		)
	from database.repository import DataRepository

	repo = DataRepository()
	if not getattr(repo, "is_available", False):
		raise HTTPException(
			status_code=503,
			detail={
				"error": "mongodb_unavailable",
				"hint": "Check MONGO_URI / MONGO_DB_NAME and that MongoDB is reachable, or set DASHBOARD_MONGO_DIRECT=false.",
			},
		)

	missing: List[str] = []
	water_quality_data: List[Any] = []
	feed_data: List[Any] = []
	energy_data: List[Any] = []
	labor_data: List[Any] = []

	for pond_id in range(1, max(1, int(ponds)) + 1):
		wq = repo.get_latest_water_quality(pond_id)
		if wq is None:
			missing.append(f"pond {pond_id}: water_quality_readings")
		else:
			water_quality_data.append(wq)

		fd = repo.get_latest_feed_data(pond_id)
		if fd is None:
			missing.append(f"pond {pond_id}: feed_readings")
		else:
			feed_data.append(fd)

		en = repo.get_latest_energy_data(pond_id)
		if en is None:
			missing.append(f"pond {pond_id}: energy_readings")
		else:
			energy_data.append(en)

		lb = repo.get_latest_labor_data(pond_id)
		if lb is None:
			missing.append(f"pond {pond_id}: labor_readings")
		else:
			labor_data.append(lb)

	if missing:
		raise HTTPException(
			status_code=503,
			detail={
				"error": "incomplete_mongodb_readings",
				"missing": missing,
				"hint": "Insert latest rows into *_readings for each pond, or set DASHBOARD_MONGO_DIRECT=false.",
			},
		)

	return water_quality_data, feed_data, energy_data, labor_data


def _num_or_default(value: Optional[float], default: float) -> float:
	try:
		if value is None:
			return float(default)
		return float(value)
	except (TypeError, ValueError):
		return float(default)


def _build_dashboard_economic_settings(
	energy_cost_per_kwh_lkr: Optional[float],
	feed_cost_per_kg_lkr: Optional[float],
	labor_cost_per_hour_lkr: Optional[float],
	shrimp_price_per_kg_lkr: Optional[float],
	medicine_cost_per_pond_lkr: Optional[float],
	maintenance_cost_per_pond_lkr: Optional[float],
) -> Dict[str, float]:
	return {
		"energy_cost_per_kwh_lkr": _num_or_default(energy_cost_per_kwh_lkr, ENERGY_COST_PER_KWH_LKR),
		"feed_cost_per_kg_lkr": _num_or_default(feed_cost_per_kg_lkr, FEED_COST_PER_KG_LKR),
		"labor_cost_per_hour_lkr": _num_or_default(labor_cost_per_hour_lkr, LABOR_COST_PER_HOUR_LKR),
		"shrimp_price_per_kg_lkr": _num_or_default(shrimp_price_per_kg_lkr, SHRIMP_PRICE_PER_KG_LKR),
		"medicine_cost_per_pond_lkr": _num_or_default(medicine_cost_per_pond_lkr, MEDICINE_COST_PER_POND_LKR),
		"maintenance_cost_per_pond_lkr": _num_or_default(maintenance_cost_per_pond_lkr, MAINTENANCE_COST_PER_POND_LKR),
	}


def _build_dashboard_budget_settings(
	weekly_feed_budget_lkr: Optional[float],
	weekly_energy_budget_lkr: Optional[float],
	weekly_labor_budget_lkr: Optional[float],
	cycle_budget_lkr: Optional[float],
) -> Dict[str, float]:
	return {
		"weekly_feed_budget_lkr": _num_or_default(weekly_feed_budget_lkr, WEEKLY_FEED_BUDGET_LKR),
		"weekly_energy_budget_lkr": _num_or_default(weekly_energy_budget_lkr, WEEKLY_ENERGY_BUDGET_LKR),
		"weekly_labor_budget_lkr": _num_or_default(weekly_labor_budget_lkr, WEEKLY_LABOR_BUDGET_LKR),
		"cycle_budget_lkr": _num_or_default(cycle_budget_lkr, CYCLE_BUDGET_LKR),
	}


def _build_cost_summary(
	feed_data: List[Any],
	energy_data: List[Any],
	labor_data: List[Any],
	economic_settings: Dict[str, float],
) -> Dict[str, Any]:
	feed_cost_per_kg = economic_settings["feed_cost_per_kg_lkr"]
	labor_cost_per_hour = economic_settings["labor_cost_per_hour_lkr"]
	shrimp_price_per_kg = economic_settings["shrimp_price_per_kg_lkr"]
	medicine_cost_per_pond = economic_settings["medicine_cost_per_pond_lkr"]
	maintenance_cost_per_pond = economic_settings["maintenance_cost_per_pond_lkr"]

	pond_ids = sorted({int(f.pond_id) for f in feed_data} | {int(e.pond_id) for e in energy_data} | {int(l.pond_id) for l in labor_data})
	per_pond: List[Dict[str, Any]] = []

	for pond_id in pond_ids:
		feed = next((f for f in feed_data if int(f.pond_id) == pond_id), None)
		energy = next((e for e in energy_data if int(e.pond_id) == pond_id), None)
		labor = next((l for l in labor_data if int(l.pond_id) == pond_id), None)

		shrimp_count = int(getattr(feed, "shrimp_count", 0) or 0)
		avg_weight = float(getattr(feed, "average_weight", 0.0) or 0.0)
		biomass_kg = round((shrimp_count * avg_weight) / 1000, 2)
		feedings = int(getattr(feed, "feeding_frequency", 0) or 0)
		daily_feed_kg = ((float(getattr(feed, "feed_amount", 0.0) or 0.0) * (feedings if feedings > 0 else 1)) / 1000) if feed else 0.0
		feed_cost = round(daily_feed_kg * feed_cost_per_kg, 2)
		energy_cost = round(float(getattr(energy, "cost", 0.0) or 0.0), 2)
		labor_hours = float(getattr(labor, "time_spent", 0.0) or 0.0)
		labor_workers = int(getattr(labor, "worker_count", 0) or 0)
		labor_cost = round(labor_hours * (labor_workers if labor_workers > 0 else 1) * labor_cost_per_hour, 2)
		medicine_cost = round(medicine_cost_per_pond, 2)
		maintenance_cost = round(maintenance_cost_per_pond, 2)
		other_cost = round(medicine_cost + maintenance_cost, 2)
		total_cost = round(feed_cost + energy_cost + labor_cost + other_cost, 2)
		revenue = round(biomass_kg * shrimp_price_per_kg, 2)
		gross_profit = round(revenue - total_cost, 2)
		gross_margin_pct = round((gross_profit / revenue) * 100, 2) if revenue > 0 else 0.0
		cost_per_kg_biomass = round(total_cost / biomass_kg, 2) if biomass_kg > 0 else 0.0

		per_pond.append(
			{
				"pond_id": pond_id,
				"pond_label": f"Pond {pond_id}",
				"shrimp_count": shrimp_count,
				"biomass_kg": biomass_kg,
				"feed_cost_lkr": feed_cost,
				"energy_cost_lkr": energy_cost,
				"labor_cost_lkr": labor_cost,
				"medicine_cost_lkr": medicine_cost,
				"maintenance_cost_lkr": maintenance_cost,
				"other_cost_lkr": other_cost,
				"total_cost_lkr": total_cost,
				"revenue_lkr": revenue,
				"gross_profit_lkr": gross_profit,
				"gross_margin_pct": gross_margin_pct,
				"cost_per_kg_biomass_lkr": cost_per_kg_biomass,
			}
		)

	def _sum(key: str) -> float:
		return round(sum(float(item.get(key, 0.0) or 0.0) for item in per_pond), 2)

	farm_biomass_kg = round(sum(float(item["biomass_kg"]) for item in per_pond), 2)
	farm_revenue = _sum("revenue_lkr")
	farm_total_cost = _sum("total_cost_lkr")
	farm_profit = round(farm_revenue - farm_total_cost, 2)
	highest_cost_item = max(per_pond, key=lambda item: item["total_cost_lkr"], default=None)

	return {
		"farm": {
			"pond_id": None,
			"pond_label": "All ponds",
			"shrimp_count": int(sum(int(item["shrimp_count"]) for item in per_pond)),
			"biomass_kg": farm_biomass_kg,
			"feed_cost_lkr": _sum("feed_cost_lkr"),
			"energy_cost_lkr": _sum("energy_cost_lkr"),
			"labor_cost_lkr": _sum("labor_cost_lkr"),
			"medicine_cost_lkr": _sum("medicine_cost_lkr"),
			"maintenance_cost_lkr": _sum("maintenance_cost_lkr"),
			"other_cost_lkr": _sum("other_cost_lkr"),
			"total_cost_lkr": farm_total_cost,
			"revenue_lkr": farm_revenue,
			"gross_profit_lkr": farm_profit,
			"gross_margin_pct": round((farm_profit / farm_revenue) * 100, 2) if farm_revenue > 0 else 0.0,
			"cost_per_kg_biomass_lkr": round(farm_total_cost / farm_biomass_kg, 2) if farm_biomass_kg > 0 else 0.0,
		},
		"ponds": per_pond,
		"highest_cost_pond_id": highest_cost_item["pond_id"] if highest_cost_item else None,
		"highest_cost_pond_label": highest_cost_item["pond_label"] if highest_cost_item else None,
	}


def _budget_metric(actual_lkr: float, budget_lkr: float, projected_lkr: float) -> Dict[str, float]:
	variance = round(actual_lkr - budget_lkr, 2)
	projected_variance = round(projected_lkr - budget_lkr, 2)
	return {
		"budget_lkr": round(budget_lkr, 2),
		"actual_lkr": round(actual_lkr, 2),
		"variance_lkr": variance,
		"variance_pct": round((variance / budget_lkr) * 100, 2) if budget_lkr > 0 else 0.0,
		"projected_lkr": round(projected_lkr, 2),
		"projected_variance_lkr": projected_variance,
	}


def _build_budget_summary(cost_summary: Dict[str, Any], budget_settings: Dict[str, float]) -> Dict[str, Any]:
	farm = cost_summary["farm"]
	daily_feed = float(farm["feed_cost_lkr"])
	daily_energy = float(farm["energy_cost_lkr"])
	daily_labor = float(farm["labor_cost_lkr"])
	daily_total = float(farm["total_cost_lkr"])
	weekly_days = 7
	cycle_days = 30
	return {
		"period_label": "Current daily run rate",
		"projected_cycle_days": cycle_days,
		"feed": _budget_metric(daily_feed * weekly_days, budget_settings["weekly_feed_budget_lkr"], daily_feed * weekly_days),
		"energy": _budget_metric(daily_energy * weekly_days, budget_settings["weekly_energy_budget_lkr"], daily_energy * weekly_days),
		"labor": _budget_metric(daily_labor * weekly_days, budget_settings["weekly_labor_budget_lkr"], daily_labor * weekly_days),
		"cycle": _budget_metric(daily_total * cycle_days, budget_settings["cycle_budget_lkr"], daily_total * cycle_days),
	}


def _build_savings_opportunities(
	feed_data: List[Any],
	water_quality_data: List[Any],
	energy_data: List[Any],
	cost_summary: Dict[str, Any],
	_economic_settings: Dict[str, float],
) -> List[Dict[str, Any]]:
	out: List[Dict[str, Any]] = []
	feed_optimizer = FeedingOptimizer()
	feed_optimization = feed_optimizer.optimize_all(feed_data, water_quality_data)
	feed_daily_cost = float(cost_summary["farm"]["feed_cost_lkr"])
	if feed_optimization.potential_savings_pct > 0 and feed_daily_cost > 0:
		feed_savings_day = round(feed_daily_cost * (feed_optimization.potential_savings_pct / 100.0), 2)
		top_plan = min(feed_optimization.plans, key=lambda p: p.adjustment_factor) if feed_optimization.plans else None
		out.append(
			{
				"id": "feed-optimizer",
				"category": "feed",
				"title": "Optimize daily feed allocation",
				"description": feed_optimization.top_recommendation,
				"pond_id": int(top_plan.pond_id) if top_plan else None,
				"priority": "high" if feed_optimization.potential_savings_pct >= 8 else "medium",
				"savings_lkr": feed_savings_day,
				"period": "day",
				"source": "Feeding optimizer",
			}
		)

	energy_agent = EnergyOptimizationAgent()
	for energy in energy_data:
		wq = next((item for item in water_quality_data if int(item.pond_id) == int(energy.pond_id)), None)
		if wq is None:
			continue
		recommendations = energy_agent.generate_optimization_recommendations(energy, wq)
		if not recommendations:
			continue
		roi = energy_agent.calculate_roi(recommendations, current_monthly_cost=float(getattr(energy, "cost", 0.0) or 0.0) * 30)
		if roi["total_monthly_savings"] <= 0:
			continue
		out.append(
			{
				"id": f"energy-{energy.pond_id}",
				"category": "energy",
				"title": f"Reduce energy waste in Pond {energy.pond_id}",
				"description": recommendations[0]["recommendation"],
				"pond_id": int(energy.pond_id),
				"priority": "high" if roi["total_monthly_savings"] >= 10000 else "medium",
				"savings_lkr": round(roi["total_monthly_savings"], 2),
				"period": "month",
				"source": "Energy optimization",
			}
		)

	labor_daily_cost = float(cost_summary["farm"]["labor_cost_lkr"])
	if labor_daily_cost > 0:
		out.append(
			{
				"id": "labor-efficiency",
				"category": "labor",
				"title": "Tighten labor scheduling",
				"description": "Shift repetitive checks into grouped rounds to reduce idle time and overtime.",
				"pond_id": None,
				"priority": "medium",
				"savings_lkr": round(labor_daily_cost * 0.12 * 7, 2),
				"period": "week",
				"source": "Labor efficiency heuristic",
			}
		)

	out.sort(key=lambda item: item["savings_lkr"], reverse=True)
	return out[:6]

# Allow local/dev/prod origins. Override with API_CORS_ORIGINS as a comma-separated list.
app.add_middleware(
	CORSMiddleware,
	allow_origins=API_CORS_ORIGINS,
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


def _wmo_label(code: int) -> str:
	labels = {
		0: "Clear sky",
		1: "Mainly clear",
		2: "Partly cloudy",
		3: "Overcast",
		45: "Fog",
		48: "Rime fog",
		51: "Light drizzle",
		53: "Moderate drizzle",
		55: "Dense drizzle",
		61: "Slight rain",
		63: "Moderate rain",
		65: "Heavy rain",
		71: "Slight snow",
		73: "Moderate snow",
		75: "Heavy snow",
		80: "Rain showers",
		81: "Heavy showers",
		82: "Violent showers",
		95: "Thunderstorm",
		96: "Thunderstorm hail",
		99: "Severe thunderstorm",
	}
	return labels.get(code, "Unknown")


def _weather_notes(hourly_rows: List[Dict[str, Any]]) -> List[str]:
	notes: List[str] = []
	if not hourly_rows:
		return notes
	max_precip = max((float(x.get("precipitation_probability", 0.0)) for x in hourly_rows), default=0.0)
	max_temp = max((float(x.get("temp_c", 0.0)) for x in hourly_rows), default=0.0)
	max_wind = max((float(x.get("wind_speed_kmh", 0.0)) for x in hourly_rows), default=0.0)

	if max_precip >= 70:
		notes.append("Heavy rain likely: watch salinity dilution and recheck pH after rainfall.")
	elif max_precip >= 45:
		notes.append("Rain risk elevated: prepare for moderate salinity fluctuations.")

	if max_temp >= 33:
		notes.append("High heat window: monitor dissolved oxygen and consider stronger aeration.")
	elif max_temp >= 31:
		notes.append("Warm conditions expected: tighten DO monitoring in afternoon hours.")

	if max_wind >= 35:
		notes.append("Strong winds possible: review harvest/logistics timing and exposed equipment.")
	elif max_wind >= 25:
		notes.append("Breezy period ahead: verify aeration and feeder stability.")

	if not notes:
		notes.append("Stable weather outlook: continue standard water and feeding routines.")
	return notes[:4]


@app.get("/api/weather-forecast")
def get_weather_forecast(
	latitude: float = FARM_LATITUDE,
	longitude: float = FARM_LONGITUDE,
	hours: int = 48,
	days: int = 3,
) -> Dict[str, Any]:
	"""
	Fetch weather forecast from Open-Meteo and normalize for dashboard use.
	"""
	hours = max(12, min(int(hours), 72))
	days = max(1, min(int(days), 7))
	params = {
		"latitude": f"{float(latitude):.6f}",
		"longitude": f"{float(longitude):.6f}",
		"hourly": "temperature_2m,precipitation_probability,wind_speed_10m,weather_code",
		"daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
		"forecast_days": str(days),
		"timezone": "auto",
	}
	url = f"https://api.open-meteo.com/v1/forecast?{urlencode(params)}"

	try:
		with urlopen(url, timeout=10) as resp:
			raw = json.loads(resp.read().decode("utf-8"))
	except HTTPError as e:
		return JSONResponse(status_code=502, content={"detail": f"Weather provider HTTP {e.code}"})
	except URLError as e:
		return JSONResponse(status_code=502, content={"detail": f"Weather provider unavailable: {e.reason}"})
	except Exception as e:
		return JSONResponse(status_code=500, content={"detail": f"Weather fetch failed: {e}"})

	hourly = raw.get("hourly") or {}
	ht = hourly.get("time") or []
	htemp = hourly.get("temperature_2m") or []
	hpr = hourly.get("precipitation_probability") or []
	hwind = hourly.get("wind_speed_10m") or []
	hcode = hourly.get("weather_code") or []

	hourly_rows: List[Dict[str, Any]] = []
	for i in range(min(hours, len(ht))):
		hourly_rows.append(
			{
				"time": ht[i],
				"temp_c": float(htemp[i]) if i < len(htemp) and htemp[i] is not None else None,
				"precipitation_probability": float(hpr[i]) if i < len(hpr) and hpr[i] is not None else 0.0,
				"wind_speed_kmh": float(hwind[i]) if i < len(hwind) and hwind[i] is not None else 0.0,
				"weather_code": int(hcode[i]) if i < len(hcode) and hcode[i] is not None else 0,
			}
		)

	daily = raw.get("daily") or {}
	dt = daily.get("time") or []
	dmax = daily.get("temperature_2m_max") or []
	dmin = daily.get("temperature_2m_min") or []
	dpr = daily.get("precipitation_probability_max") or []
	dcode = daily.get("weather_code") or []

	daily_rows: List[Dict[str, Any]] = []
	for i in range(min(days, len(dt))):
		code = int(dcode[i]) if i < len(dcode) and dcode[i] is not None else 0
		daily_rows.append(
			{
				"date": dt[i],
				"temp_max_c": float(dmax[i]) if i < len(dmax) and dmax[i] is not None else None,
				"temp_min_c": float(dmin[i]) if i < len(dmin) and dmin[i] is not None else None,
				"precipitation_probability_max": float(dpr[i]) if i < len(dpr) and dpr[i] is not None else 0.0,
				"weather_code": code,
				"condition_label": _wmo_label(code),
			}
		)

	notes = _weather_notes(hourly_rows)
	return {
		"source": "open-meteo",
		"timestamp": datetime.utcnow().isoformat(),
		"latitude": float(raw.get("latitude", latitude)),
		"longitude": float(raw.get("longitude", longitude)),
		"timezone": raw.get("timezone", "UTC"),
		"hourly": hourly_rows,
		"daily": daily_rows,
		"notes": notes,
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
	energy_cost_per_kwh_lkr: Optional[float] = None,
	feed_cost_per_kg_lkr: Optional[float] = None,
	labor_cost_per_hour_lkr: Optional[float] = None,
	shrimp_price_per_kg_lkr: Optional[float] = None,
	medicine_cost_per_pond_lkr: Optional[float] = None,
	maintenance_cost_per_pond_lkr: Optional[float] = None,
	weekly_feed_budget_lkr: Optional[float] = None,
	weekly_energy_budget_lkr: Optional[float] = None,
	weekly_labor_budget_lkr: Optional[float] = None,
	cycle_budget_lkr: Optional[float] = None,
) -> Dict[str, Any]:
	"""
	Build the dashboard snapshot for the UI.

	When USE_MONGODB=true and DASHBOARD_MONGO_DIRECT=true (default), water/feed/energy/labor
	are loaded directly from MongoDB *_readings via DataRepository — not from the
	water/feed/energy collection agents (no simulated snapshots on that path).

	Otherwise, agents generate or fetch data (simulation when Mongo has no row and
	USE_READINGS_ONLY is false).

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

	economic_settings = _build_dashboard_economic_settings(
		energy_cost_per_kwh_lkr=energy_cost_per_kwh_lkr,
		feed_cost_per_kg_lkr=feed_cost_per_kg_lkr,
		labor_cost_per_hour_lkr=labor_cost_per_hour_lkr,
		shrimp_price_per_kg_lkr=shrimp_price_per_kg_lkr,
		medicine_cost_per_pond_lkr=medicine_cost_per_pond_lkr,
		maintenance_cost_per_pond_lkr=maintenance_cost_per_pond_lkr,
	)
	budget_settings = _build_dashboard_budget_settings(
		weekly_feed_budget_lkr=weekly_feed_budget_lkr,
		weekly_energy_budget_lkr=weekly_energy_budget_lkr,
		weekly_labor_budget_lkr=weekly_labor_budget_lkr,
		cycle_budget_lkr=cycle_budget_lkr,
	)

	cache_key = (
		int(ponds),
		int(seed) if seed is not None else None,
		bool(DASHBOARD_MONGO_DIRECT),
		tuple(sorted(economic_settings.items())),
		tuple(sorted(budget_settings.items())),
	)
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

		# True only when latest readings were loaded from Mongo *_readings (not agent fallback).
		used_mongo_direct = False
		if DASHBOARD_MONGO_DIRECT and USE_MONGODB:
			try:
				water_quality_data, feed_data, energy_data, labor_data = _load_dashboard_readings_from_mongodb(ponds)
				used_mongo_direct = True
				labor_optimization = labor_agent.optimize_all_labor(
					water_quality_data, energy_data, labor_data
				)
			except HTTPException as ex:
				# Unreachable DB, DNS failure, or incomplete readings — do not fail the whole dashboard.
				if getattr(ex, "status_code", None) != 503:
					raise
				print(
					"[WARN] /api/dashboard: MongoDB direct read failed; falling back to collection agents. "
					f"detail={ex.detail!r}"
				)

		if not used_mongo_direct:
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

		# Persist only energy readings to MongoDB when snapshots came from agents (not already stored).
		if not used_mongo_direct:
			try:
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
		cost_summary = _build_cost_summary(feed_data, energy_data, labor_data, economic_settings)
		budget_summary = _build_budget_summary(cost_summary, budget_settings)
		savings_opportunities = _build_savings_opportunities(
			feed_data, water_quality_data, energy_data, cost_summary, economic_settings
		)

		payload = {
			"dashboard": dashboard.model_dump(mode="json"),
			"water_quality": [w.model_dump(mode="json") for w in water_quality_data],
			"feed": [f.model_dump(mode="json") for f in feed_data],
			"energy": [e.model_dump(mode="json") for e in energy_data],
			"labor": [l.model_dump(mode="json") for l in labor_data],
			"labor_optimization": labor_optimization,
			"economic_settings": economic_settings,
			"budget_settings": budget_settings,
			"cost_summary": cost_summary,
			"budget_summary": budget_summary,
			"savings_opportunities": savings_opportunities,
			"decision_agent_type": decision_agent_type,
			"decisions": decision_bundle_dump,
			"decision_recommendations": decision_recommendations,
		}

		if cache_ttl_s > 0:
			_DASHBOARD_CACHE[cache_key] = payload
			_DASHBOARD_CACHE_TS[cache_key] = now

		return JSONResponse(content=payload, headers=_dashboard_headers)
	except HTTPException:
		raise
	except AttributeError as e:
		# Stale cached agents after ManagerAgent API change — drop cache and retry once.
		global _dashboard_agents
		if "_generate_alerts" in str(e) and _dashboard_agents is not None:
			_dashboard_agents = None
			try:
				return get_dashboard(
					ponds=ponds,
					fresh=fresh,
					seed=seed,
					cache_ttl_s=cache_ttl_s,
					energy_cost_per_kwh_lkr=energy_cost_per_kwh_lkr,
					feed_cost_per_kg_lkr=feed_cost_per_kg_lkr,
					labor_cost_per_hour_lkr=labor_cost_per_hour_lkr,
					shrimp_price_per_kg_lkr=shrimp_price_per_kg_lkr,
					medicine_cost_per_pond_lkr=medicine_cost_per_pond_lkr,
					maintenance_cost_per_pond_lkr=maintenance_cost_per_pond_lkr,
					weekly_feed_budget_lkr=weekly_feed_budget_lkr,
					weekly_energy_budget_lkr=weekly_energy_budget_lkr,
					weekly_labor_budget_lkr=weekly_labor_budget_lkr,
					cycle_budget_lkr=cycle_budget_lkr,
				)
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


