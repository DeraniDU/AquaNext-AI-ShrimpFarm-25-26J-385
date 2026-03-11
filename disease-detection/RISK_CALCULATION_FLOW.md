# 🎯 Risk Calculation Flow - Complete Explanation

## 📊 Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    REAL-TIME DATA PIPELINE                       │
└─────────────────────────────────────────────────────────────────┘

  ┌─────────────────────┐
  │  Live IP Camera     │
  │  (30 FPS)           │
  └──────────┬──────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ live_video_monitor_enhanced.py (every ~6.6 seconds)          │
│  ├─ Motion Detection (MOG2)                                  │
│  ├─ Calculate metrics:                                       │
│  │  ├─ activity_index (average motion per frame)            │
│  │  ├─ activity_std (variability)                           │
│  │  ├─ drop_ratio (abnormal activity drops)                 │
│  │  └─ abnormal (binary: 0 or 1)                            │
│  └─ POST to /behavior/live                                  │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│ Backend API: POST /behavior/live                             │
│  ├─ Receive behavior metrics                                │
│  ├─ Store in MongoDB: behavior_live collection             │
│  └─ Return success                                          │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼ Each time behavior data arrives
┌──────────────────────────────────────────────────────────────┐
│ Option A: MANUAL RISK PREDICTION (API Endpoint)              │
│  POST /predict-risk with all 10 features                    │
│  └─ Model generates risk score immediately                 │
└──────────────────────────────────────────────────────────────┘

           OR

┌──────────────────────────────────────────────────────────────┐
│ Option B: SCHEDULED RISK RECALCULATION (Background Job)      │
│  - Run on schedule (e.g., every 30 seconds)                 │
│  - Triggers RiskScheduler                                   │
│  └─ Fuses latest data from all sources                      │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│ DataFusionService: Combine Latest Data                       │
│                                                               │
│ 1️⃣  Get LATEST from behavior_live:                          │
│    └─ activity_index, activity_std, drop_ratio, abnormal    │
│                                                               │
│ 2️⃣  Get LATEST from feeding_data:                           │
│    └─ feed_amount, feed_response                            │
│                                                               │
│ 3️⃣  Get LATEST from environment_data:                       │
│    └─ DO, temp, pH, salinity                               │
│                                                               │
│ 4️⃣  If any source is missing:                              │
│    └─ Use PREVIOUS known value (fallback)                  │
│                                                               │
│ Result: 10 features ready for model                         │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│ Risk Model Prediction                                         │
│  ├─ Random Forest (supervised): LOW/MEDIUM/HIGH             │
│  ├─ Isolation Forest: Anomaly score                         │
│  ├─ Combines both for final risk determination              │
│  └─ Returns: prediction + confidence + reasoning            │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│ Save Result in MongoDB: risk_predictions collection         │
│  ├─ pond_id                                                  │
│  ├─ timestamp                                               │
│  ├─ input_features (all 10 features used)                  │
│  ├─ prediction_result (HIGH/MEDIUM/LOW + probabilities)   │
│  └─ source_data (which behavior/feeding/env used)          │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
        Frontend Dashboard
        └─ GET /pond-status/{pond_id}
           └─ Displays latest risk + trends
```

---

## ⏰ WHEN DOES RISK CALCULATION HAPPEN?

### **Scenario 1: User Makes Manual Request**
```
When: User clicks "Calculate Risk Now" or manually calls API
API: POST /predict-risk {activity_mean, activity_std, ..., salinity}
Behavior: Immediate calculation + save
Latency: <1 second
```

### **Scenario 2: Automatic Scheduled Recalculation** ⭐ RECOMMENDED
```
When: Every 30 seconds (or custom interval via scheduler)
Process:
  1. Trigger RiskSchedulerService.recalculate_for_pond(pond_id)
  2. DataFusionService.get_latest_fused_input(pond_id)
  3. Fetch LATEST documents from each source:
     - behavior_live (newest entry by timestamp)
     - feeding_data (newest entry by timestamp)
     - environment_data (newest entry by timestamp)
  4. Combine into model input
  5. Run prediction
  6. Save result + update frontend cache
Latency: ~100-500ms (depends on network)
Frequency: Scalable (can run every 10-60 seconds)
```

---

## 🔄 LIVE VIDEO DATA INTEGRATION

### **Step-by-Step Flow:**

```
MINUTE 1:
┌──────────────────────────────┐
│ Initial State:               │
│ ├─ last_behavior: NONE       │
│ ├─ last_feeding: [old data]  │
│ └─ last_environment: [old]   │
└──────────────────────────────┘

MINUTE 1:05 (Video Monitor Sends First Behavior)
┌──────────────────────────────┐
│ POST /behavior/live          │
│ {                            │
│   activity_index: 0.25,      │
│   activity_std: 0.03,        │
│   drop_ratio: 1.02,          │
│   abnormal: 0,               │
│   pond_id: "pond-01",        │
│   timestamp: "2026-03-11..." │
│ }                            │
└──────────────────────────────┘
          ▼ Saved to DB
┌──────────────────────────────┐
│ MongoDB:behavior_live        │
│ {NEW record}                 │
└──────────────────────────────┘

