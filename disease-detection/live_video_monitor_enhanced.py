#!/usr/bin/env python3
"""
Real-time Shrimp Behavior Video Monitoring System

This script connects to an IP camera (from mobile phone or traditional camera)
and analyzes shrimp behavior in real-time. It detects movement, calculates 
behavioral metrics, and sends this data to the backend for risk assessment.

Usage:
    # With Android IP Webcam
    python live_video_monitor_enhanced.py --source http://192.168.8.128:8080/video --pond pond-01
    
    # With webcam
    python live_video_monitor_enhanced.py --source 0 --pond pond-01
    
    # With RTSP camera
    python live_video_monitor_enhanced.py --source rtsp://192.168.1.100:554/stream --pond pond-01

Requirements:
    pip install opencv-python requests numpy
"""

import cv2
import numpy as np
import requests
import os
import argparse
import logging
import sys
from collections import deque
from datetime import datetime
from pathlib import Path

# =============================
# LOGGING SETUP
# =============================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('video_monitor.log')
    ]
)
logger = logging.getLogger("BehaviorMonitor")


# =============================
# CONFIGURATION
# =============================
class Config:
    """Configuration for video monitoring."""
    
    # Video source (environment variables or defaults)
    VIDEO_SOURCE = os.getenv("VIDEO_SOURCE", "http://192.168.8.128:8080/video")
    POND_ID = os.getenv("POND_ID", "pond-01")
    API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8001")
    
    # API Endpoints
    BEHAVIOR_API_URL = f"{API_BASE_URL}/behavior/live"
    RISK_API_URL = f"{API_BASE_URL}/predict-risk"
    
    # Video processing parameters
    ROI_FRAC = 0.6  # ROI as fraction of frame (0-1)
    WINDOW_FRAMES = 20  # Frames to aggregate for metrics
    BASELINE_WINDOW = 30  # Historical window for baseline calculation
    DROP_THRESHOLD = 0.6  # Activity must stay above this fraction of baseline
    SPIKE_THRESHOLD = 1.6  # Activity must stay below this multiple of baseline
    SEND_INTERVAL = 5  # Send behavior data every N windows processed
    FPS = 15  # Target frames per second
    
    # Motion detection sensitivity
    BG_HISTORY = 200
    BG_VAR_THRESHOLD = 25
    MOTION_AREA_MIN = 10  # Minimum pixels to count as motion


# =============================
# HELPER FUNCTIONS
# =============================

def compute_roi(frame, frac=0.6):
    """Calculate Region of Interest (ROI) centered in frame."""
    h, w = frame.shape[:2]
    rw = int(w * frac)
    rh = int(h * frac)
    x0 = (w - rw) // 2
    y0 = (h - rh) // 2
    return x0, y0, rw, rh


def detect_moving_objects(mask):
    """
    Detect moving objects and their properties.
    
    Returns:
        tuple: (centers, areas) where:
            - centers: list of (x, y) tuples
            - areas: list of area values
    """
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    centers = []
    areas = []
    
    for contour in contours:
        area = cv2.contourArea(contour)
        if area > Config.MOTION_AREA_MIN:
            M = cv2.moments(contour)
            if M["m00"] != 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
                centers.append((cx, cy))
                areas.append(area)
    
    return centers, areas


def calculate_velocity(centers_prev, centers_curr):
    """
    Calculate average velocity of moving objects.
    
    Args:
        centers_prev: Previous frame centers
        centers_curr: Current frame centers
        
    Returns:
        float: Average displacement magnitude
    """
    if not centers_curr or not centers_prev:
        return 0.0
    
    # Pad shorter list
    if len(centers_prev) < len(centers_curr):
        centers_prev = centers_prev + [centers_prev[-1]] * (len(centers_curr) - len(centers_prev))
    
    displacements = []
    for i in range(min(len(centers_prev), len(centers_curr))):
        prev = centers_prev[i]
        curr = centers_curr[i]
        dist = np.sqrt((prev[0] - curr[0])**2 + (prev[1] - curr[1])**2)
        displacements.append(dist)
    
    return float(np.mean(displacements)) if displacements else 0.0


