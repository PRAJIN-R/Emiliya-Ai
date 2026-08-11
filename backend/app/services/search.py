from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote_plus
import re

import httpx
from tavily import TavilyClient

from app.core.config import settings

BAD_RESULT_HINTS = (
    "1xbet",
    "bet",
    "casino",
    "apk",
    "download",
    "advertisement",
    "sponsored",
    "loan",
    "porn",
)

SPORTS_HINTS = (
    "cricket",
    "match",
    "score",
    "scores",
    "result",
    "results",
    "wicket",
    "wickets",
    "innings",
    "over",
    "overs",
    "batting",
    "bowling",
    "league",
    "fixture",
    "fixtures",
    "tournament",
    "series",
    "final",
    "semi-final",
    "semifinal",
    "scorecard",
    "live score",
    "live scorecard",
)

WEATHER_HINTS = (
    "weather",
    "forecast",
    "temperature",
    "temp",
    "rain",
    "raining",
    "humid",
    "humidity",
    "wind",
    "winds",
    "cloud",
    "cloudy",
    "sunny",
    "storm",
    "stormy",
    "weather today",
    "today weather",
    "tomorrow weather",
)

STOPWORDS = {
    "the",
    "a",
    "an",
    "of",
    "to",
    "in",
    "on",
    "for",
    "and",
    "or",
    "is",
    "are",
    "was",
    "were",
    "it",
    "this",
    "that",
    "with",
    "by",
    "from",
    "as",
    "at",
    "tell",
    "please",
    "give",
    "show",
    "me",
    "about",
    "current",
    "latest",
    "today",
    "yesterday",
    "new",
    "news",
    "now",
}


def search_web(query: str, limit: int = 5) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    seen: set[str] = set()

    normalized_query = _normalize_live_query(query)
    search_tasks = _search_task_order(normalized_query, limit)
    with ThreadPoolExecutor(max_workers=len(search_tasks)) as executor:
        futures = {executor.submit(task): name for name, task in search_tasks}
        for future in as_completed(futures):
            try:
                items = future.result()
            except Exception:
                items = []
            for item in items:
                url = str(item.get("url") or item.get("link") or "").strip()
                title = str(item.get("title") or item.get("name") or "").strip()
                if not title and not url:
                    continue
                fingerprint = url or title.lower()
                if fingerprint in seen:
                    continue
                seen.add(fingerprint)
                results.append(
                    {
                        "title": title or url,
                        "url": url,
                        "snippet": str(item.get("snippet") or item.get("content") or item.get("description") or "").strip(),
                        "source": str(item.get("source") or item.get("provider") or item.get("engine") or "web").strip(),
                        "published_at": str(item.get("published_at") or item.get("publishedAt") or "").strip(),
                    }
                )
                if len(results) >= limit:
                    return results
    return _filter_live_results(_rank_results(results, normalized_query, limit), normalized_query, limit)


def build_live_answer(query: str, results: list[dict[str, Any]]) -> str:
    if not results:
        return ""

    if is_weather_query(query):
        return _build_weather_live_answer(query, results)
    if is_sports_query(query):
        return _build_sports_live_answer(results)

    lines = []
    header = "Here are the freshest live results I found:" if not is_news_query(query) else "Here are the latest live updates I found:"
    lines.append(header)
    for item in results[:3]:
        title = item.get("title") or "Untitled"
        snippet = _clean_snippet(item.get("snippet") or "")
        source = item.get("source") or "web"
        published = item.get("published_at") or ""
        pub_note = f" ({published})" if published else ""
        text = f"- {title}{pub_note} [{source}]"
        if snippet and len(snippet) > 18:
            text += f": {snippet}"
        lines.append(text)
    if is_news_query(query):
        lines.append("If you want, I can narrow this down to a specific team, event, or date.")
    else:
        lines.append("If you want, I can narrow this down to a specific topic or source.")
    return "\n".join(lines)


def web_results_to_context(results: list[dict[str, Any]]) -> str:
    if not results:
        return "No live web results were found."
    lines = []
    for i, item in enumerate(results, start=1):
        title = item.get("title") or "Untitled"
        url = item.get("url") or ""
        snippet = _clean_snippet(item.get("snippet") or "")
        source = item.get("source") or "web"
        published = item.get("published_at") or ""
        published_line = f"\nPublished: {published}" if published else ""
        lines.append(f"{i}. {title} ({source})\nURL: {url}{published_line}\nSummary: {snippet}".strip())
    return "\n\n".join(lines)


