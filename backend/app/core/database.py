from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db = MongoDB()

async def connect_to_mongo():
    if not settings.mongodb_uri:
        print("MONGODB_URI not set, skipping connection.")
        return
    
    try:
        db.client = AsyncIOMotorClient(settings.mongodb_uri)
        db.db = db.client[settings.mongodb_db_name]
        # Verify connection
        await db.client.admin.command('ping')
        print(f"Connected to MongoDB: {settings.mongodb_db_name}")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")

async def close_mongo_connection():
    if db.client:
        db.client.close()
        print("MongoDB connection closed.")
