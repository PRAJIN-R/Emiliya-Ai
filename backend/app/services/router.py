from collections.abc import Callable

from app.core.config import settings
from app.models.schemas import ChatMessage
from app.services.providers import call_cerebras, call_cohere, call_gemini, call_groq, call_mistral, call_openrouter, call_xai, call_you_bot, local_fallback_answer
from app.services.search import build_live_answer, is_news_query, is_weather_query, search_snapshot, search_web, web_results_to_context


LATEST_HINTS = (
    "latest",
    "today",
    "news",
    "current",
    "real-time",
    "trending",
    "browse",
    "search",
    "find",
    "yesterday",
    "breaking",
    "score",
    "scores",
    "match",
    "game",
    "fixtures",
    "fixture",
    "sports",
    "results",
    "weather",
    "forecast",
    "temperature",
    "rain",
    "humidity",
    "wind",
)
CODE_HINTS = ("code", "bug", "python", "javascript", "fix", "error")
LIVE_VERIFICATION_SYSTEM_PROMPT = """You are Emilia, a careful live-information assistant.
Answer only using the live sources provided in the context.
Do not use memory, training data, or guesswork for live news, weather, sports, prices, or current events.
If the evidence is weak, incomplete, or contradictory, say you cannot verify it from reliable current sources.
Be concise, factual, and directly answer the user's question.
For sports, include teams, score, winner, top scorer, and top bowler/key performer only if verified.
For weather, include location, condition, temperature, humidity, and wind only if verified.
Always prefer the newest source dates and mention source names naturally in the answer."""


def detect_route(messages: list[ChatMessage], mode: str) -> str:
    if mode != "auto":
        return mode

    text = " ".join([m.content.lower() for m in messages if m.role == "user"])
    if any(h in text for h in LATEST_HINTS) or is_weather_query(text):
        return "search"
    if any(h in text for h in CODE_HINTS):
        return "coding"
    return "chat"


def run_router(messages: list[ChatMessage], mode: str) -> dict:
    route = detect_route(messages, mode)

    if route == "coding":
        candidates = []
        if settings.cerebras_api_key:
            candidates.append(("cerebras", lambda: call_cerebras(messages, settings.cerebras_model)))
        if settings.groq_api_key:
            candidates.append(("groq", lambda: call_groq(messages, settings.groq_model)))
        if settings.xai_api_key:
            candidates.append(("xai", lambda: call_xai(messages, settings.xai_model)))
        if settings.gemini_api_key:
            candidates.append(("gemini", lambda: call_gemini(messages, settings.gemini_model)))
        if settings.you_api_key:
            candidates.append(("you_bot", lambda: call_you_bot(messages)))
        if settings.cohere_api_key:
            candidates.append(("cohere", lambda: call_cohere(messages, settings.cohere_model)))
        if settings.mistral_api_key:
            candidates.append(("mistral", lambda: call_mistral(messages, settings.mistral_model)))
        if settings.openrouter_api_key:
            candidates.append(("openrouter", lambda: call_openrouter(messages, settings.openrouter_model)))
        return {"route": route, **_run_candidates(candidates, messages)}

    if route == "search":
        user_query = next((m.content for m in reversed(messages) if m.role == "user"), "")
        web_results = search_web(user_query, limit=8)
        if web_results:
            verified_context = web_results_to_context(web_results)
            summary_messages = [
                ChatMessage(role="system", content=LIVE_VERIFICATION_SYSTEM_PROMPT),
                ChatMessage(
                    role="user",
                    content=(
                        f"User question: {user_query}\n\n"
                        f"Verified live sources:\n{verified_context}\n\n"
                        "Write the final answer using only the verified sources above."
                    ),
                ),
            ]
            candidates = []
            if settings.you_api_key:
                candidates.append(("you_bot", lambda: call_you_bot(summary_messages)))
            if settings.cerebras_api_key:
                candidates.append(("cerebras", lambda: call_cerebras(summary_messages, settings.cerebras_model)))
            if settings.groq_api_key:
                candidates.append(("groq", lambda: call_groq(summary_messages, settings.groq_model)))
            if settings.gemini_api_key:
                candidates.append(("gemini", lambda: call_gemini(summary_messages, settings.gemini_model)))
            if settings.xai_api_key:
                candidates.append(("xai", lambda: call_xai(summary_messages, settings.xai_model)))
            if settings.mistral_api_key:
                candidates.append(("mistral", lambda: call_mistral(summary_messages, settings.mistral_model)))
            if settings.openrouter_api_key:
                candidates.append(("openrouter", lambda: call_openrouter(summary_messages, settings.openrouter_model)))
            summary_result = _run_candidates(candidates, summary_messages) if candidates else None
            if summary_result and summary_result.get("answer"):
                return {
                    "route": route,
                    "answer": summary_result["answer"],
                    "provider": summary_result.get("provider", "local"),
                    "fallback_used": bool(summary_result.get("fallback_used")),
                    "provider_errors": summary_result.get("provider_errors", []),
                    "verified_sources": web_results,
                }
        
        search_keys_present = any(search_snapshot().values())
        if not search_keys_present:
            route = "chat"
        else:
            answer = build_live_answer(user_query, web_results)
            if not answer or not web_results:
                # If no live results found, fall back to LLM knowledge
                route = "chat"
            else:
                provider = web_results[0].get("source") or "web"
                return {
                    "route": route,
                    "answer": answer,
                    "provider": provider,
                    "fallback_used": False,
                    "provider_errors": [],
                    "verified_sources": web_results,
                }

    candidates = []
    # Speed & intelligence priority
    if settings.you_api_key:
        candidates.append(("you_bot", lambda: call_you_bot(messages)))
    if settings.cerebras_api_key:
        candidates.append(("cerebras", lambda: call_cerebras(messages, settings.cerebras_model)))
    if settings.groq_api_key:
        candidates.append(("groq", lambda: call_groq(messages, settings.groq_model)))
    if settings.gemini_api_key:
        candidates.append(("gemini", lambda: call_gemini(messages, settings.gemini_model)))
    if settings.mistral_api_key:
        candidates.append(("mistral", lambda: call_mistral(messages, settings.mistral_model)))
    if settings.xai_api_key:
        candidates.append(("xai", lambda: call_xai(messages, settings.xai_model)))
    if settings.cohere_api_key:
        candidates.append(("cohere", lambda: call_cohere(messages, settings.cohere_model)))
    if settings.openrouter_api_key:
        candidates.append(("openrouter", lambda: call_openrouter(messages, settings.openrouter_model)))

    return {"route": route, **_run_candidates(candidates, messages)}


