from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import MONGO_URI, DB_NAME
import asyncio

# MongoDB client and database
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

# Async function to check DB connection
async def check_db_connection():
    try:
        collections = await db.list_collection_names()
        print("✅ MongoDB connection successful")
        print("Collections:", collections)
    except Exception as e:
        print("❌ MongoDB connection failed:", e)

# Schedule the check safely without using asyncio.run()
# Will execute when the event loop starts
asyncio.get_event_loop().create_task(check_db_connection())
