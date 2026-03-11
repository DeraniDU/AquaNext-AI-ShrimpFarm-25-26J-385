# IP Camera & Live Video Monitoring Setup Guide

## 🎥 Overview

This guide explains how to set up real-time behavior monitoring using an IP camera (preferably from a mobile phone) to feed data into the disease detection system.

---

## 📱 Option 1: Android IP Webcam (Recommended - Free & Easy)

### What You Need
- Android smartphone with camera
- WiFi network (phone and computer on same network)
- "Android IP Webcam" app (free from Google Play Store)

### Step-by-Step Setup

#### 1. Install the App
- Open Google Play Store on your Android phone
- Search for "Android IP Webcam" by Pavel Khlebovich
- Install the free version

#### 2. Configure the App
1. Open the app
2. Go to **Settings** (⚙️ icon)
3. Configure:
   - **Resolution**: 640x480 or 1280x720 (recommended)
   - **FPS**: 15-30
   - **Quality**: Medium (for balance)
   - **Enable video stream**: Toggle ON
   - **Port**: Keep default 8080

4. Start the server by pressing "Start server"
5. Note the IP address shown (e.g., `192.168.8.128:8080`)

#### 3. Connect Backend to Camera
```bash
# In the disease-detection folder:

# Option A: Using environment variables
SET VIDEO_SOURCE=http://192.168.8.128:8080/video
SET POND_ID=pond-01
python live_video_monitor_enhanced.py

# Option B: Using command-line arguments
python live_video_monitor_enhanced.py --source http://192.168.8.128:8080/video --pond pond-01

# Option C: With risk prediction enabled
python live_video_monitor_enhanced.py --source http://192.168.8.128:8080/video --pond pond-01 --risk-prediction
```

#### 4. Monitor Output
You should see logs like:
```
Frame 000020 ✓ Normal  | Activity=0.1234 | DropRatio=1.05 | Objects=3
✓ Behavior sent | Activity=0.1234 | Abnormal=0 | DropRatio=1.05
```

---

## 🎬 Option 2: Traditional IP Camera (RTSP)

### Connection String Format
```
rtsp://username:password@192.168.1.100:554/stream
```

### Example Usage
```bash
python live_video_monitor_enhanced.py \
  --source rtsp://admin:password123@192.168.1.50:554/stream \
  --pond pond-01
```

---

## 💻 Option 3: USB Webcam (For Testing)

```bash
# Device 0 = first webcam
python live_video_monitor_enhanced.py --source 0 --pond pond-01
```

---

## 📹 Option 4: Video File (Testing)

```bash
python live_video_monitor_enhanced.py --source test_video.mp4 --pond pond-01
```

---

## 🔧 Configuration Parameters

Edit these in `Config` class in `live_video_monitor_enhanced.py`:

```python
ROI_FRAC = 0.6              # 60% of frame to analyze
WINDOW_FRAMES = 20          # Average over 20 frames
BASELINE_WINDOW = 30        # 30-frame baseline history
DROP_THRESHOLD = 0.6        # Alert if activity < 60% of baseline
SPIKE_THRESHOLD = 1.6       # Alert if activity > 160% of baseline
SEND_INTERVAL = 5           # Send data every 5 windows
FPS = 15                    # Target 15 frames/second
```

---

## 📊 Data Flow

```
IP Camera (Phone)
        ↓
Backend (live_video_monitor_enhanced.py)
        ↓
    ┌─────┴─────┐
    ↓           ↓
Behavior API  Risk API
    ↓           ↓
MongoDB   Risk Model
    ↓
Frontend (Display & Analysis)
```

---

## 📱 Mobile Phone IP Camera Setup Details

### Android IP Webcam Settings Recommended

| Setting | Recommended | Notes |
|---------|-------------|-------|
| Resolution | 640x480 | Faster processing |
| FPS | 15-20 | Balance speed & quality |
| Zoom | Off | Full field of view |
| Flashlight | Off | Use natural light |
| Rotation | Auto | Correct orientation |
| Quality | Medium | 50-70% JPEG quality |

### Camera Positioning Tips

