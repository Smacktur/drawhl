from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "drawhl"
    app_env: str = "local"
    log_level: str = "info"
    db_path: str = "data/app.db"
    drawhl_secret_key: SecretStr | None = None
    jira_tls_verify: bool = True
    jira_ca_bundle: str | None = None
    # Asks GitHub for the latest release every 6 hours to show "update available".
    update_check: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
