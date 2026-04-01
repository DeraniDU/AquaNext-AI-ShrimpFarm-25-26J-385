"""
Data Repository for MongoDB operations.

This module provides a repository pattern for accessing farm data from MongoDB.
"""

from typing import List, Optional, Dict, Any, Set, Tuple
from datetime import datetime, timedelta, time as dt_time, timezone
from database.mongodb import get_database, get_mongo_client
from models import (
    WaterQualityData, FeedData, EnergyData, LaborData,
    WaterQualityStatus, AlertLevel
)
from config import USE_MONGODB, MONGO_URI


def _pond_ids_for_mongo_in(pond_ids: List[int]) -> List[Any]:
    """MongoDB matches $in types strictly; include int, str, and float (BSON double)."""
    out: List[Any] = []
    seen: Set[Any] = set()
    for p in pond_ids:
        for v in (p, str(p), float(p)):
            if v not in seen:
                seen.add(v)
                out.append(v)
    return out


def _normalize_pond_id(value: Any, allowed: Set[int]) -> Optional[int]:
    try:
        if value is None:
            return None
        # BSON Int64, Decimal128-as-int paths
        pid = int(float(value))
    except (TypeError, ValueError):
        return None
    return pid if pid in allowed else None


def _extract_pond_id_from_doc(doc: Dict[str, Any], allowed: Set[int]) -> Optional[int]:
    """Resolve pond id from common schema variants (flat IoT docs, camelCase, etc.)."""
    for key in ("pond_id", "pond", "pondId", "pondID", "pond_number", "pondNumber"):
        if key in doc:
            pid = _normalize_pond_id(doc.get(key), allowed)
            if pid is not None:
                return pid
    return None


def _water_pond_clause(pond_mongo_in: List[Any]) -> Dict[str, Any]:
    return {
        "$or": [
            {"pond_id": {"$in": pond_mongo_in}},
            {"pond": {"$in": pond_mongo_in}},
            {"pondId": {"$in": pond_mongo_in}},
            {"pondID": {"$in": pond_mongo_in}},
            {"pond_number": {"$in": pond_mongo_in}},
            {"pondNumber": {"$in": pond_mongo_in}},
        ]
    }


def _to_float_metric(raw: Any, default: float = 0.0) -> float:
    if raw is None:
        return default
    if isinstance(raw, bool):
        return default
    if isinstance(raw, (int, float)):
        return float(raw)
    try:
        from bson.decimal128 import Decimal128

        if isinstance(raw, Decimal128):
            return float(raw.to_decimal())
    except Exception:
        pass
    try:
        return float(raw)
    except (TypeError, ValueError):
        return default


def _doc_metric(doc: Dict[str, Any], keys: tuple) -> float:
    for k in keys:
        if k in doc and doc.get(k) is not None:
            return _to_float_metric(doc.get(k), 0.0)
    return 0.0


def _coerce_analytics_datetime(raw: Any) -> Optional[datetime]:
    if raw is None:
        return None
    if isinstance(raw, datetime):
        return raw
    if isinstance(raw, (int, float)):
        try:
            return datetime.utcfromtimestamp(float(raw))
        except (OSError, OverflowError, ValueError):
            return None
    if isinstance(raw, str):
        s = raw.strip()
        if not s:
            return None
        if s.endswith("Z") and "+" not in s[-6:]:
            s = s[:-1] + "+00:00"
        try:
            return datetime.fromisoformat(s)
        except ValueError:
            pass
        for fmt, n in (("%Y-%m-%d %H:%M:%S", 19), ("%Y-%m-%dT%H:%M:%S", 19), ("%Y-%m-%d", 10)):
            try:
                return datetime.strptime(s[:n], fmt)
            except ValueError:
                continue
    return None


def _analytics_doc_timestamp(doc: Dict[str, Any]) -> Optional[datetime]:
    for key in ("timestamp", "recorded_at", "time", "created_at"):
        ts = _coerce_analytics_datetime(doc.get(key))
        if ts is not None:
            return ts
    return None


