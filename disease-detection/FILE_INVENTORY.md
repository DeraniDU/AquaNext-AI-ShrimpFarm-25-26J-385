# 📋 Complete File Inventory - Live Video Behavior Monitoring System

## 🎬 Backend - Video Monitoring

### NEW FILES

#### 1. **`live_video_monitor_enhanced.py`** ⭐ MAIN VIDEO MONITORING
- **Purpose**: Capture video from IP camera and analyze behavior
- **What it does**:
  - Connects to IP camera (HTTP/JPEG or RTSP)
  - Performs background subtraction for motion detection
  - Calculates behavior metrics (activity, variability, drop ratio)
  - Detects abnormal activity
  - Sends data to backend API
  - Optional risk prediction
  - Displays live GUI (or headless mode)
  - Comprehensive logging
  
- **Key Features**:
  - Multi-source support (IP camera, RTSP, webcam, file)
  - Object tracking and velocity calculation
  - Tunable thresholds for sensitivity
  - CLI interface with arguments
  - Error handling with retry logic
  
- **Usage**:
  ```bash
  python live_video_monitor_enhanced.py \
    --source http://192.168.8.128:8080/video \
    --pond pond-01 \
    --risk-prediction
  ```

## 📖 Documentation

### NEW DOCUMENTATION FILES

#### 1. **`START_HERE.md`** 👈 BEGIN HERE
- **Purpose**: Quick overview and starting point
- **Contains**:
  - This overview
  - Quick start (3 steps)
  - What you'll see
  - File explanations
  - Troubleshooting
  - Command quick reference

#### 2. **`QUICK_START.md`** - 5-Minute Setup Guide
- **Purpose**: Fast installation and setup
- **Contains**:
  - Installation steps
  - IP camera setup options
  - Starting commands
  - Expected output
  - Quick troubleshooting
  - Configuration parameters

#### 3. **`IP_CAMERA_SETUP.md`** - Camera Configuration
- **Purpose**: Detailed IP camera setup
- **Contains**:
  - Android IP Webcam setup (recommended)
  - Traditional RTSP camera
  - Webcam (USB)
  - Video file testing
  - Network configuration
  - Troubleshooting tips
  - Performance tuning
  - Security considerations

#### 4. **`INTEGRATION_GUIDE.md`** - System Integration
- **Purpose**: Complete system architecture and data flow
- **Contains**:
  - Complete system architecture diagram
  - Data flow from camera to frontend
  - Integration configuration
  - Running components
  - Real-time pipeline explanation
  - Performance metrics
  - Common issues & solutions
  - Performance tuning

#### 5. **`QUICK_REFERENCE.md`** - Commands & Tips
- **Purpose**: Quick reference during operation
- **Contains**:
  - Installation & setup
  - Command-line options
  - Terminal output explanation
  - IP camera details
  - Configuration parameters
  - Troubleshooting guide
  - Common commands
  - Monitoring checklist
  - Alert indicators

#### 6. **`VIDEO_MONITORING_SUMMARY.md`** - Technical Details
- **Purpose**: Complete technical implementation summary
- **Contains**:
  - What's implemented
  - System architecture
  - Data flow example
  - Performance metrics
  - Deployment topology
  - Complete checklist
  - Configuration files
  - Links to all documentation

## ⚙️ Configuration Files

### UPDATED FILES

#### 1. **`requirements.txt`** - Python Dependencies
- **Updated to include**:
  - `opencv-python==4.8.1.78` - Video processing
  - `requests==2.31.0` - HTTP communication
  - `python-dotenv==1.0.0` - Environment variables
  - (Plus existing: FastAPI, uvicorn, pymongo, etc.)

- **Install**: `pip install -r requirements.txt`

#### 2. **`.env.example`** - Environment Template
- **Purpose**: Template for environment variables
- **Contains**:
  - MONGO_URI - Database connection
  - POND_ID - Pond identifier
  - VIDEO_SOURCE - Camera URL
  - API_BASE_URL - Backend URL
  - Model paths and parameters
  - Logging configuration

- **Usage**: Copy to `.env` and customize

