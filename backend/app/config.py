from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "drawhl"
    app_env: str = "local"
    log_level: str = "info"


@lru_cache
def get_settings() -> Settings:
    return Settings()