def search_snapshot() -> dict[str, bool]:
    return {
        "tavily": bool(settings.tavily_api_key),
        "newsapi": bool(settings.news_api_key),
        "world_news": bool(settings.world_news_api_key),
        "newsdata": bool(settings.newsdata_api_key),
        "mediastack": bool(settings.mediastack_api_key),
        "google_cse": bool(settings.google_search_api_key and settings.google_search_engine_id),
        "firecrawl": bool(settings.firecrawl_api_key),
        "scrape_do": bool(settings.scrape_do_api_key),
    }


def is_news_query(query: str) -> bool:
    lower = query.lower()
    return any(
        word in lower
        for word in (
            "latest",
            "news",
            "today",
            "current",
            "breaking",
            "trending",
            "now",
            "up-to-date",
            "yesterday",
            "match",
            "score",
            "scores",
            "game",
            "games",
            "sports",
            "result",
            "results",
            "fixture",
            "fixtures",
            "league",
            "tournament",
        )
    )


def is_sports_query(query: str) -> bool:
    lower = query.lower()
    return any(word in lower for word in SPORTS_HINTS)


def is_weather_query(query: str) -> bool:
    lower = query.lower()
    return any(word in lower for word in WEATHER_HINTS)


def _normalize_live_query(query: str) -> str:
    cleaned = " ".join(str(query or "").split()).strip()
    if not cleaned:
        return cleaned
    lower = cleaned.lower()
    if is_weather_query(cleaned):
        additions = []
        for token in ("weather", "forecast", "temperature", "today", "current"):
            if token not in lower:
                additions.append(token)
        if additions:
            cleaned = f"{cleaned} {' '.join(additions)}"
    elif is_sports_query(cleaned):
        additions = []
        for token in ("live scorecard", "score", "result", "winner", "wickets", "top scorer", "bowler"):
            if token not in lower:
                additions.append(token)
        if additions:
            cleaned = f"{cleaned} {' '.join(additions)}"
    elif is_news_query(cleaned):
        additions = []
        for token in ("latest", "current", "news", "today"):
            if token not in lower:
                additions.append(token)
        if additions:
            cleaned = f"{cleaned} {' '.join(additions)}"
    return cleaned


def _search_task_order(query: str, limit: int):
    if is_weather_query(query):
        return [
            ("google_cse", lambda: _google_search(query, limit)),
            ("tavily", lambda: _tavily_search(query, limit)),
            ("newsapi", lambda: _news_search(query, limit)),
            ("newsdata", lambda: _newsdata_search(query, limit)),
        ]
    if is_news_query(query):
        return [
            ("newsdata", lambda: _newsdata_search(query, limit)),
            ("world_news", lambda: _world_news_search(query, limit)),
            ("newsapi", lambda: _news_search(query, limit)),
            ("tavily", lambda: _tavily_search(query, limit)),
            ("google_cse", lambda: _google_search(query, limit)),
        ]
    return [
        ("google_cse", lambda: _google_search(query, limit)),
        ("tavily", lambda: _tavily_search(query, limit)),
        ("newsdata", lambda: _newsdata_search(query, limit)),
        ("newsapi", lambda: _news_search(query, limit)),
    ]


