# 🎬 Backend & Frontend Integration with Live Video Monitoring

## 📊 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       DISEASE DETECTION SYSTEM                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    REAL-TIME VIDEO MONITORING                       │
│                                                                     │
│  IP Camera (Phone or RTSP)                                          │
│         ↓                                                           │
│  live_video_monitor_enhanced.py (Backend Process)                   │
│    - Connects to camera stream                                     │
│    - Analyzes motion & behavior                                    │
│    - Detects abnormalities                                         │
│    - Calculates metrics                                            │
│         ↓                                                           │
│  HTTP POST → /behavior/live API                                     │
│         ↓                                                           │
│  MongoDB Storage (behavior collection)                              │
│         ↓                                                           │
│  Real-time Updates to Frontend                                      │
│         ↓                                                           │
│  Browser Dashboard Visualization                                    │
└──────────────────────────────────────────────────────────────────────┘

Backend Stack:
├── FastAPI (api/server.py)          - REST API endpoints
├── MongoDB                          - Data storage
├── Risk Model (models/risk_model.py) - ML predictions
├── Live Monitor (live_video_monitor_enhanced.py) - Video analysis
└── Scheduler (services/risk_scheduler.py) - Background tasks

Frontend Stack:
├── React (src/)                     - UI components
├── Recharts                         - Data visualization
├── Axios                            - API client
├── Tailwind CSS                     - Styling
└── Dashboard.jsx                    - Main interface
```

---

## 🔄 Data Flow from Camera to Frontend

### Step 1: Video Capture & Analysis
```
IP Camera → OpenCV Motion Detection → Behavior Metrics
```
**Files Involved:**
- `live_video_monitor_enhanced.py`
- `Config` class with parameters

**Metrics Generated:**
- `activity_index`: Motion percentage (0-1)
- `activity_std`: Variability of motion
- `drop_ratio`: Activity vs. baseline
- `abnormal`: Binary flag for anomalies

### Step 2: Send to Backend API
```
POST /behavior/live
{
  "pond_id": "pond-01",
  "timestamp": "2026-03-11T...",
  "activity_index": 0.2345,
  "activity_std": 0.0123,
  "drop_ratio": 1.05,
  "abnormal": 0
}
```

**Files Involved:**
- `api/server.py` - Receives request
- `agents/behavior_agent.py` - Processes data
- `database/repository.py` - Stores in MongoDB

### Step 3: Risk Calculation (Optional)
```
Behavior Metrics + Environmental Data → Risk Model → Risk Score
```

**Files Involved:**
- `models/risk_model.py` - ML predictions
- `agents/risk_prediction_agent.py` - Generates recommendations
- `services/risk_scheduler.py` - Automatic recalculation

### Step 4: Storage
```
MongoDB Collections:
├── behavior_data - Raw behavior points
├── predictions - Risk predictions
├── environment_data - Water quality metrics
└── feeding_data - Feeding events
```

### Step 5: Frontend Retrieval
```
Frontend APIs:
├── GET /predictions - Get all predictions
├── GET /predictions/{pond_id} - Pond predictions
├── GET /behavior/{pond_id} - Behavior points
├── GET /pond-status/{pond_id} - Complete status
└── GET /health - System health
```

### Step 6: Dashboard Display
```
Behavior Analysis Tab:
├── Activity Index Chart (Area chart)
├── Drop Ratio & Variability (Line chart)
├── Abnormal Events Counter
└── Recent Behavior Table

Risk Score Tab:
├── Disease Risk Percentage
├── Risk Probabilities
├── Recommendations
└── Risk Trend Chart
```

---

## 🔧 Integration Configuration

### 1. Backend Configuration
**File:** `config.py` or `.env`
```python
VIDEO_SOURCE = "http://192.168.8.128:8080/video"
POND_ID = "pond-01"
API_BASE_URL = "http://127.0.0.1:8001"
```

### 2. Video Monitor Configuration
**File:** `live_video_monitor_enhanced.py` → `Config` class
```python
# Motion detection parameters
ROI_FRAC = 0.6                    # Region of interest fraction
WINDOW_FRAMES = 20                # Group frames for averaging
BASELINE_WINDOW = 30              # Historical baseline

# Sensitivity thresholds
DROP_THRESHOLD = 0.6              # Alert if activity drops below this
SPIKE_THRESHOLD = 1.6             # Alert if activity spikes above this

# Timing
SEND_INTERVAL = 5                 # Send data every 5 windows
FPS = 15                          # Target frames per second
```

### 3. Frontend Configuration
**File:** `Frontend/src/services/api.js`
```javascript
const API_BASE_URL = 'http://localhost:8001';
```

---

## 🚀 Running Components

### Option A: Individual Components (for development)

**Terminal 1 - Start Backend API:**
```bash
cd disease-detection
python main.py
```

**Terminal 2 - Start Video Monitor:**
```bash
cd disease-detection
python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --pond pond-01 \
  --risk-prediction
```

**Terminal 3 - Start Frontend:**
```bash
cd Frontend
npm run dev
```

### Option B: All Components (Windows)
```bash
startup.bat
```
Starts all three in separate windows.

### Option C: Docker/Production
```bash
# Backend
docker run -p 8001:8001 disease-detection

# Video Monitor (as background service)
python live_video_monitor_enhanced.py --headless --risk-prediction

# Frontend
npm run build && npm run preview
```

---

## 📈 Real-Time Data Pipeline

### High-Level Flow
```
1. IP Camera captures frame
        ↓
2. OpenCV analyzes motion (20 frame window)
        ↓
3. Calculate behavior metrics
        ↓
4. POST to /behavior/live API
        ↓
