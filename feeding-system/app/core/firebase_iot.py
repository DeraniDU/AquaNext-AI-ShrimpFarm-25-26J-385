"""
Firebase Realtime Database client for IoT stepper control (shrimp-feed project).
Updates /stepper with speed (0/1/2) and running. Matches ESP32: 0=stop, 1=slow, 2=medium.
Motor speed is updated per 15s model output (AI or manual).
"""
import logging
import time
import requests
from app.core.config import (
    FIREBASE_API_KEY,
    FIREBASE_DATABASE_URL,
    FIREBASE_USER_EMAIL,
    FIREBASE_USER_PASS,
    FIREBASE_STEPPER_PATH,
)

logger = logging.getLogger(__name__)

# Token cache (idToken expires in ~1 hour)
_cached_token = None
_token_expires_at = 0
TOKEN_BUFFER_SECONDS = 300  # Refresh 5 min before expiry
_config_logged = False

# Speed: 0=stop, 1=slow, 2=medium (matches ESP32)
SPEED_LABELS = {0: "STOP", 1: "SLOW", 2: "MEDIUM"}


def _is_firebase_configured() -> bool:
    return bool(FIREBASE_API_KEY and FIREBASE_USER_EMAIL and FIREBASE_USER_PASS)


def _log_firebase_config_once():
    """Log Firebase connection config once (no secrets). Always print so user sees it."""
    global _config_logged
    if _config_logged:
        return
    _config_logged = True
    base_url = (FIREBASE_DATABASE_URL or "").rstrip("/")
    if _is_firebase_configured():
        msg = f"🔥 Firebase: configured — RTDB {base_url or '(empty)'}, path /{FIREBASE_STEPPER_PATH}"
        print(msg, flush=True)
        logger.info("[Firebase] Config: RTDB URL=%s, path=/%s (configured)", base_url or "(empty)", FIREBASE_STEPPER_PATH)
    else:
        missing = []
        if not FIREBASE_API_KEY: missing.append("FIREBASE_API_KEY")
        if not FIREBASE_USER_EMAIL: missing.append("FIREBASE_USER_EMAIL")
        if not FIREBASE_USER_PASS: missing.append("FIREBASE_USER_PASS")
        msg = f"🔥 Firebase: NOT configured — missing: {', '.join(missing)} (set in .env or config)"
        print(msg, flush=True)
        logger.warning("[Firebase] Config: not configured — missing: %s", ", ".join(missing))


def _get_id_token() -> str | None:
    """Sign in with email/password and return Firebase ID token. Caches token until near expiry."""
    global _cached_token, _token_expires_at
    _log_firebase_config_once()
    if not _is_firebase_configured():
        logger.warning("[Firebase] Connection skipped: not configured")
        return None
    now = time.time()
    if _cached_token and now < _token_expires_at - TOKEN_BUFFER_SECONDS:
        remaining = int(_token_expires_at - now)
        logger.info("[Firebase] Auth: using cached token (expires in %ds)", remaining)
        return _cached_token
    print("🔥 Firebase: connecting to Auth (email/password)...", flush=True)
    logger.info("[Firebase] Auth: connecting to Firebase Auth (email/password)...")
    auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    payload = {
        "email": FIREBASE_USER_EMAIL,
        "password": FIREBASE_USER_PASS,
        "returnSecureToken": True,
    }
    try:
        r = requests.post(auth_url, json=payload, timeout=10)
        if r.status_code == 200:
            data = r.json()
            _cached_token = data.get("idToken")
            expires_in = int(data.get("expiresIn", 3600))
            _token_expires_at = now + expires_in
            print(f"🔥 Firebase: Auth OK — token expires in {expires_in}s", flush=True)
            logger.info("[Firebase] Auth: connected successfully, token expires in %ds", expires_in)
            return _cached_token
        print(f"🔥 Firebase: Auth failed — status={r.status_code} {r.text[:200]}", flush=True)
        logger.error(
            "[Firebase] Auth: failed status=%s, body=%s",
            r.status_code, r.text[:300]
        )
        r.raise_for_status()
        return None
    except requests.RequestException as e:
        print(f"🔥 Firebase: Auth request error — {e}", flush=True)
        logger.error("[Firebase] Auth: request error %s", e, exc_info=True)
        _cached_token = None
        return None
    except Exception as e:
        print(f"🔥 Firebase: Auth error — {e}", flush=True)
        logger.error("[Firebase] Auth: error %s", e, exc_info=True)
        _cached_token = None
        return None


