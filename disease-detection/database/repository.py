from typing import Optional, Dict, Any, List
from datetime import datetime

from pymongo.errors import PyMongoError

from database.mongodb import MongoDB
from utils.behavior_store import pond_behavior_store
from utils.feeding_store import pond_feeding_store
from utils.prediction_store import pond_prediction_store
from utils.dummy_data import get_dummy_environment


class Repository:
    """
    Repository for accessing and managing disease detection data.

    Behavior, environment, and predictions use MongoDB.
    Feeding data uses in-memory dummy storage for demo purposes.
    """

    def __init__(self):
        self.db = None
        self.behavior_collection = None
        self.env_collection = None
        self.prediction_collection = None

        try:
            self.db = MongoDB.get_db()
            self.behavior_collection = self.db["behavior_live"]
            self.env_collection = self.db["environment_data"]
            self.prediction_collection = self.db["risk_predictions"]
        except Exception:
            # DB is optional; service can run with in-memory + dummy fallbacks.
            self.db = None

    # ---------- behavior ----------
    def save_behavior_point(self, record: Dict[str, Any]) -> str:
        # always store in memory for realtime usage
        try:
            pond_behavior_store[record["pond_id"]].append(record)
        except Exception:
            pass

        if not self.behavior_collection:
            return f"mem-{len(pond_behavior_store[record['pond_id']])}"

        result = self.behavior_collection.insert_one(record)
        return str(result.inserted_id)

    def get_latest_behavior(self, pond_id: str) -> Optional[Dict[str, Any]]:
        # Prefer DB when available, but fall back to in-memory realtime points.
        if self.behavior_collection is not None:
            try:
                doc = self.behavior_collection.find_one(
                    {"pond_id": pond_id},
                    sort=[("timestamp", -1)]
                )
                if doc:
                    return doc
            except PyMongoError:
                pass

        points = pond_behavior_store.get(pond_id)
        if not points:
            return None
        return list(points)[-1]

    def get_recent_behavior(self, pond_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        if self.behavior_collection is not None:
            try:
                return list(
                    self.behavior_collection.find(
                        {"pond_id": pond_id},
                        {"_id": 0}
                    ).sort("timestamp", -1).limit(limit)
                )
            except PyMongoError:
                pass

        points = pond_behavior_store.get(pond_id, [])
        return list(points)[-limit:][::-1]

    # ---------- feeding (dummy in-memory) ----------
    def save_feed_point(self, record: Dict[str, Any]) -> str:
        dummy_record = {
            "pond_id": record["pond_id"],
            "timestamp": record["timestamp"],
            "feed_amount": float(record["feed_amount"]),
            "feed_response": float(record["feed_response"]),
            "source": "dummy-memory",
        }
        pond_feeding_store[record["pond_id"]].append(dummy_record)
        return f"dummy-{len(pond_feeding_store[record['pond_id']])}"

    def get_latest_feed(self, pond_id: str) -> Optional[Dict[str, Any]]:
        points = pond_feeding_store.get(pond_id)
        if not points:
            return None
        return list(points)[-1]

    def get_recent_feed(self, pond_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        points = pond_feeding_store.get(pond_id, [])
        return list(points)[-limit:]

    # ---------- environment ----------
    def get_latest_environment(self, pond_id: str) -> Optional[Dict[str, Any]]:
        if self.env_collection is not None:
            try:
                doc = self.env_collection.find_one(
                    {"pond_id": pond_id},
                    sort=[("timestamp", -1)]
                )
                if doc:
                    return doc
            except PyMongoError:
                pass

        # DB unavailable -> dummy environment
        return get_dummy_environment(pond_id)

    # ---------- prediction ----------
    def save_prediction(self, record: Dict[str, Any]) -> str:
        try:
            pond_prediction_store[record["pond_id"]].append(record)
        except Exception:
            pass

        if not self.prediction_collection:
            return f"mem-{len(pond_prediction_store[record['pond_id']])}"

        result = self.prediction_collection.insert_one(record)
        return str(result.inserted_id)

    def get_latest_prediction(self, pond_id: str) -> Optional[Dict[str, Any]]:
        if self.prediction_collection is not None:
            try:
                doc = self.prediction_collection.find_one(
                    {"pond_id": pond_id},
                    sort=[("timestamp", -1)]
                )
                if doc:
                    return doc
            except PyMongoError:
                pass

        points = pond_prediction_store.get(pond_id)
        if not points:
            return None
        return list(points)[-1]


class PredictionRepository:
    def __init__(self):
        self.db = None
        self.collection = None
        try:
            self.db = MongoDB.get_db()
            self.collection = self.db["risk_predictions"]
        except Exception:
            self.db = None

    def save_prediction(self, record: Dict[str, Any]) -> str:
        record["created_at"] = datetime.utcnow()
        if not self.collection:
            pond_prediction_store[record.get("pond_id", "unknown")].append(record)
            return "mem"
        result = self.collection.insert_one(record)
        return str(result.inserted_id)

    def get_all_predictions(self, limit: int = 50):
        if not self.collection:
            # flatten in-memory store
            all_items = []
            for _pond_id, items in pond_prediction_store.items():
                all_items.extend(list(items))
            all_items.sort(key=lambda r: str(r.get("created_at", r.get("timestamp", ""))), reverse=True)
            return all_items[:limit]

        data = list(self.collection.find({}, {"_id": 0}).sort("created_at", -1).limit(limit))
        return data

    def get_predictions_by_pond(self, pond_id: str, limit: int = 50):
        if not self.collection:
            items = list(pond_prediction_store.get(pond_id, []))
            items.sort(key=lambda r: str(r.get("created_at", r.get("timestamp", ""))), reverse=True)
            # drop _id-like fields if any
            return [{k: v for k, v in rec.items() if k != "_id"} for rec in items[:limit]]

        data = list(
            self.collection.find({"pond_id": pond_id}, {"_id": 0})
            .sort("created_at", -1)
            .limit(limit)
        )
        return data