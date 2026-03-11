import os

import certifi
from pymongo import MongoClient
from pymongo.errors import PyMongoError


class FeedingMongoDB:
    """
    Separate MongoDB connection for feeding data.

    This connects to the shrimp feeding database (shrimpfeeding) so that
    disease-detection can read/write aggregated feeding summaries while
    keeping environmental data on the IoT database.
    """

    _client = None
    _db = None

    @classmethod
    def connect(cls):
        """
        Establish connection to the shrimp feeding MongoDB.

        Required environment variables:
        - FEED_MONGO_URI
        - FEED_DB_NAME
        """
        if cls._client is None:
            mongo_uri = os.getenv("FEED_MONGO_URI", "")
            db_name = os.getenv("FEED_DB_NAME", "")

            if not mongo_uri or not db_name:
                raise ValueError("FEED_MONGO_URI and FEED_DB_NAME environment variables are required")

            try:
                cls._client = MongoClient(
                    mongo_uri,
                    tlsCAFile=certifi.where(),
                    serverSelectionTimeoutMS=10_000,
                    connectTimeoutMS=10_000,
                    socketTimeoutMS=20_000,
                )
                cls._client.admin.command("ping")
                cls._db = cls._client[db_name]
            except PyMongoError as e:
                raise ConnectionError(f"Failed to connect to MongoDB (Feeding DB): {e}") from e

        return cls._db

    @classmethod
    def get_db(cls):
        if cls._db is None:
            return cls.connect()
        return cls._db