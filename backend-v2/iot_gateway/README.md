# IoT Gateway for Shrimp Farm Water Quality Monitoring

Real-time sensor data collection system using **ESP32 → Flask API → MongoDB**

## 📋 System Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   ESP32     │         │  Flask API   │         │  MongoDB     │
│  + TDS/EC   ├────────►│  (Python)    ├────────►│  (Local)     │
│  Sensor     │ WiFi/   │  Receives &  │         │  Stores      │
│             │ HTTP    │  Validates   │         │  Data        │
└─────────────┘         └──────────────┘         └──────────────┘
     WiFi                 Port 5000             Default Port 27017
```

---

## 🔧 Step 1: MongoDB Setup (Local)

### Option A: Install MongoDB Community Server (macOS)

```bash
# Using Homebrew
brew install mongodb-community

# Start MongoDB in background
brew services start mongodb-community

# Verify it's running
mongo --eval "db.adminCommand('ping')"
# Should return: { ok: 1 }

# View logs
brew services list
```

### Option B: Using Docker (Recommended for simplicity)

```bash
# Pull MongoDB image
docker pull mongo:7.0

# Run MongoDB container
docker run -d \
  --name shrimp_farm_mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:7.0

# Verify container is running
docker ps | grep shrimp_farm_mongodb

# Access MongoDB shell (optional)
docker exec -it shrimp_farm_mongodb mongosh
```

### Verify MongoDB Connection

```bash
# Test connection from Python
python3 << 'EOF'
from pymongo import MongoClient
client = MongoClient('mongodb://localhost:27017/')
print(client.admin.command('ping'))  # Should print: {'ok': 1.0}
EOF
```

---

## 🚀 Step 2: Flask API Setup

### 1. Navigate to IoT Gateway directory

```bash
cd backend-v2/iot_gateway
```

### 2. Create Python virtual environment

```bash
# Create venv
python3 -m venv venv

# Activate venv (macOS/Linux)
source venv/bin/activate

# Or Windows:
# venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create .env file

```bash
# Copy example file
cp .env.example .env

# Edit .env if needed (default values should work)
nano .env
```

### 5. Start Flask API

```bash
python app.py
```

**Expected output:**
```
✅ Connected to MongoDB successfully
🚀 Starting IoT Gateway API on port 5000
 * Running on http://0.0.0.0:5000
 * WARNING: This is a development server...
```

### 6. Test API is working

In a new terminal:

```bash
# Health check
curl http://localhost:5000/health

# Should return:
# {
#   "status": "healthy",
#   "database": "connected",
#   "timestamp": "2024-03-04T10:30:45.123456"
# }
```

---

## 💻 Step 3: ESP32 Firmware Setup

### 1. Hardware Connections

**TDS Sensor Connection:**
```
TDS Sensor    →  ESP32
VCC (5V)      →  5V or 3.3V
GND           →  GND
Out (Signal)  →  GPIO 35 (ADC pin)
```

**Optional: DS18B20 Temperature Sensor:**
```
DS18B20       →  ESP32
VCC (3.3V)    →  3.3V
GND           →  GND
Out (Data)    →  GPIO 4 (with 4.7kΩ pull-up resistor)
```

### 2. Arduino IDE Setup

1. **Install ESP32 Board:**
   - Open Arduino IDE
   - Go to: `Arduino IDE → Settings → Additional Boards Manager URLs`
   - Add: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Go to: `Tools → Board → Boards Manager`
   - Search for "ESP32" and install latest version

2. **Install Required Libraries:**
   - `Tools → Manage Libraries`
   - Install:
     - `ArduinoJson` (by Benoit Blanchon)
     - `OneWire` (if using DS18B20)
     - `DallasTemperature` (if using DS18B20)

3. **Board Configuration:**
   - `Tools → Board → ESP32 Dev Module` (or your specific board)
   - `Tools → Port → /dev/cu.usbserial-* ` (or your COM port)
   - `Tools → Upload Speed → 921600`

### 3. Update Firmware Configuration

Open `esp32_firmware.ino` and update these lines:

```cpp
// Line 40-41: WiFi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Line 44: Your server's IP address
const char* SERVER_ADDRESS = "http://192.168.1.100:5000";  // Change to your PC/server IP

// Line 47: Device identifier
const char* DEVICE_ID = "esp32_shrimp_farm_001";
```

**⚠️ How to find your server IP:**

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or simpler:
hostname -I  # Linux
ipconfig     # Windows
```

### 4. Upload Firmware

1. Open `esp32_firmware.ino` in Arduino IDE
2. Click `Upload` (→ arrow button)
3. Watch for success message: `✓ Leaving... Hard resetting via RTS pin...`

### 5. Verify ESP32 Communication

1. Open `Tools → Serial Monitor` (115200 baud)
2. You should see:
   ```
   ╔════════════════════════════════════════════╗
   ║       ESP32 IoT Gateway Initializing       ║
   ╚════════════════════════════════════════════╝
   
   [1/3] ADC configured
   [2/3] Connecting to WiFi...
   🔗 Connecting to WiFi: YOUR_WIFI_SSID
   ...
   ✅ WiFi connected!
   60s | Reading sensors...
     ├─ TDS: 1200.5 ppm
     ├─ Conductivity: 2400.0 µS/cm
     ├─ Temperature: 25.0 °C
     └─ Battery: 100%
   
   📤 Sending to server...
   ✅ Success! (HTTP 201)
   ```

---

## 📊 API Endpoints Reference

### 1. **Health Check**
```bash
curl http://localhost:5000/health
```
Response: `{"status": "healthy", "database": "connected"}`

### 2. **Send Sensor Data** (POST)
```bash
curl -X POST http://localhost:5000/api/sensor/reading \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "esp32_shrimp_farm_001",
    "tds_value": 1200.5,
    "conductivity": 2400.0,
    "temperature": 28.5,
    "battery": 85
  }'
