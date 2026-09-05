from collections.abc import Callable

from app.core.config import settings
from app.models.schemas import ChatMessage
from app.services.memory import retrieve_memory, store_memory
from app.services.providers import (
    call_ai_horde,
    call_bazaarlink,
    call_cerebras,
    call_claude,
    call_cohere,
    call_edyx,
    call_eight_scale,
    call_free_api,
    call_gemini,
    call_groq,
    call_mistral,
    call_openrouter,
    call_plugsky,
    call_pollinations_text,
    call_xai,
    call_you_bot,
    generate_image,
    local_fallback_answer,
)
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
    "update",
    "updates",
    "patch",
    "newest",
)
CODE_HINTS = ("code", "bug", "python", "javascript", "fix", "error")
LIVE_VERIFICATION_SYSTEM_PROMPT = """You are Emilia, a highly intelligent AI assistant with real-time web browsing capabilities.
Your goal is to provide the most accurate, detailed, and up-to-date information available.
When you see live search results with dates (like 2024, 2025, 2026), you MUST prioritize them over your internal training data.
If the search results mention a specific version (like OB54) or event (9th Anniversary), focus your answer on those current details.
For Shopping, Brand, or Product queries: Proactively search for and provide verified official website links. Ensure the user can easily find where to buy or learn more about the brand/product.
Always prefer official sources. If you find a direct link to a product or company, include it in your response using markdown [Title](URL).
Combine the live search results with your general reasoning to provide a detailed, proactive, and helpful response.
Be conversational and professional, matching the standard of top-tier assistants like ChatGPT, Gemini, and Grok.
Always mention the source names (e.g., 'According to Garena...') to build trust."""


IMAGE_HINTS = ("generate image", "create image", "draw", "visualize", "show me a picture of", "make a photo of", "generate an image", "create an image", "paint me", "sketch", "illustration of")

SYSTEM_PROMPT_HUMAN_CENTRIC = """You are Emilia, a highly intelligent and empathetic AI assistant.
Your goal is to provide deeply analyzed, accurate, and human-centric responses.
When a user asks a question, don't just give a surface-level answer. Analyze the intent, consider the context, and provide a comprehensive response that is easy to understand.
Be proactive, friendly, and professional. Match the standard of top-tier assistants like Claude or ChatGPT.
If the response is complex, use clear sections or bullet points to improve readability.
Always prioritize being helpful and direct."""

def detect_route(messages: list[ChatMessage], mode: str) -> str:
    if mode != "auto":
        return mode

    text = " ".join([m.content.lower() for m in messages if m.role == "user"])
    
    # 1. Image generation intent
    if any(h in text for h in IMAGE_HINTS):
        return "image_gen"

    # 2. Research intent: Complex, deep questions
    research_hints = ("research", "deep dive", "comprehensive report", "detailed analysis", "technical overview", "explain in detail")
    if any(h in text for h in research_hints):
        return "research"

    # 3. Search intent: Latest news, real-time facts
    if any(h in text for h in LATEST_HINTS) or is_weather_query(text) or is_news_query(text):
        return "search"
        
    # 4. Coding intent: Logic, programming, math
    if any(h in text for h in CODE_HINTS) or any(math_hint in text for math_hint in ("calculate", "solve", "formula", "integral", "derivative")):
        return "coding"

    return "chat"


