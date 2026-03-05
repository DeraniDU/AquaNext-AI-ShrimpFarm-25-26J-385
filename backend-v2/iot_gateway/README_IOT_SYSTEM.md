# 🦐 ESP32 + MongoDB + Physics-Based Water Quality System

## Overview

This is a complete IoT ecosystem for real-time shrimp pond monitoring that combines:
- **IoT Hardware:** ESP32 sensors collecting real-time water quality data
- **Cloud Storage:** MongoDB for historical data persistence
- **Physics Engine:** Established chemical/physics formulas for water quality parameter calculation
- **ML Integration:** Compatible with ML prediction APIs for hybrid forecasting
- **Real-Time Dashboard:** React frontend displaying live data and alerts

---

## 📦 What's Included

### 1. **IoT Gateway API** (`app.py`)
Flask REST API that:
- Receives sensor data from ESP32 devices via HTTP
- Stores readings in MongoDB
- Integrates physics-based calculations
- Provides data retrieval and statistics endpoints

### 2. **Physics Calculator** (`physics_calculator.py`)
Pure Python implementation of:
- **NH₃ Equilibrium Formula** (Emerson et al., 1975)
  - Calculates toxic un-ionized ammonia from TAN, pH, temperature
- **DO Saturation** (Benson & Krause, 1984)
  - Determines maximum dissolvable oxygen in water
  - Calculates saturation percentage
- **Conductivity to TDS Conversion**
  - Converts electrical conductivity to total dissolved solids
- **pH & Salinity Assessment**
  - Evaluates parameters against optimal ranges
  - Provides actionable recommendations

### 3. **Documentation**
- `IOT_SETUP_GUIDE.md` - Complete hardware & software setup instructions
- `API_DOCUMENTATION.md` - Full API reference with examples
- `QUICK_REFERENCE.md` - Quick lookup for parameters, endpoints, formulas
- `example_usage.py` - Python examples for API integration

### 4. **Configuration Files**
- `.env` - Environment variables (MongoDB connection, etc.)
- `requirements.txt` - Python dependencies
- `start_iot_system.sh` - Automated startup script

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- MongoDB running locally or in cloud
- Python 3.9+
- ESP32 with WiFi

### Step 1: Install Dependencies
```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2/iot_gateway
pip install -r requirements.txt
```

### Step 2: Configure MongoDB
```bash
# Copy example env
cp .env.example .env

# Edit .env with your MongoDB connection
# Local: mongodb://localhost:27017/
# Cloud: mongodb+srv://user:pass@cluster.mongodb.net/db
```

### Step 3: Start IoT Gateway
```bash
python app.py
# API running on http://localhost:5000
```

### Step 4: Upload ESP32 Firmware
1. Open `esp32_firmware.ino` in Arduino IDE
2. Update WiFi SSID and password
3. Upload to ESP32
4. Monitor Serial output (115200 baud)

### Step 5: Verify Data Flow
```bash
# Check API health
curl http://localhost:5000/health

# Send test sensor reading
curl -X POST http://localhost:5000/api/sensor/reading \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "esp32_pond_001",
    "tds_value": 1250,
    "conductivity": 2500,
    "temperature": 28.5
  }'

# View stored data
curl http://localhost:5000/api/sensor/readings?limit=5
```

---

## 📡 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   SHRIMP POND MONITORING                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  ESP32 Devices  │ ◄─── Temperature, pH, DO, Conductivity, TDS
│  (Sensors)      │
└────────┬────────┘
         │ WiFi (HTTP POST)
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│            IoT Gateway API (Flask, Port 5000)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Receive sensor readings                            │  │
│  │ • Validate data                                      │  │
│  │ • Store in MongoDB                                   │  │
│  │ • Calculate physics parameters                       │  │
│  │ • Provide REST endpoints                             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────┬────────────────────────────┬──────────────────────┘
         │                            │
         ▼                            ▼
    ┌──────────┐              ┌──────────────────┐
    │ MongoDB  │              │ Physics Engine   │
    │ (Storage)│              │ (Calculations)   │
    └──────────┘              └──────────────────┘
         │                            │
         └────────────┬───────────────┘
                      │
                      ▼
              ┌───────────────────┐
              │ ML Prediction API │  (Port 5001)
              │ XGBoost + AutoML  │
              └───────────────────┘
                      │
                      ▼
              ┌───────────────────┐
              │ React Dashboard   │  (Port 5173)
              │ Real-Time Alerts  │
              └───────────────────┘
