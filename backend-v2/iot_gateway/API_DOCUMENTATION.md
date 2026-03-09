# IoT Gateway & Physics Calculator API Documentation

## 📡 Base URL
```
http://localhost:5000
```

## 🏥 Health & Status Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "api": "running",
  "database": "connected",
  "timestamp": "2025-03-05T10:30:00.000Z"
}
```

---

## 📊 Sensor Data Endpoints

### Store Sensor Reading
Save raw sensor readings from IoT devices to MongoDB.

```http
POST /api/sensor/reading
Content-Type: application/json

{
  "device_id": "esp32_pond_001",
  "tds_value": 1250.5,
  "conductivity": 2500,
  "temperature": 28.5,
  "battery": 95
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Sensor data saved",
  "id": "660a1b2c3d4e5f6g7h8i9j0k",
  "timestamp": "2025-03-05T10:30:00.000Z"
}
```

**Parameters:**
| Field | Type | Required | Range | Notes |
|-------|------|----------|-------|-------|
| device_id | string | ✅ | - | Unique identifier for sensor/pond |
| tds_value | float | ✅ | 0-50000 | Total Dissolved Solids (ppm) |
| conductivity | float | ✅ | 0-200000 | Electrical conductivity (µS/cm) |
| temperature | float | ❌ | -10 to 50 | Water temperature (°C) |
| battery | float | ❌ | 0-100 | Battery percentage |

---

### Get Recent Readings
Retrieve the latest sensor readings.

```http
GET /api/sensor/readings
```

**Query Parameters:**
- `device_id` (optional) - Filter by specific device
- `limit` (default: 100) - Number of readings to return
- `skip` (default: 0) - Pagination offset

**Example:**
```bash
curl "http://localhost:5000/api/sensor/readings?device_id=esp32_pond_001&limit=10"
```

**Response:**
```json
{
  "status": "success",
  "count": 10,
  "data": [
    {
      "_id": "660a1b2c...",
      "device_id": "esp32_pond_001",
      "tds_value": 1250.5,
      "conductivity": 2500,
      "temperature": 28.5,
      "battery": 95,
      "timestamp": "2025-03-05T10:30:00.000Z"
    }
  ]
}
```

---

### Get Latest Reading
Get the most recent reading from a device.

```http
GET /api/sensor/latest?device_id=esp32_pond_001
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "660a1b2c...",
    "device_id": "esp32_pond_001",
    "tds_value": 1250.5,
    "conductivity": 2500,
    "temperature": 28.5,
    "battery": 95,
    "timestamp": "2025-03-05T10:30:00.000Z"
  }
}
```

---

### Get Statistics
Calculate statistics for sensor readings over a time period.

```http
GET /api/sensor/stats
```

**Query Parameters:**
- `device_id` (optional) - Filter by device
- `hours` (default: 24) - Time period in hours

**Example:**
```bash
curl "http://localhost:5000/api/sensor/stats?device_id=esp32_pond_001&hours=24"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "device_id": "esp32_pond_001",
    "time_range_hours": 24,
    "total_readings": 1440,
    "tds": {
      "min": 1200,
      "max": 1450,
      "avg": 1320.5,
      "stdev": 45.3
    },
    "conductivity": {
      "min": 2400,
      "max": 2900,
      "avg": 2641,
      "stdev": 90.6
    },
    "temperature": {
      "min": 26.5,
      "max": 29.8,
      "avg": 28.1,
      "stdev": 0.8
    }
  }
}
```

---

## 🧮 Physics-Based Calculations

### Calculate Comprehensive Report
Get all calculated water quality parameters in one call.

```http
POST /api/physics/calculate
Content-Type: application/json

{
  "temperature_c": 28.5,
  "ph": 8.0,
  "dissolved_oxygen_mg_l": 6.5,
  "salinity_ppt": 20,
  "conductivity_us_cm": 4000,
  "tan_mg_l": 0.3
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "timestamp": "2025-03-05T10:30:00.000Z",
    "overall_status": "HEALTHY",
    "parameters": {
      "temperature": 28.5,
      "ph": 8.0,
      "dissolved_oxygen": 6.5,
      "salinity": 20
    },
    "calculations": {
      "nh3": {
        "nh3_mg_l": 0.032,
        "nh3_fraction": 0.1067,
        "nh4_mg_l": 0.268,
        "pka": 9.247,
        "status": "safe",
        "optimal_range": "< 0.05 mg/L"
      },
      "do_saturation": {
        "saturation_pct": 89.5,
        "do_sat_mg_l": 7.26,
        "do_measured_mg_l": 6.5,
        "status": "optimal",
        "optimal_range": "80-120%"
      },
      "ph_status": {
        "ph": 8.0,
        "status": "optimal",
        "optimal_range": "7.5 - 8.5",
        "recommendations": "Maintain current pH"
      },
      "salinity_status": {
        "salinity_ppt": 20,
        "status": "optimal",
        "optimal_range": "15 - 25 ppt",
        "recommendations": "Maintain current salinity"
      },
      "tds": {
        "tds_ppm": 2000,
        "quality": "fair",
        "conductivity_us_cm": 4000,
        "conversion_factor": 0.5,
        "temperature_correction": 1.021
      }
    }
  }
}
```

---

### Calculate NH₃ (Un-ionized Ammonia)
Calculate the toxic form of ammonia based on TAN, pH, and temperature.

```http
POST /api/physics/nh3
Content-Type: application/json