def run_router(messages: list[ChatMessage], mode: str, user_id: str | None = None, images: list[str] | None = None) -> dict:
    route = detect_route(messages, mode)

    # 0. Image Generation Trigger
    if route == "image_gen":
        user_query = next((m.content for m in reversed(messages) if m.role == "user"), "")
        try:
            # Clean up query to get the prompt
            prompt = user_query
            for h in IMAGE_HINTS:
                prompt = prompt.replace(h, "")
            prompt = prompt.strip(" ,.!")
            if not prompt:
                prompt = user_query
            
            img_result = generate_image(prompt)
            return {
                "route": "image_gen",
                "answer": f"I've generated an image for you: \"{prompt}\"\n\n![Generated Image]({img_result['url']})",
                "provider": img_result["provider"],
                "fallback_used": False,
                "provider_errors": []
            }
        except Exception as e:
            print(f"Auto image gen failed: {e}")
            # Continue to chat if image gen fails

    # 0.5. Multimodal Override: If images are present, force Gemini Vision
    if images:
        return {"route": "vision", **_run_candidates([("gemini", lambda: call_gemini(messages, settings.gemini_model, images))], messages)}

    # 1. Memory retrieval for personalized context
    if user_id:
        user_query = next((m.content for m in reversed(messages) if m.role == "user"), "")
        long_term_memory = retrieve_memory(user_id, user_query)
        if long_term_memory:
            # Inject memory as a system hint if relevant
            messages = [
                ChatMessage(role="system", content=f"User's past context/memory:\n{long_term_memory}"),
                *messages
            ]

    # Inject human-centric system prompt
    messages = [ChatMessage(role="system", content=SYSTEM_PROMPT_HUMAN_CENTRIC)] + messages

    result = {}
    candidates = []

    if route == "research":
        user_query = next((m.content for m in reversed(messages) if m.role == "user"), "")
        # Deep research: Search more sources with higher limit
        web_results = search_web(user_query, limit=15)
        if web_results:
            verified_context = web_results_to_context(web_results)
            summary_messages = [
                ChatMessage(role="system", content="""You are Emilia in Deep Research Mode.
Your goal is to provide a comprehensive, multi-perspective report based on the provided live sources.
Synthesize the information into clear sections: Overview, Key Findings, Details, and Sources.
Be extremely thorough and cite your sources by name."""),
                ChatMessage(
                    role="user",
                    content=f"Perform deep research on: {user_query}\n\nSources:\n{verified_context}"
                ),
            ]
            candidates = []
            if settings.anthropic_api_key:
                candidates.append(("claude", lambda: call_claude(summary_messages, settings.anthropic_model)))
            if settings.gemini_api_key:
                candidates.append(("gemini", lambda: call_gemini(summary_messages, settings.gemini_model)))
            if settings.groq_api_key:
                candidates.append(("groq", lambda: call_groq(summary_messages, settings.groq_model)))
            if settings.mistral_api_key:
                candidates.append(("mistral", lambda: call_mistral(summary_messages, settings.mistral_model)))
            
            # Universal Fallback
            candidates.append(("pollinations", lambda: call_pollinations_text(summary_messages)))

            summary_result = _run_candidates(candidates, summary_messages)
            if summary_result and summary_result.get("answer"):
                result = {
                    "route": "research",
                    "answer": summary_result["answer"],
                    "provider": summary_result.get("provider", "local"),
                    "fallback_used": bool(summary_result.get("fallback_used")),
                    "provider_errors": summary_result.get("provider_errors", []),
                    "verified_sources": web_results,
                }

    if not result and route == "coding":
        candidates = []
        if settings.cerebras_api_key:
            candidates.append(("cerebras", lambda: call_cerebras(messages, settings.cerebras_model)))
        if settings.groq_api_key:
            candidates.append(("groq", lambda: call_groq(messages, settings.groq_model)))
        if settings.anthropic_api_key:
            candidates.append(("claude", lambda: call_claude(messages, settings.anthropic_model)))
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
        
        # Universal Fallback
        candidates.append(("pollinations", lambda: call_pollinations_text(messages)))

        result = {"route": route, **_run_candidates(candidates, messages)}

    elif route == "search":
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
                        f"Current live information from the web:\n{verified_context}\n\n"
                        "Using the live information above as your primary guide, provide a detailed and accurate answer. "
                        "If the live info mentions a 2024, 2025, or 2026 date, ensure you don't use old info from 2023."
                    ),
                ),
            ]
            candidates = []
            if settings.anthropic_api_key:
                candidates.append(("claude", lambda: call_claude(summary_messages, settings.anthropic_model)))
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
            
            # Universal Fallback
            candidates.append(("pollinations", lambda: call_pollinations_text(summary_messages)))

            summary_result = _run_candidates(candidates, summary_messages) if candidates else None
            if summary_result and summary_result.get("answer") and "cannot verify" not in summary_result["answer"].lower():
                result = {
                    "route": route,
                    "answer": summary_result["answer"],
                    "provider": summary_result.get("provider", "local"),
                    "fallback_used": bool(summary_result.get("fallback_used")),
                    "provider_errors": summary_result.get("provider_errors", []),
                    "verified_sources": web_results,
                }
            else:
                route = "chat" # fallback if search summary failed or refused
        
        if not result:
            search_keys_present = any(search_snapshot().values())
            if not search_keys_present:
                route = "chat"
            else:
                answer = build_live_answer(user_query, web_results)
                if not answer or not web_results:
                    route = "chat"
                else:
                    provider = web_results[0].get("source") or "web"
                    result = {
                        "route": route,
                        "answer": answer,
                        "provider": provider,
                        "fallback_used": False,
                        "provider_errors": [],
                        "verified_sources": web_results,
                    }

    if route == "chat" or not result:
        candidates = []
        if settings.cerebras_api_key:
            candidates.append(("cerebras", lambda: call_cerebras(messages, settings.cerebras_model)))
        if settings.groq_api_key:
            candidates.append(("groq", lambda: call_groq(messages, settings.groq_model)))
        if settings.anthropic_api_key:
            candidates.append(("claude", lambda: call_claude(messages, settings.anthropic_model)))
        if settings.you_api_key:
            candidates.append(("you_bot", lambda: call_you_bot(messages)))
        if settings.edyx_api_key:
            candidates.append(("edyx", lambda: call_edyx(messages)))
        if settings.plugsky_api_key:
            candidates.append(("plugsky", lambda: call_plugsky(messages)))
        if settings.free_api_key:
            candidates.append(("free_api", lambda: call_free_api(messages)))
        if settings.bazaarlink_api_key:
            candidates.append(("bazaarlink", lambda: call_bazaarlink(messages)))
        if settings.gemini_api_key:
            candidates.append(("gemini", lambda: call_gemini(messages, settings.gemini_model)))
        if settings.mistral_api_key:
            candidates.append(("mistral", lambda: call_mistral(messages, settings.mistral_model)))
        if settings.xai_api_key:
            candidates.append(("xai", lambda: call_xai(messages, settings.xai_model)))
        if settings.cohere_api_key:
            candidates.append(("cohere", lambda: call_cohere(messages, settings.cohere_model)))
        if settings.ai_horde_api_key:
            candidates.append(("ai_horde", lambda: call_ai_horde(messages)))
        if settings.openrouter_api_key:
            candidates.append(("openrouter", lambda: call_openrouter(messages, settings.openrouter_model)))
        
        # Free/Instant Universal Fallback
        candidates.append(("pollinations", lambda: call_pollinations_text(messages)))

        result = {"route": route, **_run_candidates(candidates, messages)}

    # Auto-store the exchange in long-term memory if user_id present
    if user_id and result.get("answer"):
        last_query = next((m.content for m in reversed(messages) if m.role == "user"), "")
        if last_query:
            store_memory(user_id, f"Q: {last_query}\nA: {result['answer']}")

    return result


