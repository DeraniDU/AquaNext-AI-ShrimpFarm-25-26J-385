from typing import Optional
import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from agents.risk_prediction_agent import RiskPredictionAgent
from config import settings
from models.risk_model import FEATURES, RiskModelService
from database.mongodb import MongoDB
from database.repository import Repository, PredictionRepository
from agents.behavior_agent import BehaviorAgent
from services.data_fusion_service import DataFusionService
from services.risk_scheduler import RiskSchedulerService
from services.feeding_risk_analysis import FeedingAwareRiskAnalysis
from utils.behavior_store import pond_behavior_store

# Setup logging for error tracking (not exposed publicly)
logger = logging.getLogger("disease_detection")
logging.basicConfig(level=logging.INFO)


app = FastAPI(title=settings.APP_NAME)

# Initialize DB
MongoDB.connect()
repository = Repository()
prediction_repository = PredictionRepository()

# Load models
model_service = RiskModelService(
    rf_model_path=settings.RF_MODEL_PATH,
    if_model_path=settings.IF_MODEL_PATH,
    scaler_path=settings.SCALER_PATH,
    if_threshold=settings.IF_THRESHOLD,
)
prediction_agent = RiskPredictionAgent(model_service)
behavior_agent = BehaviorAgent()

# services
fusion_service = DataFusionService(repository)
risk_scheduler = RiskSchedulerService(repository, fusion_service, prediction_agent)
feeding_risk_analysis = FeedingAwareRiskAnalysis(repository, fusion_service, prediction_agent)


class RiskInput(BaseModel):
    activity_mean: float = Field(..., example=0.18)
    activity_std: float = Field(..., example=0.02)
    drop_ratio_min: float = Field(..., example=0.62)
    abnormal_rate: float = Field(..., example=0.25)
    feed_amount: float = Field(..., example=120.0)
    feed_response: float = Field(..., example=0.55)
    DO: float = Field(..., example=5.1)
    temp: float = Field(..., example=30.2)
    pH: float = Field(..., example=7.6)
    salinity: float = Field(..., example=15.0)

    pond_id: Optional[str] = None
    timestamp: Optional[str] = None


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": settings.APP_NAME,
        "env": settings.ENV,
    }


@app.post("/predict-risk")
def predict_risk(inp: RiskInput):
    """
    Predict disease risk for a pond based on environmental and behavioral data.
    Uses default pond_id (1) if not provided.
    Errors are logged internally but generic messages returned to client.
    """
    try:
        payload = inp.model_dump()
        # Use default pond_id if not provided
        if not payload.get("pond_id"):
            payload["pond_id"] = settings.DEFAULT_POND_ID
        
        feature_payload = {k: payload[k] for k in FEATURES}

        result = prediction_agent.run(feature_payload)
        result["pond_id"] = payload.get("pond_id")
        result["timestamp"] = payload.get("timestamp")

        # Save full record to DB
        db_record = {
            "pond_id": payload.get("pond_id"),
            "timestamp": payload.get("timestamp"),
            "input_features": feature_payload,
            "prediction_result": result,
        }
        inserted_id = prediction_repository.save_prediction(db_record)

        result["saved_to_db"] = True
        result["record_id"] = inserted_id
        return result

    except Exception as e:
        # Log the actual error internally (secure)
        logger.error(f"Error in predict_risk: {str(e)}", exc_info=True)
        # Return generic error to client (no sensitive details)
        raise HTTPException(
            status_code=500, 
            detail="Failed to process prediction request. Please try again."
        )


@app.get("/predictions")
def get_predictions(limit: int = 50):
    return {
        "ok": True,
        "data": prediction_repository.get_all_predictions(limit=limit)
    }


@app.get("/predictions/{pond_id}")
def get_predictions_by_pond(pond_id: str, limit: int = 50):
    return {
        "ok": True,
        "pond_id": pond_id,
        "data": prediction_repository.get_predictions_by_pond(pond_id=pond_id, limit=limit)
    }   


