/*
  ╔═══════════════════════════════════════════════════════════════╗
  ║  ESP32 TDS & Conductivity Sensor to Cloud IoT Gateway        ║
  ║  Sends real-time water quality data via WiFi to Flask API    ║
  ╚═══════════════════════════════════════════════════════════════╝
  
  HARDWARE SETUP:
  ───────────────
  1. TDS Sensor (analog):
     - VCC → 3.3V or 5V
     - GND → GND
     - Out → GPIO 35 (ADC1_CH7) or GPIO 34 (ADC1_CH6)
  
  2. DS18B20 Temperature (optional OneWire):
     - VCC → 3.3V
     - GND → GND
     - Out → GPIO 4 (with 4.7k pull-up resistor)
  
  3. ESP32 Development Board
     - WiFi antenna should be present
  
  INSTALLATION:
  ─────────────
  1. Install ESP32 board in Arduino IDE:
     https://github.com/espressif/arduino-esp32
  
  2. Required Libraries:
     - ArduinoJson (for JSON handling)
     - OneWire (for DS18B20 if used)
     - DallasTemperature (for DS18B20 if used)
  
  CONFIGURATION:
  ──────────────
  Update these values before uploading:
  - WIFI_SSID: Your WiFi network name
  - WIFI_PASSWORD: Your WiFi password  
  - SERVER_ADDRESS: Your Flask API server IP/hostname
  - DEVICE_ID: Unique identifier for this ESP32
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WebServer.h>
#include <time.h>

// ═══════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════

// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// API Server Configuration
const char* SERVER_ADDRESS = "http://192.168.x.x:5000";  // Change to your server IP
const char* API_ENDPOINT = "/api/sensor/reading";

// Device Configuration
const char* DEVICE_ID = "esp32_shrimp_farm_001";

// Sensor Configuration
const int TDS_PIN = 35;              // Analog pin for TDS sensor (ADC1_CH7)
const int TEMP_PIN = 4;              // GPIO 4 for DS18B20 (optional)
const float VREF = 3.3;               // Reference voltage for ADC
const int ADC_MAX = 4095;             // 12-bit ADC resolution
const float ADC_TO_VOLTAGE_FACTOR = VREF / ADC_MAX;

// Timing Configuration
const unsigned long SEND_INTERVAL = 60000;  // Send every 60 seconds (adjust as needed)
const unsigned long WIFI_TIMEOUT = 30000;   // 30 seconds WiFi timeout
const unsigned long SENSOR_READ_DELAY = 100; // Time between ADC reads (millis)

// ═══════════════════════════════════════════════════
// GLOBAL VARIABLES
// ═══════════════════════════════════════════════════

unsigned long lastSendTime = 0;
int wifiFailCount = 0;
const int MAX_WIFI_FAILS = 5;

// Sensor calibration (adjust based on your TDS sensor)
const float TDS_COEFFICIENT = 0.5;  // TDS coefficient for your sensor
const float K_VALUE = 1.0;          // Conductivity coefficient (usually 1.0)

// ═══════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n╔════════════════════════════════════════════╗");
  Serial.println("║       ESP32 IoT Gateway Initializing       ║");
  Serial.println("╚════════════════════════════════════════════╝\n");
  
  // Configure ADC
  analogReadResolution(12);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);  // Full range: 0-3.3V
  
  Serial.println("[1/3] ADC configured");
  
  // Connect to WiFi
  Serial.println("[2/3] Connecting to WiFi...");
  connectToWiFi();
  
  // Configure time for HTTPS (optional)
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.println("[3/3] Time synchronized");
  
  Serial.println("\n✅ Initialization complete! Starting sensor loop...\n");
}

// ═══════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi disconnected, reconnecting...");
    connectToWiFi();
  }
  
  // Send data at interval
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    readAndSendSensorData();
    lastSendTime = millis();
  }
  
  delay(1000);  // Prevent watchdog timeout
}

// ═══════════════════════════════════════════════════
// WiFi FUNCTIONS
// ═══════════════════════════════════════════════════

void connectToWiFi() {
  Serial.printf("🔗 Connecting to WiFi: %s\n", WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  unsigned long startTime = millis();
  int dotCount = 0;
  
  while (WiFi.status() != WL_CONNECTED && 
         millis() - startTime < WIFI_TIMEOUT) {
    delay(500);
    Serial.print(".");
    dotCount++;
    if (dotCount % 20 == 0) Serial.println();
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiFailCount = 0;
    Serial.println("✅ WiFi connected!");
    Serial.printf("   IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("   Signal Strength: %d dBm\n", WiFi.RSSI());
  } else {
    wifiFailCount++;
    Serial.printf("❌ WiFi failed (attempt %d/%d)\n", wifiFailCount, MAX_WIFI_FAILS);
    
    if (wifiFailCount >= MAX_WIFI_FAILS) {
      Serial.println("🔄 Too many WiFi failures, restarting ESP32...");
      delay(2000);
      ESP.restart();
    }
  }
}

// ═══════════════════════════════════════════════════
// SENSOR READING FUNCTIONS
// ═══════════════════════════════════════════════════

float readTDSValue() {
  /*
    TDS Calculation Formula:
    ────────────────────────
    1. Read analog voltage from sensor
    2. Calculate conductivity (µS/cm)
    3. Convert conductivity to TDS (ppm)
    
    Formula: TDS (ppm) = Conductivity (µS/cm) × 0.5
    (0.5 is a standard coefficient for freshwater)
  */
  
  // Take multiple readings and average for noise reduction
  uint32_t adcSum = 0;
  const int NUM_SAMPLES = 5;
  
  for (int i = 0; i < NUM_SAMPLES; i++) {
    adcSum += analogRead(TDS_PIN);
    delay(10);
  }
  
  uint16_t adcAverage = adcSum / NUM_SAMPLES;
  
  // Convert ADC reading to voltage
  float voltage = adcAverage * ADC_TO_VOLTAGE_FACTOR;
  
  // Calculate conductivity (µS/cm)
  // This formula depends on your specific sensor
  // Typical: EC (µS/cm) = (voltage / 3.3) * 2000
  float conductivity = (voltage / 3.3) * 2000.0 * K_VALUE;
  
  // Calculate TDS from conductivity
  // Standard formula: TDS (ppm) = EC (µS/cm) × 0.5
  float tds = conductivity * TDS_COEFFICIENT;
  
  return tds;
}

