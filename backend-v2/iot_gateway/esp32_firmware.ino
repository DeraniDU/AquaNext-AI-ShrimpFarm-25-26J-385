/*
  ╔═══════════════════════════════════════════════════════════════╗
  ║  ESP32 Water Quality IoT Gateway + 16x2 LCD Display         ║
  ║  Sends real-time water quality data via WiFi to Flask API   ║
  ║  Displays live readings on 16x2 I2C LCD                     ║
  ╚═══════════════════════════════════════════════════════════════╝

  HARDWARE SETUP:
  ───────────────
  1. TDS Sensor (analog):
     - VCC → 3.3V or 5V
     - GND → GND
     - Out → GPIO 35 (ADC1_CH7)

  2. DS18B20 Temperature (optional OneWire):
     - VCC → 3.3V
     - GND → GND
     - Out → GPIO 4 (with 4.7k pull-up resistor)

  3. 16x2 I2C LCD Module (PCF8574 backpack):
     - VCC → 5V  (use ESP32 VIN pin, NOT 3.3V)
     - GND → GND
     - SDA → GPIO 21  (ESP32 default I2C SDA)
     - SCL → GPIO 22  (ESP32 default I2C SCL)
     Note: Most modules use I2C address 0x27 or 0x3F.
           If display is blank, try changing LCD_ADDRESS below.

  REQUIRED LIBRARIES (Arduino IDE → Tools → Manage Libraries):
  ─────────────────────────────────────────────────────────────
  - ArduinoJson        (by Benoit Blanchon)
  - LiquidCrystal_I2C  (by Frank de Brabander)
  - OneWire            (optional - for DS18B20)
  - DallasTemperature  (optional - for DS18B20)

  LCD SCREENS (auto-scroll every 3 seconds):
  ──────────────────────────────────────────
  Screen 0:  TDS & Conductivity
  Screen 1:  Temperature & Battery
  Screen 2:  WiFi & API status
  Screen 3:  Uptime & Pond status

  When CRITICAL alert detected from API → LCD flashes !! ALERT !!
*/

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ═══════════════════════════════════════════════════
// LCD CONFIGURATION
// ═══════════════════════════════════════════════════

#define LCD_ADDRESS  0x27   // Change to 0x3F if LCD stays blank
#define LCD_COLS     16
#define LCD_ROWS     2

LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);

// ═══════════════════════════════════════════════════
// USER CONFIGURATION — UPDATE BEFORE UPLOADING
// ═══════════════════════════════════════════════════

const char* WIFI_SSID      = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";
const char* SERVER_ADDRESS = "http://192.168.8.144:8000";  // Your Mac IP + port 8000
const char* API_ENDPOINT   = "/api/sensor/reading";
const char* DEVICE_ID      = "esp32_shrimp_farm_001";

// Sensor pins
const int   TDS_PIN  = 35;
const float VREF     = 3.3;
const int   ADC_MAX  = 4095;
const float ADC_TO_VOLTAGE_FACTOR = VREF / ADC_MAX;
const float TDS_COEFFICIENT = 0.5;
const float K_VALUE         = 1.0;

// Timing
const unsigned long SEND_INTERVAL       = 60000;   // ms between API sends
const unsigned long LCD_SCROLL_INTERVAL = 3000;    // ms between LCD screen changes
const unsigned long WIFI_TIMEOUT        = 30000;   // ms to wait for WiFi

// ═══════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════

unsigned long lastSendTime   = 0;
unsigned long lastScrollTime = 0;
int           lcdScreen      = 0;
int           wifiFailCount  = 0;
const int     MAX_WIFI_FAILS = 5;

// Latest sensor readings
float g_tds          = 0.0;
float g_conductivity = 0.0;
float g_temperature  = 25.0;
int   g_battery      = 100;

// Last API result
bool   g_lastSendOK  = false;
int    g_lastHTTP    = 0;
bool   g_alertActive = false;
String g_alertMsg    = "";

// ═══════════════════════════════════════════════════
// LCD HELPER FUNCTIONS
// ═══════════════════════════════════════════════════

// Print text padded to fill the entire LCD row
void lcdRow(int row, String text) {
  while ((int)text.length() < LCD_COLS) text += ' ';
  text = text.substring(0, LCD_COLS);
  lcd.setCursor(0, row);
  lcd.print(text);
}

// ── Boot splash ────────────────────────────────────
void lcdBoot() {
  lcd.clear();
  lcdRow(0, "  AquaNext v2.0 ");
  lcdRow(1, " Initializing...");
}

// ── WiFi screens ──────────────────────────────────
void lcdWiFiConnecting() {
  lcd.clear();
  lcdRow(0, "Connecting WiFi ");
  lcdRow(1, String(WIFI_SSID).substring(0, 16));
}

void lcdWiFiOK(String ip) {
  lcd.clear();
  lcdRow(0, "WiFi  Connected!");
  lcdRow(1, ip);
}