def fallback_router(messages: list[ChatMessage]) -> dict:
    candidates = []
    if settings.anthropic_api_key:
        candidates.append(("claude", lambda: call_claude(messages, settings.anthropic_model)))
    if settings.you_api_key:
        candidates.append(("you_bot", lambda: call_you_bot(messages)))
    if settings.cerebras_api_key:
        candidates.append(("cerebras", lambda: call_cerebras(messages, settings.cerebras_model)))
    if settings.groq_api_key:
        candidates.append(("groq", lambda: call_groq(messages, settings.groq_model)))
    if settings.edyx_api_key:
        candidates.append(("edyx", lambda: call_edyx(messages)))
    if settings.plugsky_api_key:
        candidates.append(("plugsky", lambda: call_plugsky(messages)))
    if settings.xai_api_key:
        candidates.append(("xai", lambda: call_xai(messages, settings.xai_model)))
    if settings.gemini_api_key:
        candidates.append(("gemini", lambda: call_gemini(messages, settings.gemini_model)))
    if settings.mistral_api_key:
        candidates.append(("mistral", lambda: call_mistral(messages, settings.mistral_model)))
    if settings.cohere_api_key:
        candidates.append(("cohere", lambda: call_cohere(messages, settings.cohere_model)))
    if settings.ai_horde_api_key:
        candidates.append(("ai_horde", lambda: call_ai_horde(messages)))
    if settings.openrouter_api_key:
        candidates.append(("openrouter", lambda: call_openrouter(messages, settings.openrouter_model)))
        
    # Free Universal Fallback
    candidates.append(("pollinations", lambda: call_pollinations_text(messages)))

    return {"route": "fallback", **_run_candidates(candidates, messages)}


def provider_snapshot() -> dict:
    search_sources = search_snapshot()
    return {
        "keys_loaded": {
            "gemini": bool(settings.gemini_api_key),
            "claude": bool(settings.anthropic_api_key),
            "xai": bool(settings.xai_api_key),
            "mistral": bool(settings.mistral_api_key),
            "groq": bool(settings.groq_api_key),
            "cerebras": bool(settings.cerebras_api_key),
            "cohere": bool(settings.cohere_api_key),
            "you": bool(settings.you_api_key),
            "openrouter": bool(settings.openrouter_api_key),
            "ai_horde": bool(settings.ai_horde_api_key),
            "edyx": bool(settings.edyx_api_key),
            "plugsky": bool(settings.plugsky_api_key),
            "remem": bool(settings.remem_api_key),
            "cathedral": bool(settings.cathedral_api_key),
            "audaxic": bool(settings.audaxic_api_key),
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
            "Cerebras (Ultra-Fast)",
            "Groq (Fast)",
            "Anthropic Claude 3.5 (Premium Logic)",
            "You.com (Premium Search)",
            "Gemini (Multimodal)",
            "xAI / Grok",
            "Mistral",
            "Cohere",
            "AI Horde",
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
