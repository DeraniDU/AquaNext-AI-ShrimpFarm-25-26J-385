# Testing Feeding-Aware Risk Prediction

## Quick Test Guide

### Test 1: Basic Risk Prediction with Feeding Data

```bash
# Predict risk with automatic feeding analysis
curl "http://localhost:8001/predict-risk-with-feeding/1?include_trends=true" \
  -H "Accept: application/json"
```

**Expected Response**:
```json
{
  "ok": true,
  "pond_id": "1",
  "prediction": {
    "supervised_prediction": "MEDIUM",
    "recommendation": {
      "final_risk_level": "MEDIUM",
      "actions": [
        "Increase monitoring frequency.",
        "...",
        "FEEDING STATS: Fed X times with avg Y units"
      ]
    }
  },
  "feeding_data": {
    "current_values": {"feed_amount": 120.0, "feed_response": 0.55},
    "risk_factors": {
      "consistency_score": 0.847,
      "response_trend_direction": "improving",
      "amount_stability": "stable"
    }
  }
}
```

### Test 2: Comprehensive Pond Status with Feeding Analysis

```bash
# Get full pond status with feeding insights
curl "http://localhost:8001/pond-status-enhanced/1?include_feeding_analysis=true" \
  -H "Accept: application/json" | jq .
```

**Expected Output**:
- Latest readings (behavior, feeding, environment)
- Feeding trends and statistics
- Current risk prediction
- Enhanced recommendations with feeding insights

### Test 3: Recalculate Risk with Latest Data

```bash
# Recalculate risk incorporating latest feeding data
curl -X POST "http://localhost:8001/recalculate-risk-with-feeding/1?include_trends=true" \
  -H "Accept: application/json"
```

**Expected Response**:
- Fresh risk assessment
- Current feeding metrics
- Comparison with previous prediction
- Feeding-aware recommendations

### Test 4: Compare with Manual Risk Prediction

```bash
# Manual prediction (traditional method - provide all features)
curl -X POST "http://localhost:8001/predict-risk" \
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
    "pond_id": "1"
  }'
```

**Comparison**:
- Manual prediction: Uses provided features only
- Automatic: Uses latest from MongoDB + full feeding analysis

### Test 5: Get Feeding Data Only

```bash
# Get recent feeding data
curl "http://localhost:8001/feeding/1?limit=50"

# Get feeding statistics
curl "http://localhost:8001/feeding-stats/1?hours=24"

# Get feeding trends
curl "http://localhost:8001/feeding-trend/1?hours=24"
```

## Python Testing

### Test Script 1: Basic Integration Test

```python
import os
import sys
sys.path.insert(0, '.')

# Set environment variables
os.environ['MONGO_URI'] = 'mongodb+srv://dbUser:Sama2001@shrimpfeeding.4tifr4r.mongodb.net/shrimpfeeding?retryWrites=true&w=majority'
os.environ['DB_NAME'] = 'shrimpfeeding'
os.environ['DEFAULT_POND_ID'] = '1'

from database.repository import Repository
from services.data_fusion_service import DataFusionService
from services.feeding_risk_analysis import FeedingAwareRiskAnalysis
from config import settings

# Test 1: Can we connect to MongoDB?
try:
    repo = Repository()
    print("✅ MongoDB connection successful")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    sys.exit(1)

# Test 2: Can we retrieve feeding data?
try:
    latest_feed = repo.get_latest_feed("1")
    if latest_feed:
        print(f"✅ Retrieved latest feeding data: {latest_feed}")
    else:
        print("⚠️ No feeding data found for pond 1")
except Exception as e:
    print(f"❌ Failed to retrieve feeding data: {e}")

# Test 3: Can we get feeding statistics?
try:
    stats = repo.get_feeding_statistics("1", hours=24)
    print(f"✅ Feeding statistics: {stats['total_records']} records, avg {stats['avg_feed_amount']:.1f} units")
except Exception as e:
    print(f"❌ Failed to get statistics: {e}")

# Test 4: Can we analyze feeding trends?
try:
    fusion = DataFusionService(repo)
    trends = fusion.get_feeding_trend_analysis("1", hours=24)
    analysis = trends['trend_analysis']
    print(f"✅ Feeding consistency: {analysis['feeding_consistency']:.3f}")
    print(f"✅ Response trend: {analysis['response_trend']['direction']}")
    print(f"✅ Amount stability: {analysis['amount_variability']['stability']}")
except Exception as e:
    print(f"❌ Failed to analyze trends: {e}")

print("\n✅ All basic tests passed!")
```

### Test Script 2: Risk Prediction with Feeding Analysis

```python
import os
import sys
sys.path.insert(0, '.')

os.environ['MONGO_URI'] = 'mongodb+srv://dbUser:Sama2001@shrimpfeeding.4tifr4r.mongodb.net/shrimpfeeding?retryWrites=true&w=majority'
os.environ['DB_NAME'] = 'shrimpfeeding'

from database.repository import Repository
from services.data_fusion_service import DataFusionService
from services.feeding_risk_analysis import FeedingAwareRiskAnalysis
from agents.risk_prediction_agent import RiskPredictionAgent
from models.risk_model import RiskModelService
from config import settings

# Initialize all services
repo = Repository()
fusion = DataFusionService(repo)
model_service = RiskModelService(
    rf_model_path=settings.RF_MODEL_PATH,
    if_model_path=settings.IF_MODEL_PATH,
    scaler_path=settings.SCALER_PATH,
    if_threshold=settings.IF_THRESHOLD,
)
agent = RiskPredictionAgent(model_service)
risk_analysis = FeedingAwareRiskAnalysis(repo, fusion, agent)

# Predict with feeding analysis
print("Predicting risk with feeding analysis...")
try:
    result = risk_analysis.predict_with_feeding_analysis("1", include_feeding_trends=True)
    
    if result:
        pred = result['prediction']
        print(f"✅ Risk Prediction: {pred['recommendation']['final_risk_level']}")
        print(f"✅ Supervised: {pred['supervised_prediction']}")
        print(f"✅ Unsupervised: {pred['unsupervised_prediction']}")
        
        feeding = result['feeding_data']['risk_factors']
        print(f"✅ Feeding Consistency: {feeding['consistency_score']:.3f}")
        print(f"✅ Response Trend: {feeding['response_trend_direction']}")
        print(f"✅ Amount Stability: {feeding['amount_stability']}")
        
        print("\nRecommendations:")
        for action in pred['recommendation']['actions']:
            print(f"  • {action}")
    else:
        print("⚠️ Could not get prediction - missing data")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
```

