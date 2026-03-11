from pymongo import MongoClient
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
        if cls._client is None:
            cls._client = MongoClient(settings.MONGODB_URI)
            cls._db = cls._client[settings.MONGODB_DB]
        return cls._db

    @classmethod
    def get_db(cls):
        """Get database instance, connecting if necessary."""
        if cls._db is None:
            return cls.connect()
        return cls._db