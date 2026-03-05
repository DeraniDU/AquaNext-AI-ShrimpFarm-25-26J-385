# app/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routes import ai_feeding, batch, feeding
from app.core.model_loader import load_ai_model, get_model, get_labels
from app.routes import feeding_history
from app.routes import motor_status
from app.routes import motor_control
from app.routes import ai_decision
from app.routes import export
from app.routes import analytics
from app.api.test_force_motor import router as test_router
import traceback
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="Shrimp Feeding System",
    description="API for managing shrimp feeding batches and AI predictions",
    version="1.0.0"
)

# ---------------- CORS ----------------
# Allow all origins for development (mobile access)
# In production, specify exact origins for security
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # Allow all local network IPs (for mobile access)
    # Pattern: http://192.168.*.*:5173, http://172.*.*.*:5173, http://10.*.*.*:5173
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development/mobile access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- INCLUDE ROUTERS ----------------
app.include_router(batch.router)
app.include_router(feeding.router)
app.include_router(ai_feeding.router)
app.include_router(feeding_history.router)
app.include_router(motor_status.router)
app.include_router(motor_control.router)
app.include_router(ai_decision.router)
app.include_router(export.router)
app.include_router(analytics.router)
app.include_router(test_router)


# ---------------- EXCEPTION HANDLER ----------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to log all errors"""
    error_traceback = traceback.format_exc()
    logger.error(f"Unhandled exception: {str(exc)}")
    logger.error(f"Traceback: {error_traceback}")
    print(f"\n{'='*60}", flush=True)
    print(f"ERROR: {str(exc)}", flush=True)
    print(f"Traceback:\n{error_traceback}", flush=True)
    print(f"{'='*60}\n", flush=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# ---------------- STARTUP EVENT ----------------
@app.on_event("startup")
async def startup_event():
    load_ai_model()

# ---------------- ROOT ----------------
@app.get("/")
async def root():
    return {"message": "API is running successfully"}
