import json
import logging
import os
import time

import paho.mqtt.client as mqtt
import requests
from dotenv import load_dotenv

load_dotenv()

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────
MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
MQTT_USERNAME    = os.getenv("MQTT_USERNAME", "")          # leave blank if no auth
MQTT_PASSWORD    = os.getenv("MQTT_PASSWORD", "")          # leave blank if no auth
MQTT_TOPIC       = os.getenv("MQTT_TOPIC", "shrimp_farm/+/sensors")
MQTT_CLIENT_ID   = os.getenv("MQTT_CLIENT_ID", "aquanext_bridge_01")

# The existing gateway REST endpoint (where app.py receives data)
GATEWAY_API_URL  = os.getenv("GATEWAY_API_URL", "http://localhost:8000/api/sensor/reading")

# How long to wait before retrying MQTT connection (seconds)
RECONNECT_DELAY  = 5


# ─── Callbacks ────────────────────────────────────────────────────────────────

def on_connect(client, userdata, flags, rc):
    """Called when the MQTT connection is established."""
    if rc == 0:
        logger.info(f" Connected to MQTT Broker at {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}")
        # Subscribe to all pond sensor topics
        client.subscribe(MQTT_TOPIC)
        logger.info(f"📡 Subscribed to topic: {MQTT_TOPIC}")
    else:
        reason = {
            1: "Incorrect protocol version",
            2: "Invalid client identifier",
            3: "Server unavailable",
            4: "Bad username or password",
            5: "Not authorised",
        }.get(rc, f"Unknown reason (rc={rc})")
        logger.error(f" Failed to connect: {reason}")


def on_disconnect(client, userdata, rc):
    """Called when disconnected from the broker."""
    if rc != 0:
        logger.warning(f"  Unexpected disconnect (rc={rc}). Will attempt to reconnect...")


def on_message(client, userdata, msg):
    """Called whenever a new MQTT message arrives on a subscribed topic."""
    topic   = msg.topic
    raw     = msg.payload.decode("utf-8", errors="replace").strip()

    logger.info(f"📩 [{topic}] {raw[:120]}")  # log first 120 chars

    # ── Parse JSON ────────────────────────────────────────────────────────────
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.warning(f"     JSON parse failed: {e} | raw: {raw[:80]}")
        return

    # ── Extract device_id from topic if not in payload ────────────────────────
    # Topic format: shrimp_farm/<device_id>/sensors
    if "device_id" not in payload:
        parts = topic.split("/")
        if len(parts) >= 2:
            payload["device_id"] = parts[1]
        else:
            payload["device_id"] = "unknown_mqtt_device"

    # ── Forward to gateway REST API ───────────────────────────────────────────
    try:
        resp = requests.post(GATEWAY_API_URL, json=payload, timeout=8)
        if resp.status_code in (200, 201):
            result = resp.json()
            status  = result.get("status", "ok")
            wqi_cls = result.get("ml_prediction", {}).get("wqi_class", "N/A")
            logger.info(f"    Saved → status={status}, WQI class={wqi_cls}")
        else:
            logger.warning(f"     Gateway returned HTTP {resp.status_code}: {resp.text[:120]}")
    except requests.exceptions.ConnectionError:
        logger.error(f"    Cannot reach gateway at {GATEWAY_API_URL}. Is app.py running?")
    except requests.exceptions.Timeout:
        logger.error("    Gateway request timed out (>8 s).")
    except Exception as e:
        logger.error(f"    Unexpected error forwarding data: {e}")


def on_log(client, userdata, level, buf):
    """Optional: show low-level MQTT library messages for debugging."""
    if level == mqtt.MQTT_LOG_ERR:
        logger.debug(f"[MQTT LIB] {buf}")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    logger.info("=" * 60)
    logger.info("   AquaNext MQTT Bridge")
    logger.info("=" * 60)
    logger.info(f"  Broker  : {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}")
    logger.info(f"  Topic   : {MQTT_TOPIC}")
    logger.info(f"  Gateway : {GATEWAY_API_URL}")
    logger.info("=" * 60)

    client = mqtt.Client(client_id=MQTT_CLIENT_ID, clean_session=True)

    # Authentication (if broker requires it)
    if MQTT_USERNAME:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

    # Register callbacks
    client.on_connect    = on_connect
    client.on_disconnect = on_disconnect
    client.on_message    = on_message
    client.on_log        = on_log

    # ── Connect with auto-reconnect ───────────────────────────────────────────
    while True:
        try:
            logger.info(f" Connecting to broker at {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT} ...")
            client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, keepalive=60)
            # loop_forever handles reconnects automatically
            client.loop_forever()
        except ConnectionRefusedError:
            logger.error(
                f" Connection refused. Is Mosquitto running? "
                f"Retrying in {RECONNECT_DELAY}s..."
            )
            time.sleep(RECONNECT_DELAY)
        except KeyboardInterrupt:
            logger.info("\n Stopped by user.")
            client.disconnect()
            break
        except Exception as e:
            logger.error(f" Unexpected error: {e}. Retrying in {RECONNECT_DELAY}s...")
            time.sleep(RECONNECT_DELAY)


if __name__ == "__main__":
    main()