def fallback_router(messages: list[ChatMessage]) -> dict:
    candidates = []
    if settings.you_api_key:
        candidates.append(("you_bot", lambda: call_you_bot(messages)))
    if settings.cerebras_api_key:
        candidates.append(("cerebras", lambda: call_cerebras(messages, settings.cerebras_model)))
    if settings.groq_api_key:
        candidates.append(("groq", lambda: call_groq(messages, settings.groq_model)))
    if settings.xai_api_key:
        candidates.append(("xai", lambda: call_xai(messages, settings.xai_model)))
    if settings.gemini_api_key:
        candidates.append(("gemini", lambda: call_gemini(messages, settings.gemini_model)))
    if settings.mistral_api_key:
        candidates.append(("mistral", lambda: call_mistral(messages, settings.mistral_model)))
    if settings.cohere_api_key:
        candidates.append(("cohere", lambda: call_cohere(messages, settings.cohere_model)))
    if settings.openrouter_api_key:
        candidates.append(("openrouter", lambda: call_openrouter(messages, settings.openrouter_model)))
    return {"route": "fallback", **_run_candidates(candidates, messages)}


def provider_snapshot() -> dict:
    search_sources = search_snapshot()
    return {
        "keys_loaded": {
            "gemini": bool(settings.gemini_api_key),
            "xai": bool(settings.xai_api_key),
            "mistral": bool(settings.mistral_api_key),
            "groq": bool(settings.groq_api_key),
            "cerebras": bool(settings.cerebras_api_key),
            "cohere": bool(settings.cohere_api_key),
            "you": bool(settings.you_api_key),
            "openrouter": bool(settings.openrouter_api_key),
            "tavily": bool(settings.tavily_api_key),
            "newsapi": bool(settings.news_api_key),
            "world_news": bool(settings.world_news_api_key),
            "newsdata": bool(settings.newsdata_api_key),
            "deepgram": bool(settings.deepgram_api_key),
            "posthog": bool(settings.posthog_api_key),
            "google_cse": bool(settings.google_search_api_key and settings.google_search_engine_id),
            "firecrawl": bool(settings.firecrawl_api_key),
            "scrape_do": bool(settings.scrape_do_api_key),
            "resend": bool(settings.resend_api_key),
            "cloudinary": bool(settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret),
            "assemblyai": bool(settings.assemblyai_api_key),
            "elevenlabs": bool(settings.elevenlabs_api_key),
            "huggingface": bool(settings.huggingface_api_key),
            "langchain": bool(settings.langchain_api_key),
        },
        "provider_priority": [
            "You.com (Premium Search)",
            "Cerebras (Fast)",
            "Groq (Fast)",
            "Gemini",
            "Mistral",
            "xAI / Grok",
            "Cohere",
            "OpenRouter",
            "Local fallback",
        ],
        "search_sources": search_sources,
        "web_search_available": any(search_sources.values()),
    }


def _run_candidates(candidates: list[tuple[str, Callable[[], dict]]], messages: list[ChatMessage]) -> dict:
    errors: list[str] = []
    for name, runner in candidates:
        try:
            result = runner()
            provider = result.get("provider", name)
            # Ensure we actually got an answer string
            if result.get("answer"):
                return {
                    "answer": result["answer"],
                    "provider": provider,
                    "fallback_used": False,
                    "provider_errors": errors,
                }
            else:
                errors.append(f"{name}: Returned empty answer")
        except Exception as exc:
            print(f"Provider {name} failed: {exc}") # Add logging for debug
            errors.append(f"{name}: {exc}")
    
    # If we are here, all providers failed.
    fallback = local_fallback_answer(messages)
    return {
        "answer": fallback["answer"],
        "provider": fallback["provider"],
        "fallback_used": True,
        "provider_errors": errors,
    }
