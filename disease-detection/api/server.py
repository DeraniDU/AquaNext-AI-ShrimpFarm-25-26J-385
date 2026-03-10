from typing import Optional

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
from utils.behavior_store import pond_behavior_store


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
    try:
        payload = inp.model_dump()
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
        raise HTTPException(status_code=500, detail=str(e))


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
    try:
        record = behavior_agent.process_behavior_input(inp.model_dump())
        # store in in-memory buffer for fast access
        pond_behavior_store[record["pond_id"]].append(record)

        # persist to repository
        try:
            inserted_id = repository.save_behavior_point(record)
        except Exception:
            inserted_id = None

        return {
            "ok": True,
            "message": "Behavior data stored",
            "pond_id": record["pond_id"],
            "stored_points": len(pond_behavior_store[record["pond_id"]]),
            "record_id": inserted_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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