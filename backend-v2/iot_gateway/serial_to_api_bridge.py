import serial
import requests
import json
import time

# --- CONFIGURATION ---
# Change this to match your ESP32/Arduino COM port (e.g., 'COM3' on Windows, '/dev/ttyUSB0' or '/dev/cu.usbserial-xxx' on Mac/Linux)
SERIAL_PORT = '/dev/cu.usbserial-0001' 
BAUD_RATE = 115200

# Your Python Flask API endpoint
API_URL = "http://localhost:8000/api/sensor/reading"

print(f"📡 Connecting to Serial Port: {SERIAL_PORT} at {BAUD_RATE} baud...")

try:
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    print("✅ Successfully connected to Serial Port!")
except Exception as e:
    print(f"❌ Error opening serial port: {e}")
    print("Please make sure the Serial Monitor in right Arduino IDE is CLOSED, as only one program can access the port at a time.")
    exit(1)

print(f"🌐 Data will be forwarded to: {API_URL}")
print("Waiting for data...\n")

current_reading = {}

while True:
    try:
        if ser.in_waiting > 0:
            # Read a line from the serial port
            line = ser.readline().decode('utf-8').strip()
            
            # Print the raw line we got from Arduino
            print(f"[{time.strftime('%H:%M:%S')}] RAW SERIAL: {line}")
            
            # Because the Arduino is sending plain text lines instead of JSON,
            # we need to accumulate them until we see a separator.
            if "Salinity:" in line:
                try:
                    current_reading["salinity_ppt"] = float(line.split(":")[1].replace("ppt", "").strip())
                except ValueError:
                    pass
            elif "pH Value:" in line:
                try:
                    current_reading["ph"] = float(line.split(":")[1].strip())
                except ValueError:
                    pass
            # Add other known fields here as needed:
            elif "Temperature:" in line:
                try:
                    # Clean out degrees symbol and 'C' before converting
                    raw_temp = line.split(":")[1].replace("\u00b0", "").replace("°", "").replace("C", "").strip()
                    current_reading["temperature"] = float(raw_temp)
                except ValueError:
                    pass
            elif "TDS:" in line:
                try:
                    current_reading["tds_value"] = float(line.split(":")[1].replace("ppm", "").strip())
                except ValueError:
                    pass
                    
            # When we see the separator line, send the accumulated payload to the API
            elif "----------------------" in line:
                if current_reading: # Check if we actually collected any data
                    current_reading["device_id"] = "arduino_uno_01" # Default ID
                    
                    print(f"   ➡ Parsed data successfully. Sending to API: {current_reading}")
                    
                    try:
                        # Send to our Flask backend
                        response = requests.post(API_URL, json=current_reading, timeout=5)
                        
                        if response.status_code == 201:
                            print("   ✅ Successfully saved to Database!")
                            print(f"   API Response: {response.json().get('status')}")
                        else:
                            print(f"   ⚠️ API returned status code: {response.status_code}")
                            print(f"   Response text: {response.text}")
                    except requests.exceptions.RequestException as e:
                        print(f"   ❌ Network error sending to API: {e}")
                        
                    # Reset the dictionary for the next batch
                    current_reading = {}
                
        time.sleep(0.1) # Small delay to prevent maxing out CPU
        
    except KeyboardInterrupt:
        print("\nStopping script...")
        break
    except Exception as e:
        print(f"Unexpected error: {e}")
        time.sleep(1)

ser.close()
print("Serial port closed.")
