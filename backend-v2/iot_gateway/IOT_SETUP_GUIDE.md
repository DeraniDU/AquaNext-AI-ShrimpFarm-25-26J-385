# IoT System Setup Guide: ESP32 + MongoDB + Physics-Based Predictions

## 🎯 System Overview

Your smart shrimp farming system will:
1. **Collect Real-Time Data** from ESP32 sensors (Temperature, pH, Conductivity, TDS, etc.)
2. **Store in MongoDB** for historical analysis and trending
3. **Calculate Physics-Based Parameters** (NH₃, DO Saturation, etc.) using proven formulas
4. **Integrate with ML Models** for hybrid predictions (ML + Physics)
5. **Display on React Dashboard** with real-time alerts

---

## 📋 Prerequisites

### Hardware
- **ESP32 Development Board**
- **Sensors:**
  - DS18B20 Temperature Sensor
  - TDS Sensor (Analog)
  - pH Probe (Analog)
  - DO (Dissolved Oxygen) Sensor (Optional but recommended)
  - Conductivity Probe (Optional)

### Software
- MongoDB (Local or Cloud)
- Python 3.9+
- Arduino IDE with ESP32 board support

### Network
- WiFi access on your farm
- Internet connection for MongoDB Atlas (if using cloud)

---

## 📦 Step 1: MongoDB Setup

### Option A: Local MongoDB (Recommended for testing)

**macOS (using Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

Verify installation:
```bash
mongosh
```

If you see a MongoDB prompt, it's running!

### Option B: MongoDB Atlas (Cloud - Production)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a cluster
4. Get your connection string (looks like):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
   ```

---

## 🔧 Step 2: Configure Environment Variables

Update the `.env` file in `backend-v2/iot_gateway/`:

```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2/iot_gateway
cp .env.example .env
```

Edit `.env`:
```dotenv
# MongoDB - Local
MONGO_URI=mongodb://localhost:27017/

# OR MongoDB Atlas - Cloud (replace with your credentials)
# MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/shrimp_farm_iot?retryWrites=true&w=majority

DB_NAME=shrimp_farm_iot
FLASK_ENV=production
API_HOST=0.0.0.0
API_PORT=5000
```

---

## 🚀 Step 3: Set Up IoT Gateway

### 3.1 Install Python Dependencies

```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2/iot_gateway
pip install -r requirements.txt
```

If there's no requirements.txt, create one:
```bash
cat > requirements.txt << 'EOF'
flask>=2.3.0
flask-cors>=4.0.0
pymongo>=4.0.0
python-dotenv>=0.19.0
numpy>=1.24.0
EOF

pip install -r requirements.txt
```

### 3.2 Start IoT Gateway Server

```bash
python app.py
```

Expected output:
```
✅ Connected to MongoDB successfully
API running on http://localhost:5000
```

---

## 🤖 Step 4: Configure ESP32 Firmware

### 4.1 Install Arduino IDE & ESP32 Support

1. Download [Arduino IDE](https://www.arduino.cc/en/software)
2. In Arduino IDE: 
   - Go to: **File → Preferences**
   - Add this to "Additional Board Manager URLs":
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Go to: **Tools → Board Manager**
   - Search for "ESP32" and install

### 4.2 Install Required Libraries

In Arduino IDE: **Sketch → Include Library → Manage Libraries**

Install:
- **ArduinoJson** (by Benoit Blanchon)
- **OneWire** (by Jim Studt, et al.)
- **DallasTemperature** (by Miles Burton, et al.)

### 4.3 Hardware Wiring

**ESP32 Pin Configuration:**

| Sensor | ESP32 Pin | Notes |
|--------|-----------|-------|
| TDS Out | GPIO 35 (ADC1) | Analog pin for TDS sensor |
| DS18B20 Data | GPIO 4 | Temperature sensor (1-Wire) |
| pH Out | GPIO 32 (ADC1) | Optional analog pH probe |
| DO Out | GPIO 33 (ADC1) | Optional analog DO sensor |
| GND | GND | Common ground |
| 3.3V/5V | 3V3 or VIN | Power (depends on sensor) |

**Pin Connections Example:**
```
TDS Sensor:
  VCC → 5V (or 3.3V)
  GND → GND
  Out → GPIO 35

DS18B20 Temperature:
  VCC → 3.3V
  GND → GND
  Out → GPIO 4 (with 4.7k pull-up resistor to 3.3V)

(Similar for pH probe on GPIO 32, DO sensor on GPIO 33)
```

### 4.4 Configure ESP32 Firmware

Open `esp32_firmware.ino` in Arduino IDE and update:

```cpp
// ═══════════════════════════════════════════════════
// CONFIGURATION - UPDATE THESE VALUES
// ═══════════════════════════════════════════════════

// WiFi Configuration
const char* WIFI_SSID = "YOUR_FARM_WIFI_SSID";           // Your WiFi name
const char* WIFI_PASSWORD = "YOUR_FARM_WIFI_PASSWORD";   // Your WiFi password

// API Server Configuration
const char* SERVER_ADDRESS = "http://192.168.1.100:5000"; // Your computer/server IP
const char* API_ENDPOINT = "/api/sensor/reading";

// Device Configuration
const char* DEVICE_ID = "esp32_pond_001";  // Unique ID for this pond

// Sensor Pin Configuration
const int TDS_PIN = 35;              // TDS sensor analog pin
const int TEMP_PIN = 4;              // DS18B20 temperature pin
// const int PH_PIN = 32;            // Optional: pH probe
// const int DO_PIN = 33;            // Optional: DO sensor

// Timing
const unsigned long SEND_INTERVAL = 60000;  // Send data every 60 seconds
```

### 4.5 Upload to ESP32

1. Connect ESP32 to computer via USB
2. Select: **Tools → Board → ESP32 Dev Module**
3. Select correct **COM Port**
4. Click **Upload** (→ button)

Expected output:
```
Writing at 0x00010000... (5 %)
...
Leaving...
Hard resetting via RTS pin...
```

---

## 🌐 Step 5: Verify Data Flow

### 5.1 Check ESP32 Serial Output

Open **Tools → Serial Monitor** (115200 baud):

```
WiFi: Scanning networks...
WiFi: Found network: YOUR_FARM_WIFI_SSID
WiFi: Connecting...
WiFi: Connected! IP: 192.168.1.50
Temperature: 27.85 °C
TDS: 1245 ppm
Sending to API: http://192.168.1.100:5000/api/sensor/reading
Response: 201 Created
Sensor data saved: 65a4b2c3d4e5f6g7h8i9j0k1
```

### 5.2 Test API Directly

```bash
curl -X POST http://localhost:5000/api/sensor/reading \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "esp32_pond_001",
    "tds_value": 1250.5,
    "conductivity": 2500,
    "temperature": 28.5,
    "battery": 95
  }'