### Test Script 3: Save and Retrieve Risk Assessment

```python
import os
import sys
sys.path.insert(0, '.')

os.environ['MONGO_URI'] = 'mongodb+srv://dbUser:Sama2001@shrimpfeeding.4tifr4r.mongodb.net/shrimpfeeding?retryWrites=true&w=majority'
os.environ['DB_NAME'] = 'shrimpfeeding'

from database.repository import Repository
from services.data_fusion_service import DataFusionService
from services.feeding_risk_analysis import FeedingAwareRiskAnalysis
from agents.risk_prediction_agent import RiskPredictionAgent
from models.risk_model import RiskModelService
from config import settings

# Initialize services
repo = Repository()
fusion = DataFusionService(repo)
model_service = RiskModelService(
    rf_model_path=settings.RF_MODEL_PATH,
    if_model_path=settings.IF_MODEL_PATH,
    scaler_path=settings.SCALER_PATH,
    if_threshold=settings.IF_THRESHOLD,
)
agent = RiskPredictionAgent(model_service)
risk_analysis = FeedingAwareRiskAnalysis(repo, fusion, agent)

# Save risk assessment
print("Saving risk assessment with feeding analysis...")
try:
    result = risk_analysis.save_prediction_with_feeding("1", include_feeding_trends=True)
    
    if result:
        if result.get("saved_to_db"):
            print(f"✅ Assessment saved with ID: {result['record_id']}")
        print(f"✅ Risk Level: {result['prediction']['recommendation']['final_risk_level']}")
        
        # Retrieve and compare
        predictions = repo.get_predictions_by_pond("1", limit=5)
        print(f"\n✅ Retrieved {len(predictions)} previous predictions for pond 1")
        
        for pred in predictions[:3]:
            print(f"  • {pred['timestamp']}: {pred['prediction_result']['recommendation']['final_risk_level']} risk")
            if 'feeding_analysis' in pred:
                print(f"    Feeding consistency: {pred['feeding_analysis'].get('risk_factors', {}).get('consistency_score')}")
    else:
        print("⚠️ Could not save prediction - missing data")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
```

## Test Scenarios

### Scenario A: Normal Operation
**Setup**: All data (behavior, feeding, environment) available for pond 1
**Expected**: 
- Returns prediction with LOW or MEDIUM risk
- Feeding metrics show stable/consistent patterns
- Recommendations include feeding stats

### Scenario B: Declining Response
**Setup**: Feed response = 0.3, consistency = 0.4
**Expected**:
- Risk increased to MEDIUM or HIGH
- Recommendations mention declining response
- Alert about potential health issues

### Scenario C: Inconsistent Feeding
**Setup**: Consistency score = 0.2, high variability
**Expected**:
- Feeding risk alerts in recommendations
- Action items about checking feeder system
- Emphasis on schedule standardization

### Scenario D: Missing Data
**Setup**: No feeding records for pond
**Expected**:
- Returns error or uses defaults
- Recommendation includes "ensure feeding data is being logged"
- Graceful degradation

## Monitoring Endpoints

### Health Check
```bash
curl http://localhost:8001/health
# Response: {"ok": true, "service": "disease-detection", "env": "dev"}
```

### View All Predictions
```bash
curl http://localhost:8001/predictions?limit=10
# Lists last 10 predictions with all data

curl http://localhost:8001/predictions/1?limit=10
# Lists last 10 predictions for pond 1
```

### Verify Data Availability
```bash
# Check latest feeding
curl http://localhost:8001/feeding/1

# Check latest behavior
curl http://localhost:8001/behavior/1

# Check latest environment
curl http://localhost:8001/pond-status/1
```

## Validation Checklist

- [ ] MongoDB connection successful
- [ ] Can retrieve feeding data from `shrimpfeeding.feeding_data`
- [ ] Can calculate feeding statistics
- [ ] Can analyze feeding trends
- [ ] Risk prediction includes feeding features
- [ ] Recommendations include feeding insights
- [ ] Data saved to database successfully
- [ ] API endpoints return expected format
- [ ] Default pond_id=1 works correctly
- [ ] Include_trends parameter functions properly

## Debugging Commands

### View recent predictions
```bash
curl "http://localhost:8001/predictions?limit=5" | jq '.data[] | {timestamp, pond_id, risk: .prediction_result.recommendation.final_risk_level}'
```

### Check specific pond history
```bash
curl "http://localhost:8001/predictions/1?limit=10" | jq '.data[] | {timestamp, risk: .prediction_result.recommendation.final_risk_level, feeding: .feeding_analysis}'
```

### Monitor feeding data availability
```bash
curl "http://localhost:8001/feeding-stats/1" | jq '{timestamp: .last_feed_time, frequency: .feeding_frequency, avg_amount: .avg_feed_amount}'
```

### View detailed feeding analysis
```bash
curl "http://localhost:8001/feeding-trend/1" | jq '.trend_analysis'
```
