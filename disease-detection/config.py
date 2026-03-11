import os
from dotenv import load_dotenv
from pydantic import BaseModel

# Load variables from .env file in the current project folder
load_dotenv()


class Settings(BaseModel):
    APP_NAME: str = "disease-detection"

    # App / API
    ENV: str = os.getenv("ENV", "development")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8001"))

    # Base paths
    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    MODEL_DIR: str = os.getenv(
        "MODEL_DIR",
        os.path.join(BASE_DIR, "models", "artifacts"),
    )

    # Model paths
    RF_MODEL_PATH: str = os.getenv(
        "RF_MODEL_PATH",
        os.path.join(MODEL_DIR, "model_random_forest_multiclass.joblib"),
    )
    IF_MODEL_PATH: str = os.getenv(
        "IF_MODEL_PATH",
        os.path.join(MODEL_DIR, "model_isolation_forest.joblib"),
    )
    SCALER_PATH: str = os.getenv(
        "SCALER_PATH",
        os.path.join(MODEL_DIR, "multimodal_robust_scaler.joblib"),
    )

    # Isolation forest threshold
    IF_THRESHOLD: float = float(os.getenv("IF_THRESHOLD", "-0.003891"))

    # Main disease detection database
    MONGODB_URI: str = os.getenv("MONGO_URI", "")
    MONGODB_DB: str = os.getenv("DB_NAME", "")

    # Water quality database
    WATER_QUALITY_DB_URI: str = os.getenv("WATER_QUALITY_DB_URI", "")
    WATER_QUALITY_DB_NAME: str = os.getenv("WATER_QUALITY_DB_NAME", "")

    # Feeding database
    FEEDING_DB_URI: str = os.getenv("FEEDING_DB_URI", "")
    FEEDING_DB_NAME: str = os.getenv("FEEDING_DB_NAME", "")

    # Video source
    VIDEO_SOURCE: str = os.getenv("VIDEO_SOURCE", "")
    POND_ID: str = os.getenv("POND_ID", "pond-01")

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_DIR: str = os.getenv("LOG_DIR", "./logs")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        # Validate required variables
        if not self.MONGODB_URI:
            raise ValueError("MONGO_URI environment variable is required")

        if not self.MONGODB_DB:
            raise ValueError("DB_NAME environment variable is required")


settings = Settings()