MINUTE 1:30 (Scheduled Risk Recalculation)
┌──────────────────────────────────────────────────────┐
│ RiskScheduler.recalculate_for_pond("pond-01")        │
│                                                       │
│ Fuse Latest Data:                                     │
│ ├─ ✅ NEW: behavior_index = 0.25 (from 1:05)        │
│ ├─ ✅ OLD: feed_amount = 120.0 (no new data yet)     │
│ ├─ ✅ OLD: DO = 5.1 (no new water quality update)    │
│ ├─ ✅ OLD: temp = 30.2                               │
│ ├─ ✅ OLD: pH = 7.6                                  │
│ └─ ✅ OLD: salinity = 15.0                           │
│                                                       │
│ Model Input: {                                        │
│   activity_mean: 0.25,  ← FRESH (from video)         │
│   activity_std: 0.03,   ← FRESH (from video)         │
│   drop_ratio: 1.02,     ← FRESH (from video)         │
│   abnormal: 0,          ← FRESH (from video)         │
│   feed_amount: 120.0,   ← REUSED (no new data)       │
│   feed_response: 0.55,  ← REUSED (no new data)       │
│   DO: 5.1,              ← REUSED (no new data)       │
│   temp: 30.2,           ← REUSED (no new data)       │
│   pH: 7.6,              ← REUSED (no new data)       │
│   salinity: 15.0        ← REUSED (no new data)       │
│ }                                                     │
└──────────────────────────────────────────────────────┘
          ▼
┌──────────────────────────────────────────────────────┐
│ Risk Model Prediction                                 │
│ Input: [0.25, 0.03, 1.02, 0, 120, 0.55, 5.1, ...]   │
│ Output: {                                             │
│   supervised_prediction: "LOW",                       │
│   supervised_probabilities: {                         │
│     LOW: 0.82,                                        │
│     MEDIUM: 0.15,                                     │
│     HIGH: 0.03                                        │
│   },                                                  │
│   unsupervised_risk_score: 0.45,                      │
│   unsupervised_prediction: "NORMAL"                   │
│ }                                                     │
└──────────────────────────────────────────────────────┘
          ▼
┌──────────────────────────────────────────────────────┐
│ Save to MongoDB: risk_predictions                     │
│ {                                                     │
│   pond_id: "pond-01",                                 │
│   timestamp: "2026-03-11T14:30:00Z",                  │
│   input_features: {...all 10 features...},           │
│   source_data: {                                      │
│     behavior: {timestamp: "2026-03-11T14:25...", ...},│
│     feeding: {timestamp: "2026-03-11T13:00...", ...}, │
│     environment: {timestamp: "2026-03-11T14:28...", }│
│   },                                                  │
│   prediction_result: {...risk scores...}             │
│ }                                                     │
└──────────────────────────────────────────────────────┘

MINUTE 2:00 (New Feeding Data Arrives)
┌──────────────────────────────┐
│ POST /feeding               │
│ {                           │
│   feed_amount: 130.0,  ← NEW│
│   feed_response: 0.60, ← NEW│
│ }                           │
└──────────────────────────────┘
          ▼ Saved to DB

MINUTE 2:30 (Next Scheduled Risk Recalculation)
┌──────────────────────────────────────────────────────┐
│ RiskScheduler.recalculate_for_pond("pond-01")        │
│                                                       │
│ Fuse Latest Data:                                     │
│ ├─ ✅ OLD: behavior_index = 0.25 (from 1:05)        │
│ ├─ ✅ NEW: feed_amount = 130.0 (from 2:00)    🔴  │
│ ├─ ✅ NEW: feed_response = 0.60 (from 2:00)  🔴  │
│ ├─ ✅ OLD: DO = 5.1 (no new water quality)         │
│ └─ ... (other reused data)                         │
│                                                       │
│ Model Input: {                                        │
│   activity_mean: 0.25,    ← REUSED (1:05)           │
│   activity_std: 0.03,     ← REUSED (1:05)           │
│   drop_ratio: 1.02,       ← REUSED (1:05)           │
│   abnormal: 0,            ← REUSED (1:05)           │
│   feed_amount: 130.0,     ← FRESH (2:00)        🔴│
│   feed_response: 0.60,    ← FRESH (2:00)        🔴│
│   DO: 5.1,                ← REUSED (old env)       │
│   temp: 30.2,             ← REUSED (old env)       │
│   pH: 7.6,                ← REUSED (old env)       │
│   salinity: 15.0          ← REUSED (old env)       │
│ }                                                     │
│                                                       │
│ Note: New feeding data UPDATES risk calculation,     │
│       but old behavior data still used (no staleness)│
└──────────────────────────────────────────────────────┘
          ▼
[ Risk prediction runs with MIXED fresh & reused data ]
```

---

## 📋 FEATURE UPDATE PRIORITY

```
TIER 1: Real-Time (Updated Every 5-6 seconds)
┌────────────────────────────────────────────────┐
│ From live_video_monitor_enhanced.py:           │
│ ├─ activity_mean ............ 0.25             │
│ ├─ activity_std ............ 0.03              │
│ ├─ drop_ratio .............. 1.02              │
│ └─ abnormal ................. 0                │
│ Update Interval: ~6.6 seconds                  │
│ Data Source: IP Camera via motion analysis     │
└────────────────────────────────────────────────┘

