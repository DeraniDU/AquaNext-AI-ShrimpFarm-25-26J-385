# 🦐 Smart Shrimp Farm Project - Complete Startup Guide

## 📋 System Components Overview

Your project has multiple components running on different ports:

| Component | Port | Technology | Purpose |
|-----------|------|------------|---------|
| **IoT Gateway API** | 5000 | Flask + MongoDB | ESP32 sensor data ingestion |
| **Prediction API** | 5001 | Flask + XGBoost/AutoGL | ML predictions & water quality analysis |
| **Dashboard** | 5173 | React + TypeScript + Vite | Real-time monitoring interface |
| **Landing Page** | 3000 | Next.js + React | Public website & AI assistant |
| **MongoDB** | 27017 | MongoDB | Central database |

---

## 🚀 QUICK START (Fastest Way - 2 minutes)

### Option 1: Run Everything Automatically
```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385

# This script starts all components
bash backend-v2/iot_gateway/start_iot_system.sh
```

### Option 2: Manual Multi-Terminal Approach (Recommended for Development)

**Terminal 1: Start MongoDB**
```bash
brew services start mongodb-community
mongosh  # Verify it's running
```

**Terminal 2: Start IoT Gateway (Port 5000)**
```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2/iot_gateway
source /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/.venv/bin/activate
python app.py
# Should see: ✅ Connected to MongoDB successfully
#            API running on http://localhost:5000
```

**Terminal 3: Start Prediction API (Port 5001)**
```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2
source /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/.venv/bin/activate
python api.py
# Should see: Flask API running on http://localhost:5001
```

**Terminal 4: Start Dashboard (Port 5173)**
```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2/web
npm run dev
# Should see: ➜  Local:   http://localhost:5173/
```

**Terminal 5 (Optional): Start Landing Page (Port 3000)**
```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/web
npm run dev
# Should see: ▲ Next.js 14.0.0 running on http://localhost:3000
```

---

## 📊 Access Your Systems

Once everything is running, visit:

```
🏠 Landing Page & AI Assistant:  http://localhost:3000
📊 Real-Time Dashboard:          http://localhost:5173
🔌 Prediction API Docs:          http://localhost:5001
📡 IoT Gateway API:              http://localhost:5000/health
```

---

## 📋 DETAILED SETUP INSTRUCTIONS

### Step 1: Prerequisites Check

```bash
# Check Python
python3 --version  # Should be 3.9+

# Check Node.js
node --version     # Should be 18+
npm --version      # Should be 9+

# Check MongoDB
mongosh --version
brew services list # Check if mongodb-community is installed
```

### Step 2: Set Up Virtual Environment (One-Time)

```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385

# Create virtual environment
python3 -m venv .venv

# Activate it
source .venv/bin/activate

# Install backend dependencies
pip install -r backend-v2/requirements.txt

# Install IoT Gateway dependencies
cd backend-v2/iot_gateway
pip install -r requirements.txt
cd ../..
```

### Step 3: Install Node Dependencies (One-Time)

```bash
# Dashboard
cd backend-v2/web
npm install

# Landing page
cd ../../web
npm install

cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385
```

### Step 4: Configure Environment

```bash
# IoT Gateway environment
cd backend-v2/iot_gateway
cp .env.example .env
# Edit .env if needed (MongoDB connection, etc.)

cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385
```

### Step 5: Start MongoDB

```bash
# Start MongoDB service
brew services start mongodb-community

# Verify it's running
mongosh
# You should see: test>
# Type: exit
```

### Step 6: Run Each Component

See "Quick Start Option 2" above for terminal-by-terminal startup.

---

## 🧪 Test the System

### Test IoT Gateway
```bash
curl http://localhost:5000/health
# Should return: {"status": "healthy", "database": "connected"}
```

### Send Sample Sensor Data
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

### Test Prediction API
```bash
curl http://localhost:5001/api/health
# Should return: {"status": "healthy"} or ML model info
```

### Test Dashboard
```bash
# Open browser
open http://localhost:5173
# Should see the React dashboard loading
```

---

## 🐛 Troubleshooting

### Issue: Port Already in Use
```bash
# Find what's using port 5000
lsof -i :5000
# Kill it
kill -9 <PID>

# Do same for 5001, 5173, 3000 if needed
```

### Issue: MongoDB Connection Failed
```bash
# Check if MongoDB is running
brew services list | grep mongodb

# Start it
brew services start mongodb-community

# Or if not installed
brew install mongodb-community
brew services start mongodb-community
```

### Issue: Module Not Found (Python)
```bash
# Activate virtual environment
source .venv/bin/activate

# Reinstall dependencies
pip install -r backend-v2/requirements.txt
```

### Issue: npm Install Fails
```bash
# Clear cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Issue: API Returns 503 Error
This means MongoDB is not connected. Make sure:
```bash
# 1. MongoDB is running
brew services start mongodb-community

# 2. Check connection string in .env
cat backend-v2/iot_gateway/.env

