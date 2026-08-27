import httpx
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.core.config import settings
import os
import uuid

# Initialize local ChromaDB client
persist_directory = os.path.join(os.getcwd(), "data", "chroma")
os.makedirs(persist_directory, exist_ok=True)

chroma_client = chromadb.PersistentClient(path=persist_directory)
memory_collection = chroma_client.get_or_create_collection(name="user_memories")

def store_memory(user_id: str, text: str):
    """
    Stores a piece of information in AI memory using local ChromaDB, Remem or Cathedral.
    """
    # 1. Local RAG storage (ChromaDB)
    try:
        memory_collection.add(
            documents=[text],
            metadatas=[{"user_id": user_id, "timestamp": str(uuid.uuid4())}],
            ids=[str(uuid.uuid4())]
        )
    except Exception as e:
        print(f"Local Chroma storage failed: {e}")

    # 2. Remote API storage (Remem)
    if settings.remem_api_key:
        try:
            url = "https://api.remem.ai/v1/memories"
            headers = {"Authorization": f"Bearer {settings.remem_api_key}"}
            payload = {"user_id": user_id, "text": text}
            with httpx.Client(timeout=10.0) as client:
                client.post(url, headers=headers, json=payload)
        except Exception as e:
            print(f"Remem storage failed: {e}")

    # 3. Remote API storage (Cathedral)
    if settings.cathedral_api_key:
        try:
            url = "https://api.cathedral.ai/v1/memories"
            headers = {"Authorization": f"Bearer {settings.cathedral_api_key}"}
            payload = {"agent": "EMILIA", "user_id": user_id, "content": text}
            with httpx.Client(timeout=10.0) as client:
                client.post(url, headers=headers, json=payload)
        except Exception as e:
            print(f"Cathedral storage failed: {e}")

def retrieve_memory(user_id: str, query: str) -> str:
    """
    Retrieves relevant long-term memory for a user using local RAG or remote APIs.
    """
    memories = []
    
    # 1. Local RAG retrieval (ChromaDB)
    try:
        results = memory_collection.query(
            query_texts=[query],
            where={"user_id": user_id},
            n_results=3
        )
        for docs in results.get("documents", []):
            memories.extend(docs)
    except Exception as e:
        print(f"Local Chroma retrieval failed: {e}")

    # 2. Remote API retrieval (Remem)
    if settings.remem_api_key:
        try:
            url = f"https://api.remem.ai/v1/search?user_id={user_id}&query={query}"
            headers = {"Authorization": f"Bearer {settings.remem_api_key}"}
            with httpx.Client(timeout=10.0) as client:
                res = client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    for item in data.get("results", []):
                        memories.append(item.get("text", ""))
        except Exception:
            pass

    if not memories:
        return ""

    # De-duplicate and join
    unique_memories = list(dict.fromkeys(memories))
    return "\n".join(unique_memories)