def _rank_results(results: list[dict[str, Any]], query: str, limit: int) -> list[dict[str, Any]]:
    if not results:
        return results
    lower_query = query.lower()
    if is_weather_query(query):
        now = datetime.now(timezone.utc)
        max_age_days = 2

        def score(item: dict[str, Any]) -> tuple[int, float, int]:
            published = _parse_datetime(item.get("published_at", ""))
            age_hours = ((now - published).total_seconds() / 3600.0) if published else 9999.0
            title = str(item.get("title", "")).lower()
            snippet = _clean_snippet(str(item.get('snippet', ''))).lower()
            if any(bad in f"{title} {snippet}" for bad in BAD_RESULT_HINTS):
                return (-998, -age_hours, 0)
            weather_terms = ("weather", "forecast", "temperature", "rain", "rainfall", "humidity", "wind", "cloud", "sunny", "storm")
            weather_bonus = sum(1 for token in weather_terms if token in f"{title} {snippet}")
            snippet = f"{title} {snippet}"
            query_hits = sum(1 for token in lower_query.split() if token and token in snippet)
            return (query_hits + weather_bonus, -age_hours, len(snippet))

        ranked = [item for item in sorted(results, key=score, reverse=True) if score(item)[0] > -999]
        if not ranked:
            ranked = sorted(results, key=score, reverse=True)
        return ranked[:limit]
    if is_sports_query(query):
        now = datetime.now(timezone.utc)

        def score(item: dict[str, Any]) -> tuple[int, float, int]:
            published = _parse_datetime(item.get("published_at", ""))
            age_hours = ((now - published).total_seconds() / 3600.0) if published else 9999.0
            title = str(item.get("title", "")).lower()
            snippet = _clean_snippet(str(item.get("snippet", ""))).lower()
            blob = f"{title} {snippet}"
            if any(bad in blob for bad in BAD_RESULT_HINTS):
                return (-999, -age_hours, 0)

            relevance_terms = (
                "cricket",
                "match",
                "score",
                "scorecard",
                "result",
                "results",
                "innings",
                "over",
                "wicket",
                "wickets",
                "runs",
                "run",
                "team",
                "vs",
                "won",
                "win",
                "defeated",
                "beats",
                "beat",
                "player of the match",
                "man of the match",
                "top scorer",
                "bowler",
            )
            relevance_bonus = sum(1 for token in relevance_terms if token in blob)
            query_hits = sum(1 for token in lower_query.split() if token and token in blob)
            score_pattern = 1 if re.search(r"\b\d+\s*[-–]\s*\d+\b", blob) else 0
            cricket_bonus = 2 if "cricket" in blob else 0
            verified_hint = 1 if any(word in blob for word in ("scorecard", "result", "match report", "live", "score")) else 0
            return (query_hits + relevance_bonus + score_pattern + cricket_bonus + verified_hint, -age_hours, len(blob))

        ranked = [item for item in sorted(results, key=score, reverse=True) if score(item)[0] > 0]
        if not ranked:
            ranked = [item for item in sorted(results, key=score, reverse=True) if score(item)[0] > -999]
        return ranked[:limit]
    if is_news_query(query):
        now = datetime.now(timezone.utc)
        max_age_days = _news_window_days(query)

        def score(item: dict[str, Any]) -> tuple[int, float, int]:
            published = _parse_datetime(item.get("published_at", ""))
            age_hours = ((now - published).total_seconds() / 3600.0) if published else 9999.0
            if published and max_age_days is not None and ((now - published).total_seconds() / 86400.0) > max_age_days:
                return (-999, -age_hours, 0)
            title = str(item.get("title", "")).lower()
            snippet = _clean_snippet(str(item.get('snippet', ''))).lower()
            if any(bad in f"{title} {snippet}" for bad in BAD_RESULT_HINTS):
                return (-998, -age_hours, 0)
            sports_terms = SPORTS_HINTS if is_sports_query(query) else ("news", "latest", "current", "breaking", "today", "yesterday", "result")
            sports_bonus = sum(1 for token in sports_terms if token in f"{title} {snippet}")
            snippet = f"{title} {snippet}"
            query_hits = sum(1 for token in lower_query.split() if token and token in snippet)
            return (query_hits + sports_bonus, -age_hours, len(snippet))

        ranked = [item for item in sorted(results, key=score, reverse=True) if score(item)[0] > -999]
        if not ranked:
            ranked = sorted(results, key=score, reverse=True)
        return ranked[:limit]
    return results[:limit]


