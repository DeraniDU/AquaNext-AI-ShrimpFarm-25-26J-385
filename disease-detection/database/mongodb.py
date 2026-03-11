import os

import certifi
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from config import settings


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
                cls._client = MongoClient(
                    settings.MONGODB_URI,
                    tlsCAFile=certifi.where(),
                    serverSelectionTimeoutMS=10_000,
                    connectTimeoutMS=10_000,
                    socketTimeoutMS=20_000,
                )
                cls._client.admin.command("ping")
                cls._db = cls._client[settings.MONGODB_DB]
            except PyMongoError as e:
                raise ConnectionError(f"Failed to connect to MongoDB (IoT DB): {e}") from e
        return cls._db

    @classmethod
    def get_db(cls):
        """Get database instance, connecting if necessary."""
        if cls._db is None:
            return cls.connect()
        return cls._db