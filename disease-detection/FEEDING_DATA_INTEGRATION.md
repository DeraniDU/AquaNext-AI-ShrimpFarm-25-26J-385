# Feeding Data Integration Guide

## Overview

This document describes the integration of MongoDB feeding data from the `shrimpfeeding` database into the disease detection system. The feeding data is now used for comprehensive risk prediction analysis.

## Database Configuration

### MongoDB Connection
- **Host**: MongoDB Atlas (shrimpfeeding cluster)
- **Database**: `shrimpfeeding`
- **Collections**: 
  - `feeding_data` (READ-ONLY)
- **Connection Credentials**:
  ```
  MONGO_URI=mongodb+srv://dbUser:Sama2001@shrimpfeeding.4tifr4r.mongodb.net/shrimpfeeding?retryWrites=true&w=majority
  DB_NAME=shrimpfeeding
  ```

### Default Pond ID
Since pond IDs are not explicitly mentioned in the feeding database:
- **Default Pond ID**: `1`
- All methods automatically use pond_id=1 if not provided
- Can be overridden via `DEFAULT_POND_ID` environment variable

## Repository Methods (database/repository.py)

### 1. `get_latest_feed(pond_id: str)`
Retrieve the most recent feeding record for a pond.

```python
from database.repository import Repository

repo = Repository()
latest_feed = repo.get_latest_feed("1")

# Returns:
# {
#     "pond_id": "1",
#     "timestamp": "2026-03-09T14:30:00",
#     "feed_amount": 120.0,
#     "feed_response": 0.55
# }
```

### 2. `get_recent_feeding(pond_id: str, limit: int = 100)`
Retrieve recent feeding records for trend analysis.

```python
recent_feeds = repo.get_recent_feeding("1", limit=50)

# Returns list of feeding documents sorted by timestamp (newest first)
# Useful for analyzing feeding patterns over time
```

### 3. `get_feeding_by_date_range(pond_id: str, start_time: str, end_time: str)`
Retrieve feeding records within a specific date/time range.

```python
feeds = repo.get_feeding_by_date_range(
    "1",
    start_time="2026-03-08T00:00:00",
    end_time="2026-03-09T00:00:00"
)

# Returns feeding records within the specified time window
```

### 4. `get_feeding_statistics(pond_id: str, hours: int = 24)`
Calculate comprehensive feeding statistics for risk analysis.

```python
stats = repo.get_feeding_statistics("1", hours=24)

# Returns dictionary with:
# {
#     "pond_id": "1",
#     "total_records": 48,
#     "avg_feed_amount": 120.5,
#     "total_feed_amount": 5784.0,
#     "max_feed_amount": 135.0,
#     "min_feed_amount": 105.0,
#     "avg_feed_response": 0.52,
#     "feeding_frequency": 48,
#     "last_feed_time": "2026-03-09T14:30:00",
#     "time_window_hours": 24
# }
```

## Data Fusion Service Enhancements (services/data_fusion_service.py)

### 1. `get_latest_fused_input(pond_id: Optional[str] = None)`
Enhanced version that automatically uses default pond_id if not provided.

```python
from services.data_fusion_service import DataFusionService
from database.repository import Repository

repo = Repository()
service = DataFusionService(repo)

# With explicit pond_id
fused = service.get_latest_fused_input("1")

# With default pond_id (uses DEFAULT_POND_ID)
fused = service.get_latest_fused_input()

# Returns:
# {
#     "behavior": {...},
#     "feeding": {...},
#     "environment": {...},
#     "model_input": {
#         "pond_id": "1",
#         "timestamp": "2026-03-09T14:30:00",
#         "activity_mean": 0.18,
#         "activity_std": 0.02,
#         "drop_ratio_min": 0.62,
#         "abnormal_rate": 0.25,
#         "feed_amount": 120.0,
#         "feed_response": 0.55,
#         "DO": 5.1,
#         "temp": 30.2,
#         "pH": 7.6,
#         "salinity": 15.0
#     }
# }
```

### 2. `get_feeding_trend_analysis(pond_id: Optional[str] = None, hours: int = 24)`
NEW METHOD - Comprehensive feeding trend analysis for enhanced risk prediction.

