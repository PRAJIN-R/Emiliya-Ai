import httpx
from app.core.config import settings

def store_memory(user_id: str, text: str):
    """
    Stores a piece of information in AI memory using Remem or Cathedral.
    """
    if settings.remem_api_key:
        try:
            url = "https://api.remem.ai/v1/memories"
            headers = {"Authorization": f"Bearer {settings.remem_api_key}"}
            payload = {"user_id": user_id, "text": text}
            with httpx.Client(timeout=10.0) as client:
                client.post(url, headers=headers, json=payload)
        except Exception as e:
            print(f"Remem storage failed: {e}")

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
    Retrieves relevant long-term memory for a user.
    """
    memories = []
    
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

    if settings.audaxic_api_key:
        try:
            # Audaxic retrieval logic placeholder
            pass
        except Exception:
            pass

    return "\n".join(memories)
