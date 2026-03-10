"""
IoT Gateway API - Receives sensor data from ESP32 and stores in MongoDB
Handles TDS, Conductivity, and Temperature readings
Integrates physics-based calculations for water quality parameters
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
import os
import logging
from dotenv import load_dotenv
from physics_calculator import PhysicsCalculator
import joblib
import numpy as np

# Load ML Models
MODEL_DIR = os.path.join(os.path.dirname(__file__), "../water_quality_testing/saved_models")
try:
    rf_model = joblib.load(os.path.join(MODEL_DIR, "rf_regressor.pkl"))
    rf_scaler = joblib.load(os.path.join(MODEL_DIR, "regression_scaler.pkl"))
except Exception as e:
    rf_model = None
    rf_scaler = None

# Load Time-Series LSTM Model
try:
    import tensorflow as tf
    from tensorflow import keras
    lstm_model = keras.models.load_model(os.path.join(MODEL_DIR, "lstm_model.keras"))
    lstm_scaler = joblib.load(os.path.join(MODEL_DIR, "lstm_scaler.pkl"))
except Exception as e:
    lstm_model = None
    lstm_scaler = None

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if rf_model and rf_scaler:
    logger.info("✅ ML Regression Models loaded successfully")
else:
    logger.warning("⚠️ ML Regression Models could not be loaded")
    
if lstm_model and lstm_scaler:
    logger.info("✅ ML Time-Series (LSTM) Models loaded successfully")
else:
    logger.warning("⚠️ ML Time-Series Models could not be loaded")

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "shrimp_farm_iot")
COLLECTION_NAME = "sensor_readings"

# Connect to MongoDB (with retry logic)
client = None
db = None
collection = None

def connect_to_mongodb():
    global client, db, collection
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]
        
        # Create indexes for better query performance
        collection.create_index("timestamp")
        collection.create_index("device_id")
        collection.create_index([("timestamp", -1)])
        
        logger.info("✅ Connected to MongoDB successfully")
        return True
    except Exception as e:
        logger.warning(f"⚠️  MongoDB connection failed: {e}")
        logger.warning("   The API will still work but data won't persist until MongoDB is online")
        return False

# Try to connect to MongoDB on startup
connect_to_mongodb()


# ═══════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════

class SensorReading:
    """Validates and represents a sensor reading"""
    
    def __init__(self, device_id, tds_value=None, conductivity=None, temperature=None, battery=None,
                 ph=None, alkalinity=None, turbidity_ntu=None, secchi_cm=None,
                 chlorophyll_a_ug_l=None, tan_mg_l=None, nh3_mg_l=None,
                 no2_mg_l=None, no3_mg_l=None, orp_mv=None, salinity_ppt=None, do_mg_l=None):
        self.device_id = device_id
        self.tds_value = float(tds_value) if tds_value is not None else None
        self.conductivity = float(conductivity) if conductivity is not None else None
        self.temperature = float(temperature) if temperature is not None else None
        self.battery = float(battery) if battery is not None else None
        
        self.ph = float(ph) if ph is not None else None
        self.alkalinity = float(alkalinity) if alkalinity is not None else None
        self.turbidity_ntu = float(turbidity_ntu) if turbidity_ntu is not None else None
        self.secchi_cm = float(secchi_cm) if secchi_cm is not None else None
        self.chlorophyll_a_ug_l = float(chlorophyll_a_ug_l) if chlorophyll_a_ug_l is not None else None
        self.tan_mg_l = float(tan_mg_l) if tan_mg_l is not None else None
        self.nh3_mg_l = float(nh3_mg_l) if nh3_mg_l is not None else None
        self.no2_mg_l = float(no2_mg_l) if no2_mg_l is not None else None
        self.no3_mg_l = float(no3_mg_l) if no3_mg_l is not None else None
        self.orp_mv = float(orp_mv) if orp_mv is not None else None
        self.salinity_ppt = float(salinity_ppt) if salinity_ppt is not None else None
        self.do_mg_l = float(do_mg_l) if do_mg_l is not None else None

        self.timestamp = datetime.utcnow()
        self.physics_calculations = None
        self.ml_predictions = None
    
    def validate(self):
        """Validate sensor readings"""
        if not self.device_id:
            raise ValueError("device_id is required")
        
        if self.tds_value is not None and (self.tds_value < 0 or self.tds_value > 50000):
            raise ValueError(f"TDS value {self.tds_value} out of realistic range (0-50000 ppm)")
        
        if self.conductivity is not None and (self.conductivity < 0 or self.conductivity > 200000):
            raise ValueError(f"Conductivity {self.conductivity} out of range")
        
        if self.temperature is not None and (self.temperature < -10 or self.temperature > 50):
            raise ValueError(f"Temperature {self.temperature} unrealistic for water")
        
        if self.battery is not None and (self.battery < 0 or self.battery > 100):
            raise ValueError(f"Battery percentage must be 0-100")
        
        return True
    
    def calculate_ml_features(self):
        """Prepare features array for RF regressor prediction."""
        import math
        temp = self.temperature if self.temperature is not None else 28.0
        salinity = self.salinity_ppt if self.salinity_ppt is not None else 20.0
        
        # ─── Synthesize pH if missing ───
        # Shrimp ponds fluctuate: Higher in late afternoon (photosynthesis removes CO2)
        # Lower at night to early morning (respiration adds CO2 back)
        if self.ph is None:
            base_ph = 7.8  # standard baseline
            
            # Predict the hour impact (highest at 15:00, lowest at 03:00)
            hour = self.timestamp.hour
            # shift the curve so peak is in afternoon
            diurnal_shift = math.sin((hour - 9) / 24.0 * 2 * math.pi) * 0.4
            
            # slight salinity buffering (marine water resists drops better)
            salinity_buffer = (salinity - 15) * 0.01 
            
            estimated_ph = base_ph + diurnal_shift + salinity_buffer
            
            # slight temp effect on CO2 solubility (warmer = less co2 = slightly higher pH)
            if self.temperature is not None:
                estimated_ph += (self.temperature - 25.0) * 0.015
                
            # Clamp to safe boundaries
            self.ph = max(7.0, min(8.6, round(estimated_ph, 2)))
        
        ph = self.ph
        
        hour = self.timestamp.hour
        month = self.timestamp.month
        
        # ─── Data-Driven Proxies for Missing Sensors ───
        # Equations derived via Multiple Linear Regression on cleaned_data.csv
        # (Sri Lankan shrimp farm dataset, ~26-33°C, 17-32 ppt salinity)
        
        # 1. Alkalinity — weak correlation; primarily buffered by salinity
        if self.alkalinity is None:
            self.alkalinity = max(64.3, min(154.3, round(
                106.69 + (temp * -0.463) + (salinity * 0.047) + (ph * 2.066), 1)))
            
        # 2. Chlorophyll-a — strongest predictor: Temperature + pH (R²≈0.93)
        if self.chlorophyll_a_ug_l is None:
            self.chlorophyll_a_ug_l = max(10.0, min(190.4, round(
                -821.44 + (temp * 10.392) + (salinity * 2.625) + (ph * 68.745), 1)))
            
        # 3. Turbidity — driven by Temperature & pH (corr ~0.49 each)
        if self.turbidity_ntu is None:
            self.turbidity_ntu = max(17.9, min(194.7, round(
                -216.92 + (temp * 3.991) + (salinity * 0.809) + (ph * 22.980), 1)))
            
        # 4. Secchi Depth — inverse of Turbidity drivers (corr ~-0.44 with temp)
        if self.secchi_cm is None:
            self.secchi_cm = max(8.0, min(13.2, round(
                21.23 + (temp * -0.137) + (salinity * -0.031) + (ph * -0.973), 2)))
            
        # 5. Total Ammonia Nitrogen (TAN) — mainly driven by NH3 in data
        if self.tan_mg_l is None:
            self.tan_mg_l = max(0.0, min(1.3, round(
                0.59 + (temp * -0.001) + (salinity * 0.001) + (ph * 0.002), 3)))
            
        # 6. NH3 (toxic fraction) — use physics calculation override if available
        if self.nh3_mg_l is None:
            self.nh3_mg_l = 0.03
        if self.physics_calculations and 'nh3' in self.physics_calculations:
            self.nh3_mg_l = self.physics_calculations['nh3'].get('nh3_mg_l', self.nh3_mg_l)
            
        # 7. Nitrite (NO2) — weak correlation; small regression estimate
        if self.no2_mg_l is None:
            self.no2_mg_l = max(0.0, min(1.8, round(
                0.81 + (temp * -0.002) + (salinity * 0.002) + (ph * 0.000), 3)))
            
        # 8. Nitrate (NO3) — moderate correlation with Temperature
        if self.no3_mg_l is None:
            self.no3_mg_l = max(26.7, min(240.0, round(
                136.04 + (temp * 3.990) + (salinity * 1.015) + (ph * -15.533), 1)))
            
        # 9. ORP — very strong correlation with DO (0.86) and pH (0.74)
        if self.orp_mv is None:
            self.orp_mv = max(153.9, min(319.9, round(
                -333.01 + (temp * -1.698) + (salinity * -2.850) + (ph * 88.162), 1)))
        
        hour = self.timestamp.hour
        month = self.timestamp.month
        hour_sin = math.sin((2 * math.pi * hour) / 24.0)
        hour_cos = math.cos((2 * math.pi * hour) / 24.0)
        
        return np.array([[temp, salinity, ph, self.alkalinity, self.turbidity_ntu, self.secchi_cm, self.chlorophyll_a_ug_l, 
                          self.tan_mg_l, self.nh3_mg_l, self.no2_mg_l, self.no3_mg_l, self.orp_mv, hour_sin, hour_cos, month]])
    
    def to_dict(self):
        """Convert to dictionary for MongoDB storage"""
        return {
            "device_id": self.device_id,
            "tds_value": self.tds_value,
            "conductivity": self.conductivity,
            "temperature": self.temperature,
            "battery": self.battery,
            "ph": self.ph,
            "alkalinity": self.alkalinity,
            "turbidity_ntu": self.turbidity_ntu,
            "secchi_cm": self.secchi_cm,
            "chlorophyll_a_ug_l": self.chlorophyll_a_ug_l,
            "tan_mg_l": self.tan_mg_l,
            "nh3_mg_l": self.nh3_mg_l,
            "no2_mg_l": self.no2_mg_l,
            "no3_mg_l": self.no3_mg_l,
            "orp_mv": self.orp_mv,
            "salinity_ppt": self.salinity_ppt,
            "do_mg_l": self.do_mg_l,
            "timestamp": self.timestamp,
            "physics_calculations": self.physics_calculations,
            "ml_predictions": self.ml_predictions
        }


# ═══════════════════════════════════════════════════
# ALERT SYSTEM
# ═══════════════════════════════════════════════════

# Sri Lankan shrimp farm water quality thresholds
SHRIMP_THRESHOLDS = {
    "temperature":    {"min": 28.0,  "max": 33.0,  "unit": "°C",    "label": "Temperature"},
    "ph":             {"min": 7.5,   "max": 8.5,   "unit": "",     "label": "pH"},
    "do_mg_l":        {"min": 5.0,   "max": 15.0,  "unit": "mg/L", "label": "Dissolved Oxygen"},
    "salinity_ppt":   {"min": 10.0,  "max": 25.0,  "unit": "ppt",  "label": "Salinity"},
    "nh3_mg_l":       {"min": 0.0,   "max": 0.1,   "unit": "mg/L", "label": "Ammonia (NH₃)"},
    "no2_mg_l":       {"min": 0.0,   "max": 1.0,   "unit": "mg/L", "label": "Nitrite (NO₂)"},
    "secchi_cm":      {"min": 25.0,  "max": 45.0,  "unit": "cm",   "label": "Water Transparency (Secchi)"},
    "alkalinity":     {"min": 100.0, "max": 200.0, "unit": "mg/L", "label": "Alkalinity"},
}

def generate_alerts(reading):
    """Check all sensor values against Sri Lankan shrimp farm thresholds.
    
    Returns a list of alert dicts, each containing:
      - parameter: field name
      - label: human-readable name
      - value: measured / inferred value
      - unit: measurement unit
      - status: 'critical_high' | 'warning_high' | 'critical_low' | 'warning_low'
      - message: human-readable alert string
    """
    alerts = []
    
    # Map field names to their current values after all inference is done
    values = {
        "temperature":  reading.temperature,
        "ph":           reading.ph,
        # Prefer the ML-predicted DO if available, else the measured value
        "do_mg_l":      (
            reading.ml_predictions.get("predicted_do_mg_l")
            if reading.ml_predictions and "predicted_do_mg_l" in reading.ml_predictions
            else reading.do_mg_l
        ),
        "salinity_ppt": reading.salinity_ppt,
        "nh3_mg_l":     reading.nh3_mg_l,
        "no2_mg_l":     reading.no2_mg_l,
        "secchi_cm":    reading.secchi_cm,
        "alkalinity":   reading.alkalinity,
    }
    
    for field, val in values.items():
        if val is None:
            continue
        thresh = SHRIMP_THRESHOLDS.get(field)
        if not thresh:
            continue
        
        label = thresh["label"]
        unit  = thresh["unit"]
        lo    = thresh["min"]
        hi    = thresh["max"]
        
        if val < lo:
            alerts.append({
                "parameter": field,
                "label": label,
                "value": round(val, 3),
                "optimal_min": lo,
                "optimal_max": hi,
                "unit": unit,
                "status": "critical_low" if val < lo * 0.9 else "warning_low",
                "message": f"⚠️ {label} too LOW: {round(val, 2)} {unit} (optimal: {lo}–{hi} {unit})"
            })
        elif val > hi:
            alerts.append({
                "parameter": field,
                "label": label,
                "value": round(val, 3),
                "optimal_min": lo,
                "optimal_max": hi,
                "unit": unit,
                "status": "critical_high" if val > hi * 1.1 else "warning_high",
                "message": f"🚨 {label} too HIGH: {round(val, 2)} {unit} (optimal: {lo}–{hi} {unit})"
            })
    
    # ─── Compound / Multi-Parameter Rules ───
    temp  = values.get("temperature")
    do    = values.get("do_mg_l")
    ph    = values.get("ph")
    tan   = reading.tan_mg_l
    orp   = reading.orp_mv
    secchi = values.get("secchi_cm")
    
    # Rule 1: Possible Low Oxygen (Temperature + ORP combo)
    if temp is not None and orp is not None:
        if temp > 32.0 and orp < 220.0:
            alerts.append({
                "parameter": "compound_low_oxygen_risk",
                "label": "Low Oxygen Risk",
                "status": "warning_compound",
                "trigger": f"Temp={round(temp,1)}°C > 32 AND ORP={round(orp,1)} mV < 220",
                "message": "🚨 Possible LOW OXYGEN: High temperature + low ORP detected. Check aerators!"
            })
    
    # Rule 2: Ammonia Danger (pH + TAN combo)
    if ph is not None and tan is not None:
        if ph > 8.5 and tan > 0.5:
            alerts.append({
                "parameter": "compound_ammonia_danger",
                "label": "Ammonia Danger",
                "status": "critical_compound",
                "trigger": f"pH={round(ph,2)} > 8.5 AND TAN={round(tan,3)} mg/L > 0.5",
                "message": "☠️ AMMONIA DANGER: High pH amplifies ammonia toxicity. Immediate action required!"
            })
    
    # Rule 3: Algae Bloom (Secchi depth too low)
    if secchi is not None:
        if secchi < 20.0:
            alerts.append({
                "parameter": "compound_algae_bloom",
                "label": "Algae Bloom",
                "status": "warning_compound",
                "trigger": f"Secchi={round(secchi,1)} cm < 20",
                "message": "🟢 ALGAE BLOOM: Water too turbid (Secchi < 20 cm). Reduce feeding and check aeration."
            })
    
    return alerts


# ═══════════════════════════════════════════════════
# TEMPERATURE → DO PREDICTION  (Physics: Henry's Law)
# ═══════════════════════════════════════════════════

def predict_do_from_temperature(temperature_c, salinity_ppt=20.0, hours_ahead=1):
    """
    Predict Dissolved Oxygen based on temperature using Henry's Law.

    DO saturation (mg/L) decreases as temperature rises.
    Formula calibrated for brackish water (salinity 15-25 ppt):
        DO_sat = 14.62 - 0.3898*T + 0.006969*T² - 0.00005896*T³
    Then adjusted for salinity (Benson-Krause correction):
        DO_sal = DO_sat * exp(-salinity * 0.0175)

    For forecasting hours_ahead, we apply a conservative drift:
        - Temperature is assumed to rise 0.3 °C/h during day (06-18h)
        - Temperature is assumed to drop 0.1 °C/h at night

    Returns dict with prediction details.
    """
    import math
    T = float(temperature_c)
    S = float(salinity_ppt) if salinity_ppt is not None else 20.0

    def do_sat(t, s):
        """DO saturation at temperature t (°C) and salinity s (ppt)."""
        do_fresh = 14.62 - 0.3898*t + 0.006969*t**2 - 0.00005896*t**3
        do_salt  = do_fresh * math.exp(-s * 0.0175)
        return max(0.0, round(do_salt, 3))

    current_sat = do_sat(T, S)

    # Forecast temperature drift
    hour = datetime.utcnow().hour
    drift_per_h = 0.3 if 6 <= hour < 18 else -0.1   # °C per hour
    T_future = T + drift_per_h * hours_ahead
    future_sat = do_sat(T_future, S)

    # Risk assessment
    if future_sat < 4.0:
        risk = "critical"   # relay must be ON
    elif future_sat < 5.0:
        risk = "high"       # pre-emptive relay ON
    elif future_sat < 6.0:
        risk = "warning"    # alert only
    else:
        risk = "safe"

    return {
        "current_do_sat_mg_l":    current_sat,
        "predicted_do_sat_1h":    future_sat,
        "temp_used_c":            round(T, 2),
        "temp_1h_forecast_c":     round(T_future, 2),
        "salinity_ppt":           S,
        "method":                 "Henry's Law (Benson-Krause brackish correction)",
        "risk_level":             risk,
        "aerator_recommended":    risk in ("critical", "high"),
    }


# ═══════════════════════════════════════════════════
# RELAY CONTROL
# ═══════════════════════════════════════════════════

# In-memory relay state (ESP32 polls this)
relay_state = {
    "aerator": "OFF",        # Main aerator relay
    "reason": None,           # Why was it turned on?
    "triggered_at": None,     # Timestamp of last trigger
    "do_level": None,         # DO level that caused the trigger
    "trigger_source": None,   # 'measured_do' | 'ml_do' | 'temp_prediction'
}

DO_CRITICAL_LOW  = 4.0   # mg/L — turn aerator ON below this (measured/ML DO)
DO_SAFE_LEVEL    = 5.5   # mg/L — turn aerator OFF above this (hysteresis)
DO_PREEMPT_LOW   = 4.5   # mg/L — turn ON early from temperature prediction

def update_relay_from_do(do_value, source="measured_do", temp_c=None, salinity_ppt=20.0):
    """
    Manage aerator relay based on:
      1. Measured / ML-predicted DO directly
      2. Temperature-based DO forecast (pre-emptive)
    """
    global relay_state

    # ── 1. Temperature-based pre-emptive trigger ──────────────
    if temp_c is not None:
        temp_pred = predict_do_from_temperature(temp_c, salinity_ppt, hours_ahead=1)
        
        # Turn ON if temp > 32
        if temp_c > 32.0 and relay_state["aerator"] != "ON":
            relay_state["aerator"]       = "ON"
            relay_state["reason"]        = f"Temperature High: {round(temp_c,1)}°C (> 32°C)"
            relay_state["triggered_at"]  = datetime.utcnow().isoformat()
            relay_state["do_level"]      = temp_pred["current_do_sat_mg_l"]
            relay_state["trigger_source"]= "temp_prediction"
            logger.warning(f"🌡️ RELAY ON (Temp out of bounds) — {relay_state['reason']}")
            
        # Turn OFF if temp <= 29 (and it was the temp that originally triggered it)
        elif temp_c <= 29.0 and relay_state["aerator"] == "ON" and relay_state.get("trigger_source") == "temp_prediction":
            relay_state["aerator"]       = "OFF"
            relay_state["reason"]        = f"Temperature Cooled: {round(temp_c,1)}°C (<= 29°C)"
            relay_state["triggered_at"]  = datetime.utcnow().isoformat()
            relay_state["do_level"]      = temp_pred["current_do_sat_mg_l"]
            relay_state["trigger_source"]= "temp_prediction"
            logger.info(f"🟢 RELAY OFF — {relay_state['reason']}")
            
        # Store latest temp prediction in relay_state regardless
        relay_state["temp_prediction"] = temp_pred

    # ── 2. Direct DO trigger ──────────────────────────────────
    if do_value is None:
        return None

    if do_value < DO_CRITICAL_LOW and relay_state["aerator"] != "ON":
        relay_state["aerator"]       = "ON"
        relay_state["reason"]        = f"DO critically low: {round(do_value, 2)} mg/L (< {DO_CRITICAL_LOW})"
        relay_state["triggered_at"]  = datetime.utcnow().isoformat()
        relay_state["do_level"]      = round(do_value, 3)
        relay_state["trigger_source"]= source
        logger.warning(f"🔴 RELAY ON — Aerator activated! {relay_state['reason']}")

    elif do_value >= DO_SAFE_LEVEL and relay_state["aerator"] == "ON" and relay_state.get("trigger_source") != "temp_prediction":
        relay_state["aerator"]       = "OFF"
        relay_state["reason"]        = f"DO recovered: {round(do_value, 2)} mg/L (>= {DO_SAFE_LEVEL})"
        relay_state["triggered_at"]  = datetime.utcnow().isoformat()
        relay_state["do_level"]      = round(do_value, 3)
        relay_state["trigger_source"]= source
        logger.info(f"🟢 RELAY OFF — Aerator deactivated. {relay_state['reason']}")

    return None


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    try:
        if client is not None:
            client.admin.command('ping')
            db_status = "connected"
        else:
            db_status = "offline"
        
        return jsonify({
            "status": "healthy",
            "api": "running",
            "database": db_status,
            "relay": relay_state,
            "timestamp": datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({"status": "unhealthy", "error": str(e)}), 500


@app.route("/api/relay/status", methods=["GET"])
def get_relay_status():
    """ESP32 polls this endpoint every few seconds to know if it should switch ON/OFF.
    
    Returns:
        {"aerator": "ON" | "OFF", "reason": "...", "do_level": 3.8, ...}
    """
    return jsonify(relay_state), 200


@app.route("/api/relay/command", methods=["POST"])
def set_relay_command():
    """Manual override: farmer/dashboard forces the relay ON or OFF.
    
    Body: {"aerator": "ON" | "OFF", "reason": "manual"}
    """
    global relay_state
    data = request.get_json()
    if not data or "aerator" not in data:
        return jsonify({"error": "Provide {\"aerator\": \"ON\" or \"OFF\"}"}), 400
    
    cmd = data["aerator"].upper()
    if cmd not in ("ON", "OFF"):
        return jsonify({"error": "aerator must be ON or OFF"}), 400
    
    relay_state["aerator"]      = cmd
    relay_state["reason"]       = data.get("reason", "manual override")
    relay_state["triggered_at"] = datetime.utcnow().isoformat()
    relay_state["do_level"]     = None
    logger.info(f"Manual relay command: aerator={cmd}")
    return jsonify({"status": "ok", "relay": relay_state}), 200


@app.route("/api/sensor/reading", methods=["POST"])
def receive_sensor_data():
    """
    Receive sensor data from ESP32
    
    Expected JSON payload:
    {
        "device_id": "esp32_001",
        "tds_value": 1200.5,
        "conductivity": 2400.0,
        "temperature": 28.5,
        "battery": 85
    }
    """
    try:
        if collection is None:
            return jsonify({
                "error": "Database is currently offline",
                "hint": "Please ensure MongoDB is running"
            }), 503
        
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Create and validate sensor reading
        reading = SensorReading(
            device_id=data.get("device_id"),
            tds_value=data.get("tds_value"),
            conductivity=data.get("conductivity"),
            temperature=data.get("temperature"),
            battery=data.get("battery"),
            ph=data.get("ph"),
            alkalinity=data.get("alkalinity"),
            turbidity_ntu=data.get("turbidity_ntu"),
            secchi_cm=data.get("secchi_cm"),
            chlorophyll_a_ug_l=data.get("chlorophyll_a_ug_l"),
            tan_mg_l=data.get("tan_mg_l"),
            nh3_mg_l=data.get("nh3_mg_l"),
            no2_mg_l=data.get("no2_mg_l"),
            no3_mg_l=data.get("no3_mg_l"),
            orp_mv=data.get("orp_mv"),
            salinity_ppt=data.get("salinity_ppt"),
            do_mg_l=data.get("do_mg_l")
        )
        
        # Validate
        reading.validate()
        
        # Ensure synthetic variables (like pH) are generated BEFORE physics calculations
        features = reading.calculate_ml_features()
        
        # Run Physics Calculations
        physics_input = {
            "temperature_c": reading.temperature if reading.temperature is not None else 28.0,
            "ph": reading.ph if reading.ph is not None else 7.8,
            "dissolved_oxygen_mg_l": reading.do_mg_l if reading.do_mg_l is not None else 6.0,
            "salinity_ppt": reading.salinity_ppt if reading.salinity_ppt is not None else 20.0,
            "conductivity_us_cm": reading.conductivity if reading.conductivity is not None else 4000.0,
            "tan_mg_l": reading.tan_mg_l if reading.tan_mg_l is not None else 0.5
        }
        report = PhysicsCalculator.calculate_comprehensive_report(physics_input)
        reading.physics_calculations = report.get("calculations", {})
        
        # Run ML Predictions (RF regressor)
        if rf_model and rf_scaler:
            try:
                features_scaled = rf_scaler.transform(features)
                predicted_do = rf_model.predict(features_scaled)[0]
                reading.ml_predictions = {
                    "predicted_do_mg_l": round(float(predicted_do), 3),
                    "model_used": "RandomForestRegressor"
                }
            except Exception as e:
                logger.error(f"⚠️ ML Prediction failed: {e}")
                reading.ml_predictions = {"error": str(e)}
        
        # Temperature → DO prediction (physics, always runs)
        temp_do_pred = None
        if reading.temperature is not None:
            temp_do_pred = predict_do_from_temperature(
                reading.temperature,
                salinity_ppt=reading.salinity_ppt or 20.0,
                hours_ahead=1
            )
            if reading.ml_predictions is None:
                reading.ml_predictions = {}
            reading.ml_predictions["do_from_temp_current"] = temp_do_pred["current_do_sat_mg_l"]
            reading.ml_predictions["do_from_temp_1h"]      = temp_do_pred["predicted_do_sat_1h"]

        # ─── LSTM TIME-SERIES FORECASTING ───
        # Try to forecast the next hour's DO using the past 24 hours of data
        if lstm_model and lstm_scaler and collection is not None:
            try:
                # Calculate the timestamp threshold for 24 hours ago
                from datetime import timedelta
                time_threshold = datetime.utcnow() - timedelta(hours=24)
                
                # Fetch recent docs for this device
                recent_docs = list(collection.find(
                    {
                        "device_id": data.get("device_id"),
                        "timestamp": {"$gte": time_threshold}
                    },
                    {
                        "timestamp": 1, "temperature": 1, "salinity_ppt": 1, "ph": 1, "do_mg_l": 1,
                        "alkalinity": 1, "turbidity_ntu": 1, "tan_mg_l": 1, "nh3_mg_l": 1,
                        "no2_mg_l": 1, "orp_mv": 1
                    }
                ).sort("timestamp", 1))
                
                if len(recent_docs) > 0:
                    import pandas as pd
                    
                    df_recent = pd.DataFrame(recent_docs)
                    df_recent.set_index("timestamp", inplace=True)
                    
                    # Convert to numeric to avoid object aggregation errors
                    cols_to_convert = [
                        "temperature", "salinity_ppt", "ph", "do_mg_l",
                        "alkalinity", "turbidity_ntu", "tan_mg_l", "nh3_mg_l",
                        "no2_mg_l", "orp_mv"
                    ]
                    for col in cols_to_convert:
                        if col in df_recent.columns:
                            df_recent[col] = pd.to_numeric(df_recent[col], errors='coerce')
                    
                    # Resample into hourly averages (only on numeric columns)
                    import numpy as np
                    df_hourly = df_recent.select_dtypes(include=[np.number]).resample("1h").mean().interpolate(method='linear')
                    
                    # Target 24 rows minimum
                    # Pad missing rows backwards if we have less than 24 hours of history
                    while len(df_hourly) < 24:
                        if len(df_hourly) > 0:
                            df_hourly = pd.concat([df_hourly.iloc[[0]], df_hourly])
                        elif reading.ml_predictions:
                            break
                            
                    # Get exact tail of 24
                    df_24h = df_hourly.tail(24).copy()
                    
                    # Map exactly to what the LSTM needs
                    lookback_features = np.zeros((24, 12))
                    
                    if len(df_24h) == 24:
                        for i, (idx, row) in enumerate(df_24h.iterrows()):
                            import math
                            # Handle potential NaNs with fallbacks
                            tmp = row.get("temperature", reading.temperature or 28.0)
                            if pd.isna(tmp): tmp = reading.temperature or 28.0
                                
                            sal = row.get("salinity_ppt", reading.salinity_ppt or 20.0)
                            if pd.isna(sal): sal = reading.salinity_ppt or 20.0
                                
                            ph_val = row.get("ph", reading.ph or 7.8)
                            if pd.isna(ph_val): ph_val = reading.ph or 7.8
                                
                            do = row.get("do_mg_l", reading.do_mg_l or 6.0)
                            if pd.isna(do): do = reading.do_mg_l or 6.0
                                
                            alk = row.get("alkalinity", reading.alkalinity or 120.0)
                            if pd.isna(alk): alk = reading.alkalinity or 120.0
                                
                            turb = row.get("turbidity_ntu", reading.turbidity_ntu or 15.0)
                            if pd.isna(turb): turb = reading.turbidity_ntu or 15.0
                                
                            tan = row.get("tan_mg_l", reading.tan_mg_l or 0.5)
                            if pd.isna(tan): tan = reading.tan_mg_l or 0.5
                                
                            nh3 = row.get("nh3_mg_l", reading.nh3_mg_l or 0.03)
                            if pd.isna(nh3): nh3 = reading.nh3_mg_l or 0.03
                                
                            no2 = row.get("no2_mg_l", reading.no2_mg_l or 0.1)
                            if pd.isna(no2): no2 = reading.no2_mg_l or 0.1
                                
                            orp = row.get("orp_mv", reading.orp_mv or 250.0)
                            if pd.isna(orp): orp = reading.orp_mv or 250.0
                            
                            hour = idx.hour
                            hour_sin = math.sin((2 * math.pi * hour) / 24.0)
                            hour_cos = math.cos((2 * math.pi * hour) / 24.0)
                            
                            lookback_features[i] = [
                                tmp, sal, ph_val, do, alk, turb, tan, nh3, no2, orp, hour_sin, hour_cos
                            ]
                        
                        # Scale
                        scaled_seq = lstm_scaler.transform(lookback_features)
                        # Reshape to (1, 24, 12)
                        scaled_seq = scaled_seq.reshape(1, 24, 12)
                        
                        # Predict
                        pred_scaled = lstm_model.predict(scaled_seq, verbose=0).flatten()
                        
                        # Inverse transform just the DO column (index 3)
                        dummy = np.zeros((1, 12))
                        dummy[0, 3] = pred_scaled[0]
                        pred_actual = lstm_scaler.inverse_transform(dummy)[0, 3]
                        
                        if reading.ml_predictions is None:
                            reading.ml_predictions = {}
                        reading.ml_predictions["predicted_next_hour_do_mg_l"] = round(float(pred_actual), 3)
                        logger.info(f"✅ LSTM Success. Next Hour DO: {round(float(pred_actual), 3)}")
                    else:
                        logger.warning(f"⚠️ LSTM Skipped. df_24h length: {len(df_24h)}")
            
            except Exception as e:
                logger.error(f"⚠️ Time-Series LSTM Prediction failed: {e}")
            reading.ml_predictions["temp_1h_forecast_c"]   = temp_do_pred["temp_1h_forecast_c"]
            reading.ml_predictions["temp_do_risk"]         = temp_do_pred["risk_level"]
            reading.ml_predictions["aerator_recommended"]  = temp_do_pred["aerator_recommended"]
        
        # Save to MongoDB
        result = collection.insert_one(reading.to_dict())
        
        # Generate threshold alerts AFTER saving base reading
        alerts = generate_alerts(reading)
        
        # Temp-based compound alert
        if temp_do_pred and temp_do_pred["risk_level"] in ("critical", "high", "warning"):
            alerts.append({
                "parameter": "compound_temp_do_risk",
                "label": "High Temp → Low DO Risk",
                "status": "critical_compound" if temp_do_pred["risk_level"] == "critical" else "warning_compound",
                "trigger": f"Temp={temp_do_pred['temp_used_c']}°C, predicted DO 1h={temp_do_pred['predicted_do_sat_1h']} mg/L",
                "message": (
                    f"🌡️ HIGH TEMP ({temp_do_pred['temp_used_c']}°C) → "
                    f"Predicted DO drops to {temp_do_pred['predicted_do_sat_1h']} mg/L in 1h! "
                    f"Risk: {temp_do_pred['risk_level'].upper()}. "
                    f"{'Aerator ON required.' if temp_do_pred['aerator_recommended'] else 'Monitor closely.'}"
                )
            })
        
        # Auto-control aerator relay (checks both DO and temperature prediction)
        current_do = (
            reading.ml_predictions.get("predicted_do_mg_l")
            if reading.ml_predictions and "predicted_do_mg_l" in reading.ml_predictions
            else reading.do_mg_l
        )
        update_relay_from_do(
            current_do,
            source="ml_do",
            temp_c=reading.temperature,
            salinity_ppt=reading.salinity_ppt or 20.0
        )

        
        if alerts or True:  # Always patch to keep relay_state fresh in DB
            patch = {"alerts": alerts, "relay_state": relay_state}
            collection.update_one({"_id": result.inserted_id}, {"$set": patch})
            for a in alerts:
                logger.warning(a["message"])
        
        logger.info(f"✅ Saved sensor reading: {result.inserted_id}")
        
        response_data = {
            "status": "success",
            "message": "Sensor data saved",
            "id": str(result.inserted_id),
            "timestamp": reading.timestamp.isoformat(),
            "physics_calculations": reading.physics_calculations,
            "alerts": alerts,
            "relay": relay_state,
        }
        if reading.ml_predictions:
            response_data["ml_predictions"] = reading.ml_predictions
            
        return jsonify(response_data), 201
    
    except ValueError as e:
        logger.warning(f"⚠️ Validation error: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"❌ Error saving data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/sensor/readings", methods=["GET"])
def get_sensor_readings():
    """
    Get sensor readings with optional filtering
    
    Query parameters:
    - device_id: Filter by device (optional)
    - limit: Number of readings to return (default: 100)
    - skip: Number of readings to skip for pagination (default: 0)
    """
    try:
        device_id = request.args.get("device_id")
        limit = int(request.args.get("limit", 100))
        skip = int(request.args.get("skip", 0))
        
        # Build query
        query = {}
        if device_id:
            query["device_id"] = device_id
        
        # Fetch data (newest first)
        readings = list(collection.find(query)
                       .sort("timestamp", -1)
                       .skip(skip)
                       .limit(limit))
        
        # Convert ObjectId to string for JSON serialization
        for reading in readings:
            reading["_id"] = str(reading["_id"])
            reading["timestamp"] = reading["timestamp"].isoformat()
        
        # Get count
        total_count = collection.count_documents(query)
        
        return jsonify({
            "status": "success",
            "total_count": total_count,
            "returned_count": len(readings),
            "data": readings
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error fetching data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/sensor/latest", methods=["GET"])
def get_latest_reading():
    """Get the latest sensor reading per device"""
    try:
        device_id = request.args.get("device_id")
        
        query = {}
        if device_id:
            query["device_id"] = device_id
        
        readings = list(collection.find(query)
                       .sort("timestamp", -1)
                       .limit(1))
        
        if not readings:
            return jsonify({"status": "no_data"}), 404
        
        reading = readings[0]
        reading["_id"] = str(reading["_id"])
        reading["timestamp"] = reading["timestamp"].isoformat()
        
        return jsonify({
            "status": "success",
            "data": reading
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error fetching latest reading: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/sensor/stats", methods=["GET"])
def get_sensor_stats():
    """Get statistics for sensor readings"""
    try:
        device_id = request.args.get("device_id")
        hours = int(request.args.get("hours", 24))
        
        from datetime import timedelta
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        query = {"timestamp": {"$gte": cutoff_time}}
        if device_id:
            query["device_id"] = device_id
        
        readings = list(collection.find(query))
        
        if not readings:
            return jsonify({"status": "no_data"}), 404
        
        # Calculate statistics
        tds_values = [r["tds_value"] for r in readings]
        conductivity_values = [r["conductivity"] for r in readings]
        temps = [r["temperature"] for r in readings if r.get("temperature")]
        
        import statistics
        
        stats = {
            "device_id": device_id or "all_devices",
            "time_range_hours": hours,
            "total_readings": len(readings),
            "tds": {
                "min": min(tds_values),
                "max": max(tds_values),
                "avg": statistics.mean(tds_values),
                "stdev": statistics.stdev(tds_values) if len(tds_values) > 1 else 0
            },
            "conductivity": {
                "min": min(conductivity_values),
                "max": max(conductivity_values),
                "avg": statistics.mean(conductivity_values),
                "stdev": statistics.stdev(conductivity_values) if len(conductivity_values) > 1 else 0
            }
        }
        
        if temps:
            stats["temperature"] = {
                "min": min(temps),
                "max": max(temps),
                "avg": statistics.mean(temps),
                "stdev": statistics.stdev(temps) if len(temps) > 1 else 0
            }
        
        return jsonify({
            "status": "success",
            "data": stats
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error calculating stats: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/physics/calculate", methods=["POST"])
def calculate_physics_parameters():
    """
    Calculate physics-based water quality parameters from sensor readings.
    
    Expected JSON:
    {
        "temperature_c": 28.5,
        "ph": 8.0,
        "dissolved_oxygen_mg_l": 6.5,
        "salinity_ppt": 20,
        "conductivity_us_cm": 4000,
        "tan_mg_l": 0.3
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Calculate comprehensive physics report
        report = PhysicsCalculator.calculate_comprehensive_report(data)
        
        # Optionally save to MongoDB
        if collection:
            physics_record = {
                "device_id": data.get("device_id", "physics_calc"),
                "input_parameters": data,
                "calculated_parameters": report,
                "timestamp": datetime.utcnow()
            }
            collection.insert_one(physics_record)
        
        return jsonify({
            "status": "success",
            "data": report
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error in physics calculation: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/physics/nh3", methods=["POST"])
def calculate_nh3():
    """
    Calculate un-ionized ammonia (toxic NH₃) concentration.
    
    Expected JSON:
    {
        "tan_mg_l": 0.5,           # Total Ammonia Nitrogen
        "temperature_c": 28,
        "ph": 8.0,
        "salinity_ppt": 20         # Optional
    }
    """
    try:
        data = request.get_json()
        
        result = PhysicsCalculator.calculate_nh3(
            tan_mg_l=data.get("tan_mg_l", 0),
            temp_c=data.get("temperature_c", 28),
            ph=data.get("ph", 8.0),
            salinity_ppt=data.get("salinity_ppt", 0)
        )
        
        return jsonify({
            "status": "success",
            "data": result
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error calculating NH3: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/physics/do-saturation", methods=["POST"])
def calculate_do_saturation():
    """
    Calculate DO saturation and saturation percentage.
    
    Expected JSON:
    {
        "temperature_c": 28,
        "dissolved_oxygen_mg_l": 6.5,  # Measured value
        "salinity_ppt": 20              # Optional
    }
    """
    try:
        data = request.get_json()
        
        # Get saturation info
        sat_info = PhysicsCalculator.calculate_do_saturation_percent(
            do_measured_mg_l=data.get("dissolved_oxygen_mg_l", 6.0),
            temp_c=data.get("temperature_c", 28),
            salinity_ppt=data.get("salinity_ppt", 0)
        )
        
        return jsonify({
            "status": "success",
            "data": sat_info
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error calculating DO saturation: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/physics/conductivity-to-tds", methods=["POST"])
def convert_conductivity():
    """
    Convert conductivity to TDS (Total Dissolved Solids).
    
    Expected JSON:
    {
        "conductivity_us_cm": 4000,
        "temperature_c": 28,
        "conversion_factor": 0.5    # Optional (default 0.5)
    }
    """
    try:
        data = request.get_json()
        
        result = PhysicsCalculator.calculate_conductivity_to_tds(
            conductivity_us_cm=data.get("conductivity_us_cm", 0),
            temp_c=data.get("temperature_c", 28),
            conversion_factor=data.get("conversion_factor", 0.5)
        )
        
        return jsonify({
            "status": "success",
            "data": result
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error converting conductivity: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/sensor/delete", methods=["DELETE"])
def delete_old_readings():
    """Delete readings older than specified days (for cleanup)"""
    try:
        days = int(request.args.get("days", 30))
        
        from datetime import timedelta
        cutoff_time = datetime.utcnow() - timedelta(days=days)
        
        result = collection.delete_many({"timestamp": {"$lt": cutoff_time}})
        
        logger.info(f"Deleted {result.deleted_count} old readings")
        
        return jsonify({
            "status": "success",
            "deleted_count": result.deleted_count,
            "message": f"Deleted readings older than {days} days"
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error deleting data: {e}")
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════
# ERROR HANDLERS
# ═══════════════════════════════════════════════════

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500


# ═══════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV") == "development"
    
    logger.info(f"🚀 Starting IoT Gateway API on port {port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