void lcdWiFiFail() {
  lcd.clear();
  lcdRow(0, "!! WiFi FAILED !!");
  lcdRow(1, "Retrying...     ");
}

// ── Sending screen ────────────────────────────────
void lcdSending() {
  lcd.clear();
  lcdRow(0, "Uploading data..");
  lcdRow(1, "Please wait...  ");
}

// ── Alert screen ──────────────────────────────────
void lcdAlert() {
  lcd.clear();
  lcdRow(0, "!! ALERT !!     ");
  String msg = g_alertMsg;
  if ((int)msg.length() > LCD_COLS) msg = msg.substring(0, LCD_COLS);
  lcdRow(1, msg);
}

// ── Data screens ──────────────────────────────────
void lcdScreenTDS() {
  lcd.clear();
  char r0[17], r1[17];
  snprintf(r0, sizeof(r0), "TDS:%8.1fppm", g_tds);
  snprintf(r1, sizeof(r1), "EC: %6.1f uS/cm", g_conductivity);
  lcdRow(0, String(r0));
  lcdRow(1, String(r1));
}

void lcdScreenTemp() {
  lcd.clear();
  char r0[17], r1[17];
  snprintf(r0, sizeof(r0), "Temp:  %5.1f 'C ", g_temperature);
  snprintf(r1, sizeof(r1), "Batt:    %3d %%  ", g_battery);
  lcdRow(0, String(r0));
  lcdRow(1, String(r1));
}

void lcdScreenNetwork() {
  lcd.clear();
  bool wifi = (WiFi.status() == WL_CONNECTED);
  lcdRow(0, wifi ? "WiFi: Connected " : "WiFi: OFFLINE!! ");
  lcdRow(1, g_lastSendOK ? "API:  OK        " : "API:  FAILED    ");
}

void lcdScreenStatus() {
  lcd.clear();
  unsigned long upSec = millis() / 1000;
  char r0[17];
  snprintf(r0, sizeof(r0), "Up:%6lus      ", upSec);
  lcdRow(0, String(r0));
  lcdRow(1, g_alertActive ? "!! CHECK POND !!" : "Pond: Normal    ");
}

// ── Scroll tick (called every LCD_SCROLL_INTERVAL) ─
void lcdTick() {
  lcdScreen = (lcdScreen + 1) % 4;

  // Override screens 0 and 2 with alert when active
  if (g_alertActive && (lcdScreen == 0 || lcdScreen == 2)) {
    lcdAlert();
    return;
  }

  switch (lcdScreen) {
    case 0: lcdScreenTDS();     break;
    case 1: lcdScreenTemp();    break;
    case 2: lcdScreenNetwork(); break;
    case 3: lcdScreenStatus();  break;
  }
}

// ═══════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(500);

  // Init LCD
  Wire.begin(21, 22);   // SDA=21, SCL=22
  lcd.init();
  lcd.backlight();
  lcdBoot();
  delay(1500);

  Serial.println("\n╔════════════════════════════════════════════╗");
  Serial.println("║  AquaNext ESP32 IoT Gateway + LCD v2.0    ║");
  Serial.println("╚════════════════════════════════════════════╝\n");

  // Configure ADC
  analogReadResolution(12);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);
  Serial.println("[1/3] ADC configured");

  // Connect WiFi
  Serial.println("[2/3] Connecting to WiFi...");
  lcdWiFiConnecting();
  connectToWiFi();

  // Sync time (UTC+5:30 Sri Lanka)
  configTime(19800, 0, "pool.ntp.org");
  Serial.println("[3/3] Time synchronized");

  Serial.println("\n✅ Ready! Starting sensor loop...\n");
}

// ═══════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════

void loop() {
  unsigned long now = millis();

  // WiFi watchdog
  if (WiFi.status() != WL_CONNECTED) {
    lcdWiFiFail();
    connectToWiFi();
  }

  // Send sensor data at interval
  if (now - lastSendTime >= SEND_INTERVAL) {
    readAndSendSensorData();
    lastSendTime = now;
  }

  // LCD auto-scroll
  if (now - lastScrollTime >= LCD_SCROLL_INTERVAL) {
    lcdTick();
    lastScrollTime = now;
  }

  delay(100);
}

// ═══════════════════════════════════════════════════
// WiFi
// ═══════════════════════════════════════════════════

void connectToWiFi() {
  Serial.printf("Connecting to: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  int dots = 0;
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT) {
    delay(500);
    Serial.print(".");
    if (++dots % 20 == 0) Serial.println();
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    wifiFailCount = 0;
    String ip = WiFi.localIP().toString();
    Serial.printf("✅ WiFi OK — IP: %s\n", ip.c_str());
    lcdWiFiOK(ip);
    delay(1500);
  } else {
    wifiFailCount++;
    Serial.printf("❌ WiFi failed (%d/%d)\n", wifiFailCount, MAX_WIFI_FAILS);
    lcdWiFiFail();
    if (wifiFailCount >= MAX_WIFI_FAILS) {
      delay(2000);
      ESP.restart();
    }
  }
}

