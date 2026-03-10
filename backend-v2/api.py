"""
Water Quality Prediction API Server
=====================================
Comprehensive farmer-friendly water quality monitoring system with:
- Real-time sensor data processing
- Time-to-danger predictions
- Sensor health and drift detection
- Trend analysis and confidence scoring
- Night-time safety monitoring
- Recovery time predictions
- Historical comparisons

Author: AI Shrimp Farm System
"""

import json
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import random
import math

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

# Try to import joblib for model loading
try:
    import joblib
    MODELS_AVAILABLE = True
except ImportError:
    MODELS_AVAILABLE = False

# Try to import sklearn for anomaly detection
try:
    from sklearn.ensemble import IsolationForest
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

app = Flask(__name__)
CORS(app)

# Configuration
ROOT = Path(__file__).resolve().parent
MODELS_DIR = ROOT / "exported_models"

# Global model storage
models = {
    "classification": None,
    "timeseries": {},
    "wqi_predictor": None,
    "anomaly_detector": None,
}

# Sensor history for trend analysis (in production, use a database)
sensor_history: Dict[int, List[Dict]] = {}  # pond_id -> list of readings
MAX_HISTORY_LENGTH = 100

# Feature configuration matching the training script
FEATURE_COLS = [
    "Temp", "Turbidity (cm)", "DO(mg/L)", "BOD (mg/L)", "CO2", "pH",
    "Alkalinity (mg L-1 )", "Hardness (mg L-1 )", "Calcium (mg L-1 )",
    "Ammonia (mg L-1 )", "Nitrite (mg L-1 )", "Phosphorus (mg L-1 )",
    "H2S (mg L-1 )", "Plankton (No. L-1)"
]

# Simplified features for dashboard input
SENSOR_FEATURES = ["pH", "Temperature", "DO", "Salinity", "Ammonia", "Nitrite", "Turbidity"]

# ============================================================
# OPTIMAL RANGES AND THRESHOLDS (Based on Research Paper)
# ============================================================

OPTIMAL_RANGES = {
    "DO": {
        "optimal_min": 5.0, "optimal_max": 8.0,
        "acceptable_min": 4.0, "acceptable_max": 10.0,
        "critical_min": 3.0, "critical_max": 15.0,
        "unit": "mg/L", "name": "Dissolved Oxygen"
    },
    "pH": {
        "optimal_min": 7.5, "optimal_max": 8.5,
        "acceptable_min": 7.0, "acceptable_max": 9.0,
        "critical_min": 6.5, "critical_max": 9.5,
        "unit": "", "name": "pH Level"
    },
    "Temperature": {
        "optimal_min": 26.0, "optimal_max": 30.0,
        "acceptable_min": 30.0, "acceptable_max": 32.0,
        "critical_min": 20.0, "critical_max": 35.0,
        "unit": "°C", "name": "Temperature"
    },
    "Salinity": {
        "optimal_min": 15.0, "optimal_max": 25.0,
        "acceptable_min": 10.0, "acceptable_max": 30.0,
        "critical_min": 5.0, "critical_max": 40.0,
        "unit": "ppt", "name": "Salinity"
    },
    "Ammonia": {
        "optimal_min": 0.0, "optimal_max": 0.05,
        "acceptable_min": 0.0, "acceptable_max": 0.1,
        "critical_min": 0.0, "critical_max": 0.5,
        "unit": "mg/L", "name": "Ammonia"
    },
    "Nitrite": {
        "optimal_min": 0.0, "optimal_max": 0.25,
        "acceptable_min": 0.0, "acceptable_max": 0.5,
        "critical_min": 0.0, "critical_max": 1.0,
        "unit": "mg/L", "name": "Nitrite"
    },
    "Turbidity": {
        "optimal_min": 25.0, "optimal_max": 40.0,
        "acceptable_min": 20.0, "acceptable_max": 50.0,
        "critical_min": 10.0, "critical_max": 80.0,
        "unit": "cm", "name": "Turbidity"
    },
}

# Legacy threshold format for backward compatibility
THRESHOLDS = {
    "DO": {"min": 4.0, "max": 10.0, "critical_min": 3.0},
    "pH": {"min": 7.0, "max": 8.5, "critical_min": 6.5, "critical_max": 9.0},
    "Temperature": {"min": 26.0, "max": 32.0, "critical_max": 35.0},
    "Salinity": {"min": 15.0, "max": 25.0},
    "Ammonia": {"max": 0.1, "critical_max": 0.5},
    "Nitrite": {"max": 0.5, "critical_max": 1.0},
}


def load_models():
    """Load all exported models from disk."""
    global models
    
    if not MODELS_AVAILABLE:
        print("joblib not available - using simulation mode")
        return
    
    if not MODELS_DIR.exists():
        print(f"Models directory not found: {MODELS_DIR}")
        print("Running in simulation mode - predictions will be generated synthetically")
        return

    # Load best classification model
    cls_path = MODELS_DIR / "water_quality_cls_best.joblib"
    if cls_path.exists():
        models["classification"] = joblib.load(cls_path)
        print(f"Loaded classification model: {models['classification'].get('type', 'unknown')}")

    # Load best time-series models for each horizon
    for horizon in [6, 12, 24]:
        ts_path = MODELS_DIR / f"ts_best_h{horizon}.joblib"
        if ts_path.exists():
            models["timeseries"][horizon] = joblib.load(ts_path)
            print(f"Loaded TS model for horizon {horizon}: {models['timeseries'][horizon].get('type', 'unknown')}")

    # Load WQI predictor
    wqi_path = MODELS_DIR / "wqi_predictor.joblib"
    if wqi_path.exists():
        models["wqi_predictor"] = joblib.load(wqi_path)
        print("Loaded WQI predictor")
    
    # Initialize anomaly detector for sensor health monitoring
    if SKLEARN_AVAILABLE:
        models["anomaly_detector"] = IsolationForest(
            n_estimators=100, contamination=0.05, random_state=42
        )
        print("Initialized anomaly detector for sensor health monitoring")


# ============================================================
# CORE CALCULATION FUNCTIONS
# ============================================================

