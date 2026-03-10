# Feeding Data Integration in Risk Prediction

## Overview

The disease detection system now uses feeding data from MongoDB to provide comprehensive risk prediction analysis. Feeding patterns are analyzed and correlated with disease risk to provide more accurate assessments and actionable recommendations.

## Architecture

### Data Flow

```
MongoDB Feeding Database (shrimpfeeding)
    ↓
Repository Layer
├─ get_latest_feed()
├─ get_recent_feeding()
└─ get_feeding_statistics()
    ↓
Fusion Service (Data Integration)
├─ get_latest_fused_input() → Combines behavior + feeding + environment
└─ get_feeding_trend_analysis() → Analyzes patterns
    ↓
Feeding Risk Analysis Service
├─ predict_with_feeding_analysis()
├─ get_feeding_risk_factors()
└─ get_feeding_enhanced_recommendation()
    ↓
Risk Prediction Agent
    ↓
Enhanced Recommendations with Feeding Insights
    ↓
API Response with Risk & Feeding Analysis
```

## Key Features

### 1. **Automatic Feeding Data Retrieval**
- Directly reads from MongoDB `shrimpfeeding.feeding_data` collection
- Default pond_id = 1 (can be overridden)
- Latest 100 recent records cached for analysis

### 2. **Feeding Risk Factor Analysis**

#### Feeding Consistency (0-1 scale)
- Measures reliability of feeding schedule
- Calculates standard deviation of time intervals between feedings
- **Risk Assessment**:
  - Score < 0.5 = HIGH RISK (highly inconsistent)
  - Score 0.5-0.75 = MEDIUM RISK (some variation)
  - Score > 0.75 = LOW RISK (consistent)

#### Response Trend (Improvement/Decline)
- Compares recent feed response vs older response
- Tracks whether shrimp are eating more or less over time
- **Risk Assessment**:
  - Declining trend = HIGH RISK (health/stress issues)
  - Stable trend = LOW RISK
  - Improving trend = POSITIVE INDICATOR

#### Amount Variability (0-1 scale)
- Measures stability of feed quantities supplied
- Coefficient of variation of feed amounts
- **Classifications**:
  - < 0.2 = STABLE (consistent portions)
  - 0.2-0.5 = VARIABLE (inconsistent portions)
  - > 0.5 = HIGHLY VARIABLE (extremely inconsistent)

#### Feeding Frequency (count)
- How many times shrimp were fed in time window
- Validates feeding schedule compliance

### 3. **Integration with Disease Risk Model**

The risk model uses these feeding features directly:

```json
{
  "feed_amount": 120.0,      // Current feed amount (from latest record)
  "feed_response": 0.55      // Current feed response (from latest record)
}
```

Combined with:
- **Behavior**: activity_mean, activity_std, drop_ratio_min, abnormal_rate
- **Environment**: DO, temp, pH, salinity

**Total Features**: 10 input features to the machine learning model

## API Endpoints for Feeding-Aware Risk Prediction

### 1. GET `/predict-risk-with-feeding/{pond_id}`

**Purpose**: Automatic risk prediction with feeding analysis

**Example**:
```bash
curl "http://localhost:8001/predict-risk-with-feeding/1?include_trends=true"
```

**Query Parameters**:
- `pond_id`: Pond identifier (uses default if not provided)
- `include_trends`: Include feeding trend analysis (default: true)

