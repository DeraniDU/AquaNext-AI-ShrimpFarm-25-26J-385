/*
 * ════════════════════════════════════════════════════════════════
 *   AquaNext Arduino Uno – MQTT Firmware
 *   (Requires: Ethernet Shield W5100  OR  ESP-01 WiFi module)
 * 
 *   Libraries needed (install from Arduino IDE Library Manager):
 *     - PubSubClient  by Nick O'Leary
 *     - ArduinoJson   by Benoit Blanchon
 *     - OneWire       by Paul Stoffregen
 *     - DallasTemperature by Miles Burton
 *     - LiquidCrystal_I2C by Frank de Brabander
 * ════════════════════════════════════════════════════════════════
 * 
 *  WIRING (Ethernet Shield stacks directly on top of Arduino Uno):
 *    TDS Sensor    -> A0
 *    pH  Sensor    -> A1
 *    DS18B20 Temp  -> D2  (with 4.7kΩ pull-up to 5V)
 *    Relay IN      -> D7
 *    LCD SDA       -> A4
 *    LCD SCL       -> A5
 *    Ethernet Shield -> stacked on Uno pins (uses SPI: D10-D13)
 * 
 *  MQTT Topics:
 *    Publish  : shrimp_farm/arduino_uno_01/sensors
 *    Subscribe: shrimp_farm/arduino_uno_01/commands
 * ════════════════════════════════════════════════════════════════
 */

#include <SPI.h>
#include <Ethernet.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ─── Device Identity ─────────────────────────────────────────────────────────
#define DEVICE_ID "arduino_uno_01"

// ─── Network Configuration ───────────────────────────────────────────────────
// Change this to a unique MAC address for each device on your network
byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0x01 };

// ⚠️  Set this to the IP of your Mac/PC running Mosquitto
IPAddress mqtt_server(192, 168, 8, 144);   // <-- Change to your Mosquitto broker IP
const int  MQTT_PORT = 1883;

// ─── MQTT Topics ──────────────────────────────────────────────────────────────
const char* TOPIC_SENSORS  = "shrimp_farm/" DEVICE_ID "/sensors";
const char* TOPIC_COMMANDS = "shrimp_farm/" DEVICE_ID "/commands";

// ─── Pins ────────────────────────────────────────────────────────────────────
#define TDS_PIN      A0
#define PH_PIN       A1
#define ONE_WIRE_BUS 2
#define RELAY_PIN    7

// ─── Relay Temperature Threshold ─────────────────────────────────────────────
const float RELAY_ON_THRESHOLD  = 29.7;   // turn ON above this
const float RELAY_OFF_HYSTERESIS = 0.3;   // turn OFF below (29.7 - 0.3 = 29.4)

// ─── LCD (I2C) ───────────────────────────────────────────────────────────────
LiquidCrystal_I2C lcd(0x27, 16, 2);   // change 0x27 to 0x3F if display is blank

// ─── Temperature Sensor ──────────────────────────────────────────────────────
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

// ─── MQTT & Ethernet Clients ─────────────────────────────────────────────────
EthernetClient ethClient;
PubSubClient   mqttClient(ethClient);

// ─── State ───────────────────────────────────────────────────────────────────
float phCalibration  = 0.00;
bool  relayOn        = false;
unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 6000;  // publish every 6 seconds