# Order matters: prefer true sensor/event fields over ingest metadata when multiple fall in-window.
_TIME_KEYS_IN_ORDER = (
    "timestamp",
    "recorded_at",
    "reading_time",
    "sample_time",
    "measured_at",
    "time",
    "datetime",
    "date",
    "ts",
    "event_time",
    "eventTime",
    "created_at",
    "updated_at",
)


def _pick_event_time_in_window(
    doc: Dict[str, Any], start_w: datetime, end: datetime
) -> Optional[datetime]:
    """
    Choose a single naive-UTC instant in [start_w, end] from common BSON/string time fields.
    Avoids using a stale ``timestamp`` when ``date``/``reading_time`` is the real sample time.
    """
    best: Optional[Tuple[int, datetime]] = None
    for pri, key in enumerate(_TIME_KEYS_IN_ORDER):
        ts = _coerce_analytics_datetime(doc.get(key))
        if ts is None:
            continue
        tn = _naive_utc(ts)
        if not (start_w <= tn <= end):
            continue
        if best is None or pri < best[0]:
            best = (pri, tn)
    return None if best is None else best[1]


def _water_time_in_window_clause(start_w: datetime, end: datetime) -> Dict[str, Any]:
    """Match documents whose event time may live on different field names (like feed vs IoT)."""
    return {
        "$or": [
            {"timestamp": {"$gte": start_w, "$lte": end}},
            {"recorded_at": {"$gte": start_w, "$lte": end}},
            {"reading_time": {"$gte": start_w, "$lte": end}},
            {"sample_time": {"$gte": start_w, "$lte": end}},
            {"measured_at": {"$gte": start_w, "$lte": end}},
            {"time": {"$gte": start_w, "$lte": end}},
            {"datetime": {"$gte": start_w, "$lte": end}},
            {"date": {"$gte": start_w, "$lte": end}},
            {"ts": {"$gte": start_w, "$lte": end}},
            {"event_time": {"$gte": start_w, "$lte": end}},
            {"eventTime": {"$gte": start_w, "$lte": end}},
            {"created_at": {"$gte": start_w, "$lte": end}},
            {"updated_at": {"$gte": start_w, "$lte": end}},
        ]
    }


def _naive_utc(ts: datetime) -> datetime:
    if ts.tzinfo is None:
        return ts
    return ts.astimezone(timezone.utc).replace(tzinfo=None)