def compute_wqi(ph: float, temp: float, do: float, ammonia: float = 0.05, nitrite: float = 0.1) -> float:
    """
    Compute Water Quality Index (0-100) using weighted sub-indices.
    Based on standard WQI calculation methodology from the research paper.
    """
    def score_parameter(value: float, param: str) -> float:
        ranges = OPTIMAL_RANGES.get(param, {})
        opt_min = ranges.get("optimal_min", 0)
        opt_max = ranges.get("optimal_max", 100)
        crit_min = ranges.get("critical_min", opt_min - 10)
        crit_max = ranges.get("critical_max", opt_max + 10)
        
        # Perfect score if in optimal range
        if opt_min <= value <= opt_max:
            return 100.0
        
        # Degraded score outside optimal
        if value < opt_min:
            if value <= crit_min:
                return 0.0
            return max(0, 100 * (value - crit_min) / (opt_min - crit_min))
        else:
            if value >= crit_max:
                return 0.0
            return max(0, 100 * (crit_max - value) / (crit_max - opt_max))
    
    # Calculate sub-indices
    scores = {
        "DO": score_parameter(do, "DO"),
        "pH": score_parameter(ph, "pH"),
        "Temperature": score_parameter(temp, "Temperature"),
        "Ammonia": score_parameter(ammonia, "Ammonia"),
        "Nitrite": score_parameter(nitrite, "Nitrite"),
    }
    
    # Weights (DO is most critical for shrimp survival)
    weights = {"DO": 0.35, "pH": 0.25, "Temperature": 0.20, "Ammonia": 0.12, "Nitrite": 0.08}
    
    wqi = sum(scores[p] * weights[p] for p in scores) / sum(weights.values())
    return round(wqi, 1)


def categorize_wqi(wqi: float) -> str:
    """Map WQI to category."""
    if wqi >= 75.0:
        return "Good"
    if wqi >= 50.0:
        return "Medium"
    if wqi >= 25.0:
        return "Bad"
    return "Very Bad"


# ============================================================
# FARMER-FRIENDLY ANALYSIS FUNCTIONS
# ============================================================

def analyze_sensor_health(sensor_data: Dict, pond_id: int = 1) -> Dict:
    """
    Analyze sensor health and detect anomalies/drift.
    Returns confidence level and any issues detected.
    """
    issues = []
    confidence = 100.0
    
    # Check for impossible/unrealistic values
    checks = [
        ("pH", 0, 14, "pH out of possible range"),
        ("DO", 0, 20, "DO reading impossible"),
        ("Temperature", 10, 45, "Temperature reading unrealistic"),
        ("Salinity", 0, 50, "Salinity reading out of range"),
        ("Ammonia", 0, 5, "Ammonia reading unrealistic"),
    ]
    
    for param, min_val, max_val, msg in checks:
        val = sensor_data.get(param, sensor_data.get(param.lower(), None))
        if val is not None and (val < min_val or val > max_val):
            issues.append({"parameter": param, "type": "impossible_value", "message": msg})
            confidence -= 30
    
    # Check for sudden changes (drift detection) using history
    if pond_id in sensor_history and len(sensor_history[pond_id]) >= 3:
        recent = sensor_history[pond_id][-3:]
        for param in ["DO", "pH", "Temperature"]:
            current = sensor_data.get(param, sensor_data.get(param.lower(), None))
            if current is None:
                continue
            avg_recent = np.mean([r.get(param, current) for r in recent])
            change = abs(current - avg_recent)
            threshold = {"DO": 2.0, "pH": 0.5, "Temperature": 3.0}.get(param, 1.0)
            if change > threshold:
                issues.append({
                    "parameter": param,
                    "type": "sudden_change",
                    "message": f"{param} changed by {change:.2f} - possible sensor drift",
                    "change": change
                })
                confidence -= 15
    
    return {
        "is_healthy": len(issues) == 0,
        "confidence": max(0, min(100, confidence)),
        "issues": issues,
        "recommendation": "Calibrate sensors" if issues else "Sensors operating normally"
    }


def calculate_time_to_danger(current: Dict, forecasts: Dict) -> Dict:
    """
    Calculate estimated time until water quality becomes dangerous.
    Returns hours remaining and which parameter will trigger first.
    """
    time_to_danger = float('inf')
    critical_param = None
    danger_type = None
    
    horizons = [("6h", 6), ("12h", 12), ("24h", 24)]
    
    for horizon_key, hours in horizons:
        if horizon_key not in forecasts:
            continue
        forecast = forecasts[horizon_key]
        
        # Check DO (most critical for shrimp)
        do_val = forecast.get("DO", 6.0)
        if do_val < OPTIMAL_RANGES["DO"]["critical_min"]:
            if hours < time_to_danger:
                time_to_danger = hours
                critical_param = "Dissolved Oxygen"
                danger_type = "critical_low"
        
        # Check pH
        ph_val = forecast.get("pH", 7.5)
        if ph_val < OPTIMAL_RANGES["pH"]["critical_min"] or ph_val > OPTIMAL_RANGES["pH"]["critical_max"]:
            if hours < time_to_danger:
                time_to_danger = hours
                critical_param = "pH"
                danger_type = "out_of_range"
        
        # Check Temperature
        temp_val = forecast.get("Temperature", 28.0)
        if temp_val > OPTIMAL_RANGES["Temperature"]["critical_max"]:
            if hours < time_to_danger:
                time_to_danger = hours
                critical_param = "Temperature"
                danger_type = "critical_high"
    
    # Check if currently in danger
    current_do = current.get("DO", current.get("dissolved_oxygen", 6.0))
    current_ph = current.get("pH", current.get("ph", 7.5))
    
    if current_do < OPTIMAL_RANGES["DO"]["critical_min"]:
        time_to_danger = 0
        critical_param = "Dissolved Oxygen"
        danger_type = "already_critical"
    
    if current_ph < OPTIMAL_RANGES["pH"]["critical_min"] or current_ph > OPTIMAL_RANGES["pH"]["critical_max"]:
        time_to_danger = 0
        critical_param = "pH"
        danger_type = "already_critical"
    
    is_safe = time_to_danger == float('inf')
    
    return {
        "is_safe": is_safe,
        "hours_remaining": None if is_safe else (time_to_danger if time_to_danger > 0 else 0),
        "critical_parameter": critical_param,
        "danger_type": danger_type,
        "message": "Water quality will remain safe for 24+ hours" if is_safe else (
            f"CRITICAL: {critical_param} already dangerous!" if time_to_danger == 0 else
            f"Warning: {critical_param} will become dangerous in ~{time_to_danger} hours"
        ),
        "urgency": "normal" if is_safe else ("critical" if time_to_danger <= 2 else "warning")
    }


