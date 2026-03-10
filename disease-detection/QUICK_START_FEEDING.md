# Quick Start Guide - Feeding Data Integration

## 🚀 What's Been Done

Your disease detection system has been fully integrated with the MongoDB feeding database. Here's what was implemented:

### Database Connection
```
✅ Connected to: shrimpfeeding database
✅ Default Pond ID: 1
✅ Collection: feeding_data (READ-ONLY)
```

## 📦 New Features

### 1. **Repository Methods** - Read feeding data from MongoDB
```python
# Get latest feeding record
latest = repo.get_latest_feed("1")

# Get recent feeding records (last 50)
recent = repo.get_recent_feeding("1", limit=50)

# Get statistics for last 24 hours
stats = repo.get_feeding_statistics("1", hours=24)

# Get records in time range
feeds = repo.get_feeding_by_date_range("1", start_time, end_time)
```

### 2. **Trend Analysis** - Analyze feeding patterns for risk prediction
```python
# Get comprehensive feeding trend analysis
trends = fusion_service.get_feeding_trend_analysis("1", hours=24)

# Returns:
# - Recent feeding records
# - Statistical summary
# - Feeding consistency (0-1 scale)
# - Response trend (improving/stable/declining)
# - Amount variability (stable/variable/highly_variable)
```

### 3. **API Endpoints** - Query feeding data via HTTP
```bash
# Get recent feeding data
GET /feeding/1?limit=100

# Get feeding statistics
GET /feeding-stats/1?hours=24

# Get comprehensive trend analysis
GET /feeding-trend/1?hours=24

# Predict risk (now uses default pond_id)
POST /predict-risk
```

## ⚙️ Configuration

### Set Environment Variables (.env)
```bash
# MongoDB Feeding Database Credentials
MONGO_URI=mongodb+srv://dbUser:Sama2001@shrimpfeeding.4tifr4r.mongodb.net/shrimpfeeding?retryWrites=true&w=majority
DB_NAME=shrimpfeeding

# Default Pond ID (when not specified)
DEFAULT_POND_ID=1
```

## 📊 Use Case Examples

### Get Feeding Statistics
```python
from database.repository import Repository

repo = Repository()
stats = repo.get_feeding_statistics("1", hours=24)

print(f"Average Feed: {stats['avg_feed_amount']} units")
print(f"Total Fed: {stats['total_feed_amount']} units")
print(f"Feeding Frequency: {stats['feeding_frequency']} times")
```

### Analyze Feeding Trends
```python
from services.data_fusion_service import DataFusionService

trends = fusion_service.get_feeding_trend_analysis("1")

consistency = trends['trend_analysis']['feeding_consistency']
response_trend = trends['trend_analysis']['response_trend']
variability = trends['trend_analysis']['amount_variability']

print(f"Schedule Consistency: {consistency}")  # 0-1 scale
print(f"Response Trend: {response_trend['direction']}")  # improving/stable/declining
print(f"Amount Stability: {variability['stability']}")  # stable/variable/highly_variable
```

### API Example - Feeding Data
```bash
# Get recent feeding data
curl http://localhost:8001/feeding/1 | jq

# Get statistics
curl http://localhost:8001/feeding-stats/1 | jq

# Get trends
curl http://localhost:8001/feeding-trend/1 | jq
```

## 📋 Feeding Data Fields

Each feeding record contains:
```json
{
    "pond_id": "1",                    // Pond identifier
    "timestamp": "2026-03-09T14:30",   // ISO 8601 timestamp
    "feed_amount": 120.0,              // Amount fed (units)
    "feed_response": 0.55              // Response rate (0-1)
}
```

## 🎯 Risk Analysis Features

The system now analyzes feeding for risk prediction:

| Metric | Scale | Meaning |
|--------|-------|---------|
| **Feeding Consistency** | 0-1 | How reliable the feeding schedule is |
| **Response Trend** | +/- | Improving or declining feed acceptance |
| **Amount Variability** | 0-1 | Stability of feed quantities |
| **Feeding Frequency** | Count | How often shrimp are fed |

## 🔍 List of Updated Files

1. **config.py** - Added DEFAULT_POND_ID setting
2. **.env.example** - Updated with feeding credentials
3. **database/repository.py** - Added 3 new feeding methods
4. **services/data_fusion_service.py** - Added trend analysis
5. **api/server.py** - Added 3 new endpoints

## 📖 Full Documentation

For complete documentation, see:
- **FEEDING_DATA_INTEGRATION.md** - Complete user guide
- **FEEDING_DATA_IMPLEMENTATION.md** - Technical details

## ✅ Testing Checklist

- [ ] Set MONGO_URI and DB_NAME in .env
- [ ] Test connection: `python -c "from database.repository import Repository; Repository()"`
- [ ] Test feeding retrieval: `curl http://localhost:8001/feeding/1`
- [ ] Test statistics: `curl http://localhost:8001/feeding-stats/1`
- [ ] Test trends: `curl http://localhost:8001/feeding-trend/1`
- [ ] Run risk prediction: `POST /predict-risk` (with optional pond_id)

## 🆘 Troubleshooting

### No feeding data returned?
- Verify feeding_data collection exists in shrimpfeeding database
- Check that records have pond_id="1" (or your actual pond_id)
- Ensure timestamps are ISO 8601 format

### Connection errors?
- Verify MONGO_URI is correct in .env
- Check MongoDB whitelist includes your IP
- Ensure DB_NAME is "shrimpfeeding"

### Default pond_id not working?
- Set DEFAULT_POND_ID in .env (defaults to "1" if not set)
- Check config.py has the setting loaded

## 🚀 Next Steps

1. **Update .env** with provided database credentials
2. **Run the API server** - `uvicorn api.server:app --port 8001`
3. **Test endpoints** using curl or Postman
4. **Monitor feeding trends** in your risk prediction pipeline
5. **Optimize feeding** based on trend analysis insights

## 💡 Key Benefits

✅ **Real-time Feeding Analysis** - Monitor feeding patterns in real-time
✅ **Risk Correlation** - Link feeding behavior to disease risk
✅ **Trend Detection** - Identify improving or declining patterns
✅ **Default Pond Support** - Auto-uses pond_id=1 when not specified
✅ **Backward Compatible** - All existing code continues to work
✅ **No New Dependencies** - Uses existing packages

## 📞 Support

For issues or questions:
1. Check FEEDING_DATA_INTEGRATION.md for detailed examples
2. Review FEEDING_DATA_IMPLEMENTATION.md for technical details
3. Check .env configuration
4. Verify MongoDB connection with health endpoint: `GET /health`
