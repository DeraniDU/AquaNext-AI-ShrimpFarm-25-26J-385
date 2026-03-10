from typing import Optional, Dict, Any, List
from .mongodb import MongoDB


class Repository:
    def __init__(self):
        self.db = MongoDB.get_db()

        # expected collections
        self.behavior_collection = self.db["behavior_live"]
        self.feed_collection = self.db["feeding_data"]
        self.env_collection = self.db["environment_data"]
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
        return self.feed_collection.find_one(
            {"pond_id": pond_id},
            sort=[("timestamp", -1)]
        )

    # ---------- environment ----------
    def get_latest_environment(self, pond_id: str) -> Optional[Dict[str, Any]]:
        return self.env_collection.find_one(
            {"pond_id": pond_id},
            sort=[("timestamp", -1)]
        )

    # ---------- prediction ----------
    def save_prediction(self, record: Dict[str, Any]) -> str:
        result = self.prediction_collection.insert_one(record)
        return str(result.inserted_id)

    def get_latest_prediction(self, pond_id: str) -> Optional[Dict[str, Any]]:
        return self.prediction_collection.find_one(
            {"pond_id": pond_id},
            sort=[("timestamp", -1)]
        )


from datetime import datetime
from typing import Dict, Any

from .mongodb import MongoDB


class PredictionRepository:
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
