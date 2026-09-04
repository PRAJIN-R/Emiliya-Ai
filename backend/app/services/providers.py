from datetime import datetime
from urllib.parse import quote_plus
import httpx
import json

from app.core.config import settings
from app.models.schemas import ChatMessage


class ProviderResult(dict):
    pass


def _last_user_message(messages: list[ChatMessage]) -> str:
    for message in reversed(messages):
        if message.role == "user":
            return message.content
    return ""


def local_fallback_answer(messages: list[ChatMessage]) -> ProviderResult:
    prompt = _last_user_message(messages).strip()
    lower = prompt.lower()
    if not prompt:
        answer = "Ask me anything and I'll help."
    elif any(word in lower for word in ("hello", "hi", "hey")):
        answer = "Hey! I'm Emilia. How can I assist you today?"
    elif "code" in lower or "error" in lower or "bug" in lower:
        answer = "I can help with coding or debugging. Please share your code snippet or the error you're seeing."
    elif any(word in lower for word in ("latest", "news", "today", "current")):
        answer = "To get the latest news and real-time information, please ensure a search API key (like Tavily or You.com) is configured in the backend."
    else:
        answer = "I'm currently in offline mode because all AI providers failed. Please check your API keys in the backend/.env file to restore full functionality."
    return ProviderResult(answer=answer, provider="local")


def _extract_text_choice(data: dict) -> str:
    # Handle Gemini structure
    if "candidates" in data:
        return (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
        )
    # Handle OpenAI-compatible structure
    if "choices" in data:
        return data["choices"][0].get("message", {}).get("content", "").strip()
    return ""


def call_gemini(messages: list[ChatMessage], model: str, images: list[str] | None = None) -> ProviderResult:
    if not settings.gemini_api_key:
        raise RuntimeError("Missing GEMINI_API_KEY")
    
    target_model = "gemini-1.5-flash" if images else model
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent"
    
    system_text = ""
    contents = []
    
    for m in messages:
        if m.role == "system":
            system_text += m.content + "\n"
        elif m.role in ("user", "assistant"):
            role = "user" if m.role == "user" else "model"
            parts = [{"text": m.content}]
            
            # Add images to the last user message
            if m == messages[-1] and m.role == "user" and images:
                for img_base64 in images:
                    pure_b64 = img_base64.split(",")[-1] if "," in img_base64 else img_base64
                    parts.append({
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": pure_b64
                        }
                    })
            contents.append({"role": role, "parts": parts})

    # Gemini requires non-empty contents and usually starts with user
    if not contents:
        contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

    payload = {"contents": contents}
    if system_text.strip():
        payload["system_instruction"] = {"parts": [{"text": system_text.strip()}]}
    
    with httpx.Client(timeout=45.0) as client:
        response = client.post(url, params={"key": settings.gemini_api_key}, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"Gemini Error {response.status_code}: {response.text}")
        data = response.json()

    answer = _extract_text_choice(data)
    return ProviderResult(answer=answer or "I could not generate a response.", provider="gemini")


def call_xai(messages: list[ChatMessage], model: str) -> ProviderResult:
    if not settings.xai_api_key:
        raise RuntimeError("Missing XAI_API_KEY")
    url = "https://api.x.ai/v1/chat/completions"
    payload = {"model": model, "messages": [{"role": m.role, "content": m.content} for m in messages], "temperature": 0.4}
    headers = {"Authorization": f"Bearer {settings.xai_api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=35.0) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"xAI Error {response.status_code}: {response.text}")
        data = response.json()
    answer = _extract_text_choice(data)
    return ProviderResult(answer=answer, provider="xai")


def call_claude(messages: list[ChatMessage], model: str) -> ProviderResult:
    if not settings.anthropic_api_key:
        raise RuntimeError("Missing ANTHROPIC_API_KEY")
    url = "https://api.anthropic.com/v1/messages"
    
    # Claude doesn't like 'system' role in messages list, it wants it as a top-level parameter
    system_message = next((m.content for m in messages if m.role == "system"), "")
    filtered_messages = [
        {"role": "user" if m.role == "user" else "assistant", "content": m.content}
        for m in messages if m.role in ("user", "assistant")
    ]
    
    payload = {
        "model": model,
        "max_tokens": 1024,
        "messages": filtered_messages,
        "temperature": 0.4
    }
    if system_message:
        payload["system"] = system_message

    headers = {
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }
    
    with httpx.Client(timeout=45.0) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"Claude Error {response.status_code}: {response.text}")
        data = response.json()
    
    answer = data["content"][0]["text"].strip()
    return ProviderResult(answer=answer, provider="claude")