TIER 2: Manual Entry (Updated When User Submits)
┌────────────────────────────────────────────────┐
│ From feeding form or API:                      │
│ ├─ feed_amount .............. 130.0            │
│ └─ feed_response ............ 0.60             │
│ Update Interval: Varies (1-6 hours typical)   │
│ Data Source: Manual human input                │
└────────────────────────────────────────────────┘

TIER 3: Read-Only (Updated by External System)
┌────────────────────────────────────────────────┐
│ From water quality IoT sensors:                │
│ ├─ DO ........................ 5.1              │
│ ├─ temp ...................... 30.2             │
│ ├─ pH ........................ 7.6              │
│ └─ salinity .................. 15.0             │
│ Update Interval: 10-30 minutes (variable)       │
│ Data Source: Sensor network (read-only)        │
└────────────────────────────────────────────────┘
```

---

## 🔧 Recommended Implementation

### **Current Flow (Works Fine)**

```python
# In api/server.py
@app.post("/behavior/live")
def receive_behavior(data: BehaviorData):
    """Accept video behavior metrics"""
    repository.save_behavior_point(data)
    # Optionally trigger risk recalc automatically
    # risk_scheduler.recalculate_for_pond(data.pond_id)
    return {"status": "saved"}


# Separate background task (every 30 seconds)
async def background_risk_calculator():
    while True:
        await asyncio.sleep(30)
        for pond_id in active_ponds:
            risk_scheduler.recalculate_for_pond(pond_id)
```

### **Enhanced Flow (Recommended)**

```python
# Trigger risk calculation IMMEDIATELY when new behavior arrives
@app.post("/behavior/live")
def receive_behavior(data: BehaviorData):
    """Accept video behavior metrics and trigger risk update"""
    repository.save_behavior_point(data)
    
    # IMMEDIATELY recalculate risk with new behavior data
    result = risk_scheduler.recalculate_for_pond(data.pond_id)
    
    return {
        "behavior_saved": True,
        "behavior_id": behavior_id,
        "risk_updated": True,
        "risk_id": result["record_id"],
        "prediction": result["prediction"]
    }
```

### **Important Note About Missing Data**

```python
# In DataFusionService.get_latest_fused_input()
# It uses LATEST timestamps, so naturally:

# If behavior data is 10 minutes old
# → It still uses it (no fresher data available)

# If feeding data is 3 hours old  
# → It still uses it (last known value)

# Risk Model works with ANY combination of old/new data
# The "decision_date" tracks WHEN data was collected
# so you know if behavior is 6 seconds old vs 6 minutes old
```

---

## 📊 Data Flow Diagram with Timestamps

```
TIME    EVENT                          BEHAVIOR      FEEDING       RISK CALC
────    ─────────────────────────────  ────────      ───────       ─────────

14:00   System starts                  [NONE]        [NONE]        READY

14:05   Video monitor sends metrics    UPDATE ✓      [wait]        
        behavior metrics saved                                      

14:30   Scheduled risk calc triggers                              CALCULATE
        Uses: fresh behavior                                      + old feeding
        + old feeding                                             = LOW RISK
        + old environment                                    
        Saves prediction

14:35   User enters feeding data       [14:05]       UPDATE ✓
        feeding data saved             (stale 30min)  (fresh)

14:40   Video monitor sends NEW        UPDATE ✓      [old]
        behavior metrics saved         (fresh 6s)

15:00   Scheduled risk calc triggers                              CALCULATE
        Uses: fresh behavior (14:40)                              + fresh feeding
        + fresh feeding (14:35)                                   + old environment
        + old environment (from 14:28)                           = MEDIUM RISK
        Saves prediction

...and this continues forever, mixing fresh & reused data based
on when each data source last had updates.
```

---

## 🎯 Answer to Your Question

**"Is it happening every time the model receives data from DB?"**

✅ **Yes, with the recommended flow:**
1. Live video captures behavior frame by frame (30 FPS)
2. Every ~6.6 seconds, behavior metrics are sent to API
3. **Immediately**, risk prediction is triggered
4. Latest behavior + latest feeding + latest environment merged
5. Model generates risk score
6. Result saved to 'risk_predictions' collection
7. Frontend polls and displays updated prediction

**"Use last used data for rows that don't receive new data?"**

✅ **Already implemented:**
- `DataFusionService` fetches LATEST from each collection
- If behavior is 10 minutes old → use it
- If feeding is 2 hours old → use it  
- No field interpolation - just use last known value
- Model handles mixed old/fresh data seamlessly

---

## 🚀 Next Steps

**To enable this automatic flow:**

1. Modify `api/server.py` → Uncomment risk recalculation in `/behavior/live`
2. Start background scheduler for periodic updates
3. Verify MongoDB has collections:
   - behavior_live
   - feeding_data
   - environment_data
   - risk_predictions
4. Test with live video monitor running
5. Watch risk scores update in real-time dashboard

