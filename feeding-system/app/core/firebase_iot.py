"""
Firebase Realtime Database client for IoT stepper control.
Updates /stepper with running and speed when feeding starts (AI or manual).
Speed mapping: 1=SLOW, 2=MEDIUM, 3=FAST.
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

# Speed labels for logs
SPEED_LABELS = {1: "SLOW", 2: "MEDIUM", 3: "FAST"}


def _is_firebase_configured() -> bool:
    return bool(FIREBASE_API_KEY and FIREBASE_USER_EMAIL and FIREBASE_USER_PASS)


def _get_id_token() -> str | None:
    """Sign in with email/password and return Firebase ID token. Caches token until near expiry."""
    global _cached_token, _token_expires_at
    if not _is_firebase_configured():
        logger.warning("[Firebase] Not configured: missing API_KEY, USER_EMAIL, or USER_PASS")
        return None
    now = time.time()
    if _cached_token and now < _token_expires_at - TOKEN_BUFFER_SECONDS:
        logger.debug("[Firebase] Using cached idToken")
        return _cached_token
    logger.info("[Firebase] Auth: signing in with email/password (token refresh)")
    auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    payload = {
        "email": FIREBASE_USER_EMAIL,
        "password": FIREBASE_USER_PASS,
        "returnSecureToken": True,
    }
    try:
        r = requests.post(auth_url, json=payload, timeout=10)
        logger.info(f"[Firebase] Auth response: status={r.status_code}")
        if r.status_code != 200:
            logger.error(f"[Firebase] Auth failed: status={r.status_code}, body={r.text[:300]}")
        r.raise_for_status()
        data = r.json()
        _cached_token = data.get("idToken")
        expires_in = int(data.get("expiresIn", 3600))
        _token_expires_at = now + expires_in
        logger.info(f"[Firebase] Auth success, token expires in {expires_in}s")
        return _cached_token
    except requests.RequestException as e:
        logger.error(f"[Firebase] Auth request error: {e}", exc_info=True)
        _cached_token = None
        return None
    except Exception as e:
        logger.error(f"[Firebase] Auth failed: {e}", exc_info=True)
        _cached_token = None
        return None


# Speed: 0 = stopped, 1 = SLOW, 2 = MEDIUM, 3 = FAST
def _state_to_speed(state: str | None, motor_speed: float) -> int:
    """Map state/motor_speed to Firebase speed. Returns 0 when stopped, else 1/2/3."""
    s = (state or "").lower().strip()
    if s in ("stopped", "no", "off") or (motor_speed is not None and motor_speed < 0.01):
        return 0
    if s in ("feeding_fast", "high") or (motor_speed is not None and motor_speed >= 0.9):
        return 3  # FAST
    if s in ("feeding_slow", "low") or (motor_speed is not None and motor_speed <= 0.5):
        return 1  # SLOW
    return 2  # MEDIUM


def update_stepper_from_feed_event(state: str | None, motor_speed: float | None) -> bool:
    """
    Update Firebase /stepper: speed (0=stop, 1/2/3=run) and running (true if speed 1/2/3, else false).
    """
    logger.info(f"[Firebase] update_stepper called: state={state!r}, motor_speed={motor_speed}")
    if not _is_firebase_configured():
        logger.warning("[Firebase] Skipped: not configured (set FIREBASE_API_KEY, FIREBASE_USER_EMAIL, FIREBASE_USER_PASS)")
        return False
    token = _get_id_token()
    if not token:
        logger.error("[Firebase] Skipped: no idToken (auth failed)")
        return False
    motor_speed = motor_speed if motor_speed is not None else 0.0
    speed = _state_to_speed(state, motor_speed)
    running = speed in (1, 2, 3)  # true when speed 1/2/3, false when speed 0
    url = FIREBASE_DATABASE_URL.rstrip("/") + f"/{FIREBASE_STEPPER_PATH}.json"
    payload = {"running": running, "speed": speed}
    speed_label = SPEED_LABELS.get(speed, "STOP" if speed == 0 else str(speed))
    logger.info(f"[Firebase] PATCH {url} payload={payload} (running={running}, speed={speed_label})")
    try:
        r = requests.patch(url, params={"auth": token}, json=payload, timeout=10)
        if r.status_code == 200:
            logger.info(f"[Firebase] Realtime DB updated: running={running}, speed={speed} ({speed_label})")
            return True
        if r.status_code == 401:
            global _cached_token
            _cached_token = None
            logger.warning("[Firebase] 401 Unauthorized: token expired, will retry with new token on next update")
        else:
            logger.error(f"[Firebase] PATCH failed: status={r.status_code}, body={r.text[:400]}")
        return False
    except requests.RequestException as e:
        logger.error(f"[Firebase] PATCH request error: {e}", exc_info=True)
        return False
    except Exception as e:
        logger.error(f"[Firebase] update_stepper error: {e}", exc_info=True)
        return False
