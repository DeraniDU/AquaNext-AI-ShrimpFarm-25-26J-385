"""
MongoDB connection module for MongoDB Atlas integration.
Supports both synchronous (pymongo) and asynchronous (motor) operations.
"""

from pymongo import MongoClient
from pymongo.server_api import ServerApi
from typing import Optional
import os
from config import MONGO_URI, MONGO_DB_NAME

# Try to import motor for async operations (optional)
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    MOTOR_AVAILABLE = True
except ImportError:
    MOTOR_AVAILABLE = False
    AsyncIOMotorClient = None


def get_mongo_client() -> MongoClient:
    """
    Create and return a MongoDB client for Atlas connection.
    
    Returns:
        MongoClient: MongoDB client instance
        
    Raises:
        ValueError: If MONGO_URI is not configured
    """
    if not MONGO_URI:
        raise ValueError(
            "MONGO_URI not configured. Please set it in your .env file.\n"
            "Example: MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/"
        )
    
    # Create client with Atlas connection
    client = MongoClient(
        MONGO_URI,
        server_api=ServerApi('1')  # Use stable API version
    )
    
    return client


def get_database(client: Optional[MongoClient] = None):
    """
    Get database instance.
    
    Args:
        client: Optional MongoDB client. If not provided, creates a new one.
        
    Returns:
        Database: MongoDB database instance
    """
    if client is None:
        client = get_mongo_client()
    
    return client[MONGO_DB_NAME]


def test_connection() -> bool:
    """
    Test MongoDB Atlas connection.
    
    Returns:
        bool: True if connection successful, False otherwise
    """
    try:
        client = get_mongo_client()
        # Test connection
        client.admin.command('ping')
        client.close()
        return True
    except Exception as e:
        print(f"Connection failed: {e}")
        return False


# Async support (if motor is available)
if MOTOR_AVAILABLE:
    def get_async_mongo_client() -> AsyncIOMotorClient:
        """
        Create and return an async MongoDB client for Atlas connection.
        
        Returns:
            AsyncIOMotorClient: Async MongoDB client instance
            
        Raises:
            ValueError: If MONGO_URI is not configured
        """
        if not MONGO_URI:
            raise ValueError(
                "MONGO_URI not configured. Please set it in your .env file.\n"
                "Example: MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/"
            )
        
        # Create async client with Atlas connection
        client = AsyncIOMotorClient(
            MONGO_URI,
            server_api=ServerApi('1')
        )
        
        return client
    
    def get_async_database(client: Optional[AsyncIOMotorClient] = None):
        """
        Get async database instance.
        
        Args:
            client: Optional async MongoDB client. If not provided, creates a new one.
            
        Returns:
            Database: MongoDB database instance
        """
        if client is None:
            client = get_async_mongo_client()
        
        return client[MONGO_DB_NAME]