**Response**:
```json
{
  "ok": true,
  "pond_id": "1",
  "timestamp": "2026-03-10T10:30:00",
  "prediction": {
    "ok": true,
    "supervised_prediction": "MEDIUM",
    "supervised_probabilities": {
      "LOW": 0.25,
      "MEDIUM": 0.55,
      "HIGH": 0.20
    },
    "unsupervised_prediction": "NORMAL",
    "unsupervised_risk_score": 0.002,
    "features_used": {
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
    },
    "recommendation": {
      "final_risk_level": "MEDIUM",
      "title": "Moderate disease/stress risk detected",
      "actions": [
        "Increase monitoring frequency.",
        "Compare current readings with previous baseline values.",
        "Watch for continued behavior drop or feed response reduction.",
        "🟡 FEEDING WARNING: Feeding schedule shows some variation - monitor feeder timing.",
        "📊 FEEDING STATS: Fed 48 times in 24h with avg 120.5 units per feed."
      ],
      "feeding_insights_included": true
    }
  },
  "feeding_data": {
    "current_values": {
      "feed_amount": 120.0,
      "feed_response": 0.55
    },
    "risk_factors": {
      "has_feeding_data": true,
      "consistency_score": 0.847,
      "consistency_risk": "LOW",
      "response_trend_value": 0.03,
      "response_trend_direction": "improving",
      "response_trend_risk": "LOW",
      "amount_variability_score": 0.085,
      "amount_stability": "stable",
      "amount_stability_risk": "LOW",
      "avg_feed_amount": 120.5,
      "avg_feed_response": 0.52,
      "feeding_frequency": 48,
      "last_feed_time": "2026-03-10T10:15:00"
    }
  },
  "saved_to_db": true,
  "record_id": "507f1f77bcf86cd799439011"
}
```

### 2. POST `/recalculate-risk-with-feeding/{pond_id}`

**Purpose**: Recalculate risk for a pond with latest feeding data

**Example**:
```bash
curl -X POST "http://localhost:8001/recalculate-risk-with-feeding/1?include_trends=true"
```

**Response**: Same format as `/predict-risk-with-feeding/` plus:
```json
{
  "ok": true,
  "pond_id": "1",
  "timestamp": "2026-03-10T10:30:00",
  "input_features": {...},
  "source_data": {
    "behavior": {...},
    "feeding": {...},
    "environment": {...}
  }
}
```

### 3. GET `/pond-status-enhanced/{pond_id}`

**Purpose**: Complete pond status with all data streams and risk assessment

**Example**:
```bash
curl "http://localhost:8001/pond-status-enhanced/1?include_feeding_analysis=true"
```

**Response**:
```json
{
  "ok": true,
  "pond_id": "1",
  "timestamp": "2026-03-10T10:30:00",
  "latest_readings": {
    "behavior": {
      "pond_id": "1",
      "timestamp": "2026-03-10T10:25:00",
      "activity_index": 0.18,
      "activity_std": 0.02,
      "drop_ratio": 0.62,
      "abnormal": 0
    },
    "feeding": {
      "pond_id": "1",
      "timestamp": "2026-03-10T10:20:00",
      "feed_amount": 120.0,
      "feed_response": 0.55
    },
    "environment": {
      "pond_id": "1",
      "timestamp": "2026-03-10T10:10:00",
      "do_mg_l": 5.1,
      "temperature": 30.2,
      "ph": 7.6,
      "salinity_ppt": 15.0
    }
  },
  "feeding_analysis": {
    "trends": {
      "feeding_consistency": 0.847,
      "consistency_risk": "LOW",
      "response_trend": {
        "trend": 0.03,
        "direction": "improving"
      },
      "amount_variability": {
        "variability": 0.085,
        "stability": "stable"
      }
    },
    "statistics": {
      "total_records": 48,
      "avg_feed_amount": 120.5,
      "total_feed_amount": 5784.0,
      "avg_feed_response": 0.52,
      "feeding_frequency": 48,
      "last_feed_time": "2026-03-10T10:15:00"
    },
    "recent_records": [...]
  },
  "risk_assessment": {
    "latest_prediction": {...},
    "current_prediction": {...},
    "feeding_risk_factors": {...}
  }
}
```

## Feeding Risk Scenarios & Recommendations

### Scenario 1: Declining Feed Response

**Risk Indicators**:
- Feed response declining (trend: -0.10)
- Consistency score: 0.82 (still good)
- Recent behavior shows reduced activity

