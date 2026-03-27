# app/core/model_loader.py
from tensorflow.keras.models import load_model
import numpy as np
import json
import os

# ---------------- Paths ----------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # shrimp_feeding_fastapi/
MODEL_PATH = os.path.join(BASE_DIR, "models", "best_model.h5")
LABEL_PATH = os.path.join(BASE_DIR, "models", "labels.json")

# ---------------- Globals ----------------
model = None
labels = None

# ---------------- Load AI model ----------------
def load_ai_model():
    global model, labels

    # Load model
    if model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
        model = load_model(MODEL_PATH)
        # Warmup prediction to avoid first-request delay
        dummy = np.zeros((1, 128, 469, 1), dtype=np.float32)
        model.predict(dummy, verbose=0)
        print(f"✅ Model loaded from {MODEL_PATH}")

    # Load labels
    if labels is None:
        if not os.path.exists(LABEL_PATH):
            raise FileNotFoundError(f"Labels file not found at {LABEL_PATH}")
        with open(LABEL_PATH, "r") as f:
            labels = json.load(f)
        print(f"✅ Labels loaded from {LABEL_PATH}")

    return model, labels

# ---------------- Getter Functions ----------------
def get_model():
    if model is None:
        raise ValueError("Model not loaded. Call load_ai_model() first.")
    return model

def get_labels():
    if labels is None:
        raise ValueError("Labels not loaded. Call load_ai_model() first.")
    return labels
