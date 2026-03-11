# 🎬 LIVE VIDEO BEHAVIOR MONITORING - START HERE

## 🎯 What You Now Have

A **complete end-to-end system** for real-time shrimp pond monitoring with:
- ✅ IP camera video capture (from mobile phone or traditional camera)
- ✅ Real-time behavior analysis (motion detection, metrics)
- ✅ Automatic backend API integration
- ✅ Database storage (MongoDB)
- ✅ Risk model prediction
- ✅ Beautiful frontend dashboard

---

## 📁 Which File to Use?

### 🎬 Backend Video Monitoring
**File:** `live_video_monitor_enhanced.py`
- Purpose: Captures video from IP camera and analyzes behavior
- Run with: `python live_video_monitor_enhanced.py --source http://192.168.x.x:8080/video --pond pond-01`
- Output: Real-time behavior metrics sent to backend API

### 📋 Setup & Documentation

| File | When to Read | What It Contains |
|------|--------------|------------------|
| **START_HERE.md** | First! (you're here) | This overview |
| **QUICK_START.md** | Before setup | 5-minute quick start |
| **IP_CAMERA_SETUP.md** | Setting up camera | Detailed IP camera configuration guide |
| **INTEGRATION_GUIDE.md** | Understanding flow | How all components work together |
| **QUICK_REFERENCE.md** | During operation | Commands and debugging |
| **VIDEO_MONITORING_SUMMARY.md** | Learning more | Technical details and architecture |

### 🛠️ Configuration Files
- `.env.example` - Environment variables template
- `startup.bat` - Windows launcher (starts everything)

### 📊 Backend Components
- `api/server.py` - REST API endpoints (already integrated)
- `models/risk_model.py` - Risk prediction (optional)
- `database/repository.py` - Data storage (already integrated)

### 🎨 Frontend Components
- `Frontend/src/components/cards/BehaviorAnalysis.jsx` - Displays video data
- `Frontend/src/services/api.js` - API communication

---

## 🚀 Quick Start (3 Steps)

### Step 1: Install
```bash
cd disease-detection
pip install -r requirements.txt
```

### Step 2: Configure IP Camera
**Android Phone (recommended):**
1. Install "Android IP Webcam" app
2. Note the IP: `http://192.168.8.128:8080/video`

**Traditional IP Camera:**
- Use RTSP URL: `rtsp://192.168.1.100:554/stream`

**Tests:**
- Webcam: `0`
- Video file: `video.mp4`

### Step 3: Start Everything
**Windows:**
```bash
startup.bat
```

**Manual (3 Terminals):**
```bash
# Terminal 1
python main.py

# Terminal 2
python live_video_monitor_enhanced.py --source http://192.168.8.128:8080/video --pond pond-01

# Terminal 3
cd Frontend && npm run dev
```

Then open: **http://localhost:5173**

---

## 📊 What You'll See

### Terminal Output (Video Monitor)
```
Frame 000240 ✓ Normal  | Activity=0.2345 | DropRatio=1.05 | Objects=3
✓ Behavior sent | Activity=0.2345 | Abnormal=0 | DropRatio=1.05
```

### Browser Dashboard (http://localhost:5173)
**Analysis Tab** shows:
- 📈 Activity index chart (real-time updates)
- 📊 Drop ratio analysis
- 🚨 Abnormality tracking
- 📋 Recent behavior table

---

## 🎥 How It Works

```
IP Camera (Phone) → Video Stream
        ↓
live_video_monitor_enhanced.py → Motion Detection
        ↓
Behavior Metrics (activity, drop_ratio, etc.)
        ↓
POST /behavior/live → Backend API
        ↓
MongoDB Storage
        ↓
Frontend API Polling
        ↓
Dashboard Display with Charts
```

---

## ⚙️ Configuration Options

### Android IP Webcam (Easiest Setup)

1. **Install app** from Google Play Store
2. **Configure:**
   - Resolution: 640x480
   - FPS: 15
   - Quality: Medium
3. **Start server** and note IP
4. **Use URL:** `http://192.168.x.x:8080/video`

### Command Examples

```bash
# Android IP Webcam
python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --pond pond-01

# With risk predictions
python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --pond pond-01 \
  --risk-prediction

# Headless mode (no GUI)
python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --pond pond-01 \
  --headless

# RTSP camera
python live_video_monitor_enhanced.py \
  --source rtsp://192.168.1.100:554/stream \
  --pond pond-01

# Webcam (testing)
python live_video_monitor_enhanced.py --source 0 --pond test
```

---

## 🔍 Understanding Metrics

### Activity Index (0-1)
- **0-0.2**: Low activity (resting)
- **0.2-0.6**: Normal activity
- **0.6+**: High activity (feeding/stress)

### Drop Ratio
- **< 0.6**: 🚨 Activity drop (abnormal)
- **0.6-1.6**: ✓ Normal range
- **> 1.6**: 🚨 Activity spike (abnormal)

### Abnormal Flag
- **0**: Normal behavior
- **1**: Abnormal activity detected

---

## 🎯 Key Files Explained

### `live_video_monitor_enhanced.py` ⭐
Enhanced video monitoring with:
- Motion detection (OpenCV)
- Behavior analysis
- Object detection
- API integration
- Comprehensive logging
- GUI display or headless mode

**Key Functions:**
```python
detect_moving_objects()    # Find movement
calculate_velocity()       # Track speed
send_behavior_data()       # Send to API
send_risk_prediction()     # Optional risk calc
```

### `IP_CAMERA_SETUP.md` 📱
Complete guide for:
- Android IP Webcam setup
- RTSP camera configuration
- Troubleshooting tips
- Network setup
- Camera positioning

### `INTEGRATION_GUIDE.md` 🔌
Explains:
- Complete data flow
- How video connects to backend
- How backend connects to frontend
- Performance tuning
- Security considerations

### `QUICK_REFERENCE.md` ⚡
Quick commands:
- Installation
- Starting commands
- Configuration options
- Troubleshooting
- CLI examples

---

## 📊 Frontend Integration

The **Analysis Tab** in the dashboard now displays:

✅ **Activity Index Chart**
- Area chart showing motion over time
- Real-time updates from video monitor

✅ **Drop Ratio Analysis**
- Line chart showing ratio vs baseline
- Highlights abnormal activity

✅ **Behavior Statistics**
- Average activity
- Activity variability
- Abnormal event count
- Total data points

✅ **Recent Behavior Table**
- Last 15 behavior records
- Timestamp, metrics, status
- Auto-refreshes

---

## 🚨 Troubleshooting

### Issue: "Cannot open video source"
```
Solution: 
1. Test URL: curl http://192.168.x.x:8080/video
2. Check WiFi connection
3. Restart Android IP Webcam app
4. Check firewall allows port 8080
```

### Issue: No data in frontend
```
Solution:
1. Check backend running: curl http://localhost:8001/health
2. Check monitor logs: Should show "Behavior sent" messages
3. Check browser console (F12)
4. Restart all components
```

### Issue: High CPU usage
```
Solution:
1. Lower resolution to 480p
2. Reduce FPS to 10
3. Use --headless flag
4. Increase averaging window
```

---

## 📋 Setup Checklist

- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] Backend API running: `python main.py` on :8001
- [ ] IP camera accessible: Test URL in browser
- [ ] Video monitor connected: Shows logs
- [ ] Backend receiving data: Check API responses
- [ ] Frontend loading: http://localhost:5173
- [ ] Behavior tab showing data: Charts display
- [ ] Real-time updates working: Data refreshes

