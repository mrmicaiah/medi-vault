"""Application configuration using pydantic-settings."""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra env vars
    )

    # Supabase
    supabase_url: str = "https://your-project.supabase.co"
    supabase_key: str = "your-anon-key"  # Public anon key
    supabase_service_key: str = "your-service-role-key"  # Service role key for admin ops

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # Storage buckets
    documents_bucket: str = "documents"
    agreements_bucket: str = "agreements"

    # Upload limits (10 MB default)
    max_upload_size: int = 10_485_760

    # Application
    app_env: str = "development"
    app_port: int = 8000

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