```

---

## 🧮 Physics Calculations Explained

### 1. NH₃ (Un-ionized Ammonia)
**Why it matters:** Toxic form of ammonia; shrimp die if exposure exceeds thresholds

**Formula:** Emerson et al. (1975)
```
pKa = 0.09018 + 2729.92 / (T_celsius + 273.15)
fraction_NH3 = 1 / (1 + 10^(pKa - pH))
NH3 = TAN × fraction_NH3
```

**Example:**
- Input: TAN=0.5 mg/L, pH=8.0, Temp=28°C
- Output: NH₃=0.053 mg/L (WARNING level)

**Thresholds:**
- Safe: < 0.05 mg/L
- Warning: 0.05-0.1 mg/L
- Critical: > 0.1 mg/L

---

### 2. DO Saturation
**Why it matters:** Maximum oxygen water can hold determine aeration needs

**Formula:** Benson & Krause (1984)
```
DO_sat = exp(-139.34411 + 1.5757e5/T - 6.6423e7/T² + 1.2438e10/T³ - 8.6219e11/T⁴)
(salinity correction applied)
DO_saturation% = (DO_measured / DO_sat) × 100
```

**Example:**
- Input: Temp=28°C, DO=6.5 mg/L, Salinity=20 ppt
- Output: 89.5% saturation (OPTIMAL)

**Thresholds:**
- Critical: < 50%
- Warning: 50-80%
- Optimal: 80-120%
- Supersaturated: > 120%

---

### 3. Conductivity → TDS
**Why it matters:** Quick measure of total dissolved substances

**Formula:**
```
TDS (ppm) = Conductivity (µS/cm) × 0.5 × (1 + 0.02 × (T - 25))
```

**Conversion Factors:**
- 0.5 - Freshwater (default)
- 0.55 - Brackish water
- 0.65 - Seawater

---

## 🔌 Hardware Connections

### ESP32 DevKit Pin Layout
```
               ┌─────────────────────┐
               │    ESP32 DevKit     │
               └─────────────────────┘
    
    3V3  GND  D23  D22  TX(D1)  RX(D3)  D21
     │    │    │    │    │      │       │
    ┌┴────┴┬───┴─┬──┴────┴──────┴───────┘
    │   5V │GND  │
    │      │     │
┌───┴──┬───┴─┐   │
│      │     │   │
D4 D35 D32 D33  │← DS18B20 (Temp) - GPIO 4 (with 4.7k pull-up)
│      │    │   │← TDS Sensor - GPIO 35
│      │    └───┘← pH Probe - GPIO 32
│      └────────→← DO Sensor - GPIO 33
│
Sensors powered by 3V3 or 5V (depending on sensor specs)
All grounds connected to ESP32 GND
```

---

## 📊 API Endpoints Quick Reference

### Sensor Data
```
POST   /api/sensor/reading           # Send reading from ESP32
GET    /api/sensor/readings          # Get stored readings
GET    /api/sensor/latest            # Get most recent
GET    /api/sensor/stats             # Get statistics
```

### Physics Calculations
```
POST   /api/physics/calculate        # Full assessment
POST   /api/physics/nh3              # NH₃ calculation
POST   /api/physics/do-saturation    # DO saturation %
POST   /api/physics/conductivity-to-tds  # TDS conversion
```

### System
```
GET    /health                        # Check API health
GET    /api/sensor/delete             # Delete old data
```

---

## 📈 Data Storage

### MongoDB Collections
```javascript
db.sensor_readings
{
  _id: ObjectId,
  device_id: "esp32_pond_001",
  tds_value: 1250.5,              // ppm
  conductivity: 2500,              // µS/cm
  temperature: 28.5,               // °C
  battery: 92,                     // %
  timestamp: ISODate(...)          // Auto-indexed
}
```

### Indexes (Auto-created)
- `timestamp` - For time-range queries
- `device_id` - For filtering by device
- `(timestamp, -1)` - For latest readings

---

## 🧪 Testing & Examples

### Python Example Script
```bash
python example_usage.py
```

Includes:
- Sending sensor data
- Retrieving stored data
- Calculating NH₃
- Calculating DO saturation
- Getting comprehensive reports
- Viewing statistics
- Health checks
- Continuous monitoring loop

### cURL Examples
See `QUICK_REFERENCE.md` for curl command examples

### Postman Collection
(Can be generated from API_DOCUMENTATION.md)

---

## 🚨 Environmental Alerts

### Critical Conditions (Immediate Action)
- DO < 3 mg/L (Turn on aerators)
- NH₃ > 0.1 mg/L (Partial water change)
- pH < 7.0 or > 9.0 (Adjust pH immediately)
- Temperature < 24°C (Heat water)
- Temperature > 33°C (Shade/cool water)

### Warning Conditions (Monitor Closely)
- DO < 5 mg/L (Prepare to increase aeration)
- NH₃ > 0.05 mg/L (Monitor feeding/reduce feed)
- pH < 7.5 or > 8.5 (Prepare adjustment)
- Salinity out of range (Plan water changes)

---

## 🔐 Security & Production

### Before Production Deployment:
1. **Authentication:**
   - [ ] Add JWT token validation
   - [ ] Implement API key system
   - [ ] Add user authentication

2. **Database:**
   - [ ] Change default MongoDB passwords
   - [ ] Enable SSL/TLS encryption
   - [ ] Set up regular backups
   - [ ] Configure access control

3. **API:**
   - [ ] Enable HTTPS/SSL
   - [ ] Add rate limiting
   - [ ] Implement CORS restrictions
   - [ ] Add request validation
   - [ ] Set up API logging
   - [ ] Enable CSRF protection

4. **Deployment:**
   - [ ] Use environment variables
   - [ ] Run behind reverse proxy (nginx)
   - [ ] Set up monitoring/alerts
   - [ ] Configure automated backups
   - [ ] Enable audit logging

---

## 🐛 Troubleshooting

### ESP32 Connection Issues
```bash
# Check Serial Monitor (115200 baud)
# Look for WiFi connection messages and API response codes
```

### MongoDB Connection Failed
```bash
# Verify MongoDB is running
mongosh
# Or start it
brew services start mongodb-community
```

### Physics Calculations Incorrect
- Verify input parameter ranges
- Check temperature is in Celsius
- Verify pH is 0-14 scale
- Check salinity units (ppt)
- Confirm TAN in mg/L

### Data Not Appearing
1. Verify device_id is consistent
2. Check ESP32 Serial output for HTTP status codes
3. Verify .env MongoDB connection string
4. Check API is running: `curl http://localhost:5000/health`