# 3. .env should have:
# MONGO_URI=mongodb://localhost:27017/
# DB_NAME=shrimp_farm_iot
```

---

## 📁 Project Structure Quick Reference

```
AquaNext-AI-ShrimpFarm-25-26J-385/
│
├── backend-v2/                          # Main backend system ⭐
│   ├── api.py                           # Prediction API (Port 5001)
│   ├── train_shrimp_water_quality_models.py
│   ├── requirements.txt
│   ├── web/                             # Dashboard (Port 5173)
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── iot_gateway/                     # IoT Gateway (Port 5000)
│       ├── app.py
│       ├── physics_calculator.py
│       ├── esp32_firmware.ino
│       ├── requirements.txt
│       └── .env                         # Configure here!
│
├── web/                                 # Landing Page (Port 3000)
│   ├── app/
│   ├── components/
│   ├── public/
│   ├── package.json
│   └── next.config.ts
│
├── backend/                             # Legacy backend (optional)
│   ├── app.py
│   └── dashboard/
│
├── api/                                 # Jupyter notebooks (optional)
│   ├── notebook/
│   └── dashboard/
│
├── .venv/                               # Virtual environment
└── README.md
```

---

## 🎯 Common Workflows

### Workflow 1: Just Want to View Dashboard
```bash
# Terminal 1
brew services start mongodb-community

# Terminal 2
cd backend-v2/iot_gateway && python app.py

# Terminal 3
cd backend-v2/web && npm run dev

# Open: http://localhost:5173
```

### Workflow 2: Testing with IoT Sensors (Full System)
```bash
# Terminal 1: MongoDB
brew services start mongodb-community

# Terminal 2: IoT Gateway (for ESP32 sensors)
cd backend-v2/iot_gateway && python app.py

# Terminal 3: Prediction API (for ML models)
cd backend-v2 && python api.py

# Terminal 4: Dashboard
cd backend-v2/web && npm run dev

# Upload ESP32 firmware from: backend-v2/iot_gateway/esp32_firmware.ino
```

### Workflow 3: Development (With ML Training)
```bash
# Terminal 1: MongoDB
brew services start mongodb-community

# Terminal 2: Train ML models first
cd backend-v2
python train_shrimp_water_quality_models.py
# Wait for completion...

# Terminal 3: Start Prediction API
python api.py

# Terminal 4: Start IoT Gateway
cd iot_gateway && python app.py

# Terminal 5: Start Dashboard + Landing Page in dev mode
cd web && npm run dev
```

---

## 📊 System Status Checks

### Check All Services
```bash
# MongoDB
mongosh --eval "db.adminCommand('ping')"

# IoT Gateway
curl http://localhost:5000/health

# Prediction API
curl http://localhost:5001/api/health

# Check if ports are in use
lsof -i :5000
lsof -i :5001
lsof -i :5173
lsof -i :3000
```

### View Database Size
```bash
mongosh
db.stats()
db.sensor_readings.count()
exit
```

---

## 🔧 Configuration Files

### Backend API Configuration
- Location: `backend-v2/api.py`
- ML models loaded from: `backend-v2/exported_models/`
- Main port: 5001

### IoT Gateway Configuration
- Location: `backend-v2/iot_gateway/.env`
- Edit to set:
  ```
  MONGO_URI=mongodb://localhost:27017/
  DB_NAME=shrimp_farm_iot
  FLASK_ENV=development
  PORT=5000
  ```

### Dashboard Configuration
- Location: `backend-v2/web/`
- API connection: Hardcoded to `http://localhost:5001`
- Vite dev server: Port 5173

### Landing Page Configuration
- Location: `web/`
- Next.js app: Port 3000
- Has AI assistant component

---

## 📈 Performance & Optimization

### For Production:
```bash
# Build dashboard for production
cd backend-v2/web
npm run build
npm run preview

# Build landing page for production
cd web
npm run build
npm start

# Run APIs with gunicorn (not Flask dev server)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 api:app
```

### Monitor Resource Usage
```bash
# CPU & Memory
top -l 1 | head -20

# Check Python processes
ps aux | grep python

# MongoDB memory usage
brew services list
```

---

## 🆘 Getting Help

### If Something Breaks:

1. **Check the logs** - Look at terminal output for error messages
2. **Verify ports** - Use `lsof -i :PORT` to check what's running
3. **Restart services** - Stop and restart each component
4. **Check docs:**
   - API docs: `backend-v2/iot_gateway/API_DOCUMENTATION.md`
   - IoT setup: `backend-v2/iot_gateway/IOT_SETUP_GUIDE.md`
   - Quick ref: `backend-v2/iot_gateway/QUICK_REFERENCE.md`

### Reset Everything:
```bash
# Stop all services
brew services stop mongodb-community
pkill -f "python api.py"
pkill -f "python app.py"
pkill -f "npm run dev"

# Clear database (WARNING: deletes all data)
mongosh
use shrimp_farm_iot
db.sensor_readings.deleteMany({})
exit

# Restart fresh
# (Follow Quick Start guide again)
```

---

## 📚 Next Steps After Startup

1. ✅ Verify all 4-5 services are running
2. ✅ Check dashboard at http://localhost:5173
3. ✅ Send test sensor data using curl or Python script
4. ✅ View physics calculations working
5. ✅ Set up ESP32 sensors (optional)
6. ✅ Configure ML model predictions
7. ✅ Set up alerts and thresholds
8. ✅ Review historical data in MongoDB

---

## 💡 Tips

- **Keep terminals organized:** Use iTerm2 or VS Code integrated terminal tabs
- **Save startup commands:** Create shell aliases in `~/.zshrc`
- **Monitor logs:** Use `tail -f` on application logs
- **Database backup:** Regular exports of MongoDB collections
- **API testing:** Use Postman or curl scripts from docs

---

**Your complete Smart Shrimp Farm system is ready to run! 🦐**


/////starting commands


cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2/iot_gateway
source /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/.venv/bin/activate
python app.py

source /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/.venv/bin/activate
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2/iot_gateway
python serial_to_api_bridge.py