// ═════════════════════════════════════════════════════════════════════════════
//  MQTT Callback – handles incoming command messages
// ═════════════════════════════════════════════════════════════════════════════
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Copy payload to a null-terminated string
  char msg[length + 1];
  memcpy(msg, payload, length);
  msg[length] = '\0';

  Serial.print("[CMD] Topic: ");
  Serial.print(topic);
  Serial.print(" | Msg: ");
  Serial.println(msg);

  // Parse the JSON command
  StaticJsonDocument<128> cmdDoc;
  DeserializationError err = deserializeJson(cmdDoc, msg);
  if (err) {
    Serial.print("JSON parse error: ");
    Serial.println(err.c_str());
    return;
  }

  // Command: {"relay": "ON"} or {"relay": "OFF"}
  if (cmdDoc.containsKey("relay")) {
    String cmd = cmdDoc["relay"].as<String>();
    if (cmd == "ON") {
      digitalWrite(RELAY_PIN, HIGH);
      relayOn = true;
      Serial.println("[CMD] Relay forced ON via MQTT command.");
    } else if (cmd == "OFF") {
      digitalWrite(RELAY_PIN, LOW);
      relayOn = false;
      Serial.println("[CMD] Relay forced OFF via MQTT command.");
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  MQTT Reconnect
// ═════════════════════════════════════════════════════════════════════════════
void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT broker...");
    lcd.setCursor(0, 1);
    lcd.print("MQTT: Connecting");

    if (mqttClient.connect(DEVICE_ID)) {
      Serial.println(" Connected!");
      mqttClient.subscribe(TOPIC_COMMANDS);
      lcd.setCursor(0, 1);
      lcd.print("MQTT: Connected ");
    } else {
      Serial.print(" Failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(". Retrying in 5s...");
      lcd.setCursor(0, 1);
      lcd.print("MQTT: Retry...  ");
      delay(5000);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Setup
// ═════════════════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(9600);

  // Relay
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  // LCD
  lcd.begin(16, 2);
  lcd.backlight();
  lcd.clear();
  lcd.print("AquaNext v2.0");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");
  delay(1500);

  // Temperature sensor
  tempSensor.begin();

  // Ethernet (DHCP)
  lcd.clear();
  lcd.print("Getting IP...");
  if (Ethernet.begin(mac) == 0) {
    lcd.print("Ethernet FAIL!");
    Serial.println("Ethernet DHCP failed! Check cable/shield.");
    while (true) delay(1000);
  }
  Serial.print("IP: ");
  Serial.println(Ethernet.localIP());
  lcd.clear();
  lcd.print("IP:");
  lcd.print(Ethernet.localIP());

  // MQTT
  mqttClient.setServer(mqtt_server, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(60);

  delay(1500);
}

// ═════════════════════════════════════════════════════════════════════════════
//  Loop
// ═════════════════════════════════════════════════════════════════════════════
void loop() {
  // Keep MQTT alive
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  // Publish on interval
  unsigned long now = millis();
  if (now - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = now;
    publishSensorData();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Read sensors, control relay, publish JSON
// ═════════════════════════════════════════════════════════════════════════════
void publishSensorData() {

  // ── Temperature ───────────────────────────────────────────────────────────
  tempSensor.requestTemperatures();
  float temperature = tempSensor.getTempCByIndex(0);

  // ── Relay auto-control with hysteresis ────────────────────────────────────
  if (!relayOn && temperature > RELAY_ON_THRESHOLD) {
    digitalWrite(RELAY_PIN, HIGH);
    relayOn = true;
  } else if (relayOn && temperature < (RELAY_ON_THRESHOLD - RELAY_OFF_HYSTERESIS)) {
    digitalWrite(RELAY_PIN, LOW);
    relayOn = false;
  }
  String relayState = relayOn ? "ON" : "OFF";

  // ── TDS ───────────────────────────────────────────────────────────────────
  int tdsSum = 0;
  for (int i = 0; i < 10; i++) { tdsSum += analogRead(TDS_PIN); delay(10); }
  float tdsVoltage = (tdsSum / 10) * (5.0 / 1023.0);
  float tds = (133.42 * tdsVoltage * tdsVoltage * tdsVoltage
               - 255.86 * tdsVoltage * tdsVoltage
               + 857.39 * tdsVoltage) * 0.5;
  float salinity = tds * 0.001;

  // ── pH ────────────────────────────────────────────────────────────────────
  int phSum = 0;
  for (int i = 0; i < 10; i++) { phSum += analogRead(PH_PIN); delay(10); }
  float phVoltage = (phSum / 10) * (5.0 / 1023.0);
  float phValue = 7 + ((2.5 - phVoltage) / 0.18) + phCalibration;

  // ── Build JSON ────────────────────────────────────────────────────────────
  StaticJsonDocument<256> doc;
  doc["device_id"]    = DEVICE_ID;
  doc["temperature"]  = temperature;
  doc["tds_value"]    = tds;
  doc["salinity_ppt"] = salinity;
  doc["ph"]           = phValue;
  doc["conductivity"] = tds / 0.5;
  doc["relay_state"]  = relayState;

  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);

  // ── Publish ───────────────────────────────────────────────────────────────
  bool ok = mqttClient.publish(TOPIC_SENSORS, jsonBuffer);
  Serial.print(ok ? "✅ Published: " : "❌ Publish failed: ");
  Serial.println(jsonBuffer);

  // ── LCD Page 1: Temp + Relay ──────────────────────────────────────────────
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Temp:");
  lcd.print(temperature, 1);
  lcd.print("C");
  lcd.setCursor(0, 1);
  lcd.print("Relay: ");
  lcd.print(relayState);
  delay(3000);

  // ── LCD Page 2: pH + TDS ──────────────────────────────────────────────────
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("pH:");
  lcd.print(phValue, 2);
  lcd.print(" TDS:");
  lcd.print(tds, 0);
  lcd.setCursor(0, 1);
  lcd.print("Sal:");
  lcd.print(salinity, 3);
  lcd.print("ppt");
  delay(3000);
}
