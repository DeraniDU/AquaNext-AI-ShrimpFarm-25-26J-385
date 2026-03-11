from __future__ import annotations

from datetime import datetime
from typing import Any, Dict
import math


def _pond_seed(pond_id: str) -> int:
    # stable small seed from pond id string
    return sum(ord(c) for c in pond_id) % 997


def get_dummy_environment(pond_id: str) -> Dict[str, Any]:
    """
    Deterministic dummy environment data (used when DB is unavailable).
    Returns schema compatible with DataFusionService expectations.
    """
    s = _pond_seed(pond_id)
    t = datetime.utcnow().timestamp()

    # Create gentle daily-ish oscillations per pond
    temp = 28.0 + 1.5 * math.sin((t / 3600.0) + (s / 10.0))
    do = 5.6 + 0.8 * math.sin((t / 1800.0) + (s / 17.0))
    ph = 7.8 + 0.2 * math.sin((t / 5400.0) + (s / 23.0))
    salinity = 15.0 + 1.0 * math.sin((t / 7200.0) + (s / 31.0))

    return {
        "pond_id": pond_id,
        "timestamp": datetime.utcnow().isoformat(),
        "DO": float(max(0.1, do)),
        "temp": float(temp),
        "pH": float(ph),
        "salinity": float(max(0.1, salinity)),
        "source": "dummy",
    }


def get_dummy_feeding(pond_id: str) -> Dict[str, Any]:
    """
    Deterministic dummy feeding summary (used when DB is unavailable).
    Returns schema compatible with DataFusionService expectations.
    """
    s = _pond_seed(pond_id)
    t = datetime.utcnow().timestamp()

    feed_amount = 80.0 + (s % 40) + 10.0 * math.sin((t / 2700.0) + (s / 19.0))
    feed_response = 0.55 + 0.15 * math.sin((t / 2100.0) + (s / 29.0))

    # Clamp response to [0, 1]
    feed_response = max(0.0, min(1.0, feed_response))

    return {
        "pond_id": pond_id,
        "timestamp": datetime.utcnow().isoformat(),
        "feed_amount": float(max(0.0, feed_amount)),
        "feed_response": float(feed_response),
        "source": "dummy",
    }

