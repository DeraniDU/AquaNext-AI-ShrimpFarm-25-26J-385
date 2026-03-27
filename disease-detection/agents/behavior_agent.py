from typing import Dict, Any


class BehaviorAgent:
    def process_behavior_input(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "pond_id": payload["pond_id"],
            "timestamp": payload["timestamp"],
            "activity_index": float(payload["activity_index"]),
            "activity_std": float(payload.get("activity_std", 0.0)),
            "drop_ratio": float(payload.get("drop_ratio", 1.0)),
            "abnormal": int(payload.get("abnormal", 0)),
        }