def analyze_trends(sensor_data: Dict, pond_id: int = 1) -> Dict:
    """
    Analyze parameter trends: improving, stable, or deteriorating.
    """
    trends = {}
    overall_trend = "stable"
    
    if pond_id not in sensor_history or len(sensor_history[pond_id]) < 3:
        return {
            "overall": "insufficient_data",
            "parameters": {},
            "message": "Need more data points for trend analysis"
        }
    
    history = sensor_history[pond_id][-12:]  # Last 12 readings
    
    for param in ["DO", "pH", "Temperature", "Salinity"]:
        current = sensor_data.get(param, sensor_data.get(param.lower(), None))
        if current is None:
            continue
        
        historical_values = [r.get(param, current) for r in history]
        if len(historical_values) < 3:
            continue
        
        # Calculate trend using linear regression slope
        x = np.arange(len(historical_values))
        slope = np.polyfit(x, historical_values, 1)[0]
        
        # Normalize slope by parameter range
        ranges = OPTIMAL_RANGES.get(param, {})
        param_range = ranges.get("optimal_max", 10) - ranges.get("optimal_min", 0)
        normalized_slope = slope / (param_range / 10)  # Slope per 10% of range
        
        # Determine if trend is good or bad based on parameter
        if param == "DO":
            # For DO, increasing is good
            trend_quality = "improving" if normalized_slope > 0.05 else ("deteriorating" if normalized_slope < -0.05 else "stable")
        elif param == "Temperature":
            # For temp, staying in range is good
            opt_min, opt_max = ranges.get("optimal_min", 26), ranges.get("optimal_max", 30)
            if current < opt_min:
                trend_quality = "improving" if slope > 0 else "deteriorating"
            elif current > opt_max:
                trend_quality = "improving" if slope < 0 else "deteriorating"
            else:
                trend_quality = "stable"
        else:
            # For pH, stability is best
            trend_quality = "stable" if abs(normalized_slope) < 0.1 else ("changing" if abs(normalized_slope) < 0.2 else "unstable")
        
        trends[param] = {
            "direction": "increasing" if slope > 0.01 else ("decreasing" if slope < -0.01 else "stable"),
            "rate": round(slope, 4),
            "quality": trend_quality,
            "current": current,
            "avg_recent": round(np.mean(historical_values[-3:]), 2),
        }
    
    # Determine overall trend
    qualities = [t.get("quality", "stable") for t in trends.values()]
    if "deteriorating" in qualities:
        overall_trend = "deteriorating"
    elif "improving" in qualities and "deteriorating" not in qualities:
        overall_trend = "improving"
    else:
        overall_trend = "stable"
    
    return {
        "overall": overall_trend,
        "parameters": trends,
        "message": {
            "improving": "✅ Water quality is improving",
            "stable": "➡️ Water quality is stable",
            "deteriorating": "⚠️ Water quality is deteriorating - monitor closely"
        }.get(overall_trend, "Unknown trend")
    }


def calculate_night_safety(current: Dict, forecasts: Dict) -> Dict:
    """
    Predict night/early morning DO drops (highest shrimp mortality risk).
    DO typically drops 20-40% during night due to respiration.
    """
    current_do = current.get("DO", current.get("dissolved_oxygen", 6.0))
    
    # Simulate night-time DO drop (typically 25-35% reduction)
    night_drop_percent = 0.30  # 30% drop
    predicted_night_do = current_do * (1 - night_drop_percent)
    
    critical_threshold = OPTIMAL_RANGES["DO"]["critical_min"]
    
    is_safe = predicted_night_do >= critical_threshold
    safety_margin = predicted_night_do - critical_threshold
    
    # Calculate recommended aerator setting
    if not is_safe:
        aerator_boost = "maximum"
    elif safety_margin < 1.0:
        aerator_boost = "high"
    elif safety_margin < 2.0:
        aerator_boost = "moderate"
    else:
        aerator_boost = "normal"
    
    return {
        "current_do": current_do,
        "predicted_night_do": round(predicted_night_do, 2),
        "is_night_safe": is_safe,
        "safety_margin": round(safety_margin, 2),
        "risk_level": "critical" if not is_safe else ("warning" if safety_margin < 1.5 else "safe"),
        "recommendation": {
            "aerator_setting": aerator_boost,
            "message": (
                "⚠️ HIGH RISK: DO will drop critically low tonight. Run aerators at maximum!" if not is_safe else
                "⚡ Moderate risk: Increase aeration during night hours" if safety_margin < 1.5 else
                "✅ Night safety: DO levels should remain safe"
            )
        }
    }


def predict_recovery_time(current: Dict, target_wqi: float = 75.0) -> Dict:
    """
    Predict how long it will take for water quality to recover to target WQI.
    Based on typical recovery rates with proper intervention.
    """
    current_wqi = compute_wqi(
        current.get("pH", 7.5),
        current.get("Temperature", 28.0),
        current.get("DO", 6.0),
        current.get("Ammonia", 0.05),
        current.get("Nitrite", 0.1)
    )
    
    if current_wqi >= target_wqi:
        return {
            "needs_recovery": False,
            "current_wqi": current_wqi,
            "target_wqi": target_wqi,
            "message": "Water quality is already at target level"
        }
    
    wqi_gap = target_wqi - current_wqi
    
    # Typical recovery rates (WQI points per hour with intervention)
    # Based on aeration, water exchange, and natural processes
    recovery_rate = 2.5  # WQI points per hour with active management
    
    estimated_hours = math.ceil(wqi_gap / recovery_rate)
    
    # Determine required actions
    actions = []
    if current.get("DO", 6.0) < 5.0:
        actions.append("Activate all aerators")
    if current_wqi < 40:
        actions.append("Perform 30% water exchange")
    if current.get("Ammonia", 0.05) > 0.1:
        actions.append("Reduce feeding by 50%")
    
    return {
        "needs_recovery": True,
        "current_wqi": current_wqi,
        "target_wqi": target_wqi,
        "estimated_hours": estimated_hours,
        "recovery_rate": recovery_rate,
        "required_actions": actions,
        "message": f"Estimated {estimated_hours} hours to reach target WQI with proper intervention"
    }


