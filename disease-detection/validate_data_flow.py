#!/usr/bin/env python3
"""
Data Flow Validation Script for Disease Detection Module

Tests:
1. MongoDB connection and data retrieval
2. Data format validation
3. Model feature requirements
4. End-to-end prediction pipeline
"""

import os
import sys
from datetime import datetime

# Add project directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import settings
from database.mongodb import MongoDB
from database.repository import Repository
from models.risk_model import FEATURES, RiskModelService


def test_mongodb_connection():
    """Test MongoDB connection to shrimp_farm_iot database"""
    print("\n" + "="*60)
    print("TEST 1: MongoDB Connection")
    print("="*60)
    
    try:
        db = MongoDB.connect()
        print(f"✅ Connected to MongoDB")
        print(f"   Database: {settings.MONGODB_DB}")
        
        # List collections
        collections = db.list_collection_names()
        print(f"✅ Available collections: {collections}")
        
        if "environment_data" in collections:
            print("✅ environment_data collection found (READ-ONLY)")
        else:
            print("⚠️  environment_data collection not found")
            
        return True
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return False


def test_environment_data_retrieval():
    """Test retrieving environmental data from database"""
    print("\n" + "="*60)
    print("TEST 2: Environmental Data Retrieval")
    print("="*60)
    
    try:
        repository = Repository()
        
        # Try to get latest sensor reading from any device
        sensor_data = repository.get_latest_environment()
        
        if sensor_data:
            print(f"✅ Retrieved sensor data from device: {sensor_data.get('device_id')}")
            print(f"   Data keys: {list(sensor_data.keys())}")
            
            # Validate required fields for disease detection
            required_fields = ["do_mg_l", "temperature", "ph", "salinity_ppt"]
            missing_fields = [f for f in required_fields if f not in sensor_data or sensor_data[f] is None]
            if missing_fields:
                print(f"⚠️  Missing/null expected fields: {missing_fields}")
            else:
                print(f"✅ All required sensor fields present")
            
            # Test normalization
            normalized = Repository.normalize_sensor_data(sensor_data)
            print(f"✅ Normalized data keys: {list(normalized.keys())}")
            print(f"   Sample: DO={normalized['DO']}, pH={normalized['pH']}, "
                  f"salinity={normalized['salinity']}, temp={normalized['temp']}")
            return True
        else:
            print(f"⚠️  No sensor data found in database")
            return None
    except Exception as e:
        print(f"❌ Data retrieval failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_model_features():
    """Test model feature requirements"""
    print("\n" + "="*60)
    print("TEST 3: Model Feature Requirements")
    print("="*60)
    
    print(f"Required features for prediction: {FEATURES}")
    print(f"Total features: {len(FEATURES)}")
    
    expected_features = [
        "activity_mean", "activity_std", "drop_ratio_min", "abnormal_rate",
        "feed_amount", "feed_response", "DO", "temp", "pH", "salinity"
    ]
    
    missing = set(expected_features) - set(FEATURES)
    extra = set(FEATURES) - set(expected_features)
    
    if missing:
        print(f"❌ Missing expected features: {missing}")
        return False
    if extra:
        print(f"⚠️  Extra features: {extra}")
    
    print(f"✅ All required features present")
    return True


def test_model_loading():
    """Test if models load correctly"""
    print("\n" + "="*60)
    print("TEST 4: Model Loading")
    print("="*60)
    
    try:
        model_service = RiskModelService(
            rf_model_path=settings.RF_MODEL_PATH,
            if_model_path=settings.IF_MODEL_PATH,
            scaler_path=settings.SCALER_PATH,
            if_threshold=settings.IF_THRESHOLD,
        )
        print(f"✅ Random Forest model loaded: {model_service.rf_model is not None}")
        print(f"✅ Isolation Forest model loaded: {model_service.if_model is not None}")
        print(f"✅ Feature scaler loaded: {model_service.scaler is not None}")
        print(f"✅ IF Threshold set: {model_service.if_threshold}")
        return True
    except Exception as e:
        print(f"❌ Model loading failed: {str(e)}")
        return False


def test_sample_prediction():
    """Test prediction with sample data"""
    print("\n" + "="*60)
    print("TEST 5: Sample Prediction")
    print("="*60)
    
    try:
        model_service = RiskModelService(
            rf_model_path=settings.RF_MODEL_PATH,
            if_model_path=settings.IF_MODEL_PATH,
            scaler_path=settings.SCALER_PATH,
            if_threshold=settings.IF_THRESHOLD,
        )
        
        # Create sample input data
        sample_features = {
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
        }
        
        # Ensure features are in correct order
        feature_values = [sample_features[f] for f in FEATURES]
        
        # Test RF model predict
        try:
            rf_pred = model_service.rf_model.predict([feature_values])
            print(f"✅ RF Model prediction: {rf_pred[0]}")
        except Exception as e:
            print(f"❌ RF Model prediction failed: {str(e)}")
            return False
        
        # Test IF model score
        try:
            if_score = model_service.if_model.decision_function([feature_values])[0]
            print(f"✅ IF Model anomaly score: {if_score}")
            print(f"   Threshold: {model_service.if_threshold}")
            print(f"   Is anomaly: {if_score < model_service.if_threshold}")
        except Exception as e:
            print(f"❌ IF Model scoring failed: {str(e)}")
            return False
        
        print(f"✅ Sample prediction successful")
        return True
    except Exception as e:
        print(f"❌ Sample prediction failed: {str(e)}")
        return False


def print_summary(results):
    """Print test summary"""
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v is True)
    failed = sum(1 for v in results.values() if v is False)
    skipped = sum(1 for v in results.values() if v is None)
    
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"⚠️  Skipped: {skipped}")
    
    if failed == 0:
        print("\n🎉 All critical tests passed!")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please review above.")


if __name__ == "__main__":
    print("\n🔍 DISEASE DETECTION: DATA FLOW VALIDATION")
    print("Checking database connection, data retrieval, and model compatibility")
    
    results = {}
    
    # Run tests
    results["MongoDB Connection"] = test_mongodb_connection()
    results["Environment Data"] = test_environment_data_retrieval()
    results["Model Features"] = test_model_features()
    results["Model Loading"] = test_model_loading()
    results["Sample Prediction"] = test_sample_prediction()
    
    # Print summary
    print_summary(results)
    
    sys.exit(0 if all(v is not False for v in results.values()) else 1)