class BehaviorInput(BaseModel):
    pond_id: str = Field(..., example="pond-01")
    timestamp: str = Field(..., example="2026-03-08T10:15:00")
    activity_index: float = Field(..., example=0.21)
    activity_std: Optional[float] = Field(0.0, example=0.03)
    drop_ratio: Optional[float] = Field(1.0, example=0.82)
    abnormal: Optional[int] = Field(0, example=0)


@app.post("/behavior/live")
def push_behavior_live(inp: BehaviorInput):
    """
    Record shrimp behavior data for a pond.
    Errors are logged internally but generic messages returned to client.
    """
    try:
        record = behavior_agent.process_behavior_input(inp.model_dump())
        # store in in-memory buffer for fast access
        pond_behavior_store[record["pond_id"]].append(record)

        # persist to repository
        try:
            inserted_id = repository.save_behavior_point(record)
        except Exception as db_error:
            logger.warning(f"Failed to persist behavior to DB: {str(db_error)}")
            inserted_id = None

        return {
            "ok": True,
            "message": "Behavior data stored",
            "pond_id": record["pond_id"],
            "stored_points": len(pond_behavior_store[record["pond_id"]]),
            "record_id": inserted_id,
        }
    except Exception as e:
        # Log the actual error internally (secure)
        logger.error(f"Error in push_behavior_live: {str(e)}", exc_info=True)
        # Return generic error to client (no sensitive details)
        raise HTTPException(
            status_code=500, 
            detail="Failed to process behavior data. Please try again."
        )


@app.get("/behavior/{pond_id}")
def get_behavior_by_pond(pond_id: str):
    return {
        "ok": True,
        "pond_id": pond_id,
        "points": list(pond_behavior_store[pond_id]),
    }


@app.get("/behavior")
def get_all_behavior():
    return {
        "ok": True,
        "ponds": {
            pond_id: list(points)
            for pond_id, points in pond_behavior_store.items()
        }
    }


@app.post("/recalculate-risk/{pond_id}")
def recalculate_risk(pond_id: str):
    result = risk_scheduler.recalculate_for_pond(pond_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Missing behavior/feed/environment data for pond {pond_id}",
        )
    return {"ok": True, **result}


@app.get("/pond-status/{pond_id}")
def get_pond_status(pond_id: str):
    latest_behavior = repository.get_latest_behavior(pond_id)
    latest_feed = repository.get_latest_feed(pond_id)
    latest_env = repository.get_latest_environment(pond_id)
    latest_prediction = repository.get_latest_prediction(pond_id)
    recent_behavior = repository.get_recent_behavior(pond_id, limit=100)

    return {
        "ok": True,
        "pond_id": pond_id,
        "latest_behavior": latest_behavior,
        "latest_feeding": latest_feed,
        "latest_environment": latest_env,
        "latest_prediction": latest_prediction,
        "recent_behavior_points": recent_behavior,
    }


@app.get("/feeding/{pond_id}")
def get_feeding_data(pond_id: str = None, limit: int = 100):
    """
    Retrieve recent feeding data for a pond.
    
    Query Parameters:
    - pond_id: Pond identifier (uses default pond_id=1 if not provided)
    - limit: Number of recent records to retrieve (default: 100)
    """
    if not pond_id:
        pond_id = settings.DEFAULT_POND_ID
    
    try:
        recent_feeds = repository.get_recent_feeding(pond_id, limit=limit)
        return {
            "ok": True,
            "pond_id": pond_id,
            "total_records": len(recent_feeds),
            "feeding_data": recent_feeds,
        }
    except Exception as e:
        logger.error(f"Error retrieving feeding data: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve feeding data. Please try again."
        )