5. Backend stores in MongoDB
        ↓
6. Risk model optionally recalculates
        ↓
7. Frontend polls API for updates
        ↓
8. Display in browser dashboard
```

### Timing
- **Video Frame Rate**: ~15 FPS
- **Behavior Window**: 20 frames = ~1.3 seconds
- **API Send Interval**: Every 5 windows = ~6.6 seconds
- **Frontend Refresh**: On-demand via API calls

### Data Points Stored
Each behavior send creates:
- **Behavior record** in MongoDB
- **Activity metrics** (mean, std, min, max)
- **Abnormality flag** (1 for abnormal, 0 for normal)
- **Timestamp** for tracking

---

## 🎯 Integration Example Scenario

### Scenario: Monitor Shrimp During Feeding

**Time: 14:00:00**
```
Camera: Starts stream at 15 FPS
Monitor: Processes video, detects movement
Activity: 0.32 (32% frame pixels moving)

Time: 14:00:01.3 (after 20 frames)
Calculate metrics:
  - Activity Index: 0.32
  - Std Dev: 0.05
  - Drop Ratio: 1.10 (vs baseline 0.29)
  - Abnormal: 0 (within range)

Time: 14:00:08 (5th window, send data)
POST /behavior/live
→ Stored in MongoDB
→ Dashboard updates
→ Shows activity spike icon

Time: 14:00:15 (check risk)
POST /predict-risk (with current metrics)
→ Model predicts risk: LOW (15%)
→ Recommendation: Normal feeding response
→ Frontend shows recommendation
```

---

## 🔍 Monitoring & Debugging

### Check Behavior Data
```bash
# View in MongoDB
mongo
> db.behavior_data.find().sort({timestamp: -1}).limit(5)

# View in API
curl http://localhost:8001/behavior/pond-01
```

### Check Video Monitor Logs
```bash
# Terminal running monitor shows:
Frame 000240 ✓ Normal  | Activity=0.3200 | DropRatio=1.10 | Objects=4
✓ Behavior sent | Activity=0.3200 | Abnormal=0 | DropRatio=1.10
```

### Check Frontend Data
```bash
# Browser Console - Frontend
# Logs API calls and responses
```

---

## 🛠️ Common Integration Issues & Solutions

### Issue: Data not appearing in frontend
**Cause**: Backend not receiving from video monitor
**Solution**:
1. Check monitor logs: `python live_video_monitor_enhanced.py | grep "Behavior"`
2. Verify API URL: `curl http://localhost:8001/health`
3. Check MongoDB connection: See backend logs

### Issue: Video monitor says "Cannot open video source"
**Cause**: IP camera URL wrong or unreachable
**Solution**:
1. Test URL: `curl http://192.168.x.x:8080/video`
2. Verify phone and computer on same WiFi
3. Check firewall: Port 8080 should be open

### Issue: Frontend shows no data but API works
**Cause**: Frontend using wrong API URL
**Solution**:
1. Check `Frontend/src/services/api.js`
2. Verify `API_BASE_URL = 'http://localhost:8001'`
3. Check browser console for API errors

### Issue: Risk model not predicting
**Cause**: Not sending to risk API
**Solution**:
1. Run with `--risk-prediction` flag
2. Check model files exist: `models/artifacts/`
3. See backend logs for prediction errors

---

## 📊 Performance Tuning

### For Best Accuracy
- Higher video resolution (1280x720)
- Higher FPS (20-30)
- Larger `WINDOW_FRAMES` (30-50)
- Better lighting in pond

### For Better Performance
- Lower resolution (480p)
- Lower FPS (8-10)
- Smaller `WINDOW_FRAMES` (10-15)
- Run with `--headless` flag

### Parallel Processing
```
┌─ Video Analysis (continuous)
├─ Behavior Sending (every 5 windows)
├─ Risk Prediction (every 100 frames)
└─ Database Storage (realtime from API)
```

---

## 🔐 Security Considerations

### IP Camera Security
1. **Local Network Only**: Keep on trusted WiFi
2. **Firewall**: Restrict access to camera port
3. **Credentials**: Store in environment variables
4. **RTSP**: Use authentication if available

### API Security
1. **CORS**: Configure for frontend domain
2. **Rate Limiting**: Add if exposing publicly
3. **Authentication**: Add API key if needed
4. **Data Privacy**: Handle video securely

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `live_video_monitor_enhanced.py` | Video capture & analysis |
| `api/server.py` | REST API endpoints |
| `database/repository.py` | Data storage layer |
| `models/risk_model.py` | Risk prediction |
| `Frontend/src/components/BehaviorAnalysis.jsx` | UI for behavior display |
| `Frontend/src/services/api.js` | Frontend API client |

---

## 🎓 Learning More

### OpenCV (Video Processing)
- Docs: https://docs.opencv.org/
- Motion Detection: https://docs.opencv.org/master/de/d7c/tutorial_py_bg_subtraction.html

### Backend Integration
- FastAPI: https://fastapi.tiangolo.com/
- MongoDB: https://docs.mongodb.com/

### Frontend Display
- Recharts: https://recharts.org/
- React: https://react.dev/

---

## ✅ Integration Checklist

- [ ] Backend API running on :8001
- [ ] IP camera accessible from network
- [ ] Video monitor starting without errors
- [ ] Behavior data appearing in logs
- [ ] Data stored in MongoDB
- [ ] Frontend loading without errors
- [ ] Behavior tab showing data
- [ ] Charts displaying correctly
- [ ] Risk predictions working
- [ ] All components integrated

---

**Integration Complete! 🎉 You now have end-to-end real-time behavior monitoring.**