```

### 3. **Get All Readings** (GET)
```bash
# Get last 100 readings
curl http://localhost:5000/api/sensor/readings

# With pagination
curl "http://localhost:5000/api/sensor/readings?limit=50&skip=0"

# Filter by device
curl "http://localhost:5000/api/sensor/readings?device_id=esp32_shrimp_farm_001"
```

### 4. **Get Latest Reading**
```bash
curl "http://localhost:5000/api/sensor/latest?device_id=esp32_shrimp_farm_001"
```

### 5. **Get Statistics**
```bash
# Last 24 hours stats
curl "http://localhost:5000/api/sensor/stats?hours=24&device_id=esp32_shrimp_farm_001"

# Last 7 days
curl "http://localhost:5000/api/sensor/stats?hours=168"
```

### 6. **Delete Old Data** (DELETE)
```bash
# Delete readings older than 30 days
curl -X DELETE "http://localhost:5000/api/sensor/delete?days=30"
```

---

## 🔍 MongoDB Data Structure

Data is stored in the `shrimp_farm_iot.sensor_readings` collection:

```json
{
  "_id": ObjectId("..."),
  "device_id": "esp32_shrimp_farm_001",
  "tds_value": 1200.5,
  "conductivity": 2400.0,
  "temperature": 28.5,
  "battery": 85,
  "timestamp": 2024-03-04T10:30:45.123456
}
```

### Query Examples

```javascript
// In MongoDB shell (mongosh):

// View all readings
db.sensor_readings.find();

// Get latest 10 readings
db.sensor_readings.find().sort({timestamp: -1}).limit(10);

// Filter by device
db.sensor_readings.find({device_id: "esp32_shrimp_farm_001"});

// Get average TDS for today
db.sensor_readings.aggregate([
  {$match: {timestamp: {$gte: new Date(ISODate().toISOString().split('T')[0])}}},
  {$group: {_id: null, avg_tds: {$avg: "$tds_value"}}}
]);

// Count total readings
db.sensor_readings.countDocuments();

// Delete old data (older than 30 days)
db.sensor_readings.deleteMany({
  timestamp: {$lt: new Date(Date.now() - 30*24*60*60*1000)}
});
```

---

## 🐛 Troubleshooting

### ESP32 Won't Connect to WiFi
- ✅ Verify WiFi SSID and password in firmware
- ✅ Check if WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- ✅ Ensure firewall isn't blocking TCP port 5000
- ✅ Check `Serial Monitor` for error messages

### "connection refused" or "ERR_CONNECTION_REFUSED"
- ✅ Verify Flask API is running: `ps aux | grep "python app.py"`
- ✅ Check if port 5000 is in use: `lsof -i :5000`
- ✅ Change `SERVER_ADDRESS` to correct IP (not `localhost` or `127.0.0.1`)

### MongoDB Connection Error
- ✅ Verify MongoDB is running:
  ```bash
  # If installed via brew
  brew services list
  
  # If using Docker
  docker ps | grep mongodb
  ```
- ✅ Check connection string matches MONGO_URI in `.env`

### Sensor Readings Are 0 or Unrealistic
- ✅ Verify sensor is properly connected to GPIO 35
- ✅ Calibrate TDS_COEFFICIENT (currently 0.5)
- ✅ Increase NUM_SAMPLES in ESP32 code for noise filtering

### High Power Consumption
- ✅ Increase SEND_INTERVAL (currently 60 seconds) to 300000 (5 minutes)
- ✅ Enable ESP32 deep sleep between reads
- ✅ Reduce number of ADC samples from 5 to 2

---

## 📈 Next Steps

1. **Add More Sensors:**
   - pH sensor (analog GPIO 34)
   - Temperature sensor (OneWire GPIO 4)
   - Dissolved Oxygen sensor
   - Ammonia sensor

2. **Dashboard Integration:**
   - Connect to React/Next.js frontend in `/web` folder
   - Create real-time charts with Chart.js

3. **Alerts & Notifications:**
   - Send email/SMS when thresholds exceeded
   - Add to existing ML models for predictions

4. **Data Processing:**
   - Feed data to water quality ML models in `/water_quality_testing`
   - Calculate quality indicators (Good/Warning/Critical)

---

## 📝 Important Notes

- **Production Deployment:**
  - Use proper MQTT instead of HTTP for better efficiency
  - Store API credentials securely (not hardcoded)
  - Implement authentication/API keys
  - Use HTTPS instead of HTTP

- **Database Backup:**
  ```bash
  # Backup MongoDB
  docker exec shrimp_farm_mongodb mongodump --out /data/backup
  ```

- **ESP32 Reset:**
  ```cpp
  // If needed, add to Arduino code:
  ESP.restart();
  ```

---

## 📞 Support

For issues or improvements, check:
- ESP32 Documentation: https://docs.espressif.com/projects/esp-idf/
- Flask Documentation: https://flask.palletsprojects.com/
- PyMongo Documentation: https://pymongo.readthedocs.io/
- TDS Sensor Datasheet: Check your sensor's product page

---

**Created:** March 2024  
**Version:** 1.0  
**Platform:** ESP32 + Python Flask + MongoDB Local
