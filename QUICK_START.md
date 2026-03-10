# 🚀 Quick Start - 5 Minute Setup

## Step 1: One-Time Setup (5 min)

```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r backend-v2/requirements.txt

# Install Node packages
cd backend-v2/web && npm install
cd ../.. && cd web && npm install
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385
```

## Step 2: Start MongoDB (Once)

```bash
brew services start mongodb-community
```

## Step 3: Start Backend Services (5 terminals)

**Option A: Automatic (If using iTerm2)**
```bash
bash /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/start_all.sh
```

---

## Option B: Manual (Open 5 Terminals)

### Terminal 1: IoT Gateway (Port 5000)
```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2/iot_gateway
source /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/.venv/bin/activate
python app.py
```
✅ Should show: `API running on http://localhost:5000`

### Terminal 2: Prediction API (Port 5001)
```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2
source /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/.venv/bin/activate
python api.py
```
✅ Should show: `Flask API running on http://localhost:5001`

### Terminal 3: Dashboard (Port 5173)
```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2/web
npm run dev
```
✅ Should show: `➜  Local:   http://localhost:5173/`

### Terminal 4: Landing Page (Port 3000)
```bash
cd /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/web
npm run dev
```
✅ Should show: `▲ Next.js ... running on http://localhost:3000`

---

## 🌐 Access Your System

Once all terminals show "✅ running", visit:

| Interface | URL | Purpose |
|-----------|-----|---------|
| **Dashboard** | http://localhost:5173 | 📊 Real-time monitoring |
| **Landing Page** | http://localhost:3000 | 🏠 Public website & AI assistant |
| **Prediction API** | http://localhost:5001 | 🤖 ML predictions |
| **IoT Gateway** | http://localhost:5000 | 📡 Sensor data |

---

## 🧪 Test Everything is Working

```bash
# Test IoT Gateway
curl http://localhost:5000/health

# Test Prediction API  
curl http://localhost:5001/api/health

# Send test sensor data
curl -X POST http://localhost:5000/api/sensor/reading \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test_esp32",
    "tds_value": 1250,
    "conductivity": 2500,
    "temperature": 28.5,
    "battery": 95
  }'

# Get latest reading from database
curl http://localhost:5000/api/sensor/readings?limit=1
```

---

## 🛠️ Using Shell Aliases (Optional but Recommended)

Add these to your `~/.zshrc` for one-command shortcuts:

```bash
# Add aliases to .zshrc
cat /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/shrimp_aliases.sh >> ~/.zshrc
source ~/.zshrc

# Now you can use:
shrimp-help          # See all commands
shrimp-start         # Start all services
shrimp-status        # Check all services
shrimp-test          # Test APIs
shrimp-test-iot      # Send test data
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  ESP32 + Sensors (in the field)                         │
│  • Temperature, pH, DO, Conductivity, TDS, Battery      │
└───────────────────┬─────────────────────────────────────┘
                    │ WiFi + HTTP
                    ▼
        ┌───────────────────────────┐
        │ IoT Gateway (Port 5000)    │
        │ ├─ Receive sensor data    │
        │ ├─ Store in MongoDB       │
        │ └─ Physics calculations   │
        └───────────┬───────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌─────────┐  ┌──────────────┐  ┌──────────────┐
│ MongoDB │  │   Pred API   │  │  Dashboard   │
│ Database│  │ (Port 5001)  │  │ (Port 5173)  │
│         │  │ • ML Models  │  │ • Real-time  │
│         │  │ • Predictions│  │ • Alerting   │
└─────────┘  └──────────────┘  └──────────────┘
```

---

## 🚨 If Something Doesn't Work

### Port Already in Use
```bash
# Find what's using the port
lsof -i :5000   # For IoT Gateway
lsof -i :5001   # For Prediction API  
lsof -i :5173   # For Dashboard
lsof -i :3000   # For Landing Page

# Kill the process
kill -9 <PID>
```

### MongoDB Not Running
```bash
brew services start mongodb-community
# Or if not installed:
brew install mongodb-community
brew services start mongodb-community
```

### Virtual Environment Issues
```bash
# Reactivate it
source /Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/.venv/bin/activate

# Reinstall dependencies
pip install -r backend-v2/requirements.txt
```

### NPM Issues
```bash
cd backend-v2/web
rm -rf node_modules package-lock.json
npm install
```

---

## 📖 Full Documentation

For more detailed information, see:
- **STARTUP_GUIDE.md** - Complete setup instructions
- **backend-v2/iot_gateway/README_IOT_SYSTEM.md** - IoT system details
- **backend-v2/iot_gateway/API_DOCUMENTATION.md** - All API endpoints
- **backend-v2/iot_gateway/IOT_SETUP_GUIDE.md** - Hardware setup
- **backend-v2/iot_gateway/QUICK_REFERENCE.md** - Quick lookup

---

## 💡 Pro Tips

✅ Keep 5 terminal windows open side-by-side  
✅ Monitor logs in real-time  
✅ Use `npm audit fix` if you get warnings  
✅ Export MongoDB data regularly for backups  
✅ Monitor database size: `db.stats()` in mongosh  

---

**Your Smart Shrimp Farm system is ready! 🦐**

Next: Open http://localhost:5173 to see the dashboard!
