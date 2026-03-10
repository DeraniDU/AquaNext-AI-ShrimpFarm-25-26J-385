# Quick Reference: Database Integration Guide

## For Developers

### Reading Sensor Data

```python
from database.repository import Repository

# Initialize repository
repo = Repository()

# Get latest sensor reading from any device
latest = repo.get_latest_environment()

# Get latest from specific device
latest = repo.get_latest_environment(device_id="arduino_uno_01")

# Get recent readings (last 100)
recent = repo.get_recent_sensor_readings(device_id="arduino_uno_01", limit=100)
```

### Normalizing Data for Model

```python
from database.repository import Repository

# Get raw sensor data
sensor_data = repo.get_latest_environment()

# Normalize field names for model
normalized = Repository.normalize_sensor_data(sensor_data)

print(f"DO: {normalized['DO']} mg/L")
print(f"pH: {normalized['pH']}")
print(f"Salinity: {normalized['salinity']} ppt")
print(f"Temp: {normalized['temp']} °C")
```

### Complete Prediction Pipeline

```python
from database.repository import Repository
from models.risk_model import RiskModelService, FEATURES
from config import settings

# 1. Get sensor data from database
repo = Repository()
sensor_data = repo.get_latest_environment()

# 2. Normalize for model
normalized = Repository.normalize_sensor_data(sensor_data)

# 3. Load models
models = RiskModelService(
    rf_model_path=settings.RF_MODEL_PATH,
    if_model_path=settings.IF_MODEL_PATH,
    scaler_path=settings.SCALER_PATH,
    if_threshold=settings.IF_THRESHOLD,
)

# 4. Prepare feature vector (need behavior + feeding + sensor data)
features = {
    "activity_mean": 0.18,      # from behavior
    "activity_std": 0.02,        # from behavior
    "drop_ratio_min": 0.62,      # from behavior
    "abnormal_rate": 0.25,       # from behavior
    "feed_amount": 120.0,        # from feeding
    "feed_response": 0.55,       # from feeding
    "DO": normalized["DO"],      # from sensors
    "temp": normalized["temp"],  # from sensors
    "pH": normalized["pH"],      # from sensors
    "salinity": normalized["salinity"]  # from sensors
}

# 5. Create feature vector in correct order
feature_values = [features[f] for f in FEATURES]

# 6. Get predictions
rf_pred = models.rf_model.predict([feature_values])[0]
if_score = models.if_model.decision_function([feature_values])[0]

print(f"Risk Class: {rf_pred}")
print(f"Anomaly Score: {if_score}")
print(f"Is Anomalous: {if_score < models.if_threshold}")
```

## Database Field Reference

### sensor_readings Collection

| Field                  | Type       | Example               | Description                      |
| ---------------------- | ---------- | --------------------- | -------------------------------- |
| `device_id`            | string     | `arduino_uno_01`      | IoT sensor device ID             |
| `timestamp`            | datetime   | `2026-03-10T15:30:00` | Measurement time                 |
| `do_mg_l`              | float      | `5.1`                 | Dissolved Oxygen (mg/L) → **DO** |
| `ph`                   | float      | `7.6`                 | pH level (0-14) → **pH**         |
| `salinity_ppt`         | float      | `15.0`                | Salinity (ppt) → **salinity**    |
| `temperature`          | float      | `30.2`                | Water temp (°C) → **temp**       |
| `tds_value`            | float      | `1534.59`             | Total dissolved solids           |
| `alkalinity`           | float      | `99.1`                | Alkalinity level                 |
| `turbidity_ntu`        | float      | `...`                 | Water turbidity                  |
| `secchi_cm`            | float      | `...`                 | Secchi disk depth                |
| `chlorophyll_a_ug_l`   | float      | `...`                 | Chlorophyll A                    |
| `tan_mg_l`             | float      | `...`                 | Total ammonia nitrogen           |
| `nh3_mg_l`             | float      | `...`                 | Ammonia                          |
| `no2_mg_l`             | float      | `...`                 | Nitrite                          |
| `no3_mg_l`             | float      | `...`                 | Nitrate                          |
| `orp_mv`               | float      | `...`                 | Oxidation-reduction potential    |
| `battery`              | float/null | `...`                 | Device battery level             |
| `conductivity`         | float/null | `...`                 | Water conductivity               |
| `physics_calculations` | object     | `{}`                  | Computed physics values          |
| `ml_predictions`       | object     | `{}`                  | Previous ML predictions          |
| `alerts`               | array      | `[]`                  | Active alerts                    |
| `relay_state`          | string     | `...`                 | Relay device state               |

### Key Points

- **READ-ONLY**: All sensor data operations are read-only
- **Device-Based**: Use `device_id` for device-specific queries (e.g., "arduino_uno_01")
- **Field Normalization**: Repository provides `normalize_sensor_data()` method
- **Missing Values**: Some fields may be null; always check before using

## Common Tasks

### Check if data is available

```python
sensor_data = repo.get_latest_environment()
if sensor_data is None:
    print("No sensor data available")
else:
    print(f"Latest reading from {sensor_data['device_id']}")
```

### Handle missing fields

```python
normalized = Repository.normalize_sensor_data(sensor_data)
if normalized["DO"] is None:
    print("Warning: DO reading is missing")
    # Use default or skip prediction
```

### Get data in time range (advanced)

```python
from datetime import datetime, timedelta

# Get readings from last hour
one_hour_ago = datetime.utcnow() - timedelta(hours=1)
recent = repo.sensor_collection.find({
    "timestamp": {"$gte": one_hour_ago}
}).sort("timestamp", -1).limit(100)
```

---

**Version**: 1.0
**Last Updated**: March 10, 2026
**Status**: ✅ Production Ready