1. **Angle**: 45-90° from above (bird's eye view)
2. **Distance**: 30-50 cm from pond
3. **Lighting**: Use natural light or LED, avoid shadows
4. **Stability**: Mount on tripod or fixed stand
5. **Field of View**: Include entire monitoring area

### WiFi Connection

- Ensure phone and computer are on **same WiFi network**
- Check IP address of phone in app
- Test connection: `ping 192.168.x.x`

---

## 🚀 Complete Setup Example

### Step 1: Prepare Environment
```bash
cd disease-detection
pip install -r requirements.txt
```

### Step 2: Start Backend API
```bash
# Terminal 1
python main.py
# API runs on http://localhost:8001
```

### Step 3: Configure IP Camera (Phone)
- Install Android IP Webcam app
- Configure settings as recommended above
- Start server, note IP (e.g., 192.168.8.128)
- Keep phone stable and connected to WiFi

### Step 4: Start Video Monitoring
```bash
# Terminal 2
python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --pond pond-01 \
  --risk-prediction
```

### Step 5: Start Frontend
```bash
# Terminal 3
cd Frontend
npm run dev
# Frontend on http://localhost:5173
```

### Step 6: Monitor System
- Check Terminal 2 for behavior metrics
- View http://localhost:5173 for dashboard
- Behavior data updates in real-time

---

## 📈 Understanding the Metrics

### Activity Index (0-1)
- **0.0-0.2**: Low activity (sleeping/resting)
- **0.2-0.5**: Normal activity
- **0.5-1.0**: High activity (feeding/stressed)
- **Abnormal**: Sudden changes indicate problems

### Drop Ratio (vs Baseline)
- **< 0.6**: Significant activity drop 🚨
- **0.6-1.6**: Normal range ✓
- **> 1.6**: Activity spike 🚨

### Abnormal Flag
- **0**: Normal behavior
- **1**: Abnormal detected (drop or spike)

### Movement Objects
- Number of distinct moving objects detected
- Indicates individual shrimp or clusters

---

## 🔍 Monitoring Output Examples

### Normal Behavior
```
Frame 000120 ✓ Normal  | Activity=0.3456 | DropRatio=1.02 | Objects=5
✓ Behavior sent | Activity=0.3456 | Abnormal=0 | DropRatio=1.02
```

### Abnormal Behavior (Low Activity)
```
Frame 000140 🚨 ABNORMAL | Activity=0.1234 | DropRatio=0.45 | Objects=2
✓ Behavior sent | Activity=0.1234 | Abnormal=1 | DropRatio=0.45
🎯 Risk: MEDIUM (45.2%)
```

### Abnormal Behavior (High Activity)
```
Frame 000160 🚨 ABNORMAL | Activity=0.7890 | DropRatio=2.10 | Objects=8
✓ Behavior sent | Activity=0.7890 | Abnormal=1 | DropRatio=2.10
🎯 Risk: HIGH (72.5%)
```

---

## ⚠️ Troubleshooting

### Problem: "Cannot open video source"
**Solutions:**
- Check IP camera is running and accessible
- Test URL in browser: `http://192.168.x.x:8080/video`
- Verify phone and computer on same WiFi
- Check firewall isn't blocking port 8080

### Problem: Connection timeout
**Solutions:**
- Move phone closer to router
- Reduce video resolution to 640x480
- Check WiFi signal strength
- Restart IP Webcam app

### Problem: High CPU usage
**Solutions:**
- Reduce frame resolution
- Lower FPS to 10-15
- Increase `WINDOW_FRAMES` parameter
- Enable `--headless` mode (no GUI)

### Problem: Behavior data not appearing in frontend
**Solutions:**
- Check backend API is running on :8001
- Verify IP camera is sending frames
- Check logs in `video_monitor.log`
- Restart backend: `python main.py`

### Problem: No GUI window showing
**Solutions:**
- Operation is running fine
- Use `--headless` flag if in remote environment
- Check logs instead: `tail -f video_monitor.log`

---

## 🔐 Security Considerations

1. **Local Network Only**: Keep camera on trusted WiFi network
2. **Firewall**: Restrict access to port 8080
3. **API Password**: Add authentication to API if on open network
4. **Encryption**: Use HTTPS/RTSP for production

---

## 📊 Performance Tips

### For Better Accuracy
- Higher resolution (1280x720)
- Higher FPS (20-30)
- Better lighting
- Stable camera position

### For Better Performance
- Lower resolution (480p)
- Lower FPS (10-15)
- Increase `WINDOW_FRAMES` for averaging
- Enable `--headless` mode

---

## 🎯 Next Steps

1. ✅ Set up IP camera (Android or RTSP)
2. ✅ Start backend with video monitoring
3. ✅ Watch logs for behavior data
4. ✅ View in frontend dashboard
5. ✅ Verify risk predictions

---

## 📝 Environment Variables

Create `.env` file in `disease-detection/`:

```env
# Video Source
VIDEO_SOURCE=http://192.168.8.128:8080/video
POND_ID=pond-01

# API Configuration
API_BASE_URL=http://127.0.0.1:8001

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/
DB_NAME=shrimp_farm_iot
```

Then run:
```bash
python live_video_monitor_enhanced.py
```

---

## 💡 Quick Commands

```bash
# Android IP Webcam with risk prediction
python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --pond pond-01 \
  --risk-prediction

# Headless mode (no GUI)
python live_video_monitor_enhanced.py \
  --source http://192.168.8.128:8080/video \
  --pond pond-01 \
  --headless

# Using environment variables
export VIDEO_SOURCE=http://192.168.8.128:8080/video
export POND_ID=pond-01
python live_video_monitor_enhanced.py

# Test with video file
python live_video_monitor_enhanced.py --source test.mp4
```

---

## 📖 Full Usage

```bash
python live_video_monitor_enhanced.py --help
```

---

**Setup Complete! 🎉 Now you have real-time behavior monitoring sending data to your disease detection system.**