// ═══════════════════════════════════════════════════
// SENSOR READING
// ═══════════════════════════════════════════════════

float readTDSValue() {
  uint32_t sum = 0;
  for (int i = 0; i < 5; i++) { sum += analogRead(TDS_PIN); delay(10); }
  float v = (sum / 5) * ADC_TO_VOLTAGE_FACTOR;
  return (v / 3.3) * 2000.0 * K_VALUE * TDS_COEFFICIENT;
}

float readConductivity() {
  uint32_t sum = 0;
  for (int i = 0; i < 5; i++) { sum += analogRead(TDS_PIN); delay(10); }
  float v = (sum / 5) * ADC_TO_VOLTAGE_FACTOR;
  return (v / 3.3) * 2000.0 * K_VALUE;
}

float readTemperature() {
  // TODO: Add DS18B20 OneWire library and implement real reading
  return 25.0;   // Placeholder
}

int readBatteryPercentage() {
  return 100;    // Placeholder
}

// ═══════════════════════════════════════════════════
// DATA TRANSMISSION
// ═══════════════════════════════════════════════════

void readAndSendSensorData() {
  Serial.printf("\n%lus | Reading sensors...\n", millis() / 1000);

  g_tds          = readTDSValue();
  g_conductivity = readConductivity();
  g_temperature  = readTemperature();
  g_battery      = readBatteryPercentage();

  Serial.printf("  TDS:          %.1f ppm\n",   g_tds);
  Serial.printf("  Conductivity: %.1f uS/cm\n", g_conductivity);
  Serial.printf("  Temperature:  %.1f C\n",      g_temperature);
  Serial.printf("  Battery:      %d%%\n",         g_battery);

  lcdSending();

  StaticJsonDocument<256> doc;
  doc["device_id"]    = DEVICE_ID;
  doc["tds_value"]    = round(g_tds * 10.0) / 10.0;
  doc["conductivity"] = round(g_conductivity * 10.0) / 10.0;
  doc["temperature"]  = round(g_temperature * 10.0) / 10.0;
  doc["battery"]      = g_battery;

  String payload;
  serializeJson(doc, payload);

  Serial.println("Sending to API...");
  sendDataToServer(payload);
}

void sendDataToServer(String payload) {
  if (WiFi.status() != WL_CONNECTED) {
    g_lastSendOK = false;
    lcd.clear();
    lcdRow(0, "Send FAILED!    ");
    lcdRow(1, "No WiFi         ");
    return;
  }

  HTTPClient http;
  String url = String(SERVER_ADDRESS) + String(API_ENDPOINT);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setConnectTimeout(5000);
  http.setTimeout(8000);

  Serial.printf("  POST %s\n", url.c_str());
  int code = http.POST(payload);
  g_lastHTTP = code;

  if (code > 0) {
    String resp = http.getString();
    g_lastSendOK = (code >= 200 && code < 300);
    Serial.printf("  HTTP %d\n", code);

    if (g_lastSendOK) {
      // ─── Parse response alerts ───────────────────
      StaticJsonDocument<4096> respDoc;
      DeserializationError err = deserializeJson(respDoc, resp);

      g_alertActive = false;
      g_alertMsg    = "";

      if (!err && respDoc.containsKey("alerts")) {
        JsonArray arr = respDoc["alerts"].as<JsonArray>();
        for (JsonObject a : arr) {
          const char* status = a["status"] | "";
          if (strstr(status, "critical") != nullptr) {
            g_alertActive = true;
            if (g_alertMsg.length() == 0) {
              // Short label for LCD line 2
              const char* label = a["label"] | "Critical!";
              g_alertMsg = String(label).substring(0, LCD_COLS);
            }
          }
        }
      }

      // ─── Show result ─────────────────────────────
      if (g_alertActive) {
        Serial.println("  ⚠️  CRITICAL alert from server!");
        lcdAlert();
      } else {
        lcd.clear();
        lcdRow(0, "Upload OK!      ");
        lcdRow(1, "Pond: Normal    ");
      }
      delay(2000);

    } else {
      g_lastSendOK = false;
      Serial.printf("  Server error HTTP %d\n", code);
      lcd.clear();
      lcdRow(0, "Server Error!   ");
      char r1[17];
      snprintf(r1, sizeof(r1), "HTTP: %d         ", code);
      lcdRow(1, String(r1));
      delay(2000);
    }

  } else {
    g_lastSendOK = false;
    Serial.printf("  Connection error: %s\n", http.errorToString(code).c_str());
    lcd.clear();
    lcdRow(0, "Connect Failed! ");
    lcdRow(1, http.errorToString(code).substring(0, LCD_COLS));
    delay(2000);
  }

  http.end();
  // Resume scroll display after send
  lcdTick();
}