{
  "tan_mg_l": 0.5,
  "temperature_c": 28,
  "ph": 8.0,
  "salinity_ppt": 20
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "nh3_mg_l": 0.053,
    "nh3_fraction": 0.1067,
    "nh4_mg_l": 0.447,
    "pka": 9.247,
    "status": "warning",
    "optimal_range": "< 0.05 mg/L"
  }
}
```

**Status Values:**
- `safe` - NH₃ < 0.05 mg/L (optimal for shrimp)
- `warning` - 0.05 ≤ NH₃ < 0.1 mg/L (monitor closely)
- `critical` - NH₃ ≥ 0.1 mg/L (action required immediately)

---

### Calculate DO Saturation
Determine dissolved oxygen saturation percentage and maximum possible DO.

```http
POST /api/physics/do-saturation
Content-Type: application/json

{
  "temperature_c": 28,
  "dissolved_oxygen_mg_l": 6.5,
  "salinity_ppt": 20
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "saturation_pct": 89.52,
    "do_sat_mg_l": 7.26,
    "do_measured_mg_l": 6.5,
    "status": "optimal",
    "optimal_range": "80-120%"
  }
}
```

**Status Values:**
- `critical` - Saturation < 50% (immediate action required)
- `warning` - 50% ≤ Saturation < 80% (increase aeration)
- `optimal` - 80% ≤ Saturation ≤ 120% (ideal range)
- `supersaturated` - Saturation > 120% (excess bubbling/gas)

---

### Convert Conductivity to TDS
Convert electrical conductivity readings to Total Dissolved Solids.

```http
POST /api/physics/conductivity-to-tds
Content-Type: application/json

{
  "conductivity_us_cm": 4000,
  "temperature_c": 28,
  "conversion_factor": 0.5
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "tds_ppm": 2042,
    "quality": "fair",
    "conductivity_us_cm": 4000,
    "conversion_factor": 0.5,
    "temperature_correction": 1.0606
  }
}
```

**Conversion Factors:**
- 0.5 - Standard/Freshwater
- 0.55 - Estuarine/Brackish water
- 0.65 - Seawater

**TDS Quality:**
- Excellent: < 500 ppm
- Good: 500-1000 ppm
- Fair: 1000-2000 ppm
- Poor: > 2000 ppm

---

## 📋 Data Management

### Get Statistics
(See above)

### Delete Old Readings
Clean up historical data older than specified days.

```http
DELETE /api/sensor/delete?days=30
```

**Response:**
```json
{
  "status": "success",
  "deleted_count": 432,
  "message": "Deleted readings older than 30 days"
}
```

---

## 🔄 Integration Examples

### Full Workflow: From ESP32 to Physics Calculations

**Step 1: ESP32 sends sensor data**
```bash
curl -X POST http://localhost:5000/api/sensor/reading \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "esp32_pond_001",
    "tds_value": 1250,
    "conductivity": 2500,
    "temperature": 28.5,
    "battery": 95
  }'
```

**Step 2: Get stored reading**
```bash
curl http://localhost:5000/api/sensor/latest?device_id=esp32_pond_001
```

**Step 3: Calculate physics parameters**
```bash
curl -X POST http://localhost:5000/api/physics/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "temperature_c": 28.5,
    "ph": 8.0,
    "dissolved_oxygen_mg_l": 6.5,
    "salinity_ppt": 20,
    "tan_mg_l": 0.3
  }'
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "error": "No JSON data provided"
}
```

### 404 Not Found
```json
{
  "error": "Endpoint not found"
}
```

### 503 Service Unavailable (MongoDB offline)
```json
{
  "error": "Database is currently offline",
  "hint": "Please ensure MongoDB is running"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## 📈 Performance Recommendations

1. **Sensor Reading Frequency:** 1 reading per minute (60 seconds)
2. **Batch Requests:** Group up to 10 readings per request
3. **Data Retention:** Keep 30 days of data, archive older data
4. **MongoDB Indexing:** Already configured for timestamp and device_id
5. **API Calling Pattern:** Use batch endpoints when possible

---

## 🔑 Authentication & Security

Currently, the IoT Gateway API has **no authentication**. For production:

1. Implement JWT tokens
2. Add API key verification
3. Enable HTTPS/SSL
4. Restrict CORS to trusted domains
5. Rate limiting on physics endpoints

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| 503 Database offline | Start MongoDB: `brew services start mongodb-community` |
| Connection refused | Verify IoT Gateway is running on port 5000 |
| Validation error | Check JSON format and parameter ranges |
| No data returned | Ensure sensor data was sent first with correct device_id |
| Timestamp issues | Verify system time is synchronized |