def send_behavior_data(activity_index, activity_std, drop_ratio, abnormal_count, 
                       num_frames=0):
    """
    Send behavior metrics to backend API.
    
    Args:
        activity_index: Mean activity level
        activity_std: Standard deviation of activity
        drop_ratio: Activity drop ratio vs baseline
        abnormal_count: Count of abnormal frames
        num_frames: Total frames processed
        
    Returns:
        bool: Success status
    """
    payload = {
        "pond_id": Config.POND_ID,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "activity_index": float(activity_index),
        "activity_std": float(activity_std),
        "drop_ratio": float(drop_ratio),
        "abnormal": int(abnormal_count),
    }

    try:
        response = requests.post(Config.BEHAVIOR_API_URL, json=payload, timeout=5)
        if response.status_code == 200:
            logger.info(
                f"✓ Behavior sent | Activity={activity_index:.4f} | "
                f"Abnormal={abnormal_count} | DropRatio={drop_ratio:.2f}"
            )
            return True
        else:
            logger.warning(f"API error {response.status_code}: {response.text[:100]}")
            return False
    except requests.exceptions.ConnectionError:
        logger.error(f"Cannot reach API: {Config.BEHAVIOR_API_URL}")
        return False
    except Exception as e:
        logger.error(f"Failed to send behavior: {e}")
        return False


