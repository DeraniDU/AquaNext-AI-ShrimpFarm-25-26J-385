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

    # MongoDB - Connected to shared water quality database (read-only for environmental data)
    # URI: MongoDB Atlas cluster for water quality of shrimp ponds
    # DB: shrimp_farm_iot - contains environment_data collection
    # NOTE: Credentials can be omitted in local/dev; service will run without DB.
    MONGODB_URI: str = os.getenv("MONGO_URI", "")
    MONGODB_DB: str = os.getenv("DB_NAME", "")
    DB_ENABLED: bool = os.getenv("DB_ENABLED", "").strip().lower() in {"1", "true", "yes", "y"}

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Default behavior: enable DB only when credentials are provided.
        if not self.DB_ENABLED:
            self.DB_ENABLED = bool(self.MONGODB_URI and self.MONGODB_DB)


settings = Settings()