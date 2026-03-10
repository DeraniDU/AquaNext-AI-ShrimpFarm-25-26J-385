from typing import Optional, Dict, Any, List
from datetime import datetime
from database.mongodb import MongoDB


class Repository:
    """
    Repository for accessing IoT sensor data from shrimp farm.
    
    Connected to: shrimp_farm_iot database (water quality monitoring)
    Collection: sensor_readings - contains real-time water quality measurements
    READ-ONLY ACCESS: Only reads sensor data, no modifications allowed
    
    Field Mapping:
    - device_id: IoT sensor device identifier (e.g., arduino_uno_01)
    - do_mg_l: Dissolved Oxygen (mg/L) -> maps to "DO"
    - ph: pH level (0-14)
    - salinity_ppt: Salinity (parts per thousand) -> maps to "salinity"
    - temperature: Water temperature (°C)
    - timestamp: Measurement timestamp
    """
    def __init__(self):
        self.db = MongoDB.get_db()

        # Actual collection names in shrimp_farm_iot database
        self.behavior_collection = self.db["behavior_live"]
        self.feed_collection = self.db["feeding_data"]
        self.sensor_collection = self.db["sensor_readings"]  # READ-ONLY: water quality sensor data
        self.prediction_collection = self.db["risk_predictions"]

    # ---------- behavior ----------
    def save_behavior_point(self, record: Dict[str, Any]) -> str:
        result = self.behavior_collection.insert_one(record)
        return str(result.inserted_id)

    def get_latest_behavior(self, pond_id: str) -> Optional[Dict[str, Any]]:
        return self.behavior_collection.find_one(
            {"pond_id": pond_id},
            sort=[("timestamp", -1)]
        )

    def get_recent_behavior(self, pond_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        return list(
            self.behavior_collection.find(
                {"pond_id": pond_id},
                {"_id": 0}
            ).sort("timestamp", -1).limit(limit)
        )

    # ---------- feeding ----------
    def get_latest_feed(self, pond_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve the latest feeding record for a pond.
        
        READ-ONLY: Only reads from feeding_data collection
        
        Args:
            pond_id: Pond identifier (default: "1" if not specified)
            
        Returns:
            Latest feeding document with fields: feed_amount, feed_response, timestamp
        """
        return self.feed_collection.find_one(
            {"pond_id": pond_id},
            sort=[("timestamp", -1)]
        )
    
    def get_recent_feeding(self, pond_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Retrieve recent feeding records for trend analysis.
        
        READ-ONLY: Only reads from feeding_data collection
        
        Args:
            pond_id: Pond identifier
            limit: Number of recent records to retrieve (default: 100)
            
        Returns:
            List of feeding documents sorted by timestamp (newest first)
        """
        return list(
            self.feed_collection.find(
                {"pond_id": pond_id},
                {"_id": 0}
            ).sort("timestamp", -1).limit(limit)
        )
    
    def get_feeding_by_date_range(
        self, 
        pond_id: str, 
        start_time: str = None, 
        end_time: str = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve feeding records within a specific date/time range.
        
        READ-ONLY: Only reads from feeding_data collection
        
        Args:
            pond_id: Pond identifier
            start_time: ISO 8601 timestamp start (e.g., "2026-03-08T00:00:00")
            end_time: ISO 8601 timestamp end (e.g., "2026-03-09T00:00:00")
            
        Returns:
            List of feeding documents within the time range
        """
        query = {"pond_id": pond_id}
        
        if start_time or end_time:
            query["timestamp"] = {}
            if start_time:
                query["timestamp"]["$gte"] = start_time
            if end_time:
                query["timestamp"]["$lte"] = end_time
        
        return list(
            self.feed_collection.find(query, {"_id": 0})
            .sort("timestamp", -1)
        )
    
    def get_feeding_statistics(self, pond_id: str, hours: int = 24) -> Dict[str, Any]:
        """
        Calculate feeding statistics for risk analysis.
        
        READ-ONLY: Only reads from feeding_data collection
        
        Args:
            pond_id: Pond identifier
            hours: Number of hours to look back (default: 24)
            
        Returns:
            Dictionary with feeding statistics: avg_amount, total_amount, 
            avg_response, feeding_count, last_feed_time
        """
        from datetime import datetime, timedelta
        
        # Calculate time window
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours)
        
        # Get feeding data within time window
        feeds = self.get_feeding_by_date_range(
            pond_id,
            start_time.isoformat(),
            end_time.isoformat()
        )
        
        if not feeds:
            return {
                "pond_id": pond_id,
                "total_records": 0,
                "avg_feed_amount": 0.0,
                "total_feed_amount": 0.0,
                "avg_feed_response": 0.0,
                "feeding_frequency": 0,
            }
        
        feed_amounts = [float(f.get("feed_amount", 0.0)) for f in feeds]
        feed_responses = [float(f.get("feed_response", 0.0)) for f in feeds]
        
        return {
            "pond_id": pond_id,
            "total_records": len(feeds),
            "avg_feed_amount": sum(feed_amounts) / len(feed_amounts) if feed_amounts else 0.0,
            "total_feed_amount": sum(feed_amounts),
            "max_feed_amount": max(feed_amounts) if feed_amounts else 0.0,
            "min_feed_amount": min(feed_amounts) if feed_amounts else 0.0,
            "avg_feed_response": sum(feed_responses) / len(feed_responses) if feed_responses else 0.0,
            "feeding_frequency": len(feeds),
            "last_feed_time": feeds[0].get("timestamp") if feeds else None,
            "time_window_hours": hours,
        }

    # ---------- environment (READ-ONLY) ----------
    # Environmental data sourced from IoT sensor readings
    # These operations only read data, no modifications are made
    def get_latest_environment(self, device_id: str = None) -> Optional[Dict[str, Any]]:
        """
        Retrieve latest environmental/sensor data from device.
        
        READ-ONLY: Only reads from sensor_readings collection
        
        Args:
            device_id: IoT device identifier (e.g., 'arduino_uno_01')
                      If None, returns latest reading from any device
        
        Returns:
            Sensor reading with normalized field names:
            - do_mg_l: Dissolved Oxygen
            - temperature: Water temperature
            - ph: pH level
            - salinity_ppt: Salinity
            - timestamp: Measurement time
        """
        query = {} if device_id is None else {"device_id": device_id}
        return self.sensor_collection.find_one(query, sort=[("timestamp", -1)])
    
    def get_recent_sensor_readings(self, device_id: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get recent sensor readings from IoT device.
        
        READ-ONLY: Only reads from sensor_readings collection
        
        Args:
            device_id: IoT device identifier. If None, gets readings from any device
            limit: Maximum number of readings to return
        """
        query = {} if device_id is None else {"device_id": device_id}
        return list(
            self.sensor_collection.find(query, {"_id": 0})
            .sort("timestamp", -1)
            .limit(limit)
        )
    
    @staticmethod
    def normalize_sensor_data(sensor_reading: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize sensor data field names for disease detection model.
        
        Maps actual sensor field names to model feature names:
        - do_mg_l (mg/L) -> DO
        - ph -> pH  
        - salinity_ppt (ppt) -> salinity
        - temperature (°C) -> temp
        
        Args:
            sensor_reading: Raw sensor reading from database
            
        Returns:
            Dictionary with normalized field names
        """
        return {
            "DO": sensor_reading.get("do_mg_l"),
            "pH": sensor_reading.get("ph"),
            "salinity": sensor_reading.get("salinity_ppt"),
            "temp": sensor_reading.get("temperature"),
            "timestamp": sensor_reading.get("timestamp"),
            "device_id": sensor_reading.get("device_id"),
        }

    # ---------- prediction ----------
    def save_prediction(self, record: Dict[str, Any]) -> str:
        result = self.prediction_collection.insert_one(record)
        return str(result.inserted_id)

    def get_latest_prediction(self, pond_id: str) -> Optional[Dict[str, Any]]:
        return self.prediction_collection.find_one(
            {"pond_id": pond_id},
            sort=[("timestamp", -1)]
        )


class PredictionRepository:
    """
    Repository for storing and retrieving disease risk predictions.
    """
    def __init__(self):
        self.db = MongoDB.get_db()
        self.collection = self.db["risk_predictions"]

    def save_prediction(self, record: Dict[str, Any]) -> str:
        record["created_at"] = datetime.utcnow()
        result = self.collection.insert_one(record)
        return str(result.inserted_id)

    def get_all_predictions(self, limit: int = 50):
        data = list(
            self.collection.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
        )
        return data

    def get_predictions_by_pond(self, pond_id: str, limit: int = 50):
        data = list(
            self.collection.find({"pond_id": pond_id}, {"_id": 0})
            .sort("created_at", -1)
            .limit(limit)
        )
        return data