#### 3. **`startup.bat`** - Windows Launcher
- **Purpose**: Start all components with one click
- **Does**:
  - Checks if Node.js and Python installed
  - Starts Backend API (Terminal 1)
  - Starts Video Monitor (Terminal 2)
  - Starts Frontend (Terminal 3)
  - Opens separate command windows
  
- **Run**: `startup.bat`

## 📁 Backend Files (Existing - Now Integrated)

### Core Backend Files
- **`api/server.py`** - REST API endpoints
  - `POST /behavior/live` - Receives behavior data
  - `POST /predict-risk` - Risk prediction
  - `GET /pond-status/{pond_id}` - Pond data
  - `GET /health` - System status

- **`models/risk_model.py`** - Risk prediction model
  - Loaded behavior data for predictions

- **`database/repository.py`** - Data storage
  - Stores behavior metrics in MongoDB

- **`config.py`** - Configuration
  - API settings, model paths, etc.

- **`main.py`** - Backend entry point
  - Starts FastAPI server

## 🎨 Frontend Files (Existing - Now Enhanced)

### Components Ready for Integration
- **`Frontend/src/App.jsx`** - Main app
- **`Frontend/src/components/Dashboard.jsx`** - Dashboard with tabs
- **`Frontend/src/components/cards/BehaviorAnalysis.jsx`** ⭐ DISPLAYS VIDEO DATA
  - Shows activity index chart
  - Shows drop ratio analysis
  - Shows abnormality tracking
  - Real-time data updates

- **`Frontend/src/services/api.js`** - API client
  - All endpoints integrated

- **Other components**: RiskScoreCard, PredictionHistory, etc.

## 📊 Data Storage (MongoDB)

### Collections Populated by Video Monitor
1. **`behavior_data`** - Behavior metrics
   ```json
   {
     "pond_id": "pond-01",
     "timestamp": "2026-03-11T14:30:45Z",
     "activity_index": 0.2345,
     "activity_std": 0.0123,
     "drop_ratio": 1.05,
     "abnormal": 0
   }
   ```

2. **`predictions`** - Risk predictions (optional)
3. **`environment_data`** - Water quality metrics
4. **`feeding_data`** - Feeding events

## 🔄 Integration Points

### Video Monitor → Backend API
- **Sends**: POST /behavior/live
- **Data**: Behavior metrics every ~6.6 seconds
- **Storage**: MongoDB (automatic)

### Video Monitor → Risk Model (Optional)
- **Sends**: POST /predict-risk
- **Returns**: Risk score + recommendations

### Backend API → Frontend
- **Serves**: GET endpoints for dashboard
- **Updates**: Real-time data polling

### Frontend → Browser
- **Displays**: Behavior charts and statistics
- **Refreshes**: Auto-updates from API

## 📊 Complete Directory Structure

```
disease-detection/
│
├── 🎬 VIDEO MONITORING
│   ├── live_video_monitor_enhanced.py    ⭐ NEW (main video script)
│   ├── live_video_monitor.py            (original - kept for reference)
│
├── 📖 DOCUMENTATION
│   ├── START_HERE.md                     ⭐ NEW (read first!)
│   ├── QUICK_START.md                   ⭐ NEW
│   ├── QUICK_REFERENCE.md               ⭐ NEW
│   ├── IP_CAMERA_SETUP.md               ⭐ NEW
│   ├── INTEGRATION_GUIDE.md             ⭐ NEW
│   ├── VIDEO_MONITORING_SUMMARY.md      ⭐ NEW
│   ├── README.md                        (original)
│   ├── SECURITY.md                      (original)
│
├── ⚙️ CONFIGURATION
│   ├── .env.example                      ✅ UPDATED
│   ├── config.py                        (existing)
│   ├── requirements.txt                 ✅ UPDATED (added opencv, requests)
│   ├── startup.bat                      ⭐ NEW
│
├── 🔧 BACKEND CODE
│   ├── main.py                          (existing - entry point)
│   ├── api/
│   │   └── server.py                    (existing - API endpoints)
│   ├── models/
│   │   ├── risk_model.py                (existing)
│   │   └── artifacts/                   (existing - model files)
│   ├── database/
│   │   ├── mongodb.py                   (existing)
│   │   ├── repository.py                (existing)
│   │   └── feeding_mongodb.py           (existing)
│   ├── agents/
│   │   ├── behavior_agent.py            (existing)
│   │   └── risk_prediction_agent.py     (existing)
│   ├── services/
│   │   ├── data_fusion_service.py       (existing)
│   │   └── risk_scheduler.py            (existing)
│   └── utils/
│       └── behavior_store.py            (existing)
│
└── 🎨 FRONTEND (in Frontend/ folder)
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── Dashboard.jsx
    │   │   ├── PondSelector.jsx
    │   │   └── cards/
    │   │       ├── BehaviorAnalysis.jsx  ✅ DISPLAYS VIDEO DATA
    │   │       ├── RiskScoreCard.jsx
    │   │       ├── PredictionHistory.jsx
    │   │       └── EnvironmentalMetrics.jsx
    │   ├── services/
    │   │   └── api.js
    │   └── hooks/
    │       └── useApi.js
    ├── package.json
    ├── vite.config.js
    ├── README.md
    └── ...
```

