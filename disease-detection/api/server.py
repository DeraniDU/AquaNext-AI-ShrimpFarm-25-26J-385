import os
from contextlib import asynccontextmanager
from typing import Optional
import logging

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pymongo.errors import PyMongoError
from fastapi.middleware.cors import CORSMiddleware
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


# Setup logging
logger = logging.getLogger("disease_detection")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure DB is initialized before serving (retries from env)
    MongoDB.init_connection()
    yield
    # Shutdown: close Mongo client cleanly
    MongoDB.disconnect()


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

# ---------------- CORS ----------------
# Default dev origins; set CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:5174" to add more
_default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
_extra = os.getenv("CORS_ORIGINS", "").strip()
origins = _default_origins + [o.strip() for o in _extra.split(",") if o.strip()] if _extra else _default_origins
_cors_allow_all = (
    settings.ENV == "development"
    and os.getenv("CORS_ALLOW_ALL", "").lower() in {"1", "true", "yes"}
)
if _cors_allow_all:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # credentials + wildcard origin is invalid for browsers; disable credentials when using *
    allow_credentials=not _cors_allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ------------------------------------------


# Initialize DB before repositories so collections bind to a live connection
# (lifespan also calls init_connection on startup; this covers import-time workers)
if not MongoDB.is_connected():
    MongoDB.init_connection()

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
risk_scheduler = RiskSchedulerService(
    repository,
    fusion_service,
    prediction_agent,
    prediction_repository=prediction_repository,
)


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


class FeedingInput(BaseModel):
    pond_id: str = Field(..., example="pond-01")
    timestamp: str = Field(..., example="2026-03-08T10:20:00Z")
    feed_amount: float = Field(..., example=120.0)
    feed_response: float = Field(..., ge=0.0, le=1.0, example=0.55)


@app.get("/health")
def health():
    from utils.prediction_store import pond_prediction_store

    mongo_ok = MongoDB.is_connected()
    pred_mem = sum(len(d) for d in pond_prediction_store.values())
    behavior_mem = sum(len(points) for points in pond_behavior_store.values())
    return {
        "ok": True,
        "service": settings.APP_NAME,
        "env": settings.ENV,
        "mongo_connected": mongo_ok,
        "in_memory_predictions": pred_mem,
        "in_memory_behavior_points": behavior_mem,
    }


@app.post("/predict-risk")
def predict_risk(inp: RiskInput):
    try:
        payload = inp.model_dump()
        feature_payload = {k: payload[k] for k in FEATURES}

        result = prediction_agent.run(feature_payload)
        result["pond_id"] = payload.get("pond_id")
        result["timestamp"] = payload.get("timestamp")

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
        logger.error(f"Error in predict_risk: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to process prediction request. Please try again.",
        )


@app.get("/predictions")
def get_predictions(limit: int = 50):
    try:
        return {
            "ok": True,
            "data": prediction_repository.get_all_predictions(limit=limit),
        }
    except (PyMongoError, ConnectionError) as e:
        logger.error(f"Database error in get_predictions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=503, detail="Database unavailable. Please try again.")


@app.get("/predictions/{pond_id}")
def get_predictions_by_pond(pond_id: str, limit: int = 50):
    try:
        return {
            "ok": True,
            "pond_id": pond_id,
            "data": prediction_repository.get_predictions_by_pond(
                pond_id=pond_id, limit=limit
            ),
        }
    except (PyMongoError, ConnectionError) as e:
        logger.error(f"Database error in get_predictions_by_pond: {str(e)}", exc_info=True)
        raise HTTPException(status_code=503, detail="Database unavailable. Please try again.")


class BehaviorInput(BaseModel):
    pond_id: str = Field(..., example="pond-01")
    timestamp: str = Field(..., example="2026-03-08T10:15:00")
    activity_index: float = Field(..., example=0.21)
    activity_std: Optional[float] = Field(0.0, example=0.03)
    drop_ratio: Optional[float] = Field(1.0, example=0.82)
    abnormal: Optional[int] = Field(0, example=0)


def _safe_recalculate_for_pond(pond_id: str) -> None:
    try:
        result = risk_scheduler.recalculate_for_pond(pond_id)

        if not result:
            logger.info(
                "Background risk recalculation skipped for pond %s due to missing data",
                pond_id,
            )

    except Exception as e:
        logger.error(
            "Error during background risk recalculation for pond %s: %s",
            pond_id,
            str(e),
            exc_info=True,
        )


@app.post("/behavior/live")
def push_behavior_live(inp: BehaviorInput, background_tasks: BackgroundTasks):
    try:
        record = behavior_agent.process_behavior_input(inp.model_dump())

        pond_behavior_store[record["pond_id"]].append(record)

        try:
            inserted_id = repository.save_behavior_point(record)
        except Exception as db_error:
            logger.warning(f"Failed to persist behavior to DB: {str(db_error)}")
            inserted_id = None

        background_tasks.add_task(_safe_recalculate_for_pond, record["pond_id"])

        return {
            "ok": True,
            "message": "Behavior data stored",
            "pond_id": record["pond_id"],
            "stored_points": len(pond_behavior_store[record["pond_id"]]),
            "record_id": inserted_id,
        }

    except Exception as e:
        logger.error(f"Error in push_behavior_live: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to process behavior data. Please try again.",
        )


@app.post("/feeding/live")
def push_feeding_live(inp: FeedingInput, background_tasks: BackgroundTasks):
    try:
        record = inp.model_dump()

        try:
            inserted_id = repository.save_feed_point(record)
        except Exception as db_error:
            logger.warning(f"Failed to persist feeding data to DB: {str(db_error)}")
            inserted_id = None

        background_tasks.add_task(_safe_recalculate_for_pond, record["pond_id"])

        return {
            "ok": True,
            "message": "Feeding data stored",
            "pond_id": record["pond_id"],
            "record_id": inserted_id,
        }

    except Exception as e:
        logger.error(f"Error in push_feeding_live: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to process feeding data. Please try again.",
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
        },
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
    try:
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
    except (PyMongoError, ConnectionError) as e:
        logger.error(f"Database error in get_pond_status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=503, detail="Database unavailable. Please try again.")