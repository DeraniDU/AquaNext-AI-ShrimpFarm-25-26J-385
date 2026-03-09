# IoT System Quick Reference Card

## 🚀 Quick Start (After Setup)

### 1. Start IoT Gateway
```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2/iot_gateway
python app.py
# Runs on http://localhost:5000
```

### 2. Send Sensor Data From ESP32
```json
POST http://192.168.x.x:5000/api/sensor/reading
{
  "device_id": "esp32_pond_001",
  "tds_value": 1250.5,
  "conductivity": 2500,
  "temperature": 28.5,
  "battery": 92
}
```

### 3. Calculate Water Quality Parameters
```json
POST http://localhost:5000/api/physics/calculate
{
  "temperature_c": 28.5,
  "ph": 8.0,
  "dissolved_oxygen_mg_l": 6.5,
  "salinity_ppt": 20,
  "tan_mg_l": 0.3
}
```

---

## 📊 Key Endpoints Cheat Sheet

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Check API status |
| `/api/sensor/reading` | POST | Send sensor data |
| `/api/sensor/readings` | GET | Get stored readings |
| `/api/sensor/latest` | GET | Get most recent reading |
| `/api/sensor/stats` | GET | Get statistics |
| `/api/physics/calculate` | POST | Full water quality report |
| `/api/physics/nh3` | POST | Calculate NH₃ (ammonia) |
| `/api/physics/do-saturation` | POST | Calculate DO saturation % |
| `/api/physics/conductivity-to-tds` | POST | Convert conductivity to TDS |

---

## 🌡️ Parameter Ranges & Limits

### Temperature
- Sensor Range: -10°C to 50°C
- Optimal for Shrimp: 26-32°C
- Caution: Above 33°C or below 24°C

### pH
- Sensor Range: 0-14
- Optimal for Brackish: 7.5-8.5
- Critical: < 7.0 or > 9.0

### Dissolved Oxygen (DO)
- Sensor Range: 0-20 mg/L
- Optimal: 5-8 mg/L
- Critical: < 3 mg/L
- Saturation Target: 80-120%

### Salinity
- Sensor Range: 0-50 ppt
- Optimal for Shrimp: 15-25 ppt
- Brackish Tolerance: 10-30 ppt

### TDS (Total Dissolved Solids)
- Sensor Range: 0-50,000 ppm
- Good Quality: < 1,000 ppm
- Acceptable: 1,000-2,000 ppm
- Poor: > 2,000 ppm

### Total Ammonia Nitrogen (TAN)
- Safe: < 0.5 mg/L
- Caution: 0.5-1.0 mg/L
- Critical: > 1.0 mg/L

### Un-ionized Ammonia (NH₃) - TOXIC FORM
- Safe: < 0.05 mg/L
- Warning: 0.05-0.1 mg/L
- Critical: > 0.1 mg/L

---

## 📱 ESP32 Pin Configuration

```
ESP32 DEVKIT GPIO:

Temperature (DS18B20):    GPIO 4  (OneWire)
TDS Sensor:              GPIO 35 (Analog ADC1_CH7)
pH Probe:                GPIO 32 (Analog ADC1_CH0)
DO Sensor:               GPIO 33 (Analog ADC1_CH5)

Power:
GND:  Pin GND
3V3:  Pin 3V3
5V:   Pin VIN (if available)
```

---

## 💾 MongoDB Collections

```javascript
// Collection: sensor_readings
{
  _id: ObjectId,
  device_id: "esp32_pond_001",
  tds_value: 1250.5,
  conductivity: 2500,
  temperature: 28.5,
  battery: 92,
  timestamp: ISODate("2025-03-05T10:30:00.000Z")
}

// Indexes created automatically:
// - timestamp (for time-range queries)
// - device_id (for device filtering)
// - timestamp -1 (for latest reading queries)
```

---

## 🧮 Physics Formulas Used

### 1. NH₃ Equilibrium (Emerson et al., 1975)
```
pKa = 0.09018 + 2729.92 / T_kelvin
fraction_NH3 = 1 / (1 + 10^(pKa - pH))
NH3 = TAN × fraction_NH3
```