## 🎯 What Each File Does

### Video Processing
- `live_video_monitor_enhanced.py` → Captures video → Analyzes motion → Calculates metrics

### Data Flow
- Video Monitor → HTTP POST → API/server.py → MongoDB → API GET → Frontend

### Display
- Frontend components → Display behavior charts → Real-time updates

## 🚀 Usage Summary

### To Run Complete System

**Option 1: Windows (easiest)**
```bash
startup.bat
```

**Option 2: Manual (3 terminals)**
```bash
# Terminal 1: Backend
python main.py

# Terminal 2: Video Monitor
python live_video_monitor_enhanced.py --source http://192.168.8.128:8080/video --pond pond-01

# Terminal 3: Frontend
cd Frontend && npm run dev
```

**Then open:**
- Backend API: http://localhost:8001
- Frontend: http://localhost:5173
- Dashboard tab: "Analysis" (shows behavior data)

## 📊 Output Examples

### Video Monitor Terminal
```
Frame 000240 ✓ Normal  | Activity=0.2345 | DropRatio=1.05 | Objects=3
✓ Behavior sent | Activity=0.2345 | Abnormal=0 | DropRatio=1.05
```

### Browser Dashboard
- Activity index chart (live updating)
- Drop ratio trend
- Abnormal events counter
- Recent behavior table

## 🔧 Customization Files

To customize, edit:
1. **`live_video_monitor_enhanced.py`** → `Config` class (thresholds, etc.)
2. **`.env`** → Environment variables
3. **`Frontend/src/services/api.js`** → API URLs
4. **`Frontend/src/components/cards/BehaviorAnalysis.jsx`** → Chart styling

## 📚 Documentation Map

```
START HERE
    ↓
START_HERE.md (this overview)
    ↓
├─→ QUICK_START.md (5-min setup)
│       ↓
│   [Install & Run]
│
├─→ IP_CAMERA_SETUP.md (camera config)
│       ↓
│   [Configure camera]
│
├─→ QUICK_REFERENCE.md (commands & tips)
│       ↓
│   [Troubleshooting & quick commands]
│
├─→ INTEGRATION_GUIDE.md (how it works)
│       ↓
│   [Understand architecture]
│
└─→ VIDEO_MONITORING_SUMMARY.md (deep dive)
        ↓
    [Technical details]
```

## ✅ Verification Checklist

- [ ] Downloaded latest files
- [ ] Installed dependencies: `pip install -r requirements.txt`
- [ ] Read START_HERE.md
- [ ] Configured IP camera
- [ ] Backend API running
- [ ] Video monitor showing logs
- [ ] Frontend loading
- [ ] Behavior charts displaying

## 🎯 Next Steps

1. **Read**: [START_HERE.md](START_HERE.md)
2. **Review**: [QUICK_START.md](QUICK_START.md)
3. **Setup**: Follow [IP_CAMERA_SETUP.md](IP_CAMERA_SETUP.md)
4. **Run**: `startup.bat`
5. **Monitor**: Watch terminal logs
6. **View**: Open http://localhost:5173
7. **Check**: Behavior Analysis tab

---

**All files are ready! Start with `startup.bat` or read the documentation above. 🚀**
