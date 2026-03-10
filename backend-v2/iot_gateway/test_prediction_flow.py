import requests
import json

url = "http://localhost:5000/api/sensor/reading"
payload = {
    "device_id": "esp32_test_prediction",
    "tds_value": 1200.5,
    "conductivity": 2400.0,
    "temperature": 28.5,
    "battery": 85,
    "ph": 8.1,
    "alkalinity": 125,
    "turbidity_ntu": 15,
    "secchi_cm": 25,
    "chlorophyll_a_ug_l": 12,
    "tan_mg_l": 0.45,
    "salinity_ppt": 22
}

print("Posting data to:", url)
try:
    response = requests.post(url, json=payload)
    print("Status Code:", response.status_code)
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error:", e)
