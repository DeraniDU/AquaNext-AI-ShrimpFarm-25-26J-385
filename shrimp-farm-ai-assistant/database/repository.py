"""
Data Repository for MongoDB operations.

This module provides a repository pattern for accessing farm data from MongoDB.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from database.mongodb import get_database, get_mongo_client
from models import (
    WaterQualityData, FeedData, EnergyData, LaborData,
    WaterQualityStatus, AlertLevel
)
from config import USE_MONGODB, MONGO_URI


class DataRepository:
    """
    Repository for accessing farm data from MongoDB.
    
    Provides methods to save and retrieve water quality, feed, energy, and labor data.
    Falls back gracefully if MongoDB is not configured or unavailable.
    """
    
    def __init__(self):
        """Initialize the repository with MongoDB connection."""
        self.client = None
        self.db = None
        self.is_available = False
        
        if not USE_MONGODB or not MONGO_URI:
            return
        
        try:
            self.client = get_mongo_client()
            self.db = get_database(self.client)
            # Test connection
            self.client.admin.command('ping')
            self.is_available = True
        except Exception as e:
            print(f"Warning: Could not connect to MongoDB: {e}")
            self.is_available = False
            if self.client:
                try:
                    self.client.close()
                except Exception:
                    pass
            self.client = None
            self.db = None
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - close connection."""
        self.close()
    
    def close(self):
        """Close MongoDB connection."""
        if self.client:
            try:
                self.client.close()
            except Exception:
                pass
            self.client = None
            self.db = None
    
    def save_water_quality_data(self, data: WaterQualityData) -> bool:
        """
        Save water quality data to MongoDB.
        
        Args:
            data: WaterQualityData object to save
            
        Returns:
            bool: True if saved successfully, False otherwise
        """
        if not self.is_available:
            return False
        
        try:
            collection = self.db.water_quality
            doc = {
                'pond_id': data.pond_id,
                'timestamp': data.timestamp,
                'ph': data.ph,
                'temperature': data.temperature,
                'dissolved_oxygen': data.dissolved_oxygen,
                'salinity': data.salinity,
                'ammonia': data.ammonia,
                'nitrite': data.nitrite,
                'nitrate': data.nitrate,
                'turbidity': data.turbidity,
                'status': data.status.value if hasattr(data.status, 'value') else str(data.status),
                'alerts': data.alerts
            }
            collection.insert_one(doc)
            return True
        except Exception as e:
            print(f"Error saving water quality data: {e}")
            return False
    
    def get_latest_water_quality(self, pond_id: int) -> Optional[WaterQualityData]:
        """
        Get the latest water quality data for a specific pond.
        
        Args:
            pond_id: Pond ID to get data for
            
        Returns:
            WaterQualityData object or None if not found
        """
        if not self.is_available:
            return None
        
        results = self.get_water_quality_data(pond_id=pond_id, limit=1)
        return results[0] if results else None
    
    def get_water_quality_data(
        self, 
        pond_id: Optional[int] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[WaterQualityData]:
        """
        Retrieve water quality data from MongoDB (water_quality_readings collection).
        
        Args:
            pond_id: Optional pond ID to filter by
            start_time: Optional start time for time range
            end_time: Optional end time for time range
            limit: Maximum number of records to return
            
        Returns:
            List of WaterQualityData objects
        """
        if not self.is_available:
            return []
        
        try:
            collection = self.db.water_quality_readings
            query = {}
            
            if pond_id is not None:
                query['pond_id'] = pond_id
            
            if start_time or end_time:
                query['timestamp'] = {}
                if start_time:
                    query['timestamp']['$gte'] = start_time
                if end_time:
                    query['timestamp']['$lte'] = end_time
            
            cursor = collection.find(query).sort('timestamp', -1).limit(limit)
            results = []
            
            for doc in cursor:
                try:
                    status = WaterQualityStatus[doc.get('status', 'FAIR').upper()]
                except (KeyError, AttributeError):
                    status = WaterQualityStatus.FAIR
                
                results.append(WaterQualityData(
                    timestamp=doc.get('timestamp', datetime.now()),
                    pond_id=doc.get('pond_id', 1),
                    ph=doc.get('ph', 7.5),
                    temperature=doc.get('temperature', 28.0),
                    dissolved_oxygen=doc.get('dissolved_oxygen', 5.0),
                    salinity=doc.get('salinity', 20.0),
                    ammonia=doc.get('ammonia', 0.1),
                    nitrite=doc.get('nitrite', 0.05),
                    nitrate=doc.get('nitrate', 5.0),
                    turbidity=doc.get('turbidity', 2.0),
                    status=status,
                    alerts=doc.get('alerts', [])
                ))
            
            return results
        except Exception as e:
            print(f"Error retrieving water quality data: {e}")
            return []
    
    def save_feed_data(self, data: FeedData) -> bool:
        """Save feed data to MongoDB."""
        if not self.is_available:
            return False
        
        try:
            collection = self.db.feed
            doc = {
                'pond_id': data.pond_id,
                'timestamp': data.timestamp,
                'shrimp_count': data.shrimp_count,
                'average_weight': data.average_weight,
                'feed_amount': data.feed_amount,
                'feed_type': data.feed_type,
                'feeding_frequency': data.feeding_frequency,
                'predicted_next_feeding': data.predicted_next_feeding
            }
            collection.insert_one(doc)
            return True
        except Exception as e:
            print(f"Error saving feed data: {e}")
            return False
    
    def get_latest_feed_data(self, pond_id: int) -> Optional[FeedData]:
        """
        Get the latest feed data for a specific pond.
        
        Args:
            pond_id: Pond ID to get data for
            
        Returns:
            FeedData object or None if not found
        """
        if not self.is_available:
            return None
        
        results = self.get_feed_data(pond_id=pond_id, limit=1)
        return results[0] if results else None
    
    def get_feed_data(
        self,
        pond_id: Optional[int] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[FeedData]:
        """Retrieve feed data from MongoDB (feed_readings collection)."""
        if not self.is_available:
            return []
        
        try:
            collection = self.db.feed_readings
            query = {}
            
            if pond_id is not None:
                query['pond_id'] = pond_id
            
            if start_time or end_time:
                query['timestamp'] = {}
                if start_time:
                    query['timestamp']['$gte'] = start_time
                if end_time:
                    query['timestamp']['$lte'] = end_time
            
            cursor = collection.find(query).sort('timestamp', -1).limit(limit)
            results = []
            
            for doc in cursor:
                results.append(FeedData(
                    timestamp=doc.get('timestamp', datetime.now()),
                    pond_id=doc.get('pond_id', 1),
                    shrimp_count=doc.get('shrimp_count', 10000),
                    average_weight=doc.get('average_weight', 10.0),
                    feed_amount=doc.get('feed_amount', 500.0),
                    feed_type=doc.get('feed_type', 'Grower Feed (35% protein)'),
                    feeding_frequency=doc.get('feeding_frequency', 3),
                    predicted_next_feeding=doc.get('predicted_next_feeding', datetime.now() + timedelta(hours=6))
                ))
            
            return results
        except Exception as e:
            print(f"Error retrieving feed data: {e}")
            return []
    
    def save_energy_data(self, data: EnergyData) -> bool:
        """Save energy data to MongoDB."""
        if not self.is_available:
            return False
        
        try:
            collection = self.db.energy_readings
            doc = {
                'pond_id': data.pond_id,
                'timestamp': data.timestamp,
                'aerator_usage': data.aerator_usage,
                'pump_usage': data.pump_usage,
                'heater_usage': data.heater_usage,
                'total_energy': data.total_energy,
                'cost': data.cost,
                'efficiency_score': data.efficiency_score
            }
            collection.insert_one(doc)
            return True
        except Exception as e:
            print(f"Error saving energy data: {e}")
            return False
    
    def get_latest_energy_data(self, pond_id: int) -> Optional[EnergyData]:
        """
        Get the latest energy data for a specific pond.
        
        Args:
            pond_id: Pond ID to get data for
            
        Returns:
            EnergyData object or None if not found
        """
        if not self.is_available:
            return None
        
        results = self.get_energy_data(pond_id=pond_id, limit=1)
        return results[0] if results else None
    
    def get_energy_data(
        self,
        pond_id: Optional[int] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[EnergyData]:
        """Retrieve energy data from MongoDB."""
        if not self.is_available:
            return []
        
        try:
            collection = self.db.energy_readings
            query = {}
            
            if pond_id is not None:
                query['pond_id'] = pond_id
            
            if start_time or end_time:
                query['timestamp'] = {}
                if start_time:
                    query['timestamp']['$gte'] = start_time
                if end_time:
                    query['timestamp']['$lte'] = end_time
            
            cursor = collection.find(query).sort('timestamp', -1).limit(limit)
            results = []
            
            for doc in cursor:
                results.append(EnergyData(
                    timestamp=doc.get('timestamp', datetime.now()),
                    pond_id=doc.get('pond_id', 1),
                    aerator_usage=doc.get('aerator_usage', 20.0),
                    pump_usage=doc.get('pump_usage', 12.0),
                    heater_usage=doc.get('heater_usage', 10.0),
                    total_energy=doc.get('total_energy', 42.0),
                    cost=doc.get('cost', 5.04),
                    efficiency_score=doc.get('efficiency_score', 0.8)
                ))
            
            return results
        except Exception as e:
            print(f"Error retrieving energy data: {e}")
            return []
    
    def save_labor_data(self, data: LaborData) -> bool:
        """Save labor data to MongoDB."""
        if not self.is_available:
            return False
        
        try:
            collection = self.db.labor_readings
            doc = {
                'pond_id': data.pond_id,
                'timestamp': data.timestamp,
                'tasks_completed': data.tasks_completed,
                'time_spent': data.time_spent,
                'worker_count': data.worker_count,
                'efficiency_score': data.efficiency_score,
                'next_tasks': data.next_tasks
            }
            collection.insert_one(doc)
            return True
        except Exception as e:
            print(f"Error saving labor data: {e}")
            return False
    
    def get_latest_labor_data(self, pond_id: int) -> Optional[LaborData]:
        """
        Get the latest labor data for a specific pond.
        
        Args:
            pond_id: Pond ID to get data for
            
        Returns:
            LaborData object or None if not found
        """
        if not self.is_available:
            return None
        
        results = self.get_labor_data(pond_id=pond_id, limit=1)
        return results[0] if results else None
    
    def get_labor_data(
        self,
        pond_id: Optional[int] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[LaborData]:
        """Retrieve labor data from MongoDB."""
        if not self.is_available:
            return []
        
        try:
            collection = self.db.labor_readings
            query = {}
            
            if pond_id is not None:
                query['pond_id'] = pond_id
            
            if start_time or end_time:
                query['timestamp'] = {}
                if start_time:
                    query['timestamp']['$gte'] = start_time
                if end_time:
                    query['timestamp']['$lte'] = end_time
            
            cursor = collection.find(query).sort('timestamp', -1).limit(limit)
            results = []
            
            for doc in cursor:
                results.append(LaborData(
                    timestamp=doc.get('timestamp', datetime.now()),
                    pond_id=doc.get('pond_id', 1),
                    tasks_completed=doc.get('tasks_completed', []),
                    time_spent=doc.get('time_spent', 2.0),
                    worker_count=doc.get('worker_count', 1),
                    efficiency_score=doc.get('efficiency_score', 0.8),
                    next_tasks=doc.get('next_tasks', [])
                ))
            
            return results
        except Exception as e:
            print(f"Error retrieving labor data: {e}")
            return []
    
    def _get_data_from_collection(
        self,
        collection_name: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: Optional[int] = None,
        pond_id: Optional[int] = None,
        data_type: str = "water_quality"
    ) -> List[Any]:
        """
        Helper method to get data from alternative collection names.
        Used for compatibility with different collection naming conventions.
        """
        if not self.is_available:
            return []
        
        try:
            collection = self.db[collection_name]
            query = {}
            if pond_id is not None:
                query['pond_id'] = pond_id
            if start_time or end_time:
                query['timestamp'] = {}
                if start_time:
                    query['timestamp']['$gte'] = start_time
                if end_time:
                    query['timestamp']['$lte'] = end_time
            
            cursor = collection.find(query).sort('timestamp', -1)
            if limit:
                cursor = cursor.limit(limit)
            
            results = []
            for doc in cursor:
                try:
                    if data_type == "water_quality":
                        from models import WaterQualityStatus
                        status = WaterQualityStatus[doc.get('status', 'FAIR').upper()]
                        results.append(WaterQualityData(
                            timestamp=doc.get('timestamp', datetime.now()),
                            pond_id=doc.get('pond_id', 1),
                            ph=doc.get('ph', 7.5),
                            temperature=doc.get('temperature', 28.0),
                            dissolved_oxygen=doc.get('dissolved_oxygen', 5.0),
                            salinity=doc.get('salinity', 20.0),
                            ammonia=doc.get('ammonia', 0.0),
                            nitrite=doc.get('nitrite', 0.0),
                            nitrate=doc.get('nitrate', 0.0),
                            turbidity=doc.get('turbidity', 0.0),
                            status=status,
                            alerts=doc.get('alerts', [])
                        ))
                    elif data_type == "feed":
                        results.append(FeedData(
                            timestamp=doc.get('timestamp', datetime.now()),
                            pond_id=doc.get('pond_id', 1),
                            shrimp_count=doc.get('shrimp_count', 10000),
                            average_weight=doc.get('average_weight', 10.0),
                            feed_amount=doc.get('feed_amount', 500.0),
                            feed_type=doc.get('feed_type', 'Grower Feed (35% protein)'),
                            feeding_frequency=doc.get('feeding_frequency', 3),
                            predicted_next_feeding=doc.get('predicted_next_feeding')
                        ))
                    elif data_type == "energy":
                        results.append(EnergyData(
                            timestamp=doc.get('timestamp', datetime.now()),
                            pond_id=doc.get('pond_id', 1),
                            aerator_usage=doc.get('aerator_usage', 20.0),
                            pump_usage=doc.get('pump_usage', 12.0),
                            heater_usage=doc.get('heater_usage', 10.0),
                            total_energy=doc.get('total_energy', 20.0),
                            cost=doc.get('cost', 2.0),
                            efficiency_score=doc.get('efficiency_score', 0.8)
                        ))
                    elif data_type == "labor":
                        results.append(LaborData(
                            timestamp=doc.get('timestamp', datetime.now()),
                            pond_id=doc.get('pond_id', 1),
                            tasks_completed=doc.get('tasks_completed', []) or [],
                            time_spent=doc.get('time_spent', 4.0),
                            worker_count=doc.get('worker_count', 2),
                            efficiency_score=doc.get('efficiency_score', 0.8),
                            next_tasks=doc.get('next_tasks', []) or []
                        ))
                except Exception as e:
                    print(f"Error parsing document from {collection_name}: {e}")
                    continue
            
            return results
        except Exception as e:
            print(f"Error reading from collection {collection_name}: {e}")
            return []
    
    def get_historical_snapshots(
        self,
        limit: int = 30,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get historical snapshots grouped by timestamp for charting.
        
        Groups data by day (daily snapshots) to create snapshots for weekly chart views.
        Returns data in the same format as JSON snapshots:
        {
            "timestamp": "...",
            "water_quality": [...],
            "feed": [...],
            "energy": [...],
            "labor": [...]
        }
        
        Args:
            limit: Maximum number of snapshots to return
            start_time: Optional start time filter
            end_time: Optional end time filter
            
        Returns:
            List of snapshot dictionaries
        """
        if not self.is_available:
            return []
        
        try:
            from collections import defaultdict
            
            def _latest_per_pond(items: List[Any]) -> List[Any]:
                """
                Reduce a list of per-pond readings to the latest reading per pond.
                
                Historical chart snapshots should have one reading per pond per day.
                Without this, hourly sample data causes "daily" totals to blow up
                (e.g., summing 24 readings in a day).
                """
                latest: Dict[int, Any] = {}
                for item in items:
                    pond_id = getattr(item, "pond_id", None)
                    ts = getattr(item, "timestamp", None)
                    if pond_id is None:
                        continue
                    current = latest.get(int(pond_id))
                    if current is None:
                        latest[int(pond_id)] = item
                        continue
                    cur_ts = getattr(current, "timestamp", None)
                    if ts is not None and (cur_ts is None or ts > cur_ts):
                        latest[int(pond_id)] = item
                return list(latest.values())
            
            # When a time range is specified, get ALL records in that range (no limit)
            # Otherwise, use a reasonable limit to avoid memory issues
            # For a month of data with multiple readings per day, we need a much higher limit
            data_limit = 50000 if (start_time or end_time) else 10000
            
            # Get all data from all collections
            # Check both collection name variants for compatibility
            water_quality_all = []
            feed_all = []
            energy_all = []
            labor_all = []
            
            # Read only from _readings collections
            water_quality_all = self.get_water_quality_data(
                start_time=start_time,
                end_time=end_time,
                limit=data_limit
            )
            feed_all = self.get_feed_data(
                start_time=start_time,
                end_time=end_time,
                limit=data_limit
            )
            energy_all = self.get_energy_data(
                start_time=start_time,
                end_time=end_time,
                limit=data_limit
            )
            labor_all = self.get_labor_data(
                start_time=start_time,
                end_time=end_time,
                limit=data_limit
            )
            
            print(f"[DEBUG] _readings collections - water_quality_readings={len(water_quality_all)}, feed_readings={len(feed_all)}, energy_readings={len(energy_all)}, labor_readings={len(labor_all)}")
            if start_time:
                print(f"[DEBUG] Time range: {start_time} to {end_time or 'now'}")
            
            # Group data by day (daily snapshots for weekly view)
            # Round timestamps to start of day for grouping
            def round_to_day(dt: datetime) -> datetime:
                return dt.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Group by rounded timestamp (day)
            grouped = defaultdict(lambda: {
                "water_quality": [],
                "feed": [],
                "energy": [],
                "labor": []
            })
            
            # Collect unique timestamps for debugging
            unique_wq_days = set()
            unique_feed_days = set()
            
            for wq in water_quality_all:
                key = round_to_day(wq.timestamp)
                unique_wq_days.add(key)
                grouped[key]["water_quality"].append(wq)
            
            for f in feed_all:
                key = round_to_day(f.timestamp)
                unique_feed_days.add(key)
                grouped[key]["feed"].append(f)
            
            for e in energy_all:
                key = round_to_day(e.timestamp)
                grouped[key]["energy"].append(e)
            
            for l in labor_all:
                key = round_to_day(l.timestamp)
                grouped[key]["labor"].append(l)
            
            print(f"[DEBUG] Unique days in data: water_quality={len(unique_wq_days)}, feed={len(unique_feed_days)}, total_groups={len(grouped)}")
            if unique_wq_days:
                sorted_days = sorted(unique_wq_days)
                print(f"[DEBUG] Water quality date range: {sorted_days[0]} to {sorted_days[-1]}")
            if unique_feed_days:
                sorted_days = sorted(unique_feed_days)
                print(f"[DEBUG] Feed date range: {sorted_days[0]} to {sorted_days[-1]}")
            
            # Convert to snapshot format
            snapshots = []
            for ts, data in grouped.items():
                # Only create snapshot if we have at least some data
                if data["water_quality"] or data["feed"] or data["energy"] or data["labor"]:
                    # Keep only the latest reading per pond for the day
                    wq_day = _latest_per_pond(data["water_quality"])
                    feed_day = _latest_per_pond(data["feed"])
                    energy_day = _latest_per_pond(data["energy"])
                    labor_day = _latest_per_pond(data["labor"])
                    snapshot = {
                        "timestamp": ts.isoformat(),
                        "water_quality": [w.model_dump(mode="json") for w in wq_day],
                        "feed": [f.model_dump(mode="json") for f in feed_day],
                        "energy": [e.model_dump(mode="json") for e in energy_day],
                        "labor": [l.model_dump(mode="json") for l in labor_day]
                    }
                    snapshots.append(snapshot)
            
            print(f"[DEBUG] Created {len(snapshots)} snapshots from grouped data")
            if snapshots:
                snapshots_sorted = sorted(snapshots, key=lambda x: x.get("timestamp", ""))
                print(f"[DEBUG] Snapshot date range: {snapshots_sorted[0]['timestamp']} to {snapshots_sorted[-1]['timestamp']}")
                print(f"[DEBUG] Snapshot dates: {[s['timestamp'][:10] for s in snapshots_sorted]}")
            
            # Sort chronologically (oldest first) for chart display
            snapshots.sort(key=lambda x: x.get("timestamp", ""))
            
            # When a time range is specified, return ALL snapshots within that range
            # The limit parameter is used to control how many records to fetch from DB, not to truncate after grouping
            # Only apply limit when no time range is specified (to prevent memory issues on large datasets)
            if start_time is None and end_time is None:
                # No time range specified - apply limit to most recent snapshots
                if limit > 0:
                    snapshots = snapshots[-limit:]
            # else: time range specified - return all snapshots in range (already filtered by start_time/end_time query)
            
            print(f"[DEBUG] Returning {len(snapshots)} snapshots after limit logic")
            return snapshots
            
        except Exception as e:
            print(f"Error retrieving historical snapshots: {e}")
            import traceback
            traceback.print_exc()
            return []




            