def call_mistral(messages: list[ChatMessage], model: str) -> ProviderResult:
    if not settings.mistral_api_key:
        raise RuntimeError("Missing MISTRAL_API_KEY")
    url = "https://api.mistral.ai/v1/chat/completions"
    payload = {
        "model": model, 
        "messages": [{"role": m.role, "content": m.content} for m in messages], 
        "temperature": 0.4,
        "max_tokens": 1024
    }
    headers = {"Authorization": f"Bearer {settings.mistral_api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=35.0) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"Mistral Error {response.status_code}: {response.text}")
        data = response.json()
        answer = _extract_text_choice(data)
        return ProviderResult(answer=answer, provider="mistral")


def call_groq(messages: list[ChatMessage], model: str) -> ProviderResult:
    if not settings.groq_api_key:
        raise RuntimeError("Missing GROQ_API_KEY")
    url = "https://api.groq.com/openai/v1/chat/completions"
    # Filter out empty messages
    valid_msgs = [{"role": m.role, "content": m.content} for m in messages if m.content.strip()]
    payload = {"model": model, "messages": valid_msgs, "temperature": 0.4}
    headers = {"Authorization": f"Bearer {settings.groq_api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=30.0) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"Groq Error {response.status_code}: {response.text}")
        data = response.json()
    answer = _extract_text_choice(data)
    return ProviderResult(answer=answer or "I could not generate a response.", provider="groq")


def call_openrouter(messages: list[ChatMessage], model: str) -> ProviderResult:
    if not settings.openrouter_api_key:
        raise RuntimeError("Missing OPENROUTER_API_KEY")
    url = "https://openrouter.ai/api/v1/chat/completions"
    payload = {"model": model, "messages": [{"role": m.role, "content": m.content} for m in messages], "temperature": 0.5}
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": "https://emilia.ai",
        "X-Title": "Emilia AI",
        "Content-Type": "application/json"
    }
    with httpx.Client(timeout=45.0) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"OpenRouter Error {response.status_code}: {response.text}")
        data = response.json()
    answer = _extract_text_choice(data)
    return ProviderResult(answer=answer or "I could not generate a response.", provider="openrouter")


def call_ai_horde(messages: list[ChatMessage]) -> ProviderResult:
    if not settings.ai_horde_api_key:
        raise RuntimeError("Missing AI_HORDE_API_KEY")
    url = "https://aihorde.net/api/v2/generate/text/sync"
    prompt = "\n".join([f"{m.role}: {m.content}" for m in messages]) + "\nassistant: "
    payload = {
        "prompt": prompt,
        "params": {"max_context_length": 1024, "max_length": 512, "temperature": 0.7}
    }
    headers = {"apikey": settings.ai_horde_api_key, "Content-Type": "application/json"}
    with httpx.Client(timeout=60.0) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"AI Horde Error {response.status_code}: {response.text}")
        data = response.json()
    answer = data.get("generations", [{}])[0].get("text", "").strip()
    return ProviderResult(answer=answer, provider="ai_horde")


