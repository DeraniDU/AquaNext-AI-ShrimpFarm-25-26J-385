import requests
import json
from datetime import datetime, timedelta

url = "http://localhost:5000/api/sensor/reading"

def send_mock_reading(time_desc, custom_time=None):
    payload = {
        "device_id": f"esp32_synthetic_test_{time_desc.replace(' ', '_')}",
        "tds_value": 1100.5,
        "conductivity": 2200.0,
        "temperature": 29.0, # warmer
        "salinity_ppt": 1.21,
        # Notice we are omitting pH and DO entirely
    }

    print(f"\n--- Testing: {time_desc} ---")
    try:
        response = requests.post(url, json=payload)
        
        data = response.json()
        saved_doc_id = data.get("id")
        
        print("Status Code:", response.status_code)
        
        # We need to hit MongoDB or parse the response to see what pH and DO was synthesized 
        if "ml_predictions" in data:
            print(f"Predicted DO: {data['ml_predictions'].get('predicted_do_mg_l')} mg/L")
        
        if "physics_calculations" in data:
            ph_status = data['physics_calculations'].get('ph_status', {})
            print(f"Synthesized pH: {ph_status.get('ph')}")
            
    except Exception as e:
        print("Error:", e)

# Note: The test will just hit the endpoint, which uses datetime.utcnow() inside app.py.
# To properly test daytime/nighttime synthesis without mocking the internal server clock, 
# we can just verify the estimator catches the missing pH right now and successfully outputs varied DO.
print("Posting live synthetic data to:", url)
send_mock_reading("Current Time Local Test")
