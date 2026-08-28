from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
import json
import asyncio

from app.models.schemas import AuthEmailEventRequest, ChatMessage, ChatRequest, ChatResponse, DebugChatRequest, ImageRequest, ImageResponse, SearchRequest, SearchResponse
from app.services.router import detect_route, fallback_router, provider_snapshot, run_router
from app.services.providers import generate_image, local_fallback_answer
from app.services.email import send_welcome_back_email, send_welcome_email
from app.core.config import settings
from app.services.search import is_news_query, is_weather_query, search_web

router = APIRouter()


def _provider_detail(exc: Exception) -> str:
    message = str(exc).strip()
    if not message:
        return "Chat provider failed."
    return message


@router.get("/health")
def api_health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/providers")
def api_health_providers() -> dict:
    return provider_snapshot()


@router.get("/debug/providers")
def debug_providers(prompt: str = "hello") -> dict:
    route = detect_route([ChatMessage(role="user", content=prompt)], "auto")
    return {"route_for_prompt": route, **provider_snapshot()}


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    try:
        result = run_router(payload.messages, payload.mode, user_id=payload.user_id, images=payload.images)
    except Exception as exc:
        fallback = local_fallback_answer(payload.messages)
        result = {
            "route": "fallback",
            "answer": fallback["answer"],
            "provider": fallback["provider"],
            "fallback_used": True,
            "provider_errors": [str(exc)] if str(exc).strip() else ["provider failure"],
        }
    route = result.get("route", "fallback")
    provider = result.get("provider", "local")
    source_name, freshness = _response_labels(route, provider, payload.messages)
    return ChatResponse(
        answer=result.get("answer", ""),
        provider=provider,
        route=route,
        source_name=source_name,
        freshness=freshness,
        provider_errors=result.get("provider_errors", []),
    )


@router.post("/debug/chat")
def debug_chat(payload: DebugChatRequest) -> dict:
    messages = [ChatMessage(role="user", content=payload.prompt)]
    try:
        result = run_router(messages, payload.mode)
    except Exception as exc:
        fallback = local_fallback_answer(messages)
        result = {
            "route": "fallback",
            "answer": fallback["answer"],
            "provider": fallback["provider"],
            "fallback_used": True,
            "provider_errors": [str(exc)] if str(exc).strip() else ["provider failure"],
        }
    return {
        "prompt": payload.prompt,
        "provider": result.get("provider"),
        "route": result.get("route"),
        "source_name": _response_labels(result.get("route", "fallback"), result.get("provider", "local"), messages)[0],
        "freshness": _response_labels(result.get("route", "fallback"), result.get("provider", "local"), messages)[1],
        "fallback_used": bool(result.get("fallback_used")),
        "provider_errors": result.get("provider_errors", []),
        "answer": result.get("answer", ""),
    }


@router.post("/chat/stream")
async def chat_stream(payload: ChatRequest) -> StreamingResponse:
    try:
        result = run_router(payload.messages, payload.mode)
    except Exception as exc:
        fallback = local_fallback_answer(payload.messages)
        result = {
            "route": "fallback",
            "answer": fallback["answer"],
            "provider": fallback["provider"],
            "fallback_used": True,
            "provider_errors": [str(exc)] if str(exc).strip() else ["provider failure"],
        }
    answer = result.get("answer", "") or ""

    async def event_gen():
        yield f"data: {json.dumps({'type': 'meta', 'provider': result.get('provider'), 'route': result.get('route')})}\n\n"
        yield f"data: {json.dumps({'type': 'meta2', 'source_name': _response_labels(result.get('route', 'fallback'), result.get('provider', 'local'), payload.messages)[0], 'freshness': _response_labels(result.get('route', 'fallback'), result.get('provider', 'local'), payload.messages)[1]})}\n\n"
        for token in answer.split(" "):
            await asyncio.sleep(0.02)
            yield f"data: {json.dumps({'type': 'token', 'value': token + ' '})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")


@router.post("/search", response_model=SearchResponse)
def search(payload: SearchRequest) -> SearchResponse:
    try:
        results = search_web(payload.query, limit=6)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Search provider failed: {exc}") from exc
    return SearchResponse(query=payload.query, results=results)


@router.post("/generate/image", response_model=ImageResponse)
async def api_generate_image(payload: ImageRequest) -> ImageResponse:
    try:
        result = generate_image(payload.prompt, payload.size)
        return ImageResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


def _response_labels(route: str | None, provider: str | None, messages: list[ChatMessage]) -> tuple[str, str]:
    normalized_route = (route or "").lower()
    normalized_provider = (provider or "assistant").lower()
    user_text = " ".join(m.content.lower() for m in messages if m.role == "user")
    if normalized_route == "search" or is_news_query(user_text) or is_weather_query(user_text):
        if is_weather_query(user_text):
            return ("weather", "weather")
        freshness = "news" if is_news_query(user_text) else "web"
        return (freshness, freshness)
    if normalized_route == "fallback" or normalized_provider == "local":
        return ("fallback", "fallback")
    if normalized_route == "coding":
        return (normalized_provider, "chat")
    return (normalized_provider, "chat")


@router.post("/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)) -> dict:
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    content = await file.read()
    # TODO: Chunk + embed in ChromaDB via LangChain
    return {
        "filename": file.filename,
        "size": len(content),
        "status": "received",
        "next": "Implement chunk + embedding pipeline",
    }


@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...)) -> dict:
    content = await file.read()
    # TODO: Send bytes to Gemini vision endpoint
    return {
        "filename": file.filename,
        "size": len(content),
        "status": "received",
        "next": "Implement Gemini vision analyzer",
    }


@router.post("/auth/post-signup")
def auth_post_signup(payload: AuthEmailEventRequest) -> dict[str, str]:
    try:
        send_welcome_email(payload.email)
        return {"status": "sent"}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to send welcome email: {exc}") from exc


@router.post("/auth/post-login")
def auth_post_login(payload: AuthEmailEventRequest) -> dict[str, str]:
    try:
        send_welcome_back_email(payload.email)
        return {"status": "sent"}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to send welcome-back email: {exc}") from exc