def _filter_live_results(results: list[dict[str, Any]], query: str, limit: int) -> list[dict[str, Any]]:
    if not results:
        return results
    if not (is_news_query(query) or is_weather_query(query) or is_sports_query(query)):
        return results[:limit]

    lower_query = query.lower()
    query_tokens = [
        token
        for token in re.findall(r"[a-z0-9]+", lower_query)
        if len(token) > 2 and token not in STOPWORDS
    ]
    want_sports = is_sports_query(query)
    want_weather = is_weather_query(query)

    filtered: list[dict[str, Any]] = []
    for item in results:
        title = str(item.get("title", "")).lower()
        snippet = _clean_snippet(str(item.get("snippet", ""))).lower()
        blob = f"{title} {snippet}"
        if any(bad in blob for bad in BAD_RESULT_HINTS):
            continue
        if want_weather:
            if any(term in blob for term in WEATHER_HINTS) or any(token in blob for token in query_tokens) or any(word in blob for word in ("forecast", "temperature", "humidity", "wind", "rain", "sunny", "cloudy", "storm")):
                filtered.append(item)
            continue
        if want_sports:
            score_pattern = bool(re.search(r"\b\d+\s*[-–]\s*\d+\b", blob))
            cricket_terms = ("cricket", "wicket", "wickets", "over", "overs", "innings", "runs", "run", "scorecard", "score", "result", "results", "match", "league", "tournament", "series")
            if (
                any(term in blob for term in cricket_terms)
                or score_pattern
                or any(token in blob for token in query_tokens if token in {"cricket", "match", "score", "result", "results", "league", "tournament", "series", "wicket", "wickets", "innings", "runs"})
            ):
                filtered.append(item)
            continue
        if any(token in blob for token in query_tokens) or is_news_query(query):
            filtered.append(item)

    if filtered:
        return filtered[:limit]
    return []


def _parse_datetime(value: str):
    if not value:
        return None
    value = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def _clean_snippet(text: str) -> str:
    cleaned = str(text or "")
    cleaned = cleaned.replace("\r", " ").replace("\n", " ")
    cleaned = cleaned.replace("<ul>", " ").replace("</ul>", " ").replace("<li>", " • ").replace("</li>", " ")
    while "<" in cleaned and ">" in cleaned:
        start = cleaned.find("<")
        end = cleaned.find(">", start + 1)
        if start < 0 or end < 0:
            break
        cleaned = cleaned[:start] + cleaned[end + 1 :]
    cleaned = " ".join(cleaned.split())
    return cleaned.strip()


def _extract_location_hint(query: str) -> str:
    cleaned = " ".join(str(query or "").split())
    lower = cleaned.lower()
    lower = re.sub(r"\b(?:weather|forecast|temperature|today|current|now|tomorrow|news|latest|breaking|update|updates)\b", " ", lower)
    lower = re.sub(r"\s+", " ", lower).strip()
    parts = re.split(r"\b(?:in|for|at|near|around)\b", lower, maxsplit=1)
    if len(parts) > 1:
        candidate = parts[-1].strip(" ?.,")
        return candidate.title() if candidate else ""
    return lower.title() if lower else ""


def _extract_weather_facts(results: list[dict[str, Any]]) -> dict[str, str]:
    blob = "\n".join(
        f"{item.get('title', '')}\n{_clean_snippet(item.get('snippet') or '')}"
        for item in results
    )
    compact = " ".join(blob.split())
    fact: dict[str, str] = {}

    loc = _extract_location_hint(compact)
    if loc:
        fact["location"] = loc

    temp = re.search(r"(?:temp(?:erature)?|temperature|high|low|forecast)[:\s-]*(-?\d{1,3}(?:\.\d+)?\s?(?:°\s?[CF]|degrees?|deg)?(?:\s?(?:C|F))?)", compact, re.IGNORECASE)
    if temp:
        fact["temperature"] = temp.group(1).strip()

    feels = re.search(r"(?:feels like|realfeel|apparent temperature)[:\s-]*(-?\d{1,3}(?:\.\d+)?\s?(?:°\s?[CF]|degrees?|deg)?(?:\s?(?:C|F))?)", compact, re.IGNORECASE)
    if feels:
        fact["feels_like"] = feels.group(1).strip()

    cond = re.search(r"(?:condition|sky|forecast|weather)[:\s-]*([A-Za-z][A-Za-z ,/\-]{2,40})", compact, re.IGNORECASE)
    if cond:
        fact["condition"] = cond.group(1).strip()

    humidity = re.search(r"humidity[:\s-]*([0-9]{1,3}%?)", compact, re.IGNORECASE)
    if humidity:
        fact["humidity"] = humidity.group(1).strip()

    wind = re.search(r"wind[:\s-]*([0-9]{1,3}(?:\.\d+)?\s?(?:km/h|kph|mph|m/s|knots)?(?:\s?[NSEW]{1,2})?)", compact, re.IGNORECASE)
    if wind:
        fact["wind"] = wind.group(1).strip()

    precipitation = re.search(r"(?:rain|precipitation|chance of rain)[:\s-]*([0-9]{1,3}%?)", compact, re.IGNORECASE)
    if precipitation:
        fact["precipitation"] = precipitation.group(1).strip()

    return fact