class DataRepository:
    """
    Repository for accessing farm data from MongoDB.
    
    Shrimp-farm-ai-assistant uses only MongoDB for data. When USE_MONGODB is true,
    MONGO_URI must be set and the connection must succeed; otherwise the repository raises.
    """

    def __init__(self):
        """Initialize the repository with MongoDB connection.

        In local/dev setups we want the app to keep working even when MongoDB
        is not configured or unavailable, so this constructor never raises.
        Instead, it marks the repository as unavailable and callers are
        expected to fall back to simulated data.
        """
        self.client = None
        self.db = None
        self.is_available = False

        if not USE_MONGODB:
            # MongoDB disabled via config/env – repository is simply unavailable.
            return

        if not MONGO_URI or not MONGO_URI.strip():
            # Missing URI: log-style error via print, but do not crash the app.
            print(
                "WARNING: MONGO_URI is not set but USE_MONGODB is true. "
                "MongoDB features will be disabled (using simulated data only)."
            )
            return

        try:
            self.client = get_mongo_client()
            self.db = get_database(self.client)
            self.client.admin.command("ping")
            self.is_available = True
        except Exception as e:
            # Connection failed – log and fall back to simulated data.
            print(
                "WARNING: Could not connect to MongoDB. "
                "MongoDB features will be disabled (using simulated data only). "
                f"Error: {e}"
            )
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
        """Save feed data to MongoDB (feed_readings collection, same as get_feed_data reads)."""
        if not self.is_available:
            return False
        
        try:
            collection = self.db.feed_readings
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
                    # Default ~42 kWh * 65 LKR/kWh when legacy USD-scale docs missing
                    cost=float(doc.get('cost', 42 * 65)),
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
                            cost=float(doc.get('cost', 20 * 65)),
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

    def get_hourly_snapshots(
        self,
        hours: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Get historical snapshots grouped by hour for 24h charting.
        """
        if not self.is_available:
            return []
        
        try:
            from collections import defaultdict
            
            def _latest_per_pond(items: List[Any]) -> List[Any]:
                latest: Dict[int, Any] = {}
                for item in items:
                    pond_id = getattr(item, "pond_id", None)
                    ts = getattr(item, "timestamp", None)
                    if pond_id is None:
                        # Sometimes pydantic models need dict access
                        if hasattr(item, "model_dump"):
                            try:
                                pond_id = item.pond_id
                                ts = item.timestamp
                            except:
                                pass
                    if pond_id is None:
                        continue
                        
                    current = latest.get(int(pond_id))
                    if current is None:
                        latest[int(pond_id)] = item
                        continue
                    cur_ts = getattr(current, "timestamp", None)
                    if hasattr(current, "model_dump") and cur_ts is None:
                        try:
                            cur_ts = current.timestamp
                        except:
                            pass
                            
                    if ts is not None and (cur_ts is None or ts > cur_ts):
                        latest[int(pond_id)] = item
                return list(latest.values())
            
            # Calculate relative offset from max available data instead of utcnow
            # If the database hasn't been updated in a few days, using utcnow() returns nothing
            data_limit = 50000
            
            water_quality_all = self.get_water_quality_data(limit=data_limit)
            feed_all = self.get_feed_data(limit=data_limit)
            energy_all = self.get_energy_data(limit=data_limit)
            labor_all = self.get_labor_data(limit=data_limit)

            # Find the max timestamp across all collections
            max_ts = None
            if water_quality_all:
                max_ts = max((max_ts, max(x.timestamp for x in water_quality_all))) if max_ts else max(x.timestamp for x in water_quality_all)
            if feed_all:
                max_ts = max((max_ts, max(x.timestamp for x in feed_all))) if max_ts else max(x.timestamp for x in feed_all)
            if energy_all:
                max_ts = max((max_ts, max(x.timestamp for x in energy_all))) if max_ts else max(x.timestamp for x in energy_all)
            if labor_all:
                max_ts = max((max_ts, max(x.timestamp for x in labor_all))) if max_ts else max(x.timestamp for x in labor_all)

            if not max_ts:
                max_ts = datetime.utcnow()
            
            start_time = max_ts - timedelta(hours=hours)
            
            # Filter by time manually if the query didn't catch it correctly due to timestamp formats
            water_quality_filtered = [x for x in water_quality_all if x.timestamp >= start_time]
            feed_filtered = [x for x in feed_all if x.timestamp >= start_time]
            energy_filtered = [x for x in energy_all if x.timestamp >= start_time]
            labor_filtered = [x for x in labor_all if x.timestamp >= start_time]
            
            def round_to_hour(dt: datetime) -> datetime:
                return dt.replace(minute=0, second=0, microsecond=0)
            
            grouped = defaultdict(lambda: {
                "water_quality": [],
                "feed": [],
                "energy": [],
                "labor": []
            })
            
            for wq in water_quality_filtered:
                if getattr(wq, "pond_id", None) is not None:
                    grouped[round_to_hour(wq.timestamp)]["water_quality"].append(wq)
            for f in feed_filtered:
                if getattr(f, "pond_id", None) is not None:
                    grouped[round_to_hour(f.timestamp)]["feed"].append(f)
            for e in energy_filtered:
                if getattr(e, "pond_id", None) is not None:
                    grouped[round_to_hour(e.timestamp)]["energy"].append(e)
            for l in labor_filtered:
                if getattr(l, "pond_id", None) is not None:
                    grouped[round_to_hour(l.timestamp)]["labor"].append(l)
            
            # Convert to snapshot format
            snapshots = []
            for ts, data in grouped.items():
                if data["water_quality"] or data["feed"] or data["energy"] or data["labor"]:
                    wq_hour = _latest_per_pond(data["water_quality"])
                    feed_hour = _latest_per_pond(data["feed"])
                    energy_hour = _latest_per_pond(data["energy"])
                    labor_hour = _latest_per_pond(data["labor"])
                    snapshot = {
                        "timestamp": ts.isoformat(),
                        "water_quality": [w.model_dump(mode="json") if hasattr(w, 'model_dump') else dict(w) for w in wq_hour],
                        "feed": [f.model_dump(mode="json") if hasattr(f, 'model_dump') else dict(f) for f in feed_hour],
                        "energy": [e.model_dump(mode="json") if hasattr(e, 'model_dump') else dict(e) for e in energy_hour],
                        "labor": [l.model_dump(mode="json") if hasattr(l, 'model_dump') else dict(l) for l in labor_hour]
                    }
                    snapshots.append(snapshot)
            
            snapshots.sort(key=lambda x: x.get("timestamp", ""))
            return snapshots
            
        except Exception as e:
            print(f"Error retrieving hourly snapshots: {e}")
            import traceback
            traceback.print_exc()
            return []

    def get_analytics_charts_from_readings(
        self,
        pond_ids: List[int],
        hours: int = 24,
        feed_days: int = 7,
    ) -> Dict[str, Any]:
        """
        Build chart-ready series from MongoDB (no agents).

        - Dissolved oxygen / ammonia: mean per clock hour (0–23 UTC) in the last `hours` window.
          Reads both ``water_quality_readings`` (IoT / samples) and ``water_quality`` (same schema as
          save_water_quality_data) so orchestrator saves are not ignored.
        - Feed: total kg per calendar day for the last `feed_days` days (amount * frequency / 1000).
        - Energy: sum of total_energy per clock hour across all ponds in the window.
        """
        from collections import defaultdict

        weekday_short = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
        hours24 = [f"{h:02d}:00" for h in range(24)]

        base_empty = {
            "source": "none",
            "has_any_data": False,
            "series_sources": {
                "dissolved_oxygen": False,
                "ammonia": False,
                "feed": False,
                "energy": False,
            },
            "hours24": hours24,
            "pond_ids": list(pond_ids),
            "dissolved_oxygen_by_pond": {str(p): [None] * 24 for p in pond_ids},
            "ammonia_by_pond": {str(p): [None] * 24 for p in pond_ids},
            "feed_7d": {
                "labels": list(weekday_short),
                "values_kg": [0.0] * feed_days,
            },
            "energy_kwh_24h": [0.0] * 24,
        }

        if not self.is_available or not pond_ids:
            return base_empty

        end = datetime.utcnow()
        start_w = end - timedelta(hours=hours)
        end_date = end.date()
        day_keys: List = [end_date - timedelta(days=(feed_days - 1 - i)) for i in range(feed_days)]
        feed_labels = [weekday_short[d.weekday()] for d in day_keys]
        start_f = datetime.combine(day_keys[0], dt_time.min)

        do_vals: Dict[int, Dict[int, List[float]]] = defaultdict(lambda: defaultdict(list))
        nh_vals: Dict[int, Dict[int, List[float]]] = defaultdict(lambda: defaultdict(list))

        pond_set = set(pond_ids)
        pond_mongo_in = _pond_ids_for_mongo_in(pond_ids)

        def _ingest_water_collection(coll_name: str) -> None:
            do_keys = (
                "dissolved_oxygen",
                "dissolvedOxygen",
                "do",
                "DO",
                "dissolved_oxygen_mg_l",
            )
            nh_keys = ("ammonia", "nh3", "NH3", "total_ammonia", "tAN")

            def _append(pid: int, hour: int, src: Dict[str, Any]) -> None:
                do_vals[pid][hour].append(_doc_metric(src, do_keys))
                nh_vals[pid][hour].append(_doc_metric(src, nh_keys))

            def _ingest_doc(doc: Dict[str, Any]) -> None:
                wq = doc.get("water_quality")
                if isinstance(wq, list) and len(wq) > 0:
                    for sub in wq:
                        if not isinstance(sub, dict):
                            continue
                        merged = {**doc, **sub}
                        ts_n = _pick_event_time_in_window(merged, start_w, end)
                        if ts_n is None:
                            continue
                        pid = _extract_pond_id_from_doc(sub, pond_set) or _extract_pond_id_from_doc(
                            doc, pond_set
                        )
                        if pid is None:
                            continue
                        _append(pid, ts_n.hour, merged)
                    return
                ts_n = _pick_event_time_in_window(doc, start_w, end)
                if ts_n is None:
                    return
                pid = _extract_pond_id_from_doc(doc, pond_set)
                if pid is None:
                    return
                _append(pid, ts_n.hour, doc)

            try:
                coll = self.db[coll_name]
                pond_q = _water_pond_clause(pond_mongo_in)
                tw = _water_time_in_window_clause(start_w, end)
                # Pond + any known time field in window (not only ``timestamp``).
                q_idx = {"$and": [pond_q, tw]}
                docs = list(coll.find(q_idx).sort("timestamp", 1).limit(50_000))
                # Recent rows for those ponds (string times may miss BSON range $or).
                if not docs:
                    docs = list(coll.find(pond_q).sort("timestamp", -1).limit(50_000))
                # Time window on any known field; resolve pond in Python.
                if not docs:
                    docs = list(coll.find(tw).sort("timestamp", 1).limit(50_000))
                for doc in docs:
                    _ingest_doc(doc)
            except Exception as e:
                print(f"[analytics] {coll_name}: {e}")

        # Readings collection (e.g. generate_all_samples / IoT); also legacy/orchestrator collection.
        _ingest_water_collection("water_quality_readings")
        _ingest_water_collection("water_quality")

        def hourly_avg(acc: Dict[int, List[float]]) -> List[Optional[float]]:
            out: List[Optional[float]] = []
            for h in range(24):
                xs = acc.get(h, [])
                if not xs:
                    out.append(None)
                else:
                    out.append(round(sum(xs) / len(xs), 4))
            return out

        do_by_pond = {str(p): hourly_avg(do_vals[p]) for p in pond_ids}
        nh_by_pond = {str(p): hourly_avg(nh_vals[p]) for p in pond_ids}

        has_do = any(v is not None for p in pond_ids for v in do_by_pond[str(p)])
        has_nh3 = any(v is not None for p in pond_ids for v in nh_by_pond[str(p)])
        has_water = has_do or has_nh3

        feed_totals: Dict[Any, float] = defaultdict(float)
        try:
            fc = self.db.feed_readings
            fq = {"timestamp": {"$gte": start_f, "$lte": end}}
            for doc in fc.find(fq).sort("timestamp", 1).limit(50_000):
                ts = doc.get("timestamp")
                if ts is None:
                    continue
                day = ts.date() if hasattr(ts, "date") else None
                if day is None:
                    continue
                amt = float(doc.get("feed_amount", 0))
                freq = doc.get("feeding_frequency", 1)
                try:
                    freq_f = float(freq) if freq is not None else 1.0
                except (TypeError, ValueError):
                    freq_f = 1.0
                feed_totals[day] += amt * freq_f / 1000.0
        except Exception as e:
            print(f"[analytics] feed_readings: {e}")

        feed_vals = [round(float(feed_totals.get(d, 0.0)), 4) for d in day_keys]
        has_feed = sum(feed_vals) > 0

        energy_hour: Dict[int, float] = defaultdict(float)
        try:
            ec = self.db.energy_readings
            eq = {"timestamp": {"$gte": start_w, "$lte": end}}
            for doc in ec.find(eq).sort("timestamp", 1).limit(50_000):
                ts = doc.get("timestamp")
                if ts is None:
                    continue
                h = getattr(ts, "hour", None)
                if h is None:
                    continue
                energy_hour[h] += float(doc.get("total_energy", 0))
        except Exception as e:
            print(f"[analytics] energy_readings: {e}")

        energy_24 = [round(float(energy_hour.get(h, 0.0)), 4) for h in range(24)]
        has_energy = sum(energy_24) > 0

        return {
            "source": "mongodb",
            "has_any_data": bool(has_water or has_feed or has_energy),
            "series_sources": {
                "dissolved_oxygen": has_do,
                "ammonia": has_nh3,
                "feed": has_feed,
                "energy": has_energy,
            },
            "hours24": hours24,
            "pond_ids": list(pond_ids),
            "dissolved_oxygen_by_pond": do_by_pond,
            "ammonia_by_pond": nh_by_pond,
            "feed_7d": {"labels": feed_labels, "values_kg": feed_vals},
            "energy_kwh_24h": energy_24,
        }