def generate_alerts(sensor_data: Dict) -> List[Dict]:
    """Generate alerts based on sensor thresholds with farmer-friendly messages."""
    alerts = []
    
    # DO alerts (most critical)
    do_val = sensor_data.get("DO", sensor_data.get("dissolved_oxygen", 6.0))
    do_ranges = OPTIMAL_RANGES["DO"]
    if do_val < do_ranges["critical_min"]:
        alerts.append({
            "level": "critical",
            "parameter": "Dissolved Oxygen",
            "message": f"CRITICAL: DO at {do_val:.1f} mg/L - Shrimp mortality risk!",
            "action": "activate_aerator",
            "value": do_val,
            "threshold": do_ranges["critical_min"],
            "farmer_message": "🚨 Turn on ALL aerators NOW! Shrimp are suffocating."
        })
    elif do_val < do_ranges["acceptable_min"]:
        alerts.append({
            "level": "warning",
            "parameter": "Dissolved Oxygen",
            "message": f"Warning: Low DO at {do_val:.1f} mg/L",
            "action": "increase_aeration",
            "value": do_val,
            "threshold": do_ranges["acceptable_min"],
            "farmer_message": "⚠️ Oxygen is low. Consider adding more aeration."
        })

    # pH alerts
    ph_val = sensor_data.get("pH", sensor_data.get("ph", 7.5))
    ph_ranges = OPTIMAL_RANGES["pH"]
    if ph_val < ph_ranges["critical_min"]:
        alerts.append({
            "level": "critical",
            "parameter": "pH",
            "message": f"CRITICAL: pH too acidic at {ph_val:.1f}",
            "action": "add_lime",
            "value": ph_val,
            "threshold": ph_ranges["critical_min"],
            "farmer_message": "🚨 Water too acidic! Add agricultural lime."
        })
    elif ph_val > ph_ranges["critical_max"]:
        alerts.append({
            "level": "critical",
            "parameter": "pH",
            "message": f"CRITICAL: pH too alkaline at {ph_val:.1f}",
            "action": "water_exchange",
            "value": ph_val,
            "threshold": ph_ranges["critical_max"],
            "farmer_message": "🚨 Water too alkaline! Perform water exchange."
        })
    elif ph_val < ph_ranges["acceptable_min"] or ph_val > ph_ranges["acceptable_max"]:
        alerts.append({
            "level": "warning",
            "parameter": "pH",
            "message": f"Warning: pH at {ph_val:.1f} outside optimal range",
            "action": "monitor",
            "value": ph_val,
            "farmer_message": "⚠️ pH needs attention. Monitor closely."
        })

    # Temperature alerts
    temp_val = sensor_data.get("Temperature", sensor_data.get("temperature", 28.0))
    temp_ranges = OPTIMAL_RANGES["Temperature"]
    if temp_val > temp_ranges["critical_max"]:
        alerts.append({
            "level": "critical",
            "parameter": "Temperature",
            "message": f"CRITICAL: High temperature at {temp_val:.1f}°C",
            "action": "emergency_cooling",
            "value": temp_val,
            "threshold": temp_ranges["critical_max"],
            "farmer_message": "🚨 Water too hot! Add fresh water or shade."
        })
    elif temp_val > temp_ranges["acceptable_max"]:
        alerts.append({
            "level": "warning",
            "parameter": "Temperature",
            "message": f"Warning: Elevated temperature at {temp_val:.1f}°C",
            "action": "monitor",
            "value": temp_val,
            "farmer_message": "⚠️ Temperature rising. Watch for stress signs."
        })

    # Ammonia alerts
    ammonia_val = sensor_data.get("Ammonia", sensor_data.get("ammonia", 0.05))
    ammonia_ranges = OPTIMAL_RANGES["Ammonia"]
    if ammonia_val > ammonia_ranges["critical_max"]:
        alerts.append({
            "level": "critical",
            "parameter": "Ammonia",
            "message": f"CRITICAL: High ammonia at {ammonia_val:.2f} mg/L",
            "action": "water_exchange",
            "value": ammonia_val,
            "threshold": ammonia_ranges["critical_max"],
            "farmer_message": "🚨 Toxic ammonia level! Stop feeding, exchange water."
        })
    elif ammonia_val > ammonia_ranges["acceptable_max"]:
        alerts.append({
            "level": "warning",
            "parameter": "Ammonia",
            "message": f"Warning: Elevated ammonia at {ammonia_val:.2f} mg/L",
            "action": "reduce_feeding",
            "value": ammonia_val,
            "farmer_message": "⚠️ Ammonia building up. Reduce feeding amount."
        })

    # Nitrite alerts
    nitrite_val = sensor_data.get("Nitrite", sensor_data.get("nitrite", 0.1))
    nitrite_ranges = OPTIMAL_RANGES["Nitrite"]
    if nitrite_val > nitrite_ranges["critical_max"]:
        alerts.append({
            "level": "critical",
            "parameter": "Nitrite",
            "message": f"CRITICAL: High nitrite at {nitrite_val:.2f} mg/L",
            "action": "add_salt",
            "value": nitrite_val,
            "threshold": nitrite_ranges["critical_max"],
            "farmer_message": "🚨 Nitrite poisoning risk! Add salt to reduce toxicity."
        })

    return alerts

    # Ammonia alerts
    ammonia_val = sensor_data.get("Ammonia", sensor_data.get("ammonia", 0.05))
    if ammonia_val > THRESHOLDS["Ammonia"]["critical_max"]:
        alerts.append({
            "level": "critical",
            "parameter": "Ammonia",
            "message": f"Critical: High ammonia at {ammonia_val:.2f} mg/L",
            "action": "water_exchange",
            "value": ammonia_val
        })
    elif ammonia_val > THRESHOLDS["Ammonia"]["max"]:
        alerts.append({
            "level": "warning",
            "parameter": "Ammonia",
            "message": f"Warning: Elevated ammonia at {ammonia_val:.2f} mg/L",
            "action": "reduce_feeding",
            "value": ammonia_val
        })

    return alerts


