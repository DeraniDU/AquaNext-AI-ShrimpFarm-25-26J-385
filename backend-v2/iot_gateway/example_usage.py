"""
Python Example: Using the IoT Gateway & Physics Calculator APIs
==============================================================

This script demonstrates how to:
1. Send sensor data to the IoT Gateway
2. Retrieve stored data from MongoDB
3. Calculate physics-based water quality parameters
4. Parse and display results

Requires: requests library
Installation: pip install requests
"""

import requests
import json
import time
from datetime import datetime, timedelta

# API Base URL
IOT_API_BASE = "http://localhost:5000"

class ShrimpFarmClient:
    """Client for interacting with IoT Gateway and Physics Calculator APIs"""
    
    def __init__(self, base_url=IOT_API_BASE):
        self.base_url = base_url
        self.session = requests.Session()
    
    # ═══════════════════════════════════════════════════
    # SENSOR DATA ENDPOINTS
    # ═══════════════════════════════════════════════════
    
    def send_sensor_reading(self, device_id, tds_value, conductivity, 
                           temperature=None, battery=None):
        """
        Send sensor reading from IoT device to API.
        
        Args:
            device_id: Unique identifier (e.g., "esp32_pond_001")
            tds_value: Total Dissolved Solids in ppm
            conductivity: Electrical conductivity in µS/cm
            temperature: Water temperature in °C (optional)
            battery: Battery percentage 0-100 (optional)
        """
        endpoint = f"{self.base_url}/api/sensor/reading"
        
        payload = {
            "device_id": device_id,
            "tds_value": tds_value,
            "conductivity": conductivity,
            "temperature": temperature,
            "battery": battery
        }
        
        try:
            response = self.session.post(endpoint, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error sending sensor data: {e}")
            return None
    
    def get_recent_readings(self, device_id=None, limit=10, skip=0):
        """
        Get recent sensor readings.
        
        Args:
            device_id: Filter by device (optional)
            limit: Number of readings to return
            skip: Pagination offset
        """
        endpoint = f"{self.base_url}/api/sensor/readings"
        
        params = {
            "limit": limit,
            "skip": skip
        }
        if device_id:
            params["device_id"] = device_id
        
        try:
            response = self.session.get(endpoint, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error getting readings: {e}")
            return None
    
    def get_latest_reading(self, device_id):
        """Get the most recent reading from a device."""
        endpoint = f"{self.base_url}/api/sensor/latest"
        
        params = {"device_id": device_id}
        
        try:
            response = self.session.get(endpoint, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error getting latest reading: {e}")
            return None
    
    def get_statistics(self, device_id=None, hours=24):
        """
        Get statistics for sensor readings.
        
        Args:
            device_id: Filter by device (optional)
            hours: Time period in hours
        """
        endpoint = f"{self.base_url}/api/sensor/stats"
        
        params = {"hours": hours}
        if device_id:
            params["device_id"] = device_id
        
        try:
            response = self.session.get(endpoint, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error getting statistics: {e}")
            return None
    
    # ═══════════════════════════════════════════════════
    # PHYSICS CALCULATION ENDPOINTS
    # ═══════════════════════════════════════════════════
    
    def calculate_nh3(self, tan_mg_l, temperature_c, ph, salinity_ppt=0):
        """
        Calculate un-ionized ammonia (NH₃).
        
        Args:
            tan_mg_l: Total Ammonia Nitrogen (mg/L)
            temperature_c: Water temperature (°C)
            ph: pH value
            salinity_ppt: Salinity in ppt (optional)
        """
        endpoint = f"{self.base_url}/api/physics/nh3"
        
        payload = {
            "tan_mg_l": tan_mg_l,
            "temperature_c": temperature_c,
            "ph": ph,
            "salinity_ppt": salinity_ppt
        }
        
        try:
            response = self.session.post(endpoint, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error calculating NH₃: {e}")
            return None
    
    def calculate_do_saturation(self, temperature_c, dissolved_oxygen_mg_l, 
                               salinity_ppt=0):
        """
        Calculate DO saturation percentage.
        
        Args:
            temperature_c: Water temperature (°C)
            dissolved_oxygen_mg_l: Measured DO (mg/L)
            salinity_ppt: Salinity in ppt (optional)
        """
        endpoint = f"{self.base_url}/api/physics/do-saturation"
        
        payload = {
            "temperature_c": temperature_c,
            "dissolved_oxygen_mg_l": dissolved_oxygen_mg_l,
            "salinity_ppt": salinity_ppt
        }
        
        try:
            response = self.session.post(endpoint, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error calculating DO saturation: {e}")
            return None
    
    def calculate_comprehensive_report(self, temperature_c, ph, 
                                      dissolved_oxygen_mg_l, salinity_ppt,
                                      conductivity_us_cm=None, tan_mg_l=None):
        """
        Calculate comprehensive water quality report.
        
        Args:
            temperature_c: Water temperature (°C)
            ph: pH value
            dissolved_oxygen_mg_l: Dissolved oxygen (mg/L)
            salinity_ppt: Salinity (ppt)
            conductivity_us_cm: Conductivity (µS/cm) - optional
            tan_mg_l: Total Ammonia Nitrogen (mg/L) - optional
        """
        endpoint = f"{self.base_url}/api/physics/calculate"
        
        payload = {
            "temperature_c": temperature_c,
            "ph": ph,
            "dissolved_oxygen_mg_l": dissolved_oxygen_mg_l,
            "salinity_ppt": salinity_ppt
        }
        
        if conductivity_us_cm:
            payload["conductivity_us_cm"] = conductivity_us_cm
        if tan_mg_l:
            payload["tan_mg_l"] = tan_mg_l
        
        try:
            response = self.session.post(endpoint, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error calculating comprehensive report: {e}")
            return None
    
    def health_check(self):
        """Check API health status."""
        endpoint = f"{self.base_url}/health"
        
        try:
            response = self.session.get(endpoint)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Health check failed: {e}")
            return None


# ═══════════════════════════════════════════════════
# USAGE EXAMPLES
# ═══════════════════════════════════════════════════

def example_1_send_sensor_data():
    """Example 1: Send sensor readings from ESP32"""
    print("\n" + "="*60)
    print("Example 1: Sending Sensor Data")
    print("="*60)
    
    client = ShrimpFarmClient()
    
    # Simulate sensor readings from an ESP32
    sensor_data = {
        "device_id": "esp32_pond_001",
        "tds_value": 1250.5,
        "conductivity": 2500,
        "temperature": 28.5,
        "battery": 92
    }
    
    print(f"\n📤 Sending sensor data from {sensor_data['device_id']}...")
    response = client.send_sensor_reading(**sensor_data)
    
    if response:
        print(f"✅ Response: {response['status']}")
        print(f"   ID: {response['id']}")
        print(f"   Timestamp: {response['timestamp']}")


def example_2_retrieve_data():
    """Example 2: Retrieve stored sensor data"""
    print("\n" + "="*60)
    print("Example 2: Retrieving Stored Sensor Data")
    print("="*60)
    
    client = ShrimpFarmClient()
    
    print("\n📥 Getting latest reading from esp32_pond_001...")
    response = client.get_latest_reading("esp32_pond_001")
    
    if response and response['status'] == 'success':
        data = response['data']
        print(f"\n✅ Latest Reading:")
        print(f"   Device: {data['device_id']}")
        print(f"   Temperature: {data['temperature']}°C")
        print(f"   TDS: {data['tds_value']} ppm")
        print(f"   Conductivity: {data['conductivity']} µS/cm")
        print(f"   Timestamp: {data['timestamp']}")


def example_3_calculate_nh3():
    """Example 3: Calculate ammonia levels"""
    print("\n" + "="*60)
    print("Example 3: Calculating NH₃ (Ammonia)")
    print("="*60)
    
    client = ShrimpFarmClient()
    
    print("\n🧮 Calculating un-ionized ammonia (NH₃)...")
    response = client.calculate_nh3(
        tan_mg_l=0.5,
        temperature_c=28,
        ph=8.0,
        salinity_ppt=20
    )
    
    if response and response['status'] == 'success':
        data = response['data']
        print(f"\n✅ Ammonia Calculation:")
        print(f"   Input TAN: 0.5 mg/L")
        print(f"   Calculated NH₃: {data['nh3_mg_l']} mg/L")
        print(f"   NH₃ Fraction: {data['nh3_fraction']*100:.2f}%")
        print(f"   Status: {data['status'].upper()}")
        print(f"   Optimal Range: {data['optimal_range']}")


def example_4_do_saturation():
    """Example 4: Calculate DO saturation"""
    print("\n" + "="*60)
    print("Example 4: Calculating DO Saturation")
    print("="*60)
    
    client = ShrimpFarmClient()
    
    print("\n🧮 Calculating dissolved oxygen saturation...")
    response = client.calculate_do_saturation(
        temperature_c=28,
        dissolved_oxygen_mg_l=6.5,
        salinity_ppt=20
    )
    
    if response and response['status'] == 'success':
        data = response['data']
        print(f"\n✅ DO Saturation:")
        print(f"   Measured DO: {data['do_measured_mg_l']} mg/L")
        print(f"   DO Saturation: {data['do_sat_mg_l']:.2f} mg/L")
        print(f"   Saturation %: {data['saturation_pct']:.1f}%")
        print(f"   Status: {data['status'].upper()}")
        print(f"   Optimal Range: {data['optimal_range']}")


def example_5_comprehensive_report():
    """Example 5: Get comprehensive water quality report"""
    print("\n" + "="*60)
    print("Example 5: Comprehensive Water Quality Report")
    print("="*60)
    
    client = ShrimpFarmClient()
    
    print("\n📊 Generating comprehensive water quality report...")
    response = client.calculate_comprehensive_report(
        temperature_c=28.5,
        ph=8.0,
        dissolved_oxygen_mg_l=6.5,
        salinity_ppt=20,
        conductivity_us_cm=4000,
        tan_mg_l=0.3
    )
    
    if response and response['status'] == 'success':
        data = response['data']
        print(f"\n✅ Overall Status: {data['overall_status']}")
        print(f"\n   Parameters:")
        for param, value in data['parameters'].items():
            print(f"      {param}: {value}")
        
        print(f"\n   Calculations:")
        if 'nh3' in data['calculations']:
            nh3 = data['calculations']['nh3']
            print(f"      NH₃: {nh3['nh3_mg_l']} mg/L ({nh3['status']})")
        
        if 'do_saturation' in data['calculations']:
            do = data['calculations']['do_saturation']
            print(f"      DO Saturation: {do['saturation_pct']:.1f}% ({do['status']})")
        
        if 'ph_status' in data['calculations']:
            ph = data['calculations']['ph_status']
            print(f"      pH: {ph['ph']} ({ph['status']})")


def example_6_statistics():
    """Example 6: Get sensor statistics"""
    print("\n" + "="*60)
    print("Example 6: Getting Sensor Statistics")
    print("="*60)
    
    client = ShrimpFarmClient()
    
    print("\n📈 Getting 24-hour statistics for esp32_pond_001...")
    response = client.get_statistics("esp32_pond_001", hours=24)
    
    if response and response['status'] == 'success':
        data = response['data']
        print(f"\n✅ Statistics for {data['time_range_hours']} hours:")
        print(f"   Total Readings: {data['total_readings']}")
        
        if 'tds' in data:
            tds = data['tds']
            print(f"\n   TDS (ppm):")
            print(f"      Min: {tds['min']:.1f}")
            print(f"      Avg: {tds['avg']:.1f}")
            print(f"      Max: {tds['max']:.1f}")
        
        if 'temperature' in data:
            temp = data['temperature']
            print(f"\n   Temperature (°C):")
            print(f"      Min: {temp['min']:.1f}")
            print(f"      Avg: {temp['avg']:.1f}")
            print(f"      Max: {temp['max']:.1f}")


def example_7_health_check():
    """Example 7: Check API health"""
    print("\n" + "="*60)
    print("Example 7: API Health Check")
    print("="*60)
    
    client = ShrimpFarmClient()
    
    print("\n🏥 Checking API health...")
    response = client.health_check()
    
    if response:
        print(f"\n✅ API Status: {response['status']}")
        print(f"   API: {response['api']}")
        print(f"   Database: {response['database']}")
        print(f"   Timestamp: {response['timestamp']}")


def example_8_continuous_monitoring():
    """Example 8: Continuous monitoring loop"""
    print("\n" + "="*60)
    print("Example 8: Continuous Monitoring")
    print("="*60)
    
    client = ShrimpFarmClient()
    
    print("\n📡 Starting continuous monitoring (press Ctrl+C to stop)...")
    
    try:
        iteration = 0
        while True:
            iteration += 1
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Reading #{iteration}")
            
            # Get latest reading
            response = client.get_latest_reading("esp32_pond_001")
            
            if response and response['status'] == 'success':
                data = response['data']
                
                # Calculate comprehensive report
                calc_response = client.calculate_comprehensive_report(
                    temperature_c=data.get('temperature', 28),
                    ph=8.0,  # You would get this from an actual pH sensor
                    dissolved_oxygen_mg_l=6.5,  # From DO sensor
                    salinity_ppt=20
                )
                
                if calc_response:
                    overall = calc_response['data']['overall_status']
                    print(f"   ✅ Status: {overall}")
                    print(f"      Temperature: {data['temperature']}°C")
                    print(f"      TDS: {data['tds_value']} ppm")
            
            print("   Waiting 10 seconds...")
            time.sleep(10)
    
    except KeyboardInterrupt:
        print("\n\n✅ Monitoring stopped")


# ═══════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n" + "╔" + "="*58 + "╗")
    print("║" + " "*58 + "║")
    print("║" + "  🦐 IoT Gateway API Python Examples  ".center(58) + "║")
    print("║" + " "*58 + "║")
    print("╚" + "="*58 + "╝")
    
    # Run examples
    example_1_send_sensor_data()
    example_2_retrieve_data()
    example_3_calculate_nh3()
    example_4_do_saturation()
    example_5_comprehensive_report()
    example_6_statistics()
    example_7_health_check()
    
    # Uncomment to run continuous monitoring
    # example_8_continuous_monitoring()
    
    print("\n✅ Examples completed!\n")
