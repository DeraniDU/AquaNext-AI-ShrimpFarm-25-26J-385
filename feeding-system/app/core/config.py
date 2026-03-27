# Project settings and configuration
import os
from pathlib import Path

# Load .env from feeding-system directory if present (optional)
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_path)
    except ImportError:
        pass  # python-dotenv not installed, use env vars or defaults

MONGO_URI = "mongodb+srv://dbUser:Sama2001@shrimpfeeding.4tifr4r.mongodb.net/shrimpfeeding?retryWrites=true&w=majority"
DB_NAME = "shrimpfeeding"

# Firebase Realtime Database (IoT stepper control) - shrimp-feed project
# Speed: 0=stop, 1=slow, 2=medium. running=true when speed 1 or 2.
# Use default when env var is missing or empty so Firebase works out of the box.
def _env(key: str, default: str) -> str:
    v = os.getenv(key, default)
    return v.strip() if (v and isinstance(v, str)) else default

FIREBASE_API_KEY = _env("FIREBASE_API_KEY", "AIzaSyCzKh0ESFrVUPkAK1eQhr6blH9UrKpcHx0")
FIREBASE_DATABASE_URL = _env("FIREBASE_DATABASE_URL", "https://shrimp-feed-default-rtdb.firebaseio.com/")
FIREBASE_USER_EMAIL = _env("FIREBASE_USER_EMAIL", "jithmisamadi2001@gmail.com")
FIREBASE_USER_PASS = _env("FIREBASE_USER_PASS", "samadi1234")
FIREBASE_STEPPER_PATH = "stepper"