# Simple: model says no → speed 0 running false; low → speed 1 running true; high → speed 2 running true
def _model_to_speed_and_running(label: str | None, motor_speed: float) -> tuple[int, bool]:
    """From model output: (speed 0|1|2, running bool)."""
    label = (label or "no").lower().strip()
    if label == "no" or (motor_speed is not None and motor_speed < 0.01):
        return 0, False
    if label == "low" or (motor_speed is not None and motor_speed <= 0.5):
        return 1, True   # SLOW, motor on
    return 2, True   # HIGH / fast, motor on


def update_stepper_from_feed_event(state: str | None, motor_speed: float | None) -> bool:
    """
    Update Firebase /stepper from model output: running (true/false) and speed (0|1|2).
    state can be 'high'|'low'|'no' or 'feeding_fast'|'feeding_slow'|'stopped'.
    """
    # Normalize to model label (high/low/no)
    s = (state or "no").lower().strip()
    if s in ("stopped", "no", "off"): model_label = "no"
    elif s in ("feeding_slow", "low"): model_label = "low"
    else: model_label = "high"  # feeding_fast, high, etc.
    motor_speed = motor_speed if motor_speed is not None else 0.0
    speed, running = _model_to_speed_and_running(model_label, motor_speed)
    print(f"🔥 Firebase: model → running={running}, speed={speed} (label={model_label})", flush=True)
    logger.info("[Firebase] Stepper update: model_label=%s → running=%s speed=%s", model_label, running, speed)
    if not _is_firebase_configured():
        print("🔥 Firebase: skipped — not configured", flush=True)
        return False
    token = _get_id_token()
    if not token:
        print("🔥 Firebase: skipped — no auth token", flush=True)
        return False
    url = FIREBASE_DATABASE_URL.rstrip("/") + f"/{FIREBASE_STEPPER_PATH}.json"
    payload = {"running": running, "speed": speed}
    speed_label = SPEED_LABELS.get(speed, str(speed))
    logger.info(
        "[Firebase] RTDB: PATCH /%s -> running=%s, speed=%s (%s)",
        FIREBASE_STEPPER_PATH, running, speed, speed_label
    )
    try:
        r = requests.patch(url, params={"auth": token}, json=payload, timeout=10)
        if r.status_code == 200:
            # Demo: exact values written to /stepper (running=true|false, speed=0|1|2)
            print(f"🔥 Firebase: /stepper updated — running={running}, speed={speed} (0=stop 1=slow 2=medium)", flush=True)
            logger.info("[Firebase] RTDB: update OK running=%s speed=%s (%s)", running, speed, speed_label)
            return True
        if r.status_code == 401:
            global _cached_token
            _cached_token = None
            print("🔥 Firebase: 401 Unauthorized (token expired) — will retry on next update", flush=True)
            logger.warning("[Firebase] RTDB: 401 Unauthorized — token expired, will retry with new token on next update")
        else:
            print(f"🔥 Firebase: PATCH failed — status={r.status_code} {r.text[:150]}", flush=True)
            logger.error("[Firebase] RTDB: PATCH failed status=%s, body=%s", r.status_code, r.text[:400])
        return False
    except requests.RequestException as e:
        print(f"🔥 Firebase: PATCH error — {e}", flush=True)
        logger.error("[Firebase] RTDB: request error %s", e, exc_info=True)
        return False
    except Exception as e:
        print(f"🔥 Firebase: update error — {e}", flush=True)
        logger.error("[Firebase] Stepper update error: %s", e, exc_info=True)
        return False
