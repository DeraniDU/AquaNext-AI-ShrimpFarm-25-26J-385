"""
IoT Gateway API - Receives sensor data from ESP32 and stores in MongoDB
Handles TDS, Conductivity, and Temperature readings
Integrates physics-based calculations for water quality parameters
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
import os
import logging
from dotenv import load_dotenv
from physics_calculator import PhysicsCalculator

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "shrimp_farm_iot")
COLLECTION_NAME = "sensor_readings"

# Connect to MongoDB (with retry logic)
client = None
db = None
collection = None

def connect_to_mongodb():
    global client, db, collection
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]
        
        # Create indexes for better query performance
        collection.create_index("timestamp")
        collection.create_index("device_id")
        collection.create_index([("timestamp", -1)])
        
        logger.info("✅ Connected to MongoDB successfully")
        return True
    except Exception as e:
        logger.warning(f"⚠️  MongoDB connection failed: {e}")
        logger.warning("   The API will still work but data won't persist until MongoDB is online")
        return False

# Try to connect to MongoDB on startup
connect_to_mongodb()


# ═══════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════

class SensorReading:
    """Validates and represents a sensor reading"""
    
    def __init__(self, device_id, tds_value, conductivity, temperature=None, battery=None):
        self.device_id = device_id
        self.tds_value = float(tds_value)  # TDS in ppm
        self.conductivity = float(conductivity)  # Conductivity in µS/cm or mS/cm
        self.temperature = float(temperature) if temperature else None  # in Celsius
        self.battery = float(battery) if battery else None  # Battery percentage 0-100
        self.timestamp = datetime.utcnow()
    
    def validate(self):
        """Validate sensor readings"""
        if not self.device_id:
            raise ValueError("device_id is required")
        
        if self.tds_value < 0 or self.tds_value > 50000:
            raise ValueError(f"TDS value {self.tds_value} out of realistic range (0-50000 ppm)")
        
        if self.conductivity < 0 or self.conductivity > 200000:
            raise ValueError(f"Conductivity {self.conductivity} out of range")
        
        if self.temperature and (self.temperature < -10 or self.temperature > 50):
            raise ValueError(f"Temperature {self.temperature} unrealistic for water")
        
        if self.battery and (self.battery < 0 or self.battery > 100):
            raise ValueError(f"Battery percentage must be 0-100")
        
        return True
    
    def to_dict(self):
        """Convert to dictionary for MongoDB storage"""
        return {
            "device_id": self.device_id,
            "tds_value": self.tds_value,
            "conductivity": self.conductivity,
            "temperature": self.temperature,
            "battery": self.battery,
            "timestamp": self.timestamp,
        }


# ═══════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    try:
        if client is not None:
            # Test MongoDB connection
            client.admin.command('ping')
            db_status = "connected"
        else:
            db_status = "offline"
        
        return jsonify({
            "status": "healthy",
            "api": "running",
            "database": db_status,
            "timestamp": datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500


@app.route("/api/sensor/reading", methods=["POST"])
def receive_sensor_data():
    """
    Receive sensor data from ESP32
    
    Expected JSON payload:
    {
        "device_id": "esp32_001",
        "tds_value": 1200.5,
        "conductivity": 2400.0,
        "temperature": 28.5,
        "battery": 85
    }
    """
    try:
        if collection is None:
            return jsonify({
                "error": "Database is currently offline",
                "hint": "Please ensure MongoDB is running"
            }), 503
        
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Create and validate sensor reading
        reading = SensorReading(
            device_id=data.get("device_id"),
            tds_value=data.get("tds_value"),
            conductivity=data.get("conductivity"),
            temperature=data.get("temperature"),
            battery=data.get("battery")
        )
        
        # Validate
        reading.validate()
        
        # Save to MongoDB
        result = collection.insert_one(reading.to_dict())
        
        logger.info(f"✅ Saved sensor reading: {result.inserted_id}")
        
        return jsonify({
            "status": "success",
            "message": "Sensor data saved",
            "id": str(result.inserted_id),
            "timestamp": reading.timestamp.isoformat()
        }), 201
    
    except ValueError as e:
        logger.warning(f"⚠️ Validation error: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"❌ Error saving data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/sensor/readings", methods=["GET"])
def get_sensor_readings():
    """
    Get sensor readings with optional filtering
    
    Query parameters:
    - device_id: Filter by device (optional)
    - limit: Number of readings to return (default: 100)
    - skip: Number of readings to skip for pagination (default: 0)
    """
    try:
        device_id = request.args.get("device_id")
        limit = int(request.args.get("limit", 100))
        skip = int(request.args.get("skip", 0))
        
        # Build query
        query = {}
        if device_id:
            query["device_id"] = device_id
        
        # Fetch data (newest first)
        readings = list(collection.find(query)
                       .sort("timestamp", -1)
                       .skip(skip)
                       .limit(limit))
        
        # Convert ObjectId to string for JSON serialization
        for reading in readings:
            reading["_id"] = str(reading["_id"])
            reading["timestamp"] = reading["timestamp"].isoformat()
        
        # Get count
        total_count = collection.count_documents(query)
        
        return jsonify({
            "status": "success",
            "total_count": total_count,
            "returned_count": len(readings),
            "data": readings
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error fetching data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/sensor/latest", methods=["GET"])
def get_latest_reading():
    """Get the latest sensor reading per device"""
    try:
        device_id = request.args.get("device_id")
        
        query = {}
        if device_id:
            query["device_id"] = device_id
        
        readings = list(collection.find(query)
                       .sort("timestamp", -1)
                       .limit(1))
        
        if not readings:
            return jsonify({"status": "no_data"}), 404
        
        reading = readings[0]
        reading["_id"] = str(reading["_id"])
        reading["timestamp"] = reading["timestamp"].isoformat()
        
        return jsonify({
            "status": "success",
            "data": reading
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error fetching latest reading: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/sensor/stats", methods=["GET"])
def get_sensor_stats():
    """Get statistics for sensor readings"""
    try:
        device_id = request.args.get("device_id")
        hours = int(request.args.get("hours", 24))
        
        from datetime import timedelta
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        query = {"timestamp": {"$gte": cutoff_time}}
        if device_id:
            query["device_id"] = device_id
        
        readings = list(collection.find(query))
        
        if not readings:
            return jsonify({"status": "no_data"}), 404
        
        # Calculate statistics
        tds_values = [r["tds_value"] for r in readings]
        conductivity_values = [r["conductivity"] for r in readings]
        temps = [r["temperature"] for r in readings if r.get("temperature")]
        
        import statistics
        
        stats = {
            "device_id": device_id or "all_devices",
            "time_range_hours": hours,
            "total_readings": len(readings),
            "tds": {
                "min": min(tds_values),
                "max": max(tds_values),
                "avg": statistics.mean(tds_values),
                "stdev": statistics.stdev(tds_values) if len(tds_values) > 1 else 0
            },
            "conductivity": {
                "min": min(conductivity_values),
                "max": max(conductivity_values),
                "avg": statistics.mean(conductivity_values),
                "stdev": statistics.stdev(conductivity_values) if len(conductivity_values) > 1 else 0
            }
        }
        
        if temps:
            stats["temperature"] = {
                "min": min(temps),
                "max": max(temps),
                "avg": statistics.mean(temps),
                "stdev": statistics.stdev(temps) if len(temps) > 1 else 0
            }
        
        return jsonify({
            "status": "success",
            "data": stats
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error calculating stats: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/physics/calculate", methods=["POST"])
def calculate_physics_parameters():
    """
    Calculate physics-based water quality parameters from sensor readings.
    
    Expected JSON:
    {
        "temperature_c": 28.5,
        "ph": 8.0,
        "dissolved_oxygen_mg_l": 6.5,
        "salinity_ppt": 20,
        "conductivity_us_cm": 4000,
        "tan_mg_l": 0.3
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Calculate comprehensive physics report
        report = PhysicsCalculator.calculate_comprehensive_report(data)
        
        # Optionally save to MongoDB
        if collection:
            physics_record = {
                "device_id": data.get("device_id", "physics_calc"),
                "input_parameters": data,
                "calculated_parameters": report,
                "timestamp": datetime.utcnow()
            }
            collection.insert_one(physics_record)
        
        return jsonify({
            "status": "success",
            "data": report
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error in physics calculation: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/physics/nh3", methods=["POST"])
def calculate_nh3():
    """
    Calculate un-ionized ammonia (toxic NH₃) concentration.
    
    Expected JSON:
    {
        "tan_mg_l": 0.5,           # Total Ammonia Nitrogen
        "temperature_c": 28,
        "ph": 8.0,
        "salinity_ppt": 20         # Optional
    }
    """
    try:
        data = request.get_json()
        
        result = PhysicsCalculator.calculate_nh3(
            tan_mg_l=data.get("tan_mg_l", 0),
            temp_c=data.get("temperature_c", 28),
            ph=data.get("ph", 8.0),
            salinity_ppt=data.get("salinity_ppt", 0)
        )
        
        return jsonify({
            "status": "success",
            "data": result
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error calculating NH3: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/physics/do-saturation", methods=["POST"])
def calculate_do_saturation():
    """
    Calculate DO saturation and saturation percentage.
    
    Expected JSON:
    {
        "temperature_c": 28,
        "dissolved_oxygen_mg_l": 6.5,  # Measured value
        "salinity_ppt": 20              # Optional
    }
    """
    try:
        data = request.get_json()
        
        # Get saturation info
        sat_info = PhysicsCalculator.calculate_do_saturation_percent(
            do_measured_mg_l=data.get("dissolved_oxygen_mg_l", 6.0),
            temp_c=data.get("temperature_c", 28),
            salinity_ppt=data.get("salinity_ppt", 0)
        )
        
        return jsonify({
            "status": "success",
            "data": sat_info
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error calculating DO saturation: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/physics/conductivity-to-tds", methods=["POST"])
def convert_conductivity():
    """
    Convert conductivity to TDS (Total Dissolved Solids).
    
    Expected JSON:
    {
        "conductivity_us_cm": 4000,
        "temperature_c": 28,
        "conversion_factor": 0.5    # Optional (default 0.5)
    }
    """
    try:
        data = request.get_json()
        
        result = PhysicsCalculator.calculate_conductivity_to_tds(
            conductivity_us_cm=data.get("conductivity_us_cm", 0),
            temp_c=data.get("temperature_c", 28),
            conversion_factor=data.get("conversion_factor", 0.5)
        )
        
        return jsonify({
            "status": "success",
            "data": result
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error converting conductivity: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/sensor/delete", methods=["DELETE"])
def delete_old_readings():
    """Delete readings older than specified days (for cleanup)"""
    try:
        days = int(request.args.get("days", 30))
        
        from datetime import timedelta
        cutoff_time = datetime.utcnow() - timedelta(days=days)
        
        result = collection.delete_many({"timestamp": {"$lt": cutoff_time}})
        
        logger.info(f"Deleted {result.deleted_count} old readings")
        
        return jsonify({
            "status": "success",
            "deleted_count": result.deleted_count,
            "message": f"Deleted readings older than {days} days"
        }), 200
    
    except Exception as e:
        logger.error(f"❌ Error deleting data: {e}")
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════
# ERROR HANDLERS
# ═══════════════════════════════════════════════════

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500


# ═══════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV") == "development"
    
    logger.info(f"🚀 Starting IoT Gateway API on port {port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
