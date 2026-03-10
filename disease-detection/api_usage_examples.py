#!/usr/bin/env python3
"""
API Usage Examples - Disease Detection Module

Demonstrates how to use the disease detection API with real data from MongoDB
"""

import requests
import json
from datetime import datetime

# API Base URL
BASE_URL = "http://localhost:8001"

# Example 1: Health Check
def check_health():
    """Check if API is running"""
    response = requests.get(f"{BASE_URL}/health")
    print("Health Check:")
    print(json.dumps(response.json(), indent=2))
    return response.status_code == 200


# Example 2: Predict Risk with Sample Data
def predict_risk_with_sample_data():
    """
    Predict disease risk using sample data.
    In production, these values would come from the database.
    """
    risk_input = {
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
        "pond_id": "pond-01",
        "timestamp": datetime.utcnow().isoformat()
    }
    
    print("\nRisk Prediction - Sample Data:")
    print(f"Input: {json.dumps(risk_input, indent=2)}")
    
    response = requests.post(f"{BASE_URL}/predict-risk", json=risk_input)
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json()


# Example 3: Predict Risk with Database Data
def predict_risk_with_database_data():
    """
    In production implementation:
    1. Retrieve sensor data from MongoDB (sensor_readings collection)
    2. Retrieve behavior data from MongoDB (behavior_live collection)
    3. Retrieve feeding data from MongoDB (feeding_data collection)
    4. Combine all data
    5. Send to /predict-risk endpoint
    """
    print("\nRisk Prediction - Production Flow:")
    print("""
    Step 1: Query sensor data from MongoDB
      repo.get_latest_environment(device_id="arduino_uno_01")
      ↓
      Returns: {'do_mg_l': 5.1, 'ph': 7.6, 'salinity_ppt': 15.0, 'temperature': 30.2, ...}
    
    Step 2: Normalize sensor data
      Repository.normalize_sensor_data(sensor_data)
      ↓
      Returns: {'DO': 5.1, 'pH': 7.6, 'salinity': 15.0, 'temp': 30.2, ...}
    
    Step 3: Get behavior data from MongoDB
      repo.get_latest_behavior(pond_id="pond-01")
      ↓
      Returns: {'activity_mean': 0.18, 'activity_std': 0.02, 'drop_ratio_min': 0.62, ...}
    
    Step 4: Get feeding data from MongoDB
      repo.get_latest_feed(pond_id="pond-01")
      ↓
      Returns: {'feed_amount': 120.0, 'feed_response': 0.55, ...}
    
    Step 5: Combine all data into feature vector
      Combined: {all 10 required features}
    
    Step 6: Send to prediction API
      requests.post('/predict-risk', json=combined_data)
      ↓
      Returns: Risk class, anomaly score, record ID
    """)


# Example 4: Get Predictions
def get_all_predictions():
    """Retrieve stored predictions"""
    print("\nRetrieve All Predictions:")
    response = requests.get(f"{BASE_URL}/predictions?limit=10")
    predictions = response.json()
    print(f"Total predictions: {len(predictions.get('data', []))}")
    if predictions.get('data'):
        print(f"Latest: {json.dumps(predictions['data'][0], indent=2)}")


# Example 5: Get Predictions by Pond
def get_predictions_by_pond(pond_id="pond-01"):
    """Retrieve predictions for specific pond"""
    print(f"\nPredictions for {pond_id}:")
    response = requests.get(f"{BASE_URL}/predictions/{pond_id}?limit=5")
    print(json.dumps(response.json(), indent=2))


# Example 6: Submit Behavior Data
def submit_behavior_data():
    """Submit live shrimp behavior data"""
    behavior_input = {
        "pond_id": "pond-01",
        "timestamp": datetime.utcnow().isoformat(),
        "activity_index": 0.21,
        "activity_std": 0.03,
        "drop_ratio": 0.82,
        "abnormal": 0
    }
    
    print("\nSubmit Behavior Data:")
    print(f"Input: {json.dumps(behavior_input, indent=2)}")
    
    response = requests.post(f"{BASE_URL}/behavior/live", json=behavior_input)
    print(f"Response: {json.dumps(response.json(), indent=2)}")


# Example 7: Get Pond Status
def get_pond_status(pond_id="pond-01"):
    """Get complete status of a pond"""
    print(f"\nPond Status - {pond_id}:")
    response = requests.get(f"{BASE_URL}/pond-status/{pond_id}")
    status = response.json()
    
    # Print summary
    print(f"Latest Prediction: {status.get('ok')}")
    if status.get('latest_environment'):
        env = status['latest_environment']
        print(f"  - DO: {env.get('do_mg_l')} mg/L")
        print(f"  - pH: {env.get('ph')}")
        print(f"  - Temp: {env.get('temperature')} °C")
        print(f"  - Salinity: {env.get('salinity_ppt')} ppt")
    
    if status.get('latest_prediction'):
        pred = status['latest_prediction']
        print(f"  - Risk Class: {pred.get('risk_class')}")
        print(f"  - Prediction: {pred.get('prediction')}")


# Example 8: Recalculate Risk for Pond
def recalculate_risk_for_pond(pond_id="pond-01"):
    """Trigger recalculation of risk for a pond"""
    print(f"\nRecalculate Risk - {pond_id}:")
    response = requests.post(f"{BASE_URL}/recalculate-risk/{pond_id}")
    print(json.dumps(response.json(), indent=2))


if __name__ == "__main__":
    print("=" * 70)
    print("DISEASE DETECTION API - USAGE EXAMPLES")
    print("=" * 70)
    
    # Try to connect and run examples
    try:
        # Example 1: Health check
        if check_health():
            print("✅ API is running\n")
            
            # Example 2: Predict with sample data
            predict_risk_with_sample_data()
            
            # Example 3: Show production flow
            predict_risk_with_database_data()
            
            # Example 4: Get predictions
            get_all_predictions()
            
            # Example 5: Get pond predictions
            get_predictions_by_pond()
            
            # Example 6: Submit behavior
            submit_behavior_data()
            
            # Example 7: Get pond status
            get_pond_status()
            
            # Example 8: Recalculate risk
            recalculate_risk_for_pond()
        else:
            print("❌ API is not running")
            print("Start the API with: python main.py")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API at", BASE_URL)
        print("Start the API first: python main.py")
        print("\nBut here's what the API calls would look like:")
        predict_risk_with_database_data()
    
    print("\n" + "=" * 70)
    print("For more details, see DATABASE_GUIDE.md")
    print("=" * 70)
