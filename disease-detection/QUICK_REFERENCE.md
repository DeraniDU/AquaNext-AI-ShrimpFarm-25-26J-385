# 🚀 Quick Reference Guide - Live Video Monitoring System

## 📋 Installation & Setup (5 Minutes)

### 1. Install Dependencies
```bash
cd disease-detection
pip install -r requirements.txt
```
This installs: opencv-python, requests, numpy, and all backend packages.

### 2. Set Up IP Camera

**Option A: Android Phone (Easiest)**
```
1. Install "Android IP Webcam" app (Google Play)
2. Configure: Settings → Resolution: 640x480, Fps: 15
3. Start server, note IP (e.g., 192.168.8.128:8080)
```

**Option B: Traditional Camera**
```
rtsp://IP:PORT/stream (RTSP format)
```

**Option C: Webcam (Testing)**
```
Device 0 or 1
```

### 3. Create .env File (Optional)
```bash
# Copy example
cp .env.example .env

# Edit .env with your settings
VIDEO_SOURCE=http://192.168.8.128:8080/video
POND_ID=pond-01
```

---

## 🚀 Starting the System

### Single Command (Windows)
```bash
startup.bat
```
Starts Backend API, Video Monitor, and Frontend in 3 windows.

### Manual Start (3 Terminals)

**Terminal 1: Backend API**
```bash
cd disease-detection
python main.py
# Runs on http://localhost:8001
```

**Terminal 2: Video Monitor**
```bash
cd disease-detection
python live_video_monitor_enhanced.py --source http://192.168.8.128:8080/video --pond pond-01
```

**Terminal 3: Frontend**
```bash
cd Frontend
npm run dev
# Runs on http://localhost:5173
```

### With Risk Prediction
```bash
python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --pond pond-01 \
  --risk-prediction
```

### Headless Mode (No GUI)
```bash
python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --pond pond-01 \
  --headless
```

---

## 📋 Command-Line Options

```
python live_video_monitor_enhanced.py [OPTIONS]

Options:
  --source TEXT              Video source URL or device
  --pond TEXT               Pond ID (default: pond-01)
  --headless                Run without GUI
  --risk-prediction         Send to risk model
  --api-url TEXT            Backend API URL
  --help                    Show all options
```

### Examples

```bash
# Android IP Camera
python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --pond pond-01

# RTSP Camera
python live_video_monitor_enhanced.py \
  --source rtsp://192.168.1.100:554/stream \
  --pond pond-02

# Webcam
python live_video_monitor_enhanced.py --source 0 --pond test

# Video file
python live_video_monitor_enhanced.py --source video.mp4 --pond test

# Remote API
python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --api-url http://remote-server.com:8001
```

---

## 📊 Understanding Output

### Terminal Output
```
Frame 000240 ✓ Normal  | Activity=0.2345 | Std=0.0123 | DropRatio=1.05 | Velocity=2.34 | Objects=3
```

**Meanings:**
- `Frame 000240`: Total frames processed
- `✓ Normal`: No anomalies detected  (or 🚨 ABNORMAL)
- `Activity=0.2345`: 23.45% of pixels moving
- `Std=0.0123`: Low variability (stable)
- `DropRatio=1.05`: 105% of baseline (normal range: 0.6-1.6)
- `Velocity=2.34`: Average pixel displacement per frame
- `Objects=3`: 3 distinct moving clusters detected

### Behavior Send
```
✓ Behavior sent | Activity=0.2345 | Abnormal=0 | DropRatio=1.05
```
Data successfully sent to API.

### Risk Prediction
```
🎯 Risk: MEDIUM (52.3%)
```
Model predicts disease risk.

### Video Windows (GUI Mode)
- **Left side**: Original frame with ROI rectangle and object centers
- **Right side**: Motion mask (white = movement)

---

## 🔍 Common Commands

### Monitor System Health
```bash
# Check API is running
curl http://localhost:8001/health

# Get all predictions
curl http://localhost:8001/predictions

# Get pond-specific data
curl http://localhost:8001/pond-status/pond-01

# Get behavior data
curl http://localhost:8001/behavior/pond-01
```

### View Logs
```bash
# Video monitor logs
tail -f video_monitor.log

# Backend logs (if running)
# Usually printed to terminal

# Browser console (Frontend)
F12 or Ctrl+Shift+I in browser
```

### Stop Services
```bash
# Windows: Close individual windows or
taskkill /F /IM python.exe
taskkill /F /IM node.exe

# Linux/Mac: Ctrl+C in each terminal
```

---

## 🎯 Accessing the System

| Component | URL | Purpose |
|-----------|-----|---------|
| Backend API | http://localhost:8001 | REST endpoints |
| API Docs | http://localhost:8001/docs | Swagger documentation |
| Frontend | http://localhost:5173 | Dashboard UI |
| Health Check | http://localhost:8001/health | System status |

---

## 📱 IP Camera Setup Details

### Android IP Webcam (Recommended)

**App Settings:**
```
Resolution: 640x480 (optimal balance)
FPS: 15 (good speed)
Front Camera On
Quality: 50% (medium quality)
Port: 8080 (default)
Audio: Off
Flashlight: Off
```