```python
trend = service.get_feeding_trend_analysis("1", hours=24)

# Returns:
# {
#     "pond_id": "1",
#     "recent_feeds": [...],  # Last 100 feeding records
#     "statistics": {
#         "total_records": 48,
#         "avg_feed_amount": 120.5,
#         "avg_feed_response": 0.52,
#         ...
#     },
#     "trend_analysis": {
#         "pond_id": "1",
#         "has_feeding_data": true,
#         "feeding_consistency": 0.847,  # 0-1 scale
#         "response_trend": {
#             "trend": 0.03,
#             "direction": "improving",
#             "avg_recent_response": 0.55,
#             "avg_older_response": 0.52
#         },
#         "amount_variability": {
#             "variability": 0.085,
#             "stability": "stable",
#             "avg_amount": 120.5,
#             "std_dev_amount": 10.3
#         }
#     }
# }
```

## API Endpoints

### 1. New Feeding Data Endpoints

#### GET `/feeding/{pond_id}`
Retrieve recent feeding data for a pond.

```bash
curl http://localhost:8001/feeding/1?limit=50
```

**Query Parameters**:
- `pond_id`: Pond identifier (uses default if not provided via path)
- `limit`: Number of records (default: 100)

**Response**:
```json
{
    "ok": true,
    "pond_id": "1",
    "total_records": 50,
    "feeding_data": [...]
}
```

#### GET `/feeding-stats/{pond_id}`
Get feeding statistics for risk analysis.

```bash
curl http://localhost:8001/feeding-stats/1?hours=24
```

**Query Parameters**:
- `pond_id`: Pond identifier
- `hours`: Analysis window (default: 24)

**Response**:
```json
{
    "ok": true,
    "pond_id": "1",
    "total_records": 48,
    "avg_feed_amount": 120.5,
    "total_feed_amount": 5784.0,
    "avg_feed_response": 0.52,
    "feeding_frequency": 48,
    "last_feed_time": "2026-03-09T14:30:00"
}
```

#### GET `/feeding-trend/{pond_id}`
Get comprehensive feeding trend analysis.

```bash
curl http://localhost:8001/feeding-trend/1?hours=24
```

**Query Parameters**:
- `pond_id`: Pond identifier
- `hours`: Analysis window (default: 24)

**Response**: Includes recent_feeds, statistics, and trend_analysis

### 2. Updated Risk Prediction Endpoint

#### POST `/predict-risk`
Now automatically uses default pond_id if not provided.

```bash
curl -X POST http://localhost:8001/predict-risk \
  -H "Content-Type: application/json" \
  -d '{
    "activity_mean": 0.18,
    "activity_std": 0.02,
    "drop_ratio_min": 0.62,
    "abnormal_rate": 0.25,
    "feed_amount": 120.0,
    "feed_response": 0.55,
    "DO": 5.1,
    "temp": 30.2,
    "pH": 7.6,
    "salinity": 15.0,
    "pond_id": "1"  # Optional - uses DEFAULT_POND_ID if not provided
  }'
```

## Feeding Data Structure

### Document Format
```json
{
    "pond_id": "1",
    "timestamp": "2026-03-09T14:30:00",
    "feed_amount": 120.0,
    "feed_response": 0.55
}
```

### Field Descriptions
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `pond_id` | string | Pond identifier | "1" |
| `timestamp` | string | ISO 8601 timestamp | "2026-03-09T14:30:00" |
| `feed_amount` | float | Amount of feed supplied (grams/kg) | 120.0 |
| `feed_response` | float | Feeding response rate (0-1 scale) | 0.55 |

## Risk Analysis Using Feeding Data

### Feeding Metrics Included in Risk Model
The disease detection model now uses these feeding features:

1. **Current Feeding Status**:
   - `feed_amount`: Latest feeding amount
   - `feed_response`: Latest feeding response rate

2. **Feeding Trends** (24-hour analysis):
   - `feeding_consistency`: How consistent feeding patterns are (0-1)
   - `response_trend`: Improving/declining trend in feed response
   - `amount_variability`: Stability of feed amounts

### Risk Indicators
- **Feeding Consistency**: Highly erratic feeding schedules may indicate system problems
- **Response Decline**: Decreasing feed response may indicate health issues
- **Amount Variability**: Extreme variations may stress the shrimp population

## Configuration

### Environment Variables (.env)
```
# MongoDB Feeding Database
MONGO_URI=mongodb+srv://dbUser:Sama2001@shrimpfeeding.4tifr4r.mongodb.net/shrimpfeeding?retryWrites=true&w=majority
DB_NAME=shrimpfeeding

# Default Pond ID
DEFAULT_POND_ID=1
```

