import cv2
import numpy as np
import joblib
import pandas as pd
from collections import deque
import requests
import threading
from datetime import datetime
import os

os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

IP_CAM_URL = "http://10.185.46.228:8080/videofeed"
MODEL_PATH = "../models/shrimp_anomaly_model.pkl"
BACKEND_URL = "http://localhost:5000/api/behavior-monitoring"

# These thresholds should match your current model output roughly.
LOW_MED_Q = -0.034095
MED_HIGH_Q = -0.012482

model = joblib.load(MODEL_PATH)

# Keep the same features used during training
FEATURE_COLS = [
    "avg_flow_mag",
    "std_flow_mag",
    "active_area_ratio",
    "clustering_score",
    "movement_stability",
    "activity_balance",
    "activity_intensity",
]

buffer = deque(maxlen=10)

def extract_features(mag_frames: deque) -> pd.DataFrame:
    stack = np.stack(mag_frames)

    avg_flow_mag = float(np.mean(stack))
    std_flow_mag = float(np.std(stack))
    active_area_ratio = float(np.mean(stack > 1.0))

    h, w = stack.shape[1], stack.shape[2]
    center = stack[:, h // 4 : 3 * h // 4, w // 4 : 3 * w // 4]

    edges = np.copy(stack)
    edges[:, h // 4 : 3 * h // 4, w // 4 : 3 * w // 4] = 0

    center_activity_ratio = float(np.mean(center))
    edge_activity_ratio = float(np.mean(edges))

    clustering_score = edge_activity_ratio / (center_activity_ratio + 1e-5)
    movement_stability = std_flow_mag / (avg_flow_mag + 1e-5)
    activity_balance = center_activity_ratio / (edge_activity_ratio + 1e-5)
    activity_intensity = avg_flow_mag * active_area_ratio

    row = {
        "avg_flow_mag": avg_flow_mag,
        "std_flow_mag": std_flow_mag,
        "active_area_ratio": active_area_ratio,
        "clustering_score": clustering_score,
        "movement_stability": movement_stability,
        "activity_balance": activity_balance,
        "activity_intensity": activity_intensity,
    }
    return pd.DataFrame([row], columns=FEATURE_COLS), row

def map_stress(score: float) -> str:
    if score < LOW_MED_Q:
        return "LOW"
    elif score < MED_HIGH_Q:
        return "MEDIUM"
    return "HIGH"

def send_to_backend(score, stress, features):
    payload = {
        "pond_id": "P01",
        "camera_id": "IPCAM_01",
        "source": "ip_camera",
        "stress_score": score,
        "stress_level": stress,
        "features": features
    }

    try:
        response = requests.post(
            "http://localhost:5000/api/behavior-monitoring",
            json=payload,
            timeout=3
        )
        print("POST status:", response.status_code, response.text)
    except Exception as e:
        print("Failed to send data:", e)

cap = cv2.VideoCapture(IP_CAM_URL)
if not cap.isOpened():
    raise RuntimeError("Could not open IP camera stream.")

ret, prev_frame = cap.read()
if not ret:
    raise RuntimeError("Could not read first frame from IP camera.")

prev_frame = cv2.resize(prev_frame, (320, 240))
prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)

frame_count = 0
stress = "WAITING"
score = 0.0

while True:
    try:
        ret, frame = cap.read()
        if not ret:
            print("Failed to read frame, retrying...")
            continue
    except Exception as e:
        print(f"Error reading frame: {e}")
        continue

    try:
        frame = cv2.resize(frame, (320, 240))
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    except Exception as e:
        print(f"Error processing frame: {e}")
        continue

    # Skip some frames for stability/performance
    frame_count += 1
    if frame_count % 2 == 0:
        flow = cv2.calcOpticalFlowFarneback(
            prev_gray, gray, None,
            0.5, 3, 15, 3, 5, 1.2, 0
        )
        mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        buffer.append(mag)

        if len(buffer) == buffer.maxlen:
            X_live, feature_dict = extract_features(buffer)
            score = float(model.decision_function(X_live)[0])
            stress = map_stress(score)

            if frame_count % 30 == 0:
                threading.Thread(target=send_to_backend, args=(score, stress, feature_dict), daemon=True).start()

    prev_gray = gray

    # Display
    cv2.putText(
        frame,
        f"Stress: {stress}",
        (20, 35),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 0, 255),
        2,
    )
    cv2.putText(
        frame,
        f"Score: {score:.5f}",
        (20, 70),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 255),
        2,
    )

    cv2.imshow("Shrimp Live Stress Detection", frame)

    key = cv2.waitKey(1) & 0xFF
    if key == 27:
        break

cap.release()
cv2.destroyAllWindows()