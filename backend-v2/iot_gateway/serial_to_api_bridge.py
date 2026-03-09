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

while True:
    try:
        if ser.in_waiting > 0:
            # Read a line from the serial port
            line = ser.readline().decode('utf-8').strip()
            
            # Print the raw line we got from Arduino
            print(f"[{time.strftime('%H:%M:%S')}] RAW SERIAL: {line}")
            
            # We expect the Arduino to send JSON format over serial. 
            # E.g.: {"device_id": "esp32_01", "temperature": 28.5, "ph": 8.1}
            try:
                # Try to parse it as JSON
                payload = json.loads(line)
                
                print("   ➡ Parsed JSON successfully. Sending to API...")
                
                # Send to our Flask backend
                response = requests.post(API_URL, json=payload, timeout=5)
                
                if response.status_code == 201:
                    print("   ✅ Successfully saved to Database!")
                    print(f"   API Response: {response.json().get('status')}")
                else:
                    print(f"   ⚠️ API returned status code: {response.status_code}")
                    print(f"   Response text: {response.text}")
                    
            except json.JSONDecodeError:
                # The line wasn't JSON. It might be standard Serial.println("Hello World") debug text
                pass
            except requests.exceptions.RequestException as e:
                print(f"   ❌ Network error sending to API: {e}")
                
        time.sleep(0.1) # Small delay to prevent maxing out CPU
        
    except KeyboardInterrupt:
        print("\nStopping script...")
        break
    except Exception as e:
        print(f"Unexpected error: {e}")
        time.sleep(1)

ser.close()
print("Serial port closed.")
