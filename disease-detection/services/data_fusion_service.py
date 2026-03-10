from typing import Optional, Dict, Any
from config import settings
from database.repository import Repository


class DataFusionService:
    def __init__(self, repository: Repository):
        self.repository = repository

    def _normalize_pond_id(self, pond_id: Optional[str]) -> str:
        """
        Normalize pond_id: use provided value or return default from settings.
        
        Args:
            pond_id: Pond identifier or None
            
        Returns:
            Normalized pond_id (uses default if None or empty)
        """
        return pond_id if pond_id else settings.DEFAULT_POND_ID

    def get_latest_fused_input(self, pond_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Fuse latest behavior, feeding, and environment data for risk prediction.
        
        Args:
            pond_id: Pond identifier (uses DEFAULT_POND_ID if not provided)
            
        Returns:
            Dictionary with behavior, feeding, environment data and model_input features
        """
        pond_id = self._normalize_pond_id(pond_id)
        
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
    
    def get_feeding_trend_analysis(self, pond_id: Optional[str] = None, hours: int = 24) -> Dict[str, Any]:
        """
        Analyze feeding trends for enhanced risk prediction.
        
        Provides comprehensive feeding data analysis including:
        - Recent feeding record (last 100)
        - Feeding statistics (averages, totals, frequency)
        - Trend metrics for risk assessment
        
        Args:
            pond_id: Pond identifier (uses DEFAULT_POND_ID if not provided)
            hours: Time window for analysis (default: 24 hours)
            
        Returns:
            Dictionary with feeding trends: recent_feeds, statistics, trend_analysis
        """
        pond_id = self._normalize_pond_id(pond_id)
        
        # Get recent feeding records
        recent_feeds = self.repository.get_recent_feeding(pond_id, limit=100)
        
        # Calculate statistics
        stats = self.repository.get_feeding_statistics(pond_id, hours=hours)
        
        # Trend analysis
        trend_analysis = {
            "pond_id": pond_id,
            "has_feeding_data": len(recent_feeds) > 0,
            "feeding_consistency": self._calculate_feeding_consistency(recent_feeds),
            "response_trend": self._calculate_response_trend(recent_feeds),
            "amount_variability": self._calculate_amount_variability(recent_feeds),
        }
        
        return {
            "pond_id": pond_id,
            "recent_feeds": recent_feeds,
            "statistics": stats,
            "trend_analysis": trend_analysis,
        }
    
    def _calculate_feeding_consistency(self, feeds: list) -> float:
        """
        Calculate feeding consistency (0-1 scale).
        Higher value = more consistent feeding pattern.
        """
        if len(feeds) < 2:
            return 0.0
        
        from datetime import datetime
        
        try:
            # Calculate time intervals between feedings
            timestamps = [datetime.fromisoformat(f.get("timestamp", "")) for f in feeds]
            intervals = []
            
            for i in range(len(timestamps) - 1):
                delta = (timestamps[i] - timestamps[i + 1]).total_seconds() / 3600  # hours
                intervals.append(delta)
            
            if not intervals:
                return 0.0
            
            # Mean interval
            mean_interval = sum(intervals) / len(intervals)
            
            # Calculate standard deviation
            if mean_interval == 0:
                return 0.0
            
            variance = sum((x - mean_interval) ** 2 for x in intervals) / len(intervals)
            std_dev = variance ** 0.5
            
            # Consistency score (inverse coefficient of variation)
            cv = std_dev / mean_interval if mean_interval > 0 else float('inf')
            consistency = max(0.0, 1.0 - min(cv / 2, 1.0))  # Normalize to 0-1
            
            return round(consistency, 3)
        except Exception:
            return 0.0
    
    def _calculate_response_trend(self, feeds: list) -> Dict[str, float]:
        """
        Analyze feed response trend (improving or declining).
        """
        if len(feeds) < 2:
            return {"trend": 0.0, "direction": "stable", "avg_response": 0.0}
        
        # Take recent vs older records
        recent = [float(f.get("feed_response", 0.0)) for f in feeds[:5]]
        older = [float(f.get("feed_response", 0.0)) for f in feeds[-5:]]
        
        avg_recent = sum(recent) / len(recent) if recent else 0.0
        avg_older = sum(older) / len(older) if older else 0.0
        
        trend = avg_recent - avg_older
        direction = "improving" if trend > 0.05 else "declining" if trend < -0.05 else "stable"
        
        return {
            "trend": round(trend, 3),
            "direction": direction,
            "avg_recent_response": round(avg_recent, 3),
            "avg_older_response": round(avg_older, 3),
        }
    
    def _calculate_amount_variability(self, feeds: list) -> Dict[str, float]:
        """
        Analyze variability in feed amounts.
        """
        if len(feeds) < 2:
            return {"variability": 0.0, "stability": "stable"}
        
        amounts = [float(f.get("feed_amount", 0.0)) for f in feeds[:20]]
        
        if not amounts or sum(amounts) == 0:
            return {"variability": 0.0, "stability": "no_data"}
        
        mean_amount = sum(amounts) / len(amounts)
        variance = sum((x - mean_amount) ** 2 for x in amounts) / len(amounts)
        std_dev = variance ** 0.5
        
        cv = (std_dev / mean_amount) if mean_amount > 0 else 0.0
        
        stability = "stable" if cv < 0.2 else "variable" if cv < 0.5 else "highly_variable"
        
        return {
            "variability": round(cv, 3),
            "stability": stability,
            "avg_amount": round(mean_amount, 2),
            "std_dev_amount": round(std_dev, 2),
        }
