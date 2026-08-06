from app.core.config import settings
from app.models.schemas import ChatMessage
import httpx


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
        answer = "Hey! I'm Emilia. Ask me anything and I'll help."
    elif "code" in lower or "error" in lower or "bug" in lower:
        answer = "I can help debug that. Share the relevant code or error message and I'll walk through it."
    elif any(word in lower for word in ("latest", "news", "today", "current")):
        answer = "I'm not connected to live search right now. Add a search key and I can fetch up-to-date results."
    else:
        answer = f"I got your message: {prompt}. Once a provider key is configured, I'll give a full AI response."
    return ProviderResult(answer=answer, provider="local")


def _extract_text_choice(data: dict) -> str:
    return (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
        .strip()
    )


def call_gemini(messages: list[ChatMessage], model: str) -> ProviderResult:
    if not settings.gemini_api_key:
        raise RuntimeError("Missing GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": m.content}]} for m in messages if m.role in ("user", "assistant", "system")]
    }
    with httpx.Client(timeout=30.0) as client:
        response = client.post(url, params={"key": settings.gemini_api_key}, json=payload)
        response.raise_for_status()
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
    answer = data["choices"][0]["message"]["content"].strip()
    return ProviderResult(answer=answer, provider="xai")


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
        answer = data["choices"][0]["message"]["content"].strip()
        return ProviderResult(answer=answer, provider="mistral")


def call_groq(messages: list[ChatMessage], model: str) -> ProviderResult:
    if not settings.groq_api_key:
        raise RuntimeError("Missing GROQ_API_KEY")
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {"model": model, "messages": [{"role": m.role, "content": m.content} for m in messages], "temperature": 0.4}
    headers = {"Authorization": f"Bearer {settings.groq_api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=30.0) as client:
        response = client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
    answer = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    return ProviderResult(answer=answer or "I could not generate a response.", provider="groq")


def call_openrouter(messages: list[ChatMessage], model: str) -> ProviderResult:
    if not settings.openrouter_api_key:
        raise RuntimeError("Missing OPENROUTER_API_KEY")
    url = "https://openrouter.ai/api/v1/chat/completions"
    payload = {"model": model, "messages": [{"role": m.role, "content": m.content} for m in messages], "temperature": 0.5}
    headers = {"Authorization": f"Bearer {settings.openrouter_api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=35.0) as client:
        response = client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
    answer = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    return ProviderResult(answer=answer or "I could not generate a response.", provider="openrouter")


def generate_image(prompt: str, size: str = "1024x1024") -> dict:
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