### 2. DO Saturation (Benson & Krause, 1984)
```
ln(DO_sat) = -139.34411 + 1.5757e5/T - 6.6423e7/T² + 1.2438e10/T³ - 8.6219e11/T⁴
DO_saturation% = (Measured_DO / DO_sat) × 100
```

### 3. Conductivity to TDS
```
TDS (ppm) = Conductivity (µS/cm) × 0.5 × Temperature_Correction
Temperature_Correction = 1 + 0.02 × (T - 25)
```

---

## 🚨 Alert Thresholds

### Critical Alerts
- DO < 3 mg/L
- NH₃ > 0.1 mg/L
- pH < 7.0 or pH > 9.0
- Salinity < 10 or > 35 ppt
- Temperature < 24°C or > 33°C

### Warning Alerts
- DO < 5 mg/L
- NH₃ > 0.05 mg/L
- pH < 7.5 or pH > 8.5
- Salinity < 15 or > 25 ppt
- Temperature < 26°C or > 30°C

---

## 🔧 Common Commands

### Check MongoDB Status
```bash
mongosh
# In MongoDB shell:
db.adminCommand("ping")
db.sensor_readings.find().limit(5)
db.sensor_readings.stats()
```

### Test API
```bash
# Health check
curl http://localhost:5000/health

# Send test data
curl -X POST http://localhost:5000/api/sensor/reading \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test","tds_value":1000,"conductivity":2000,"temperature":28}'

# Get readings
curl http://localhost:5000/api/sensor/readings?limit=5
```

### Run Python Examples
```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2/iot_gateway
python example_usage.py
```

---

## 📈 Data Schema Examples

### Input: Raw Sensor Data (from ESP32)
```json
{
  "device_id": "esp32_pond_001",
  "tds_value": 1250.5,
  "conductivity": 2500,
  "temperature": 28.5,
  "battery": 92
}
```

### Output: Physics Calculation
```json
{
  "nh3_mg_l": 0.053,
  "nh3_fraction": 0.1067,
  "nh3_status": "warning",
  "do_saturation_pct": 89.52,
  "do_status": "optimal",
  "overall_status": "HEALTHY"
}
```

---

## 🔐 Security Checklist

- [ ] Change default MongoDB password
- [ ] Use .env file for sensitive data
- [ ] Enable MongoDB SSL/TLS
- [ ] Add API authentication (JWT)
- [ ] Set up CORS restrictions
- [ ] Enable HTTPS for production
- [ ] Use API rate limiting
- [ ] Validate all inputs
- [ ] Monitor API logs
- [ ] Regular backups of MongoDB

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| ESP32 won't connect | Check WiFi SSID/password, verify 2.4GHz, check antenna |
| 503 Database offline | `brew services start mongodb-community` |
| Connection refused | Verify IoT Gateway is running: `ps aux \| grep app.py` |
| Data not saving | Check MongoDB connection string in `.env` |
| Invalid JSON error | Verify JSON format with JSONlint.com |
| Physics calc error | Check parameter ranges are valid |
| MongoDB out of space | Run: `db.sensor_readings.deleteMany({timestamp: {$lt: ISODate("2025-01-01")}})` |

---

## 💡 Tips & Tricks

1. **Batch Uploads:** Send multiple readings in one request when possible
2. **Caching:** Store recent calculations to reduce API calls
3. **Alerts:** Set up webhook notifications for critical conditions
4. **Logging:** Enable debug mode to see detailed API requests
5. **Backup:** Export MongoDB data regularly to CSV
6. **Testing:** Use Postman collection for endpoint testing
7. **Monitoring:** Set up Grafana dashboards for visualization
8. **Calibration:** Verify sensors annually against lab standards

---

## 📞 Support Resources

- **Documentation:** See API_DOCUMENTATION.md
- **Setup Guide:** See IOT_SETUP_GUIDE.md
- **Examples:** Run example_usage.py
- **Physics:** See physics_calculator.py
- **Logs:** Check Flask console output