def send_risk_prediction(activity_mean, activity_std, drop_ratio_min, abnormal_rate,
                         feed_amount=120.0, feed_response=0.55,
                         DO=5.1, temp=30.2, pH=7.6, salinity=15.0):
    """
    Send collected metrics to risk prediction model.
    
    Args:
        activity_mean: Mean activity level
        activity_std: Activity standard deviation
        drop_ratio_min: Minimum drop ratio
        abnormal_rate: Rate of abnormal events
        feed_amount: Feeding amount (grams)
        feed_response: Feed response ratio
        DO: Dissolved oxygen level
        temp: Water temperature
        pH: pH level
        salinity: Salinity level
        
    Returns:
        dict: Prediction result or None on failure
    """
    payload = {
        "activity_mean": float(activity_mean),
        "activity_std": float(activity_std),
        "drop_ratio_min": float(drop_ratio_min),
        "abnormal_rate": float(abnormal_rate),
        "feed_amount": float(feed_amount),
        "feed_response": float(feed_response),
        "DO": float(DO),
        "temp": float(temp),
        "pH": float(pH),
        "salinity": float(salinity),
        "pond_id": Config.POND_ID,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    try:
        response = requests.post(Config.RISK_API_URL, json=payload, timeout=5)
        if response.status_code == 200:
            result = response.json()
            risk_level = result.get('recommendation', {}).get('final_risk_level', 'UNKNOWN')
            risk_score = result.get('unsupervised_risk_score', 0)
            logger.info(f"🎯 Risk: {risk_level} ({risk_score*100:.1f}%)")
            return result
        else:
            logger.warning(f"Risk prediction failed: {response.status_code}")
            return None
    except Exception as e:
        logger.error(f"Risk prediction error: {e}")
        return None


# =============================
# MAIN MONITORING LOOP
# =============================

def main(video_source=None, pond_id=None, headless=False, risk_prediction=False):
    """
    Main video monitoring loop.
    
    Args:
        video_source: Override default video source
        pond_id: Override default pond ID
        headless: Run without GUI
        risk_prediction: Send data to risk model
    """
    
    # Override defaults if provided
    if video_source:
        Config.VIDEO_SOURCE = video_source
    if pond_id:
        Config.POND_ID = pond_id
    
    logger.info("="*70)
    logger.info("SHRIMP BEHAVIOR VIDEO MONITORING SYSTEM")
    logger.info("="*70)
    logger.info(f"Video Source: {Config.VIDEO_SOURCE}")
    logger.info(f"Pond ID: {Config.POND_ID}")
    logger.info(f"API URL: {Config.BEHAVIOR_API_URL}")
    logger.info(f"Risk Prediction: {'Enabled' if risk_prediction else 'Disabled'}")
    logger.info("="*70)
    
    # Try to connect to video source
    logger.info("Connecting to video source...")
    cap = cv2.VideoCapture(Config.VIDEO_SOURCE)
    
    # For IP cameras, add retry logic
    retries = 0
    while not cap.isOpened() and retries < 3:
        logger.warning(f"Connection attempt {retries + 1}/3 failed, retrying...")
        import time
        time.sleep(2)
        cap = cv2.VideoCapture(Config.VIDEO_SOURCE)
        retries += 1
    
    if not cap.isOpened():
        logger.error(f"Cannot open video source: {Config.VIDEO_SOURCE}")
        logger.info("\nTroubleshooting:")
        logger.info("  - Android IP Webcam: http://192.168.x.x:8080/video")
        logger.info("  - Webcam: 0")
        logger.info("  - RTSP: rtsp://192.168.x.x:554/stream")
        logger.info("  - Video file: path/to/video.mp4")
        return
    
    logger.info("✓ Connected to video source")
    
    # Set video capture properties
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, Config.FPS)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce buffer for live streams
    
    # Initialize background subtractor
    bg = cv2.createBackgroundSubtractorMOG2(
        history=Config.BG_HISTORY,
        varThreshold=Config.BG_VAR_THRESHOLD,
        detectShadows=True
    )
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    
    # State variables
    roi_defined = False
    x0, y0, rw, rh = 0, 0, 0, 0
    activity_buffer = []
    abnormal_buffer = []
    baseline_history = deque(maxlen=Config.BASELINE_WINDOW)
    centers_prev = []
    send_counter = 0
    frame_count = 0
    
    logger.info(f"Starting monitoring loop (press 'q' to quit)...\n")
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                logger.warning("Failed to read frame, retrying...")
                continue
            
            frame_count += 1
            
            # Define ROI on first frame
            if not roi_defined:
                x0, y0, rw, rh = compute_roi(frame, Config.ROI_FRAC)
                roi_defined = True
                logger.info(f"ROI defined: position=({x0}, {y0}) size={rw}x{rh}")
            
            # Extract ROI
            roi = frame[y0:y0+rh, x0:x0+rw]
            
            # Preprocess for motion detection
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Background subtraction
            fg = bg.apply(gray)
            _, fg = cv2.threshold(fg, 200, 255, cv2.THRESH_BINARY)
            fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, kernel, iterations=1)
            
            # Calculate activity metrics
            moving_pixels = np.count_nonzero(fg)
            total_pixels = fg.size
            activity_index = moving_pixels / total_pixels
            
            # Detect moving objects
            centers, areas = detect_moving_objects(fg)
            velocity = calculate_velocity(centers_prev, centers)
            centers_prev = centers
            
            activity_buffer.append(activity_index)
            
            # Prepare display frame
            display_frame = frame.copy()
            cv2.rectangle(display_frame, (x0, y0), (x0+rw, y0+rh), (0, 255, 0), 2)
            
            # Draw detected movement centers
            for cx, cy in centers:
                adjusted_cx = cx + x0
                adjusted_cy = cy + y0
                cv2.circle(display_frame, (adjusted_cx, adjusted_cy), 5, (0, 0, 255), -1)
            
            # Draw motion mask overlay
            mask_display = np.zeros_like(frame)
            mask_display[y0:y0+rh, x0:x0+rw] = cv2.cvtColor(fg, cv2.COLOR_GRAY2BGR)
            
            # Process when buffer is full
            if len(activity_buffer) >= Config.WINDOW_FRAMES:
                avg_activity = float(np.mean(activity_buffer))
                std_activity = float(np.std(activity_buffer))
                min_activity = float(np.min(activity_buffer))
                
                # Update baseline
                baseline_history.append(avg_activity)
                if len(baseline_history) >= 3:
                    baseline = float(np.median(baseline_history))
                else:
                    baseline = avg_activity
                
                # Calculate drop ratio
                drop_ratio = avg_activity / baseline if baseline > 0 else 1.0
                
                # Detect abnormal activity
                abnormal = 1 if (drop_ratio < Config.DROP_THRESHOLD or 
                                drop_ratio > Config.SPIKE_THRESHOLD) else 0
                abnormal_buffer.append(abnormal)
                
                # Log metrics
                status = "🚨 ABNORMAL" if abnormal else "✓ Normal"
                logger.info(
                    f"Frame {frame_count:6d} {status} | "
                    f"Activity={avg_activity:.4f} | Std={std_activity:.4f} | "
                    f"DropRatio={drop_ratio:.2f} | Velocity={velocity:.2f} | "
                    f"Objects={len(centers)}"
                )
                
                # Send behavior data at intervals
                send_counter += 1
                if send_counter >= Config.SEND_INTERVAL:
                    abnormal_rate = float(np.mean(abnormal_buffer)) if abnormal_buffer else 0
                    send_behavior_data(avg_activity, std_activity, drop_ratio, 
                                     abnormal, len(activity_buffer))
                    
                    # Optionally send to risk model
                    if risk_prediction and frame_count % 100 == 0:
                        send_risk_prediction(
                            avg_activity, std_activity, drop_ratio, 
                            abnormal_rate, DO=5.1, temp=30.2, pH=7.6, salinity=15.0
                        )
                    
                    send_counter = 0
                    abnormal_buffer = []
                
                activity_buffer = []
            
            # Display on screen (if not headless)
            if not headless:
                try:
                    # Combine frames for display
                    combined = np.hstack([display_frame, mask_display])
                    cv2.imshow("Shrimp Behavior Monitoring | 'q' to quit", combined)
                    
                    key = cv2.waitKey(1) & 0xFF
                    if key == ord("q"):
                        logger.info("Quit signal received")
                        break
                    elif key == ord("s"):
                        filename = f"shrimp_frame_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                        cv2.imwrite(filename, display_frame)
                        logger.info(f"Screenshot saved: {filename}")
                
                except cv2.error as e:
                    logger.warning(f"GUI error: {e}")
                    headless = True
    
    except KeyboardInterrupt:
        logger.info("\nMonitoring interrupted by user (Ctrl+C)")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
    finally:
        cap.release()
        cv2.destroyAllWindows()
        logger.info("="*70)
        logger.info(f"Monitoring stopped. Processed {frame_count} frames.")
        logger.info("="*70)