def _build_weather_live_answer(query: str, results: list[dict[str, Any]]) -> str:
    best = results[:4]
    facts = _extract_weather_facts(best)
    location = _extract_location_hint(query) or facts.get("location") or "Not specified"
    if not any(value for key, value in facts.items() if key != "location"):
        lines = ["I found live weather-related results, but not enough verified forecast details to quote safely."]
        lines.append(f"Location: {location}")
        lines.append("Try asking with a city or region name for a tighter weather check.")
        lines.append("Sources:")
        for item in best[:3]:
            title = item.get("title") or "Untitled"
            source = item.get("source") or "web"
            published = item.get("published_at") or ""
            pub_note = f" ({published})" if published else ""
            lines.append(f"- {title}{pub_note} [{source}]")
        return "\n".join(lines)

    lines = ["Here is the live weather summary I could verify:"]
    lines.append(f"Location: {location}")
    if facts.get("condition"):
        lines.append(f"Condition: {facts['condition']}")
    if facts.get("temperature"):
        lines.append(f"Temperature: {facts['temperature']}")
    if facts.get("feels_like"):
        lines.append(f"Feels like: {facts['feels_like']}")
    if facts.get("humidity"):
        lines.append(f"Humidity: {facts['humidity']}")
    if facts.get("wind"):
        lines.append(f"Wind: {facts['wind']}")
    if facts.get("precipitation"):
        lines.append(f"Precipitation: {facts['precipitation']}")
    lines.append("")
    lines.append("Sources:")
    for item in best[:3]:
        title = item.get("title") or "Untitled"
        source = item.get("source") or "web"
        published = item.get("published_at") or ""
        pub_note = f" ({published})" if published else ""
        lines.append(f"- {title}{pub_note} [{source}]")
    return "\n".join(lines)


def _build_sports_live_answer(results: list[dict[str, Any]]) -> str:
    best = results[:4]
    parsed = _extract_sports_facts(best)
    if not any(parsed.values()):
        return (
            "I couldn't verify the live score or result from current sources. "
            "Send the team, league, or match date and I’ll narrow it down."
        )

    lines = ["Here are the freshest sports updates I found:"]
    lines.append(f"Match/Teams: {parsed.get('teams') or 'Not verified'}")
    lines.append(f"Score: {parsed.get('score') or 'Not verified'}")
    lines.append(f"Winner: {parsed.get('winner') or 'Not verified'}")
    lines.append(f"Top scorer: {parsed.get('top_scorer') or 'Not verified'}")
    lines.append(f"Best bowler / key performer: {parsed.get('bowler') or 'Not verified'}")
    lines.append(f"Next match / next step: {parsed.get('next_match') or 'Not verified'}")
    lines.append("")
    lines.append("Live sources:")
    for item in best[:3]:
        title = item.get("title") or "Untitled"
        source = item.get("source") or "web"
        published = item.get("published_at") or ""
        pub_note = f" ({published})" if published else ""
        lines.append(f"- {title}{pub_note} [{source}]")
    return "\n".join(lines)