@app.get("/feeding-stats/{pond_id}")
def get_feeding_statistics(pond_id: str = None, hours: int = 24):
    """
    Get feeding statistics for risk analysis.
    
    Query Parameters:
    - pond_id: Pond identifier (uses default pond_id=1 if not provided)
    - hours: Time window for analysis (default: 24 hours)
    """
    if not pond_id:
        pond_id = settings.DEFAULT_POND_ID
    
    try:
        stats = repository.get_feeding_statistics(pond_id, hours=hours)
        return {
            "ok": True,
            "pond_id": pond_id,
            **stats,
        }
    except Exception as e:
        logger.error(f"Error calculating feeding statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to calculate feeding statistics. Please try again."
        )


@app.get("/feeding-trend/{pond_id}")
def get_feeding_trends(pond_id: str = None, hours: int = 24):
    """
    Get comprehensive feeding trend analysis for enhanced risk prediction.
    
    Includes:
    - Recent feeding records
    - Feeding statistics
    - Trend analysis (consistency, response trend, amount variability)
    
    Query Parameters:
    - pond_id: Pond identifier (uses default pond_id=1 if not provided)
    - hours: Time window for analysis (default: 24 hours)
    """
    if not pond_id:
        pond_id = settings.DEFAULT_POND_ID
    
    try:
        trend_analysis = fusion_service.get_feeding_trend_analysis(pond_id, hours=hours)
        return {
            "ok": True,
            **trend_analysis,
        }
    except Exception as e:
        logger.error(f"Error analyzing feeding trends: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze feeding trends. Please try again."
        )


# ============================================================================
# INTEGRATED FEEDING-AWARE RISK PREDICTION ENDPOINTS
# ============================================================================

@app.get("/predict-risk-with-feeding/{pond_id}")
def predict_risk_with_feeding_analysis(pond_id: str = None, include_trends: bool = True):
    """
    Comprehensive risk prediction with feeding data analysis.
    
    Automatically retrieves behavior, feeding, and environment data from MongoDB,
    analyzes feeding trends, and predicts disease risk incorporating feeding insights.
    
    Query Parameters:
    - pond_id: Pond identifier (uses DEFAULT_POND_ID if not provided)
    - include_trends: Whether to include feeding trend analysis (default: true)
    
    Returns:
        - Prediction with feeding analysis
        - Risk factors from feeding patterns
        - Enhanced recommendations based on feeding
    """
    if not pond_id:
        pond_id = settings.DEFAULT_POND_ID
    
    try:
        result = feeding_risk_analysis.save_prediction_with_feeding(
            pond_id=pond_id,
            include_feeding_trends=include_trends
        )
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Missing required data (behavior/feeding/environment) for pond {pond_id}"
            )
        
        # Enhance recommendation with feeding insights
        if include_trends and result.get("feeding_data", {}).get("risk_factors"):
            enhanced_recommendation = feeding_risk_analysis.get_feeding_enhanced_recommendation(
                result["prediction"],
                result["feeding_data"]["risk_factors"]
            )
            result["prediction"]["recommendation"] = enhanced_recommendation
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in predict_risk_with_feeding_analysis: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to calculate risk prediction with feeding analysis"
        )


@app.post("/recalculate-risk-with-feeding/{pond_id}")
def recalculate_risk_with_feeding(pond_id: str, include_trends: bool = True):
    """
    Recalculate risk for a pond with comprehensive feeding analysis.
    
    Automatically retrieves latest data and includes feeding trend analysis
    in the risk assessment.
    
    Query Parameters:
    - Include_trends: Whether to include feeding trend analysis (default: true)
    
    Response includes:
    - New risk prediction
    - Feeding analysis
    - Source data used (behavior, feeding, environment)
    - Enhanced recommendations
    """
    try:
        result = feeding_risk_analysis.save_prediction_with_feeding(
            pond_id=pond_id,
            include_feeding_trends=include_trends
        )
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Missing data for pond {pond_id}. Ensure behavior, feeding, and environment data are available."
            )
        
        # Enhance with feeding recommendations
        if include_trends and result.get("feeding_data", {}).get("risk_factors"):
            enhanced_recommendation = feeding_risk_analysis.get_feeding_enhanced_recommendation(
                result["prediction"],
                result["feeding_data"]["risk_factors"]
            )
            result["prediction"]["recommendation"] = enhanced_recommendation
        
        return {
            "ok": True,
            "pond_id": pond_id,
            "timestamp": result["timestamp"],
            "saved_to_db": result.get("saved_to_db", False),
            "record_id": result.get("record_id"),
            "prediction": result["prediction"],
            "feeding_analysis": result["feeding_data"],
            "input_features": result["input_features"],
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in recalculate_risk_with_feeding: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to recalculate risk with feeding analysis"
        )