```

Expected response:
```json
{
  "status": "success",
  "message": "Sensor data saved",
  "id": "660a1b2c3d4e5f6g7h8i9j0k",
  "timestamp": "2025-03-05T10:30:00.000Z"
}
```

### 5.3 Retrieve Stored Data

```bash
curl http://localhost:5000/api/sensor/readings?limit=5
```

---

## 🧮 Step 6: Physics-Based Calculations

The system automatically calculates:

### NH₃ (Un-ionized Ammonia)
- Formula: Emerson et al. (1975)
- Inputs: TAN, pH, Temperature
- Output: Toxic NH₃ concentration
- Thresholds:
  - Safe: < 0.05 mg/L
  - Warning: 0.05-0.1 mg/L
  - Critical: > 0.1 mg/L

### DO Saturation
- Formula: Benson & Krause (1984)
- Inputs: Temperature, Salinity
- Output: Maximum dissolvable oxygen
- Calculation: DO% = (Measured DO / Saturation) × 100
- Optimal: 80-120%

### Temperature-Corrected Parameters
- Q10 effect calculations
- Growth rate adjustments
- Metabolic rate predictions

### TDS from Conductivity
- Conversion: TDS (ppm) = Conductivity (µS/cm) × 0.5 × Temp Correction
- Salinity conversion if needed

---

## 📊 Step 7: View Data on Dashboard

### Access Dashboard
```
http://localhost:5173
```

### Expected Features
- Real-time sensor readings
- Historical data graphs
- Physics-based parameter calculations
- Alerts for out-of-range values
- Multi-pond support
- Export data to CSV

---

## 🔌 Step 8: Integrated Data Flow

```
ESP32 Device(s)
    ↓
[WiFi]
    ↓
IoT Gateway API
(PORT 5000)
    ↓
MongoDB
(Local or Cloud)
    ↓
Physics Calculator
(NH₃, DO Sat, etc.)
    ↓
ML Prediction API
(PORT 5001)
    ↓
React Dashboard
(PORT 5173)
```

---

## 🐛 Troubleshooting

### ESP32 Not Connecting to WiFi
- Check WiFi SSID and password
- Verify WiFi network is 2.4 GHz (not 5 GHz)
- Check ESP32 antenna connection

### Data Not Saving to MongoDB
- Verify MongoDB is running: `mongosh`
- Check connection string in `.env`
- Verify firewall allows port 27017

### API Returns 503 Error
- MongoDB connection failed
- Start MongoDB: `brew services start mongodb-community`
- Check MONGO_URI in `.env`

### Dashboard Shows No Data
- IoT Gateway must be running (port 5000)
- Ensure ESP32 is on same network
- Check ESP32 Serial Monitor for errors

---

## 📈 Next Steps

1. ✅ Set up MongoDB
2. ✅ Configure environment variables
3. ✅ Start IoT Gateway (port 5000)
4. ✅ Upload ESP32 firmware
5. ✅ Verify data flow
6. ✅ Monitor on Dashboard (port 5173)
7. ✅ Integrate with ML predictions (port 5001)

---

## 📞 Support

For issues or questions:
- Check MongoDB logs: `log stream --predicate 'process == "mongod"'`
- Check Flask/Python errors in terminal
- Verify network connectivity
- Check sensor wiring

Happy farming! 🦐