def _extract_sports_facts(results: list[dict[str, Any]]) -> dict[str, str]:
    blob = "\n".join(
        f"{item.get('title', '')}\n{_clean_snippet(item.get('snippet') or '')}"
        for item in results
    )
    compact = " ".join(blob.split())
    fact: dict[str, str] = {}

    score_match = re.search(r"([A-Z][A-Za-z0-9.&' -]{1,40})\s+(\d+)\s*[-–]\s*(\d+)\s+([A-Z][A-Za-z0-9.&' -]{1,40})", compact)
    if score_match:
        fact["teams"] = f"{score_match.group(1).strip()} vs {score_match.group(4).strip()}"
        fact["score"] = f"{score_match.group(1).strip()} {score_match.group(2)}-{score_match.group(3)} {score_match.group(4).strip()}"

    won_by = re.search(r"([A-Z][A-Za-z0-9.&' -]{1,40})\s+(?:won|beats?|beat|def\.?)\s+(?:by|the)?", compact, re.IGNORECASE)
    if won_by and "winner" not in fact:
        fact["winner"] = won_by.group(1).strip()

    if "top scorer" not in fact:
        scorer = re.search(r"(?:top scorer|top scorer[s]?|highest scorer|player of the match|man of the match)[:\s-]*([A-Z][A-Za-z0-9.&' -]{2,40})", compact, re.IGNORECASE)
        if scorer:
            fact["top_scorer"] = scorer.group(1).strip()

    if "bowler" not in fact:
        bowler = re.search(r"(?:best bowler|top wicket[- ]?taker|player of the match|key performer)[:\s-]*([A-Z][A-Za-z0-9.&' -]{2,40})", compact, re.IGNORECASE)
        if bowler:
            fact["bowler"] = bowler.group(1).strip()

    if "next match" not in fact:
        next_match = re.search(r"(?:next match|next game|next fixture)[:\s-]*([A-Z][A-Za-z0-9.&' -]{2,60})", compact, re.IGNORECASE)
        if next_match:
            fact["next_match"] = next_match.group(1).strip()

    return fact


def _tavily_search(query: str, limit: int) -> list[dict[str, Any]]:
    if not settings.tavily_api_key:
        return []
    try:
        client = TavilyClient(api_key=settings.tavily_api_key)
        response = client.search(
            query=query,
            max_results=limit,
            include_answer=False,
            search_depth="advanced",
            include_raw_content=False,
        )
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "snippet": r.get("content", ""),
                "source": "tavily",
            }
            for r in response.get("results", [])
        ]
    except Exception:
        return []


def _google_search(query: str, limit: int) -> list[dict[str, Any]]:
    if not (settings.google_search_api_key and settings.google_search_engine_id):
        return []
    try:
        url = "https://customsearch.googleapis.com/customsearch/v1"
        params = {
            "key": settings.google_search_api_key,
            "cx": settings.google_search_engine_id,
            "q": query,
            "num": min(limit, 10),
            "dateRestrict": _google_date_restrict(query),
        }
        with httpx.Client(timeout=20.0) as client:
            res = client.get(url, params=params)
            res.raise_for_status()
            data = res.json()
        items = data.get("items", [])
        return [
            {
                "title": item.get("title", ""),
                "url": item.get("link", ""),
                "snippet": item.get("snippet", ""),
                "source": "google_cse",
            }
            for item in items[:limit]
        ]
    except Exception:
        return []


def _news_search(query: str, limit: int) -> list[dict[str, Any]]:
    if not settings.news_api_key:
        return []
    try:
        url = "https://newsapi.org/v2/everything"
        params = {
            "q": query,
            "pageSize": min(limit, 10),
            "sortBy": "publishedAt",
            "language": "en",
            "from": (datetime.now(timezone.utc) - timedelta(days=_news_window_days(query) or 30)).date().isoformat(),
            "apiKey": settings.news_api_key,
        }
        with httpx.Client(timeout=20.0) as client:
            res = client.get(url, params=params)
            res.raise_for_status()
            data = res.json()
        articles = data.get("articles", [])
        return [
            {
                "title": article.get("title", ""),
                "url": article.get("url", ""),
                "snippet": article.get("description", "") or article.get("content", ""),
                "source": article.get("source", {}).get("name", "newsapi"),
            }
            for article in articles[:limit]
        ]
    except Exception:
        return []


def _mediastack_search(query: str, limit: int) -> list[dict[str, Any]]:
    if not settings.mediastack_api_key:
        return []
    try:
        url = "http://api.mediastack.com/v1/news"
        params = {
            "access_key": settings.mediastack_api_key,
            "keywords": query,
            "languages": "en",
            "limit": min(limit, 10),
            "sort": "published_desc",
            "date": (datetime.now(timezone.utc) - timedelta(days=_news_window_days(query) or 30)).date().isoformat(),
        }
        with httpx.Client(timeout=20.0) as client:
            res = client.get(url, params=params)
            res.raise_for_status()
            data = res.json()
        articles = data.get("data", []) or []
        return [
            {
                "title": article.get("title", ""),
                "url": article.get("url", ""),
                "snippet": article.get("description", "") or article.get("summary", "") or article.get("content", ""),
                "source": article.get("source", "mediastack"),
                "published_at": article.get("published_at") or article.get("publishedAt") or article.get("published") or "",
            }
            for article in articles[:limit]
        ]
    except Exception:
        return []


