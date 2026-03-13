import os
import logging
import time
from typing import Optional
from urllib.parse import urlparse

from pymongo import MongoClient
from pymongo.errors import PyMongoError

from config import settings
from database.mongo_tls import mongo_client_tls_kwargs

logger = logging.getLogger(__name__)


def _mongo_uri_host_for_log(uri: str) -> str:
    """Log target without credentials."""
    if not uri:
        return "(empty MONGO_URI)"
    try:
        p = urlparse(uri)
        if p.hostname:
            return f"{p.scheme or 'mongodb'}://{p.hostname}:{p.port or ''}".rstrip(":")
        return "(parse failed)"
    except Exception:
        return "(configured)"


class MongoDB:
    """
    MongoDB connection handler for disease detection module.
    
    Connects to: Water Quality of Shrimp Ponds database (MongoDB Atlas)
    Database: shrimp_farm_iot
    Access Level: READ-ONLY for environmental data monitoring
    """
    _client = None
    _db = None

    @classmethod
    def connect(cls):
        """
        Establish connection to MongoDB Atlas.
        Uses MONGO_URI and DB_NAME environment variables or defaults.
        """
        if os.getenv("DISABLE_MONGO", "").strip().lower() in {"1", "true", "yes"}:
            raise ConnectionError("MongoDB disabled via DISABLE_MONGO")

        if cls._client is None:
            try:
                tls_kwargs = mongo_client_tls_kwargs()
                if tls_kwargs.get("tlsAllowInvalidCertificates"):
                    logger.warning(
                        "MongoDB TLS: tlsAllowInvalidCertificates is enabled "
                        "(MONGO_TLS_INSECURE=1) — use only for local debugging"
                    )
                cls._client = MongoClient(
                    settings.MONGODB_URI,
                    serverSelectionTimeoutMS=10_000,
                    connectTimeoutMS=10_000,
                    socketTimeoutMS=20_000,
                    **tls_kwargs,
                )
                cls._client.admin.command("ping")
                cls._db = cls._client[settings.MONGODB_DB]
            except PyMongoError as e:
                # Reset client so the next connect() retries instead of returning _db=None
                cls._client = None
                cls._db = None
                raise ConnectionError(f"Failed to connect to MongoDB (IoT DB): {e}") from e
        return cls._db

    @classmethod
    def get_db(cls):
        """Get database instance, connecting if necessary."""
        if cls._db is None:
            return cls.connect()
        return cls._db

    @classmethod
    def is_connected(cls) -> bool:
        """True if connect() succeeded and db handle is available."""
        return cls._db is not None

    @classmethod
    def disconnect(cls) -> None:
        """Close client and clear handles (e.g. on app shutdown)."""
        if cls._client is not None:
            try:
                cls._client.close()
            except Exception as e:
                logger.debug("MongoDB client close: %s", e)
        cls._client = None
        cls._db = None

    @classmethod
    def reset(cls) -> None:
        """Force next connect() to open a new client (after config change)."""
        cls.disconnect()

    @classmethod
    def init_connection(cls) -> bool:
        """
        Initialize DB connection with optional retries.

        Env:
          MONGO_CONNECT_RETRIES — default 1 (set 3 to retry transient failures)
          MONGO_CONNECT_RETRY_DELAY_SEC — default 2

        Call this before constructing Repository/PredictionRepository so
        collections bind to a live connection.

        Returns True if connected, False if disabled or all attempts failed.
        """
        if os.getenv("DISABLE_MONGO", "").strip().lower() in {"1", "true", "yes"}:
            logger.info("MongoDB skipped (DISABLE_MONGO is set)")
            return False

        if not settings.MONGODB_URI or not settings.MONGODB_DB:
            logger.warning(
                "MongoDB not configured: set MONGO_URI and DB_NAME in .env"
            )
            return False

        retries = max(1, int(os.getenv("MONGO_CONNECT_RETRIES", "1")))
        delay = max(0, float(os.getenv("MONGO_CONNECT_RETRY_DELAY_SEC", "2")))

        logger.info(
            "Initializing MongoDB: db=%s target=%s",
            settings.MONGODB_DB,
            _mongo_uri_host_for_log(settings.MONGODB_URI),
        )

        last_error: Optional[Exception] = None
        for attempt in range(1, retries + 1):
            try:
                cls.connect()
                logger.info("MongoDB connected successfully (attempt %s/%s)", attempt, retries)
                return True
            except Exception as e:
                last_error = e
                logger.warning(
                    "MongoDB connect attempt %s/%s failed: %s",
                    attempt,
                    retries,
                    e,
                )
                if attempt < retries and delay > 0:
                    time.sleep(delay)

        logger.error(
            "MongoDB unavailable after %s attempts; using in-memory fallbacks. Last error: %s",
            retries,
            last_error,
        )
        return False