---

## 🎓 Learning Path

**Start with:**
1. ✅ This file (START_HERE.md)
2. ✅ QUICK_START.md (5 minutes)

**Then setup:**
3. ✅ IP_CAMERA_SETUP.md (configure camera)
4. ✅ startup.bat (launch all components)

**If issues:**
5. ✅ QUICK_REFERENCE.md (troubleshooting)

**For understanding:**
6. ✅ INTEGRATION_GUIDE.md (how it works)
7. ✅ VIDEO_MONITORING_SUMMARY.md (architecture)

---

## 🔧 Environment Variables

Create `.env` file:
```env
VIDEO_SOURCE=http://192.168.8.128:8080/video
POND_ID=pond-01
API_BASE_URL=http://127.0.0.1:8001
MONGO_URI=your_mongodb_uri
DB_NAME=shrimp_farm_iot
```

Then run: `python live_video_monitor_enhanced.py`

---

## 📱 Hardware Requirements

**Minimum:**
- Webcam or IP camera
- ~500MB storage
- Stable WiFi (for IP camera)

**Recommended:**
- IP Camera (Android phone)
- Fiber/stable internet
- 1GB+ RAM
- Dual-core processor

---

## 🌐 Access Points

| Component | URL | Purpose |
|-----------|-----|---------|
| Frontend | http://localhost:5173 | Dashboard UI |
| Backend API | http://localhost:8001 | REST endpoints |
| API Docs | http://localhost:8001/docs | Swagger UI |
| Health Check | http://localhost:8001/health | System status |
| MongoDB | Local or cloud | Data storage |

---

## 🚀 Advanced Options

### Enable Risk Prediction
```bash
python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --risk-prediction
```

### Use Remote API
```bash
python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --api-url http://remote-server.com:8001
```

### Headless Production Mode
```bash
nohup python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --headless \
  --risk-prediction &
```

---

## 📊 System Status

**Backend:** ✅ Ready
**Frontend:** ✅ Ready  
**Video Monitor:** ✅ Ready
**Integration:** ✅ Complete
**Documentation:** ✅ Complete

---

## 🎯 What's Next?

1. **Read QUICK_START.md** (5-min setup guide)
2. **Read IP_CAMERA_SETUP.md** (configure camera)
3. **Run startup.bat** or manual start
4. **Monitor terminal output**
5. **Open dashboard** http://localhost:5173
6. **Watch behavior data** update in real-time

---

## 📞 Quick Commands

```bash
# One-liner to start everything (Windows)
startup.bat

# Start backend API
python main.py

# Start video monitor (Android IP camera)
python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --pond pond-01

# Start frontend
cd Frontend && npm run dev

# Check system health
curl http://localhost:8001/health

# View behavior data
curl http://localhost:8001/behavior/pond-01
```

---

## ✨ You're All Set!

**Complete end-to-end system ready for production use:**

- 🎥 Real-time video capture
- 📊 Live behavior analysis
- 📈 Dashboard visualization
- 🎯 Risk prediction
- 📱 Multi-device support
- 🔄 Real-time updates

---

## 📚 Quick Links to Documentation

- **[QUICK_START.md](QUICK_START.md)** - 5-minute setup
- **[IP_CAMERA_SETUP.md](IP_CAMERA_SETUP.md)** - Camera configuration
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Commands & tips
- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - System architecture
- **[VIDEO_MONITORING_SUMMARY.md](VIDEO_MONITORING_SUMMARY.md)** - Technical details

---

**Ready? Start with `startup.bat` or read QUICK_START.md next! 🚀**