def _news_window_days(query: str) -> int | None:
    lower = query.lower()
    if any(word in lower for word in ("yesterday", "today", "now", "breaking")):
        return 2
    if any(word in lower for word in ("match", "score", "result", "results", "game", "games", "sports", "league", "fixture", "fixtures")):
        return 3
    if any(word in lower for word in ("news", "latest", "current", "trending", "up-to-date")):
        return 7
    return None


def _google_date_restrict(query: str) -> str:
    lower = query.lower()
    if is_weather_query(query):
        return "d2"
    if any(word in lower for word in ("yesterday", "today", "now", "breaking")):
        return "d2"
    if any(word in lower for word in ("match", "score", "result", "results", "game", "games", "sports", "league", "fixture", "fixtures")):
        return "d3"
    return "w1" if is_news_query(query) else "m1"


def _firecrawl_search(query: str, limit: int) -> list[dict[str, Any]]:
    if not settings.firecrawl_api_key:
        return []
    try:
        url = "https://api.firecrawl.dev/v1/search"
        payload = {
            "query": query,
            "limit": min(limit, 10),
            "scrapeOptions": {"formats": ["markdown", "html"], "onlyMainContent": True},
        }
        headers = {"Authorization": f"Bearer {settings.firecrawl_api_key}", "Content-Type": "application/json"}
        with httpx.Client(timeout=30.0) as client:
            res = client.post(url, headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()
        items = data.get("data") or data.get("results") or []
        return [
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "snippet": item.get("markdown") or item.get("description") or item.get("content", ""),
                "source": "firecrawl",
            }
            for item in items[:limit]
        ]
    except Exception:
        return []


def _scrape_do_search(query: str, limit: int) -> list[dict[str, Any]]:
    if not settings.scrape_do_api_key:
        return []
    try:
        url = "https://api.scrape.do/"
        params = {
            "token": settings.scrape_do_api_key,
            "url": f"https://www.google.com/search?q={quote_plus(query)}&hl=en&num={min(limit, 10)}",
            "geoCode": "us",
            "render": "true",
        }
        with httpx.Client(timeout=30.0) as client:
            res = client.get(url, params=params)
            res.raise_for_status()
            data = res.json()
        organic = data.get("organicResults") or data.get("organic_results") or data.get("results") or []
        return [
            {
                "title": item.get("title", ""),
                "url": item.get("link") or item.get("url", ""),
                "snippet": item.get("snippet", "") or item.get("description", ""),
                "source": "scrape_do",
            }
            for item in organic[:limit]
        ]
    except Exception:
        return []


def _newsdata_search(query: str, limit: int) -> list[dict[str, Any]]:
    if not settings.newsdata_api_key:
        return []
    try:
        url = "https://newsdata.io/api/1/news"
        params = {"apikey": settings.newsdata_api_key, "q": query, "language": "en"}
        with httpx.Client(timeout=15.0) as client:
            res = client.get(url, params=params)
            res.raise_for_status()
            data = res.json()
        results = data.get("results", []) or []
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("link", ""),
                "snippet": r.get("description", "") or r.get("content", ""),
                "source": r.get("source_id", "newsdata"),
                "published_at": r.get("pubDate", ""),
            }
            for r in results[:limit]
        ]
    except Exception:
        return []


def _world_news_search(query: str, limit: int) -> list[dict[str, Any]]:
    if not settings.world_news_api_key:
        return []
    try:
        url = "https://api.worldnewsapi.com/search-news"
        params = {"api-key": settings.world_news_api_key, "text": query, "number": min(limit, 10), "language": "en"}
        with httpx.Client(timeout=15.0) as client:
            res = client.get(url, params=params)
            res.raise_for_status()
            data = res.json()
        news = data.get("news", []) or []
        return [
            {
                "title": n.get("title", ""),
                "url": n.get("url", ""),
                "snippet": n.get("text", ""),
                "source": "worldnews",
                "published_at": n.get("publish_date", ""),
            }
            for n in news[:limit]
        ]
    except Exception:
        return []
