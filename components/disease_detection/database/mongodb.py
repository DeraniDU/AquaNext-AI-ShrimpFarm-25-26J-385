from pymongo import MongoClient
from ..config import settings


class MongoDB:
    _client = None
    _db = None

    @classmethod
    def connect(cls):
        if cls._client is None:
            cls._client = MongoClient(settings.MONGODB_URI)
            cls._db = cls._client[settings.MONGODB_DB]
        return cls._db

    @classmethod
    def get_db(cls):
        if cls._db is None:
            return cls.connect()
        return cls._db