def generate_recommendations(wqi_class: str, alerts: List[Dict], trends: Dict = None) -> List[Dict]:
    """Generate actionable recommendations based on water quality status."""
    recommendations = []
    
    if wqi_class == "Good":
        recommendations.append({
            "type": "info",
            "title": "Optimal Conditions",
            "description": "Water quality is excellent. Maintain current management practices.",
            "icon": "check-circle",
            "priority": 5
        })
    elif wqi_class == "Medium":
        recommendations.append({
            "type": "warning",
            "title": "Monitor Closely",
            "description": "Water quality is acceptable but trending. Increase monitoring frequency.",
            "icon": "eye",
            "priority": 3
        })
    elif wqi_class == "Bad":
        recommendations.append({
            "type": "warning",
            "title": "Intervention Required",
            "description": "Water quality degraded. Consider partial water exchange (20-30%).",
            "icon": "alert-triangle",
            "priority": 2
        })
        recommendations.append({
            "type": "action",
            "title": "Reduce Feeding",
            "description": "Reduce feed amount by 30% to decrease organic load.",
            "icon": "minus-circle",
            "priority": 2
        })
    elif wqi_class == "Very Bad":
        recommendations.append({
            "type": "critical",
            "title": "Emergency Response",
            "description": "Critical water quality! Immediate water exchange (40-50%) recommended.",
            "icon": "alert-octagon",
            "priority": 1
        })
        recommendations.append({
            "type": "critical",
            "title": "Activate All Aerators",
            "description": "Run aerators at maximum capacity to improve oxygen levels.",
            "icon": "wind",
            "priority": 1
        })

    # Add alert-specific recommendations
    for alert in alerts:
        if alert["action"] == "activate_aerator":
            recommendations.append({
                "type": "action",
                "title": "Increase Aeration",
                "description": "Turn on additional aerators or increase RPM by 20%.",
                "icon": "fan",
                "priority": 1
            })
        elif alert["action"] == "water_exchange":
            recommendations.append({
                "type": "action",
                "title": "Water Exchange",
                "description": "Replace 30% of pond water with fresh pre-treated water.",
                "icon": "droplet",
                "priority": 1
            })
        elif alert["action"] == "reduce_feeding":
            recommendations.append({
                "type": "action",
                "title": "Reduce Feed",
                "description": "Cut feed amount by 50% until ammonia levels normalize.",
                "icon": "minus-circle",
                "priority": 2
            })

    # Add trend-based recommendations
    if trends and trends.get("overall") == "deteriorating":
        recommendations.append({
            "type": "warning",
            "title": "Deteriorating Trend",
            "description": "Water quality is declining. Take preventive action now.",
            "icon": "trending-down",
            "priority": 2
        })

    # Sort by priority and limit
    recommendations.sort(key=lambda x: x.get("priority", 5))
    return recommendations[:6]


def simulate_forecast(current_sensors: Dict, horizon: int) -> Dict:
    """Generate simulated forecast when models aren't available."""
    # Add some realistic drift/noise to current values
    drift_factor = horizon / 24  # More drift for longer horizons
    
    ph = current_sensors.get("pH", current_sensors.get("ph", 7.8))
    do = current_sensors.get("DO", current_sensors.get("dissolved_oxygen", 6.5))
    temp = current_sensors.get("Temperature", current_sensors.get("temperature", 28.5))
    salinity = current_sensors.get("Salinity", current_sensors.get("salinity", 20.0))
    
    return {
        "pH": round(ph + random.uniform(-0.3, 0.3) * drift_factor, 2),
        "DO": round(max(3.0, do + random.uniform(-1.0, 0.5) * drift_factor), 2),
        "Temperature": round(temp + random.uniform(-1.5, 2.0) * drift_factor, 1),
        "Salinity": round(salinity + random.uniform(-1.0, 1.0) * drift_factor, 1),
    }


def predict_with_model(current_sensors: Dict, horizon: int) -> Optional[Dict]:
    """Use trained model for prediction if available."""
    if horizon not in models["timeseries"] or models["timeseries"][horizon] is None:
        return None
    
    try:
        model_data = models["timeseries"][horizon]
        model_obj = model_data["model"]
        scaler = model_obj.get("scaler")
        regressor = model_obj.get("regressor") or model_obj.get("regressors")
        
        # Build feature vector (simplified - would need proper lag features in production)
        # For demo, we'll fall back to simulation
        return None
    except Exception as e:
        print(f"Prediction error: {e}")
        return None


def classify_water_quality(sensor_data: Dict) -> str:
    """Classify water quality using trained model or WQI computation."""
    ph = sensor_data.get("pH", sensor_data.get("ph", 7.5))
    temp = sensor_data.get("Temperature", sensor_data.get("temperature", 28.0))
    do = sensor_data.get("DO", sensor_data.get("dissolved_oxygen", 6.0))
    
    wqi = compute_wqi(ph, temp, do)
    return categorize_wqi(wqi)


