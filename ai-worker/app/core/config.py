from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    host: str = "0.0.0.0"
    port: int = 8000
    env: str = "development"

    supabase_url: str
    supabase_service_role_key: str
    supabase_bucket: str = "documents"

    mongo_uri: str
    mongo_db: str = "omniquery"
    mongo_collection: str = "vector_store"
    mongo_vector_index: str = "vector_index"

    qstash_current_signing_key: str
    qstash_next_signing_key: str

    groq_api_key: str
    groq_model: str = "llama-3.1-8b-instant"


@lru_cache
def get_settings() -> Settings:
    return Settings()
