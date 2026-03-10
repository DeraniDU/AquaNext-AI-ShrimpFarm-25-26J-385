import os
from pydantic import BaseModel


class Settings(BaseModel):
    APP_NAME: str = "disease-detection"
    ENV: str = os.getenv("ENV", "dev")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8001"))

    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    MODEL_DIR: str = os.getenv("MODEL_DIR", os.path.join(BASE_DIR, "models", "artifacts"))

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

    IF_THRESHOLD: float = float(os.getenv("IF_THRESHOLD", "-0.003891"))

    # MongoDB - Connected to feeding farm database (read-only for feeding data)
    # URI: MongoDB Atlas cluster for shrimp farm feeding data
    # DB: shrimpfeeding - contains feeding_data collection
    # NOTE: Credentials must be provided via environment variables - NO DEFAULTS
    MONGODB_URI: str = os.getenv("MONGO_URI", "")
    MONGODB_DB: str = os.getenv("DB_NAME", "")
    
    # Default pond ID for systems without explicit pond identification
    DEFAULT_POND_ID: str = os.getenv("DEFAULT_POND_ID", "1")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Validate required credentials are set at runtime
        if not self.MONGODB_URI:
            raise ValueError("MONGO_URI environment variable is required")
        if not self.MONGODB_DB:
            raise ValueError("DB_NAME environment variable is required")


settings = Settings()