# =============================
# CLI INTERFACE
# =============================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Real-time Shrimp Behavior Video Monitoring",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
EXAMPLES:
  # Android IP Webcam phone to computer
  python live_video_monitor_enhanced.py \\
    --source http://192.168.8.128:8080/video \\
    --pond pond-01
  
  # Using webcam
  python live_video_monitor_enhanced.py --source 0 --pond pond-01
  
  # RTSP IP camera
  python live_video_monitor_enhanced.py \\
    --source rtsp://192.168.1.100:554/stream \\
    --pond pond-01
  
  # Test with video file
  python live_video_monitor_enhanced.py --source test.mp4 --pond test
  
  # Headless mode (no GUI)
  python live_video_monitor_enhanced.py --source 0 --pond pond-01 --headless
  
  # Enable risk prediction
  python live_video_monitor_enhanced.py --source 0 --pond pond-01 --risk-prediction

ENVIRONMENT VARIABLES:
  VIDEO_SOURCE    Video source URL or path
  POND_ID         Pond identifier
  API_BASE_URL    Backend API base URL (http://localhost:8001)

IP CAMERA SETUP:
  1. Install "Android IP Webcam" app on phone
  2. Connect phone and computer to same WiFi
  3. Start app, note the IP and port
  4. Use: http://PHONE_IP:8080/video

OTHER CAMERA FORMATS:
  • Webcam: 0 or 1
  • RTSP: rtsp://IP:PORT/stream
  • HTTP: http://IP:PORT/video
  • File: path/to/video.mp4
        """
    )
    
    parser.add_argument(
        "--source",
        default=None,
        help="Video source (URL, device ID, or file path)"
    )
    parser.add_argument(
        "--pond",
        default=None,
        help="Pond identifier (default: pond-01)"
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run without GUI display"
    )
    parser.add_argument(
        "--risk-prediction",
        action="store_true",
        help="Send data to risk prediction model"
    )
    parser.add_argument(
        "--api-url",
        default=None,
        help="Backend API base URL (default: http://127.0.0.1:8001)"
    )
    
    args = parser.parse_args()
    
    # Apply arguments
    if args.api_url:
        Config.API_BASE_URL = args.api_url
        Config.BEHAVIOR_API_URL = f"{Config.API_BASE_URL}/behavior/live"
        Config.RISK_API_URL = f"{Config.API_BASE_URL}/predict-risk"
    
    main(
        video_source=args.source,
        pond_id=args.pond,
        headless=args.headless,
        risk_prediction=args.risk_prediction
    )