**URL Format:**
```
http://192.168.8.128:8080/video
```

**Find Your Phone's IP:**
1. Open Android IP Webcam app
2. Look for "IP:8080/video" on screen
3. Replace 192.168.8.128 with your actual IP

**Test Connection:**
```bash
# Open browser to:
http://192.168.8.128:8080/video

# Or test with curl:
curl http://192.168.8.128:8080/video
```

---

## 🔧 Configuration Parameters

**File:** `live_video_monitor_enhanced.py` → `Config` class

```python
# Adjust to your environment:
ROI_FRAC = 0.6              # Analyze 60% of frame
WINDOW_FRAMES = 20          # Group 20 frames for averaging
BASELINE_WINDOW = 30        # Remember last 30 windows
DROP_THRESHOLD = 0.6        # Alert if < 60% of baseline
SPIKE_THRESHOLD = 1.6       # Alert if > 160% of baseline
SEND_INTERVAL = 5           # Send every 5 windows (~6.6 sec)
FPS = 15                    # Target 15 frames/second
```

**Tuning Guide:**
- **More sensitive**: Lower thresholds (0.4, 1.8)
- **Less sensitive**: Higher thresholds (0.7, 1.5)
- **Faster updates**: Lower SEND_INTERVAL (2-3)
- **More stable**: Higher WINDOW_FRAMES (30-50)

---

## 🐛 Troubleshooting

### Video Monitor Won't Start
```bash
# Error: Cannot open video source
# Solution:
1. Test IP camera: curl http://192.168.8.128:8080/video
2. Check WiFi connection
3. Verify firewall allows port 8080
4. Restart IP Webcam app on phone
```

### No Data in Frontend
```bash
# Solution:
1. Check backend is running: curl http://localhost:8001/health
2. Check monitor is running: Look for logs
3. Check API call: curl http://localhost:8001/predictions
4. Check browser console for errors (F12)
```

### High CPU Usage
```bash
# Solution:
1. Lower video resolution to 480p
2. Reduce FPS to 10
3. Use --headless flag
4. Increase WINDOW_FRAMES parameter
```

### Connection Timeout
```bash
# For IP Camera:
1. Move phone closer to router
2. Check WiFi signal strength
3. Restart IP Webcam app
4. Reduce resolution to 480p
```

---

## 📊 Data Flow

```
IP Camera
    ↓
OpenCV Motion Detection
    ↓
Behavior Metrics Calculation
    ↓
POST /behavior/live
    ↓
MongoDB Storage
    ↓
Optional: Risk Model Prediction
    ↓
Frontend API (GET)
    ↓
Dashboard Display & Charts
```

---

## 🎨 Frontend Integration

### Behavior Analysis Tab Shows:
- Activity index chart (area chart)
- Drop ratio chart (line chart)
- Abnormal events counter
- Recent behavior table with timestamps

### Automatic Updates:
- Frontend polls API every few seconds
- Charts update with latest data
- Real-time risk assessment

### Sample Behavior Data:
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

---

## 📈 Monitoring Checklist

- [ ] Backend API running
- [ ] IP camera accessible
- [ ] Video monitor logging data
- [ ] Dashboard loading
- [ ] Behavior tab showing charts
- [ ] Risk predictions working
- [ ] Data updating in real-time

---

## 💡 Pro Tips

1. **Positioning**: Mount camera 45° above pond
2. **Lighting**: Use natural light or LED setup
3. **Stability**: Use tripod for fixed position
4. **Network**: Ensure stable WiFi connection
5. **Updates**: Monitor logs regularly
6. **Backup**: Save important data periodically

---

## 🚨 Alert Indicators

### Normal (Green ✓)
- Activity: 0.2-0.6 (20-60%)
- Drop Ratio: 0.6-1.6
- Abnormal: 0
- Status: NORMAL

### Warning (Yellow ⚠️)
- Activity: 0.1-0.2 or 0.6-0.8
- Drop Ratio: 0.45-0.6 or 1.6-1.9
- Abnormal: 1 (occasional)
- Status: MONITORING

### Critical (Red 🚨)
- Activity: < 0.1 or > 0.9
- Drop Ratio: < 0.4 or > 2.0
- Abnormal: 1 (frequent)
- Status: ACTION NEEDED

---

## 📞 Quick Reference

**Installation:**
```bash
pip install -r requirements.txt
```

**Start All:**
```bash
startup.bat  # or run manually in 3 terminals
```

**Video Monitor:**
```bash
python live_video_monitor_enhanced.py --source http://192.168.8.128:8080/video --pond pond-01
```

**Check Health:**
```bash
curl http://localhost:8001/health
```

**View Dashboard:**
```
http://localhost:5173
```

**Stop All:**
```
Close all terminal windows or Ctrl+C
```

---

## 📚 Documentation Files

- `IP_CAMERA_SETUP.md` - Detailed IP camera configuration
- `INTEGRATION_GUIDE.md` - Full system integration
- `README.md` - General project information
- `IMPLEMENTATION.md` - Frontend features

---

**Ready to monitor! Start with `startup.bat` or follow manual start instructions above. 🎉**
