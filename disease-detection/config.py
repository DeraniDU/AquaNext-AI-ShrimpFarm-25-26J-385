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

    # MongoDB
    # The connection string can be overridden using the MONGODB_URI environment variable.
    # Example for Atlas (replace <password> with your actual password):
    #   export MONGODB_URI="mongodb+srv://piyumalipalihawadana_db_user:palihe1234@cluster0.ni5ykui.mongodb.net/?appName=Cluster0"
    # If you prefer to hardcode a default for development you can change the fallback below.
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB: str = os.getenv("MONGODB_DB", "Shrimp_desease")


settings = Settings()