float readConductivity() {
  /*
    Read conductivity directly in µS/cm or mS/cm
    Adjust multiplier based on your sensor's range
  */
  uint32_t adcSum = 0;
  const int NUM_SAMPLES = 5;
  
  for (int i = 0; i < NUM_SAMPLES; i++) {
    adcSum += analogRead(TDS_PIN);
    delay(10);
  }
  
  uint16_t adcAverage = adcSum / NUM_SAMPLES;
  float voltage = adcAverage * ADC_TO_VOLTAGE_FACTOR;
  
  // Conductivity in µS/cm
  float conductivity = (voltage / 3.3) * 2000.0 * K_VALUE;
  
  return conductivity;
}

float readTemperature() {
  /*
    Read temperature from DS18B20 (optional)
    Returns: Temperature in Celsius
    For now, returning a mock value or 25.0 if not configured
  */
  
  // TODO: Implement OneWire/DallasTemperature reading
  // For now, return room temperature approximation
  return 25.0;
}

int readBatteryPercentage() {
  /*
    Estimate battery percentage from ADC reading of battery voltage
    ADC pin should be connected to battery through voltage divider
    For now, return a fixed value (implement if using battery)
  */
  return 100;  // Placeholder
}

// ═══════════════════════════════════════════════════
// DATA TRANSMISSION
// ═══════════════════════════════════════════════════

void readAndSendSensorData() {
  Serial.println("\n" + String(millis()/1000) + "s | Reading sensors...");
  
  // Read sensor values
  float tds = readTDSValue();
  float conductivity = readConductivity();
  float temperature = readTemperature();
  int battery = readBatteryPercentage();
  
  // Display readings
  Serial.printf("  ├─ TDS: %.1f ppm\n", tds);
  Serial.printf("  ├─ Conductivity: %.1f µS/cm\n", conductivity);
  Serial.printf("  ├─ Temperature: %.1f °C\n", temperature);
  Serial.printf("  └─ Battery: %d%%\n", battery);
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["tds_value"] = round(tds * 10) / 10.0;  // Round to 1 decimal
  doc["conductivity"] = round(conductivity * 10) / 10.0;
  doc["temperature"] = round(temperature * 10) / 10.0;
  doc["battery"] = battery;
  
  // Convert to string
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.println("\n📤 Sending to server...");
  sendDataToServer(jsonPayload);
}

void sendDataToServer(String jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, skipping send");
    return;
  }
  
  HTTPClient http;
  String url = String(SERVER_ADDRESS) + String(API_ENDPOINT);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Optional: Add timeout
  http.setConnectTimeout(5000);
  http.setTimeout(5000);
  
  Serial.printf("   URL: %s\n", url.c_str());
  
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    
    if (httpResponseCode >= 200 && httpResponseCode < 300) {
      Serial.printf("✅ Success! (HTTP %d)\n", httpResponseCode);
      Serial.printf("   Response: %s\n", response.c_str());
    } else {
      Serial.printf("⚠️  Server error (HTTP %d)\n", httpResponseCode);
      Serial.printf("   Response: %s\n", response.c_str());
    }
  } else {
    Serial.printf("❌ Error sending data: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
}

// ═══════════════════════════════════════════════════
// OPTIONAL: WEB SERVER FOR STATUS
// ═══════════════════════════════════════════════════

/*
  Optional web server to check ESP32 status
  Access at: http://<esp32-ip>:80/status
  
  Uncomment and add to setup() if desired:
  
  WebServer server(80);
  server.on("/status", handleStatus);
  server.begin();
  
  In loop(), call: server.handleClient();
*/

void handleStatus() {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  doc["uptime_seconds"] = millis() / 1000;
  doc["last_send"] = lastSendTime / 1000;
  
  String response;
  serializeJson(doc, response);
  
  // Casting to WebServer (not implemented in this basic version)
  // server.send(200, "application/json", response);
}