def call_edyx(messages: list[ChatMessage]) -> ProviderResult:
    if not settings.edyx_api_key:
        raise RuntimeError("Missing EDYX_API_KEY")
    url = "https://api.edyx.ai/v1/chat/completions"
    payload = {"model": "llama-3.1-70b", "messages": [{"role": m.role, "content": m.content} for m in messages]}
    headers = {"Authorization": f"Bearer {settings.edyx_api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=45.0) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"Edyx Error {response.status_code}: {response.text}")
        data = response.json()
    answer = _extract_text_choice(data)
    return ProviderResult(answer=answer, provider="edyx")


def call_plugsky(messages: list[ChatMessage]) -> ProviderResult:
    if not settings.plugsky_api_key:
        raise RuntimeError("Missing PLUGSKY_API_KEY")
    url = "https://api.plugsky.com/v1/chat/completions"
    payload = {"model": "llama-3.1-70b", "messages": [{"role": m.role, "content": m.content} for m in messages]}
    headers = {"Authorization": f"Bearer {settings.plugsky_api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=45.0) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"Plugsky Error {response.status_code}: {response.text}")
        data = response.json()
    answer = _extract_text_choice(data)
    return ProviderResult(answer=answer, provider="plugsky")


def call_eight_scale(messages: list[ChatMessage]) -> ProviderResult:
    if not settings.eight_scale_api_key:
        raise RuntimeError("Missing EIGHT_SCALE_API_KEY")
    url = "https://api.8scale.com/v1/chat/completions"
    payload = {"model": "llama-3-70b", "messages": [{"role": m.role, "content": m.content} for m in messages]}
    headers = {"Authorization": f"Bearer {settings.eight_scale_api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=25.0) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"8scale Error {response.status_code}: {response.text}")
        data = response.json()
    answer = _extract_text_choice(data)
    return ProviderResult(answer=answer, provider="8scale")


def call_bazaarlink(messages: list[ChatMessage]) -> ProviderResult:
    if not settings.bazaarlink_api_key:
        raise RuntimeError("Missing BAZAARLINK_API_KEY")
    url = "https://api.bazaarlink.com/v1/chat/completions"
    payload = {"model": "llama-3.1-70b", "messages": [{"role": m.role, "content": m.content} for m in messages]}
    headers = {"Authorization": f"Bearer {settings.bazaarlink_api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=40.0) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"Bazaarlink Error {response.status_code}: {response.text}")
        data = response.json()
    answer = _extract_text_choice(data)
    return ProviderResult(answer=answer, provider="bazaarlink")


def call_free_api(messages: list[ChatMessage]) -> ProviderResult:
    if not settings.free_api_key:
        raise RuntimeError("Missing FREE_API_KEY")
    url = "https://api.free-api.com/v1/chat/completions"
    payload = {"model": "gpt-3.5-turbo", "messages": [{"role": m.role, "content": m.content} for m in messages]}
    headers = {"Authorization": f"Bearer {settings.free_api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=40.0) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"Free-API Error {response.status_code}: {response.text}")
        data = response.json()
    answer = _extract_text_choice(data)
    return ProviderResult(answer=answer, provider="free_api")


def call_cerebras(messages: list[ChatMessage], model: str) -> ProviderResult:
    if not settings.cerebras_api_key:
        raise RuntimeError("Missing CEREBRAS_API_KEY")
    url = "https://api.cerebras.ai/v1/chat/completions"
    payload = {"model": model, "messages": [{"role": m.role, "content": m.content} for m in messages], "temperature": 0.3}
    headers = {"Authorization": f"Bearer {settings.cerebras_api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=20.0) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"Cerebras Error {response.status_code}: {response.text}")
        data = response.json()
    answer = _extract_text_choice(data)
    return ProviderResult(answer=answer, provider="cerebras")


def call_cohere(messages: list[ChatMessage], model: str) -> ProviderResult:
    if not settings.cohere_api_key:
        raise RuntimeError("Missing COHERE_API_KEY")
    url = "https://api.cohere.ai/v1/chat"
    payload = {
        "model": model,
        "message": _last_user_message(messages),
        "chat_history": [{"role": m.role.upper() if m.role != "assistant" else "CHATBOT", "message": m.content} for m in messages[:-1]],
        "temperature": 0.3
    }
    headers = {"Authorization": f"Bearer {settings.cohere_api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=40.0) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"Cohere Error {response.status_code}: {response.text}")
        data = response.json()
    answer = data.get("text", "").strip()
    return ProviderResult(answer=answer, provider="cohere")


def call_you_bot(messages: list[ChatMessage]) -> ProviderResult:
    if not settings.you_api_key:
        raise RuntimeError("Missing YOU_API_KEY")
    url = "https://api.you.com/v1/chat/completions"
    payload = {
        "model": "research",
        "messages": [{"role": m.role, "content": m.content} for m in messages],
        "stream": False
    }
    headers = {"X-API-Key": settings.you_api_key, "Content-Type": "application/json"}
    with httpx.Client(timeout=45.0) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"You.com Error {response.status_code}: {response.text}")
        data = response.json()
    answer = _extract_text_choice(data)
    return ProviderResult(answer=answer, provider="you_bot")


def generate_image(prompt: str, size: str = "1024x1024") -> dict:
    if settings.journey_api_key:
        try:
            url = "https://api.journeyapi.co/v1/midjourney/imagine"
            headers = {"Authorization": f"Bearer {settings.journey_api_key}", "Content-Type": "application/json"}
            payload = {"prompt": prompt}
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("url"):
                         return {"url": data["url"], "provider": "journeyapi"}
        except Exception:
            pass

    if settings.pollinations_api_key:
        try:
            seed = str(datetime.now().timestamp()).replace(".", "")
            url = f"https://pollinations.ai/p/{quote_plus(prompt)}?width=1024&height=1024&seed={seed}&model=flux"
            return {"url": url, "provider": "pollinations"}
        except Exception:
            pass

    if settings.pixazo_api_key:
        try:
            url = "https://api.pixazo.ai/v1/images/generations"
            headers = {"Authorization": f"Bearer {settings.pixazo_api_key}", "Content-Type": "application/json"}
            payload = {"prompt": prompt, "n": 1, "size": size}
            with httpx.Client(timeout=60.0) as client:
                res = client.post(url, headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
            return {"url": data["data"][0]["url"], "provider": "pixazo"}
        except Exception:
            pass

    if settings.openai_api_key:
        try:
            url = "https://api.openai.com/v1/images/generations"
            headers = {"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"}
            payload = {"model": "dall-e-3", "prompt": prompt, "n": 1, "size": size}
            with httpx.Client(timeout=60.0) as client:
                res = client.post(url, headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
            img_data = data.get("data", [{}])[0]
            return {"url": img_data.get("url"), "provider": "openai", "revised_prompt": img_data.get("revised_prompt")}
        except Exception:
            pass

    if settings.huggingface_api_key:
        try:
            # Using FLUX or Stable Diffusion XL on HF
            model = "black-forest-labs/FLUX.1-schnell"
            url = f"https://api-inference.huggingface.co/models/{model}"
            headers = {"Authorization": f"Bearer {settings.huggingface_api_key}"}
            payload = {"inputs": prompt}
            with httpx.Client(timeout=60.0) as client:
                res = client.post(url, headers=headers, json=payload)
                res.raise_for_status()
                return {"url": "https://placehold.co/1024x1024/212121/white?text=Add+Cloudinary+to+store+HF+images", "provider": "huggingface"}
        except Exception:
            pass

    raise RuntimeError("No image generation API keys configured (OpenAI or HuggingFace).")