### Adding to .env File
1. Copy from `.env.example`
2. Update with your credentials
3. Ensure not to commit `.env` to version control

## Usage Examples

### Python Script - Analyze Feeding Trends
```python
from database.repository import Repository
from services.data_fusion_service import DataFusionService

# Initialize
repo = Repository()
service = DataFusionService(repo)

# Get trend analysis for last 24 hours
trend = service.get_feeding_trend_analysis("1", hours=24)

print(f"Feeding Consistency: {trend['trend_analysis']['feeding_consistency']}")
print(f"Response Trend: {trend['trend_analysis']['response_trend']['direction']}")
print(f"Amount Stability: {trend['trend_analysis']['amount_variability']['stability']}")

# Get statistics
stats = trend['statistics']
print(f"Average Feed Amount: {stats['avg_feed_amount']}")
print(f"Feeding Frequency: {stats['feeding_frequency']} times")
```

### REST API - Get Feeding Data and Predict Risk
```bash
# 1. Get feeding statistics
curl http://localhost:8001/feeding-stats/1

# 2. Get feeding trends
curl http://localhost:8001/feeding-trend/1

# 3. Use data in risk prediction
curl -X POST http://localhost:8001/predict-risk \
  -H "Content-Type: application/json" \
  -d '{
    "activity_mean": 0.18,
    "activity_std": 0.02,
    "drop_ratio_min": 0.62,
    "abnormal_rate": 0.25,
    "feed_amount": 120.0,
    "feed_response": 0.55,
    "DO": 5.1,
    "temp": 30.2,
    "pH": 7.6,
    "salinity": 15.0
  }'
```

## Files Modified

1. **config.py**
   - Added `DEFAULT_POND_ID` setting
   - Updated MongoDB documentation for feeding database

2. **.env.example**
   - Updated with feeding database credentials
   - Added `DEFAULT_POND_ID` configuration

3. **database/repository.py**
   - Added `get_recent_feeding()` method
   - Added `get_feeding_by_date_range()` method
   - Added `get_feeding_statistics()` method

4. **services/data_fusion_service.py**
   - Added `_normalize_pond_id()` helper
   - Added `get_feeding_trend_analysis()` method
   - Added trend calculation methods:
     - `_calculate_feeding_consistency()`
     - `_calculate_response_trend()`
     - `_calculate_amount_variability()`
   - Made `pond_id` optional in `get_latest_fused_input()`

5. **api/server.py**
   - Updated `/predict-risk` to use default pond_id
   - Added `/feeding/{pond_id}` endpoint
   - Added `/feeding-stats/{pond_id}` endpoint
   - Added `/feeding-trend/{pond_id}` endpoint

## Testing

### Test Feeding Data Retrieval
```python
import os
os.environ['MONGO_URI'] = 'mongodb+srv://dbUser:Sama2001@shrimpfeeding.4tifr4r.mongodb.net/shrimpfeeding?retryWrites=true&w=majority'
os.environ['DB_NAME'] = 'shrimpfeeding'
os.environ['DEFAULT_POND_ID'] = '1'

from database.repository import Repository

repo = Repository()
stats = repo.get_feeding_statistics("1", hours=24)
print("Feeding Statistics:", stats)
```

### Test API Endpoints
```bash
# Test health
curl http://localhost:8001/health

# Test feeding data retrieval
curl http://localhost:8001/feeding/1

# Test feeding statistics
curl http://localhost:8001/feeding-stats/1

# Test feeding trends
curl http://localhost:8001/feeding-trend/1
```

## Troubleshooting

### Issue: "MONGO_URI environment variable is required"
**Solution**: Ensure `.env` file is in the disease-detection directory with `MONGO_URI` and `DB_NAME` set.

### Issue: "Missing feeding data" in predictions
**Solution**: 
1. Verify feeding data exists in `shrimpfeeding.feeding_data` collection
2. Check that pond_id matches (default is "1")
3. Verify timestamp format is ISO 8601

### Issue: No recent feeding records
**Solution**:
1. Check MongoDB connection with health endpoint
2. Verify collection name is `feeding_data`
3. Ensure data is being written to the collection

## Next Steps

1. **Monitor Feeding Trends**: Use the trend analysis endpoint to monitor feeding patterns
2. **Correlate with Health**: Compare feeding trends with disease risk predictions
3. **Optimize Feeding**: Use consistency and variability metrics to optimize feeding schedules
4. **Real-time Alerts**: Integrate feeding anomalies into the alert system
