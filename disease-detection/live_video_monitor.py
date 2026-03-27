import cv2
import numpy as np
import requests
import os
import argparse
from collections import deque
from datetime import datetime

# -----------------------------
# CONFIG
# -----------------------------
# Default video source. Can be overridden with CLI `--source` or env var `VIDEO_SOURCE`.
VIDEO_SOURCE = "http://192.168.8.128:8080/video"
# 0 = laptop webcam
# "rtsp://..." = IP camera
# "pond.mp4" = video file for testing

POND_ID = "pond-01"
API_URL = "http://127.0.0.1:8001/behavior/live"

ROI_FRAC = 0.6
WINDOW_FRAMES = 20
BASELINE_WINDOW = 30
DROP_THRESHOLD = 0.6
SPIKE_THRESHOLD = 1.6

# -----------------------------
# HELPERS
# -----------------------------
def compute_roi(frame, frac=0.6):
    h, w = frame.shape[:2]
    rw = int(w * frac)
    rh = int(h * frac)
    x0 = (w - rw) // 2
    y0 = (h - rh) // 2
    return x0, y0, rw, rh

def send_behavior(activity_index, activity_std, drop_ratio, abnormal):
    payload = {
        "pond_id": POND_ID,
        "timestamp": datetime.utcnow().isoformat(),
        "activity_index": float(activity_index),
        "activity_std": float(activity_std),
        "drop_ratio": float(drop_ratio),
        "abnormal": int(abnormal),
    }

    try:
        r = requests.post(API_URL, json=payload, timeout=3)
        print("Sent:", r.json())
    except Exception as e:
        print("Failed to send behavior:", e)

# -----------------------------
# MAIN
# -----------------------------
cap = cv2.VideoCapture(VIDEO_SOURCE)
if not cap.isOpened():
    raise RuntimeError("Cannot open video source")

bg = cv2.createBackgroundSubtractorMOG2(history=200, varThreshold=25, detectShadows=True)
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))

roi_defined = False
activity_buffer = []
baseline_history = deque(maxlen=BASELINE_WINDOW)

print("Live shrimp video monitoring started.")
print("Press 'q' to stop.")
gui_available = True

while True:
    ret, frame = cap.read()
    if not ret:
        break

    if not roi_defined:
        x0, y0, rw, rh = compute_roi(frame, ROI_FRAC)
        roi_defined = True

    roi = frame[y0:y0+rh, x0:x0+rw]

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    fg = bg.apply(gray)
    _, fg = cv2.threshold(fg, 200, 255, cv2.THRESH_BINARY)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, kernel, iterations=1)

    moving_pixels = np.count_nonzero(fg)
    total_pixels = fg.size
    activity_index = moving_pixels / total_pixels

    activity_buffer.append(activity_index)

    # draw ROI
    display_frame = frame.copy()
    cv2.rectangle(display_frame, (x0, y0), (x0 + rw, y0 + rh), (0, 255, 0), 2)

    if len(activity_buffer) >= WINDOW_FRAMES:
        avg_activity = float(np.mean(activity_buffer))
        std_activity = float(np.std(activity_buffer))

        baseline_history.append(avg_activity)
        if len(baseline_history) >= 3:
            baseline = float(np.median(baseline_history))
        else:
            baseline = avg_activity

        drop_ratio = avg_activity / baseline if baseline > 0 else 1.0

        abnormal = 1 if (drop_ratio < DROP_THRESHOLD or drop_ratio > SPIKE_THRESHOLD) else 0

        print(
            f"time={datetime.now().strftime('%H:%M:%S')} | "
            f"activity={avg_activity:.4f} | std={std_activity:.4f} | "
            f"baseline={baseline:.4f} | drop_ratio={drop_ratio:.2f} | abnormal={abnormal}"
        )

        send_behavior(
            activity_index=avg_activity,
            activity_std=std_activity,
            drop_ratio=drop_ratio,
            abnormal=abnormal
        )

        activity_buffer = []

    if gui_available:
        try:
            cv2.imshow("Live Shrimp Monitoring", display_frame)
            cv2.imshow("Motion Mask", fg)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
        except cv2.error as e:
            print("OpenCV GUI functions not available:", e)
            print("If you're running in a headless environment, install the non-headless OpenCV package on Windows:")
            print("  python -m pip uninstall -y opencv-python-headless")
            print("  python -m pip install --upgrade --force-reinstall opencv-python")
            gui_available = False
            print("Continuing without GUI. Press Ctrl+C to stop.")
    else:
        # Running headless — don't attempt to show frames. Allow KeyboardInterrupt to stop.
        try:
            pass
        except KeyboardInterrupt:
            break

cap.release()
cv2.destroyAllWindows()