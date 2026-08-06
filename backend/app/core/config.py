from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Knowledge Assistant"
    environment: str = "dev"

    gemini_api_key: str = ""
    xai_api_key: str = ""
    mistral_api_key: str = ""
    groq_api_key: str = ""
    openrouter_api_key: str = ""
    openai_api_key: str = ""
    tavily_api_key: str = ""
    news_api_key: str = ""
    mediastack_api_key: str = ""
    scrape_do_api_key: str = ""
    firecrawl_api_key: str = ""
    google_search_api_key: str = ""
    google_search_engine_id: str = ""
    resend_api_key: str = ""
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    assemblyai_api_key: str = ""
    elevenlabs_api_key: str = ""
    huggingface_api_key: str = ""
    langchain_api_key: str = ""
    email_from: str = "no-reply@example.com"
    email_sender_name: str = "Emilia"

    gemini_model: str = "gemini-1.5-flash"
    xai_model: str = "grok-4.3"
    mistral_model: str = "mistral-large-latest"
    groq_model: str = "llama-3.3-70b-versatile"
    openrouter_model: str = "mistralai/mistral-small-3.1-24b-instruct"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
