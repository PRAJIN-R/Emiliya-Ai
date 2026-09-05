from app.core.database import db
import time
from typing import Any

async def save_chat_thread(user_id: str, thread_id: str, title: str, messages: list[Any], project_id: str = "p_default"):
    if not db.db:
        return
    
    collection = db.db["chat_threads"]
    
    # Store messages exactly as they come (preserving metadata like provider, route, etc.)
    await collection.update_one(
        {"id": thread_id, "user_id": user_id},
        {
            "$set": {
                "id": thread_id,
                "user_id": user_id,
                "title": title,
                "messages": messages,
                "projectId": project_id,
                "updatedAt": int(time.time() * 1000)
            }
        },
        upsert=True
    )

async def get_user_threads(user_id: str):
    if not db.db:
        return []
    
    collection = db.db["chat_threads"]
    # Exclude MongoDB internal _id from the result to avoid serialization issues
    cursor = collection.find({"user_id": user_id}, {"_id": 0}).sort("updatedAt", -1)
    threads = await cursor.to_list(length=100)
    return threads

async def delete_chat_thread(user_id: str, thread_id: str):
    if not db.db:
        return
    
    collection = db.db["chat_threads"]
    await collection.delete_one({"id": thread_id, "user_id": user_id})