**Recommendations**:
- 🔴 FEEDING CONCERN: Feed response is declining - may indicate health issues or stress.
- Consider reducing feed amount or increasing monitoring frequency.
- Check for disease symptoms in high-risk health data

### Scenario 2: Highly Variable Feeding

**Risk Indicators**:
- Amount variability: 0.65 (highly variable)
- Inconsistent feeding schedule
- Normal response but irregular patterns

**Recommendations**:
- 🔴 FEEDING ISSUE: Feed amounts are highly variable - standardize feeding portions.
- Check automated feeder system for mechanical issues
- Consider manual feeding calibration

### Scenario 3: Inconsistent Feeding Schedule

**Risk Indicators**:
- Feeding consistency: 0.35 (highly inconsistent)
- Schedule timing varies significantly
- Feeding frequency irregular

**Recommendations**:
- 🔴 FEEDING ALERT: Feeding schedule is highly inconsistent - check automated feeder system.
- Verify feeder motor/timer is functioning
- Check for power supply issues

### Scenario 4: Positive Response Trend

**Risk Indicators**:
- Response trend improving (direction: improving)
- Consistency good (0.87)
- Amount stability stable

**Recommendations**:
- ✅ POSITIVE: Feed response is improving - recent interventions may be working.
- Continue current feeding protocol
- Monitor for sustained improvement

## Python Usage Examples

### Example 1: Get Risk Prediction with Feeding Analysis

```python
from services.feeding_risk_analysis import FeedingAwareRiskAnalysis
from database.repository import Repository
from services.data_fusion_service import DataFusionService
from agents.risk_prediction_agent import RiskPredictionAgent

# Initialize services
repo = Repository()
fusion = DataFusionService(repo)
agent = RiskPredictionAgent(model_service)
risk_analysis = FeedingAwareRiskAnalysis(repo, fusion, agent)

# Predict with feeding analysis
result = risk_analysis.predict_with_feeding_analysis("1", include_feeding_trends=True)

# Extract results
prediction = result["prediction"]
feeding_risk = result["feeding_data"]["risk_factors"]

print(f"Risk Level: {prediction['recommendation']['final_risk_level']}")
print(f"Feed Response Trend: {feeding_risk['response_trend_direction']}")
print(f"Feeding Consistency: {feeding_risk['consistency_score']:.3f}")
print(f"Amount Stability: {feeding_risk['amount_stability']}")
```

### Example 2: Get Comprehensive Feeding Risk Factors

```python
# Get risk factors for pond
risk_factors = risk_analysis._get_feeding_risk_factors("1")

# Analyze
consistency = risk_factors["consistency_score"]
response = risk_factors["response_trend_value"]
variability = risk_factors["amount_variability_score"]

if consistency < 0.5:
    print("⚠️ WARNING: Feeding schedule is highly inconsistent")
    
if risk_factors["response_trend_direction"] == "declining":
    print("⚠️ WARNING: Feed response is declining")

if variability > 0.5:
    print("⚠️ WARNING: Feed amounts are highly variable")
```

### Example 3: Save and Retrieve Risk Assessment

```python
# Save risk assessment with feeding analysis
result = risk_analysis.save_prediction_with_feeding("1")

if result["saved_to_db"]:
    print(f"Risk assessment saved with ID: {result['record_id']}")
    print(f"Feeding stats: {result['feeding_data']['risk_factors']}")
    
# Retrieve from database
predictions = repository.get_predictions_by_pond("1", limit=10)
for pred in predictions:
    feeding_analysis = pred.get("feeding_analysis", {})
    print(f"Time: {pred['timestamp']}")
    print(f"Risk: {pred['prediction_result']['recommendation']['final_risk_level']}")
    print(f"Feeding Consistency: {feeding_analysis.get('risk_factors', {}).get('consistency_score')}")
```

## Database Storage