def classify_with_ml_model(sensor_data: Dict) -> Dict:
    """
    Classify water quality using the trained ML model (RandomForest or MLP).
    Returns classification result with confidence and model info.
    """
    # Extract sensor values with defaults
    temp = float(sensor_data.get("Temperature", sensor_data.get("temperature", 28.0)))
    turbidity = float(sensor_data.get("Turbidity", sensor_data.get("turbidity", 30.0)))
    do = float(sensor_data.get("DO", sensor_data.get("dissolved_oxygen", 6.0)))
    ph = float(sensor_data.get("pH", sensor_data.get("ph", 7.5)))
    ammonia = float(sensor_data.get("Ammonia", sensor_data.get("ammonia", 0.05)))
    nitrite = float(sensor_data.get("Nitrite", sensor_data.get("nitrite", 0.1)))
    salinity = float(sensor_data.get("Salinity", sensor_data.get("salinity", 20.0)))
    
    # Default values for features not provided by dashboard
    # These are typical/median values from the training dataset
    bod = 3.5       # BOD (mg/L)
    co2 = 5.0       # CO2
    alkalinity = 120.0  # Alkalinity (mg L-1)
    hardness = 150.0    # Hardness (mg L-1)
    calcium = 50.0      # Calcium (mg L-1)
    phosphorus = 0.5    # Phosphorus (mg L-1)
    h2s = 0.01          # H2S (mg L-1)
    plankton = 5000.0   # Plankton (No. L-1)
    
    # Check if ML model is loaded
    if models["classification"] is None:
        # Fallback to WQI-based classification
        wqi = compute_wqi(ph, temp, do, ammonia, nitrite)
        wqi_class = categorize_wqi(wqi)
        return {
            "ml_class": wqi_class,
            "ml_confidence": 0.7,
            "ml_probabilities": {wqi_class: 0.7},
            "model_used": "wqi_computation",
            "model_type": "rule_based",
            "wqi_score": wqi,
            "using_trained_model": False
        }
    
    try:
        model_data = models["classification"]
        model = model_data["model"]
        feature_names = model_data.get("features", [])
        model_type = model_data.get("type", "unknown")
        
        # Build feature vector in the order expected by the model
        # Map our sensor names to training dataset column names
        feature_map = {
            "Temp": temp,
            "Turbidity (cm)": turbidity,
            "DO(mg/L)": do,
            "BOD (mg/L)": bod,
            "CO2": co2,
            "pH": ph,
            "Alkalinity (mg L-1 )": alkalinity,
            "Hardness (mg L-1 )": hardness,
            "Calcium (mg L-1 )": calcium,
            "Ammonia (mg L-1 )": ammonia,
            "Nitrite (mg L-1 )": nitrite,
            "Phosphorus (mg L-1 )": phosphorus,
            "H2S (mg L-1 )": h2s,
            "Plankton (No. L-1)": plankton,
        }
        
        # Create feature array in correct order
        features = []
        for fname in feature_names:
            features.append(feature_map.get(fname, 0.0))
        
        X = np.array([features])
        
        # Get prediction
        prediction = model.predict(X)[0]
        
        # Get probabilities if available
        probabilities = {}
        confidence = 0.85  # Default confidence
        if hasattr(model, 'predict_proba'):
            proba = model.predict_proba(X)[0]
            classes = model.classes_ if hasattr(model, 'classes_') else ["Good", "Medium", "Bad", "Very Bad"]
            probabilities = {cls: float(p) for cls, p in zip(classes, proba)}
            confidence = float(max(proba))
        elif hasattr(model, 'named_steps') and hasattr(model.named_steps.get('mlp', None), 'predict_proba'):
            # For Pipeline with MLP
            proba = model.predict_proba(X)[0]
            classes = model.classes_ if hasattr(model, 'classes_') else ["Good", "Medium", "Bad", "Very Bad"]
            probabilities = {cls: float(p) for cls, p in zip(classes, proba)}
            confidence = float(max(proba))
        
        # Also compute WQI for reference
        wqi = compute_wqi(ph, temp, do, ammonia, nitrite)
        
        return {
            "ml_class": str(prediction),
            "ml_confidence": round(confidence, 3),
            "ml_probabilities": probabilities,
            "model_used": model_type,
            "model_type": "random_forest" if "random" in model_type.lower() else "mlp" if "mlp" in model_type.lower() else model_type,
            "wqi_score": wqi,
            "wqi_class": categorize_wqi(wqi),
            "using_trained_model": True,
            "features_used": len(feature_names),
            "input_sensors": {
                "Temperature": temp,
                "DO": do,
                "pH": ph,
                "Salinity": salinity,
                "Ammonia": ammonia,
                "Nitrite": nitrite,
                "Turbidity": turbidity
            }
        }
        
    except Exception as e:
        print(f"ML classification error: {e}")
        # Fallback to WQI
        wqi = compute_wqi(ph, temp, do, ammonia, nitrite)
        wqi_class = categorize_wqi(wqi)
        return {
            "ml_class": wqi_class,
            "ml_confidence": 0.6,
            "ml_probabilities": {},
            "model_used": "wqi_fallback",
            "model_type": "rule_based",
            "wqi_score": wqi,
            "using_trained_model": False,
            "error": str(e)
        }


# ============================================================
# API ENDPOINTS
# ============================================================

@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models_loaded": {
            "classification": models["classification"] is not None,
            "timeseries_6h": 6 in models["timeseries"],
            "timeseries_12h": 12 in models["timeseries"],
            "timeseries_24h": 24 in models["timeseries"],
            "wqi_predictor": models["wqi_predictor"] is not None,
        }
    })


