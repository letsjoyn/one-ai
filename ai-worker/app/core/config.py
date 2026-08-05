from functools import lru_cache

from pydantic import model_validator
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
    mongo_server_selection_timeout_ms: int = 10000
    max_pdf_pages: int = 250

    qstash_current_signing_key: str
    qstash_next_signing_key: str
    internal_api_key: str = "local-development-only"
    metrics_api_key: str = "local-metrics-only"
    log_level: str = "INFO"

    groq_api_key: str
    groq_model: str = "openai/gpt-oss-20b"

    @model_validator(mode="after")
    def validate_production_secrets(self):
        if self.env != "production":
            return self

        if len(self.internal_api_key) < 32 or self.internal_api_key == "local-development-only":
            raise ValueError("INTERNAL_API_KEY must be at least 32 characters in production")
        if len(self.metrics_api_key) < 32 or self.metrics_api_key == "local-metrics-only":
            raise ValueError("METRICS_API_KEY must be at least 32 characters in production")
        if not self.qstash_current_signing_key or not self.qstash_next_signing_key:
            raise ValueError("QStash signing keys are required in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
