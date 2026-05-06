from typing import Optional, Dict, Any
from database.repository import Repository


class DataFusionService:
    def __init__(self, repository: Repository):
        self.repository = repository

    def get_latest_fused_input(self, pond_id: str) -> Optional[Dict[str, Any]]:
        behavior = self.repository.get_latest_behavior(pond_id)
        feed = self.repository.get_latest_feed(pond_id)
        env = self.repository.get_latest_environment(pond_id)

        if not behavior or not feed or not env:
            return None

        fused = {
            "pond_id": pond_id,
            "timestamp": behavior.get("timestamp"),

            # behavior features
            "activity_mean": float(behavior.get("activity_index", 0.0)),
            "activity_std": float(behavior.get("activity_std", 0.0)),
            "drop_ratio_min": float(behavior.get("drop_ratio", 1.0)),
            "abnormal_rate": float(behavior.get("abnormal", 0.0)),

            # feeding features
            "feed_amount": float(feed.get("feed_amount", 0.0)),
            "feed_response": float(feed.get("feed_response", 0.0)),

            # environment features
            "DO": float(env.get("DO", 0.0)),
            "temp": float(env.get("temp", 0.0)),
            "pH": float(env.get("pH", 0.0)),
            "salinity": float(env.get("salinity", 0.0)),
        }

        return {
            "behavior": behavior,
            "feeding": feed,
            "environment": env,
            "model_input": fused,
        }