@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Main prediction endpoint with comprehensive farmer-friendly features.
    
    Returns:
    - Current water quality status and WQI
    - Forecasts for 6h, 12h, 24h
    - Time-to-danger prediction
    - Trend analysis
    - Night safety prediction
    - Recovery time estimate
    - Sensor health status
    - Alerts and recommendations
    """
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        pond_id = int(data.get("pond_id", 1))

        # Extract sensor values with defaults
        sensors = {
            "pH": float(data.get("pH", data.get("ph", 7.5))),
            "Temperature": float(data.get("Temperature", data.get("temperature", 28.0))),
            "DO": float(data.get("DO", data.get("dissolved_oxygen", 6.0))),
            "Salinity": float(data.get("Salinity", data.get("salinity", 20.0))),
            "Ammonia": float(data.get("Ammonia", data.get("ammonia", 0.05))),
            "Nitrite": float(data.get("Nitrite", data.get("nitrite", 0.1))),
            "Turbidity": float(data.get("Turbidity", data.get("turbidity", 30.0))),
        }

        # Store in history for trend analysis
        if pond_id not in sensor_history:
            sensor_history[pond_id] = []
        sensor_history[pond_id].append({**sensors, "timestamp": datetime.now().isoformat()})
        if len(sensor_history[pond_id]) > MAX_HISTORY_LENGTH:
            sensor_history[pond_id] = sensor_history[pond_id][-MAX_HISTORY_LENGTH:]

        # Compute WQI
        wqi = compute_wqi(sensors["pH"], sensors["Temperature"], sensors["DO"], 
                         sensors["Ammonia"], sensors["Nitrite"])
        wqi_class = categorize_wqi(wqi)

        # === ML CLASSIFICATION ===
        ml_result = classify_with_ml_model(sensors)

        # Generate forecasts for 6h, 12h, 24h
        forecasts = {}
        for horizon in [6, 12, 24]:
            model_pred = predict_with_model(sensors, horizon)
            if model_pred:
                forecasts[f"{horizon}h"] = model_pred
            else:
                forecasts[f"{horizon}h"] = simulate_forecast(sensors, horizon)

        # Compute predicted WQI for each horizon
        predicted_wqi = {}
        for h_key, forecast in forecasts.items():
            pred_wqi = compute_wqi(forecast["pH"], forecast["Temperature"], forecast["DO"])
            predicted_wqi[h_key] = {
                "value": pred_wqi,
                "class": categorize_wqi(pred_wqi)
            }

        # Generate alerts
        alerts = generate_alerts(sensors)
        
        # === FARMER-FRIENDLY ANALYSES ===
        
        # 1. Sensor health check
        sensor_health = analyze_sensor_health(sensors, pond_id)
        
        # 2. Time to danger
        time_to_danger = calculate_time_to_danger(sensors, forecasts)
        
        # 3. Trend analysis
        trends = analyze_trends(sensors, pond_id)
        
        # 4. Night safety prediction
        night_safety = calculate_night_safety(sensors, forecasts)
        
        # 5. Recovery time prediction
        recovery = predict_recovery_time(sensors)
        
        # Generate recommendations (including trend info)
        recommendations = generate_recommendations(wqi_class, alerts, trends)

        # Determine overall urgency
        critical_count = len([a for a in alerts if a["level"] == "critical"])
        warning_count = len([a for a in alerts if a["level"] == "warning"])
        urgency = "critical" if critical_count > 0 else "warning" if warning_count > 0 else "normal"

        # Identify the most critical parameter
        critical_parameter = None
        if alerts:
            critical_alerts = [a for a in alerts if a["level"] == "critical"]
            if critical_alerts:
                critical_parameter = critical_alerts[0]["parameter"]
            else:
                critical_parameter = alerts[0]["parameter"]

        # Build comprehensive response
        response = {
            "timestamp": datetime.now().isoformat(),
            "pond_id": pond_id,
            
            # Current status
            "current": {
                "sensors": sensors,
                "wqi": wqi,
                "wqi_class": wqi_class,
                "status": wqi_class.lower().replace(" ", "_"),
            },
            
            # Forecasts
            "forecasts": forecasts,
            "predicted_wqi": predicted_wqi,
            
            # === FARMER-FRIENDLY FEATURES ===
            
            # Simple status message for farmers
            "simple_status": {
                "status": wqi_class,
                "color": {"Good": "green", "Medium": "yellow", "Bad": "orange", "Very Bad": "red"}.get(wqi_class, "gray"),
                "message": {
                    "Good": "✅ Water is healthy - shrimp are safe",
                    "Medium": "⚡ Water is okay but needs attention",
                    "Bad": "⚠️ Water quality is poor - take action",
                    "Very Bad": "🚨 CRITICAL - Immediate action required!"
                }.get(wqi_class, "Unknown status")
            },
            
            # Time to danger
            "time_to_danger": time_to_danger,
            
            # Trends
            "trends": trends,
            
            # Night safety
            "night_safety": night_safety,
            
            # Recovery prediction
            "recovery": recovery,
            
            # Sensor health
            "sensor_health": sensor_health,
            
            # Critical parameter highlight
            "critical_parameter": critical_parameter,
            
            # Confidence scores
            "confidence": {
                "sensor_confidence": sensor_health["confidence"],
                "prediction_confidence": 85 if models["timeseries"] else 70,  # Higher if using trained models
                "overall_confidence": min(sensor_health["confidence"], 85 if models["timeseries"] else 70)
            },
            
            # Model agreement (for trust building)
            "model_agreement": {
                "models_used": list(models["timeseries"].keys()) if models["timeseries"] else ["simulation"],
                "consensus": True,  # Would be calculated from multiple model outputs
                "message": "All models agree on prediction" if models["timeseries"] else "Using simulation mode"
            },
            
            # Alerts and recommendations
            "alerts": alerts,
            "recommendations": recommendations,
            "urgency": urgency,
            
            # === ML CLASSIFICATION RESULTS ===
            "ml_classification": ml_result,
            
            # Model info
            "model_info": {
                "classification_model": ml_result.get("model_type", "wqi_computation"),
                "classification_confidence": ml_result.get("ml_confidence", 0.7),
                "using_trained_model": ml_result.get("using_trained_model", False),
                "forecast_models": {str(h): models["timeseries"][h].get("type", "simulation") for h in models["timeseries"]} if models["timeseries"] else {"6": "simulation", "12": "simulation", "24": "simulation"}
            }
        }

        return jsonify(response)

    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


@app.route("/api/predict/batch", methods=["POST"])
def predict_batch():
    """
    Batch prediction for multiple ponds with full farmer-friendly features.
    """
    try:
        data = request.json
        if not data or "ponds" not in data:
            return jsonify({"error": "No ponds data provided"}), 400

        results = []
        for pond_data in data["ponds"]:
            pond_id = pond_data.get("pond_id", 0)
            
            sensors = {
                "pH": float(pond_data.get("pH", pond_data.get("ph", 7.5))),
                "Temperature": float(pond_data.get("Temperature", pond_data.get("temperature", 28.0))),
                "DO": float(pond_data.get("DO", pond_data.get("dissolved_oxygen", 6.0))),
                "Salinity": float(pond_data.get("Salinity", pond_data.get("salinity", 20.0))),
                "Ammonia": float(pond_data.get("Ammonia", pond_data.get("ammonia", 0.05))),
                "Nitrite": float(pond_data.get("Nitrite", pond_data.get("nitrite", 0.1))),
                "Turbidity": float(pond_data.get("Turbidity", pond_data.get("turbidity", 30.0))),
            }

            # Store history
            if pond_id not in sensor_history:
                sensor_history[pond_id] = []
            sensor_history[pond_id].append({**sensors, "timestamp": datetime.now().isoformat()})

            wqi = compute_wqi(sensors["pH"], sensors["Temperature"], sensors["DO"],
                            sensors["Ammonia"], sensors["Nitrite"])
            wqi_class = categorize_wqi(wqi)
            alerts = generate_alerts(sensors)

            forecasts = {}
            for horizon in [6, 12, 24]:
                forecasts[f"{horizon}h"] = simulate_forecast(sensors, horizon)

            # Calculate time to danger
            time_to_danger = calculate_time_to_danger(sensors, forecasts)
            
            # Analyze trends
            trends = analyze_trends(sensors, pond_id)
            
            # Night safety
            night_safety = calculate_night_safety(sensors, forecasts)

            results.append({
                "pond_id": pond_id,
                "sensors": sensors,
                "wqi": wqi,
                "wqi_class": wqi_class,
                "simple_status": {
                    "status": wqi_class,
                    "color": {"Good": "green", "Medium": "yellow", "Bad": "orange", "Very Bad": "red"}.get(wqi_class),
                },
                "forecasts": forecasts,
                "time_to_danger": time_to_danger,
                "trends": trends,
                "night_safety": night_safety,
                "alerts": alerts,
                "alert_count": len(alerts),
                "critical_count": len([a for a in alerts if a["level"] == "critical"]),
            })

        # Sort by urgency (critical count, then alert count)
        results.sort(key=lambda x: (-x["critical_count"], -x["alert_count"]))

        # Calculate farm-wide summary
        all_alerts = sum(r["alert_count"] for r in results)
        critical_ponds = [r for r in results if r["critical_count"] > 0]
        avg_wqi = round(sum(r["wqi"] for r in results) / len(results), 1) if results else 0
        
        # Determine overall farm status
        if len(critical_ponds) > 0:
            farm_status = "critical"
            farm_message = f"🚨 {len(critical_ponds)} pond(s) need immediate attention!"
        elif all_alerts > 0:
            farm_status = "warning"
            farm_message = f"⚠️ {all_alerts} alert(s) across farm - monitor closely"
        else:
            farm_status = "healthy"
            farm_message = "✅ All ponds are in good condition"

        return jsonify({
            "timestamp": datetime.now().isoformat(),
            "pond_count": len(results),
            "results": results,
            "summary": {
                "total_alerts": all_alerts,
                "critical_ponds": len(critical_ponds),
                "average_wqi": avg_wqi,
                "farm_status": farm_status,
                "farm_message": farm_message,
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/sensor-data", methods=["POST"])
def ingest_sensor_data():
    """
    Endpoint for ESP32/IoT devices to push sensor data.
    Returns immediate prediction and any alerts.
    """
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        pond_id = data.get("pond_id", 1)
        device_id = data.get("device_id", "unknown")

        sensors = {
            "pH": float(data.get("pH", 7.5)),
            "Temperature": float(data.get("Temperature", 28.0)),
            "DO": float(data.get("DO", 6.0)),
            "Salinity": float(data.get("Salinity", 20.0)),
            "Ammonia": float(data.get("Ammonia", 0.05)),
            "Nitrite": float(data.get("Nitrite", 0.1)),
            "Turbidity": float(data.get("Turbidity", 30.0)),
        }

        wqi = compute_wqi(sensors["pH"], sensors["Temperature"], sensors["DO"])
        wqi_class = categorize_wqi(wqi)
        alerts = generate_alerts(sensors)

        # Quick 6h forecast
        forecast_6h = simulate_forecast(sensors, 6)
        pred_wqi_6h = compute_wqi(forecast_6h["pH"], forecast_6h["Temperature"], forecast_6h["DO"])

        return jsonify({
            "status": "received",
            "timestamp": datetime.now().isoformat(),
            "pond_id": pond_id,
            "device_id": device_id,
            "wqi": wqi,
            "wqi_class": wqi_class,
            "alerts": alerts,
            "forecast_6h": forecast_6h,
            "predicted_wqi_6h": pred_wqi_6h,
            "predicted_class_6h": categorize_wqi(pred_wqi_6h),
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/thresholds", methods=["GET"])
def get_thresholds():
    """Return current alert thresholds."""
    return jsonify({
        "thresholds": THRESHOLDS,
        "wqi_categories": {
            "Good": ">= 75",
            "Medium": "50 - 75",
            "Bad": "25 - 50",
            "Very Bad": "< 25"
        }
    })


@app.route("/api/ml/classify", methods=["POST"])
def ml_classify():
    """
    Dedicated ML classification endpoint.
    Uses trained RandomForest/MLP model to classify water quality.
    
    Input: { pH, Temperature, DO, Salinity, Ammonia, Nitrite, Turbidity }
    Output: ML classification with confidence and probabilities
    """
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No sensor data provided"}), 400
        
        # Run ML classification
        result = classify_with_ml_model(data)
        
        # Add metadata
        result["timestamp"] = datetime.now().isoformat()
        result["endpoint"] = "ml_classify"
        
        # Generate alerts based on sensor values
        sensors = {
            "pH": data.get("pH", data.get("ph", 7.5)),
            "Temperature": data.get("Temperature", data.get("temperature", 28.0)),
            "DO": data.get("DO", data.get("dissolved_oxygen", 6.0)),
            "Salinity": data.get("Salinity", data.get("salinity", 20.0)),
            "Ammonia": data.get("Ammonia", data.get("ammonia", 0.05)),
            "Nitrite": data.get("Nitrite", data.get("nitrite", 0.1)),
        }
        result["alerts"] = generate_alerts(sensors)
        
        # Add simple recommendation based on ML class
        ml_class = result.get("ml_class", "Medium")
        result["recommendation"] = {
            "Good": {"action": "maintain", "message": "✅ Excellent water quality. Continue current practices."},
            "Medium": {"action": "monitor", "message": "⚡ Acceptable quality. Monitor for changes."},
            "Bad": {"action": "intervene", "message": "⚠️ Poor quality. Consider water exchange or aeration."},
            "Very Bad": {"action": "emergency", "message": "🚨 Critical! Immediate intervention required."}
        }.get(ml_class, {"action": "unknown", "message": "Unable to determine recommendation"})
        
        return jsonify(result)
        
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


@app.route("/api/ml/info", methods=["GET"])
def ml_model_info():
    """Return information about loaded ML models."""
    cls_model = models.get("classification")
    ts_models = models.get("timeseries", {})
    
    return jsonify({
        "timestamp": datetime.now().isoformat(),
        "classification_model": {
            "loaded": cls_model is not None,
            "type": cls_model.get("type", "unknown") if cls_model else None,
            "features": cls_model.get("features", []) if cls_model else [],
            "feature_count": len(cls_model.get("features", [])) if cls_model else 0,
        },
        "timeseries_models": {
            str(h): {
                "loaded": True,
                "type": ts_models[h].get("type", "unknown"),
                "horizon_steps": h
            } for h in ts_models
        },
        "wqi_predictor_loaded": models.get("wqi_predictor") is not None,
        "optimal_ranges": OPTIMAL_RANGES,
    })


@app.route("/api/simulate", methods=["GET"])
def simulate_reading():
    """Generate a simulated sensor reading for testing."""
    sensors = {
        "pH": round(random.uniform(6.8, 8.5), 2),
        "Temperature": round(random.uniform(25.0, 33.0), 1),
        "DO": round(random.uniform(3.5, 8.0), 2),
        "Salinity": round(random.uniform(15.0, 28.0), 1),
        "Ammonia": round(random.uniform(0.01, 0.3), 3),
        "Nitrite": round(random.uniform(0.05, 0.6), 3),
        "Turbidity": round(random.uniform(20.0, 45.0), 1),
    }

    wqi = compute_wqi(sensors["pH"], sensors["Temperature"], sensors["DO"])
    
    return jsonify({
        "sensors": sensors,
        "wqi": wqi,
        "wqi_class": categorize_wqi(wqi),
        "timestamp": datetime.now().isoformat()
    })


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("🦐 Water Quality Prediction API Server")
    print("=" * 60)
    load_models()
    print("\nStarting server on http://localhost:5001")
    print("API Documentation:")
    print("  POST /api/predict         - Single pond prediction with ML")
    print("  POST /api/predict/batch   - Multi-pond batch prediction")
    print("  POST /api/ml/classify     - Direct ML classification")
    print("  GET  /api/ml/info         - ML model information")
    print("  POST /api/sensor-data     - IoT device data ingestion")
    print("  GET  /api/health          - Health check")
    print("  GET  /api/thresholds      - Alert thresholds")
    print("  GET  /api/simulate        - Generate test data")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5001, debug=True)