---

## 📚 Additional Resources

| File | Purpose |
|------|---------|
| `IOT_SETUP_GUIDE.md` | Complete hardware & software setup |
| `API_DOCUMENTATION.md` | Full API reference with examples |
| `QUICK_REFERENCE.md` | Parameter ranges, formulas, troubleshooting |
| `example_usage.py` | Python API usage examples |
| `physics_calculator.py` | Physics formulas implementation |
| `esp32_firmware.ino` | Arduino code for ESP32 |
| `app.py` | Flask API server |
| `start_iot_system.sh` | Startup automation script |

---

## 🤝 Integration with Other Systems

### Dashboard (Port 5173)
React frontend displays:
- Real-time sensor values
- Physics calculations
- Historical trends
- Alert notifications
- Multi-pond dashboard

### ML Prediction API (Port 5001)
Hybrid approach combining:
- Physics-based calculations
- Machine learning models
- Ensemble predictions
- Higher accuracy forecasts

---

## 📞 Support & Debugging

### Enable Debug Mode
```python
# In app.py
app.run(debug=True)
```

### View Logs
```bash
# Flask logs show in terminal
# MongoDB logs: log stream --predicate 'process == "mongod"'
```

### Monitor Performance
```bash
# MongoDB stats
mongosh
db.sensor_readings.stats()
db.sensor_readings.count()
```

---

## 📝 License & Attribution

Physics formula sources:
- Emerson, K., Russo, R. C., & Lund, R. E. (1975)
- Benson, B. B., & Krause Jr, D. (1984)

ESP32 Arduino Libraries:
- Arduino core for ESP32
- ArduinoJson
- OneWire
- DallasTemperature

---

## 🎯 Next Steps

1. ✅ Complete hardware setup (See IOT_SETUP_GUIDE.md)
2. ✅ Configure MongoDB connection
3. ✅ Upload ESP32 firmware
4. ✅ Start IoT Gateway API
5. ✅ Verify data flow with test readings
6. ✅ Run dashboard on port 5173
7. ✅ Set up alerts and thresholds
8. ✅ Monitor for 24 hours to validate
9. ✅ Deploy to production with security measures
10. ✅ Integrate with ML prediction API (Port 5001)

---

**Happy farming! 🦐**

For questions or issues, refer to the documentation files or enable debug mode for detailed error messages.

