from app.core.database import db
from app.models.schemas import ChatMessage
import time
import uuid

async def save_chat_thread(user_id: str, thread_id: str, title: str, messages: list[ChatMessage], project_id: str = "p_default"):
    if not db.db:
        return
    
    collection = db.db["chat_threads"]
    
    # Convert messages to dicts
    msgs_dict = [{"role": m.role, "content": m.content} for m in messages]
    
    await collection.update_one(
        {"id": thread_id, "user_id": user_id},
        {
            "$set": {
                "id": thread_id,
                "user_id": user_id,
                "title": title,
                "messages": msgs_dict,
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
    cursor = collection.find({"user_id": user_id}).sort("updatedAt", -1)
    threads = await cursor.to_list(length=100)
    return threads

async def delete_chat_thread(user_id: str, thread_id: str):
    if not db.db:
        return
    
    collection = db.db["chat_threads"]
    await collection.delete_one({"id": thread_id, "user_id": user_id})
