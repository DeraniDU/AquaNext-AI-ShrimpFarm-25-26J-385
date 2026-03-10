#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>

#define TDS_PIN 34
#define ONE_WIRE_BUS 4

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

float temperature = 0;

void setup() {
  Serial.begin(115200);
  sensors.begin();
}

void loop() {

  // Read Temperature
  sensors.requestTemperatures();
  temperature = sensors.getTempCByIndex(0);

  // Read TDS Analog
  int analogValue = analogRead(TDS_PIN);
  float voltage = analogValue * (3.3 / 4095.0);

  float tdsValue = (133.42 * voltage * voltage * voltage 
                   - 255.86 * voltage * voltage 
                   + 857.39 * voltage) * 0.5;

  // Create a JSON document to hold the sensor data.
  // We allocate 200 bytes for this document size, which is plenty for 3 variables.
  StaticJsonDocument<200> doc;
  
  // Assign the device ID and the sensor readings
  doc["device_id"] = "esp32_serial_device";
  doc["temperature"] = temperature;
  doc["tds_value"] = tdsValue;
  
  // Conductivity is related to TDS, standard conversion is Conductivity = TDS / 0.5 (µS/cm)
  float conductivity = tdsValue / 0.5;
  doc["conductivity"] = conductivity;

  // Approximate Salinity from Conductivity
  // General conversion factor for brackish/shrimp water is often 0.00055 to convert µS/cm to ppt
  float salinity = conductivity * 0.00055;
  doc["salinity_ppt"] = salinity;

  // Print the JSON string entirely on ONE SINGLE LINE to the Serial monitor
  serializeJson(doc, Serial);
  Serial.println(); // Add a newline at the end

  delay(2000);
}