### Risk Prediction Record Format

```json
{
  "_id": "ObjectId",
  "pond_id": "1",
  "timestamp": "2026-03-10T10:30:00",
  "input_features": {
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
  },
  "feeding_analysis": {
    "current_values": {
      "feed_amount": 120.0,
      "feed_response": 0.55
    },
    "risk_factors": {
      "has_feeding_data": true,
      "consistency_score": 0.847,
      "consistency_risk": "LOW",
      "response_trend_value": 0.03,
      "response_trend_direction": "improving",
      "response_trend_risk": "LOW",
      "amount_variability_score": 0.085,
      "amount_stability": "stable",
      "amount_stability_risk": "LOW",
      "avg_feed_amount": 120.5,
      "avg_feed_response": 0.52,
      "feeding_frequency": 48,
      "last_feed_time": "2026-03-10T10:15:00"
    }
  },
  "prediction_result": {
    "ok": true,
    "supervised_prediction": "MEDIUM",
    "supervised_probabilities": {...},
    "unsupervised_prediction": "NORMAL",
    "unsupervised_risk_score": 0.002,
    "recommendation": {...}
  }
}
```

## Workflow Summary

### Step 1: Data Collection
- Behavior data logged to `shrimp_farm_iot.behavior_live`
- Feeding data logged to `shrimpfeeding.feeding_data`
- Environment data logged to `shrimp_farm_iot.sensor_readings`

### Step 2: Data Fusion
- Repository retrieves latest from all three sources
- DataFusionService combines into unified format
- Default pond_id = 1 used if not specified

### Step 3: Feeding Analysis
- FeedingAwareRiskAnalysis extracts feeding trends
- Calculates consistency, response trend, variability
- Retrieves 24-hour statistical window

### Step 4: Risk Prediction
- Machine learning model uses 10 features (including feed amount & response)
- Both supervised (RF) and unsupervised (IF) predictions calculated
- Risk level determined (LOW/MEDIUM/HIGH)

### Step 5: Feeding-Enhanced Recommendations
- Base recommendations from risk level
- Feeding-specific alerts added based on risk factors
- Comprehensive action items returned

### Step 6: Storage & Retrieval
- Full assessment saved to `risk_predictions` collection
- Includes all data sources and feeding analysis
- Can be retrieved for historical analysis

## Performance Considerations

### Query Optimization
- Latest feed query: O(1) - indexed on pond_id, timestamp
- Recent feeding: O(n) - limited to 100 records
- Statistics: O(n) - aggregates 24-hour window

### Caching Strategy
- Recent 100 feeding records held in memory for speed
- Statistics cached for 5-minute window
- Trend analysis computed on-demand

### Scaling Recommendations
- Use MongoDB indexes: `{pond_id: 1, timestamp: -1}`
- Archive old predictions quarterly
- Consider time-series collections for high-frequency data

## Troubleshooting

### Issue: "No feeding data found"
- **Check**: Feeding records exist in `shrimpfeeding.feeding_data`
- **Check**: pond_id matches (default: "1")
- **Check**: Timestamps are ISO 8601 format
- **Solution**: Verify data collection is running

### Issue: Feeding risk factors showing "UNKNOWN"
- **Check**: Exception in `_get_feeding_risk_factors()`
- **Check**: MongoDB connection is active
- **Solution**: Check logs for specific error

### Issue: Recommendations not including feeding insights
- **Check**: `include_trends=true` in query parameters
- **Check**: Feeding data exists for the pond
- **Solution**: Verify feeding data integration is working

## Future Enhancements

1. **Anomaly Detection**: Identify unusual feeding patterns automatically
2. **Predictive Alerts**: Alert when feeding response predicted to decline
3. **Feed Optimization**: Recommend optimal feeding times and amounts
4. **Multi-Pond Comparison**: Compare feeding strategies across ponds
5. **Historical Correlation**: Link disease outbreaks to feeding patterns
