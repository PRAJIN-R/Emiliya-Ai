from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(system|user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    mode: str = "auto"
    user_id: str | None = None


class ChatResponse(BaseModel):
    answer: str
    provider: str
    route: str
    source_name: str = "assistant"
    freshness: str = "chat"
    provider_errors: list[str] = []


class SearchRequest(BaseModel):
    query: str


class SearchResponse(BaseModel):
    query: str
    results: list[dict]


class DebugChatRequest(BaseModel):
    prompt: str
    mode: str = "auto"


class AuthEmailEventRequest(BaseModel):
    email: str


class ImageRequest(BaseModel):
    prompt: str
    size: str = "1024x1024"


class ImageResponse(BaseModel):
    url: str
    provider: str
    revised_prompt: str | None = None