@app.get("/pond-status-enhanced/{pond_id}")
def get_pond_status_enhanced(pond_id: str = None, include_feeding_analysis: bool = True):
    """
    Get comprehensive pond status with feeding analysis and risk assessment.
    
    Combines latest data readings with feeding trends and disease risk prediction.
    
    Query Parameters:
    - pond_id: Pond identifier (uses DEFAULT_POND_ID if not provided)
    - include_feeding_analysis: Include feeding trend analysis (default: true)
    
    Returns:
        - Latest readings (behavior, feeding, environment)
        - Feeding analysis and trends
        - Current disease risk prediction
        - Enhanced recommendations
    """
    if not pond_id:
        pond_id = settings.DEFAULT_POND_ID
    
    try:
        # Get latest readings
        latest_behavior = repository.get_latest_behavior(pond_id)
        latest_feed = repository.get_latest_feed(pond_id)
        latest_env = repository.get_latest_environment(pond_id)
        latest_prediction = repository.get_latest_prediction(pond_id)
        recent_behavior = repository.get_recent_behavior(pond_id, limit=50)
        
        # Get feeding analysis if requested
        feeding_analysis = None
        if include_feeding_analysis:
            trend_data = fusion_service.get_feeding_trend_analysis(pond_id, hours=24)
            feeding_stats = repository.get_feeding_statistics(pond_id, hours=24)
            feeding_analysis = {
                "trends": trend_data.get("trend_analysis", {}),
                "statistics": feeding_stats,
                "recent_records": trend_data.get("recent_feeds", [])[:10],  # Last 10 records
            }
        
        # Calculate current risk with all integrated data
        risk_prediction = None
        feeding_risk_factors = None
        try:
            risk_result = feeding_risk_analysis.predict_with_feeding_analysis(
                pond_id=pond_id,
                include_feeding_trends=include_feeding_analysis
            )
            if risk_result:
                risk_prediction = risk_result["prediction"]
                feeding_risk_factors = risk_result["feeding_data"]["risk_factors"]
                
                # Enhance recommendation with feeding insights
                if feeding_risk_factors:
                    enhanced_rec = feeding_risk_analysis.get_feeding_enhanced_recommendation(
                        risk_prediction,
                        feeding_risk_factors
                    )
                    risk_prediction["recommendation"] = enhanced_rec
        except Exception as e:
            logger.warning(f"Could not calculate risk prediction: {str(e)}")
        
        return {
            "ok": True,
            "pond_id": pond_id,
            "timestamp": latest_behavior.get("timestamp") if latest_behavior else None,
            "latest_readings": {
                "behavior": latest_behavior,
                "feeding": latest_feed,
                "environment": latest_env,
            },
            "feeding_analysis": feeding_analysis,
            "risk_assessment": {
                "latest_prediction": latest_prediction,
                "current_prediction": risk_prediction,
                "feeding_risk_factors": feeding_risk_factors,
            },
            "history": {
                "recent_behavior": recent_behavior,
                "recent_predictions_count": len(repository.get_predictions_by_pond(pond_id, limit=10)) if hasattr(repository, 'get_predictions_by_pond') else 0,
            },
        }
    
    except Exception as e:
        logger.error(f"Error in get_pond_status_enhanced: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate enhanced pond status"
        )