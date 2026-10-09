from functools import lru_cache
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "tiko"
    app_env: str = "local"
    log_level: str = "info"
    db_path: str = "data/app.db"
    tiko_secret_key: SecretStr | None = None
    tiko_password: SecretStr | None = None
    # Holds the generated password when TIKO_PASSWORD is empty.
    password_file: str = "data/password"
    # Set at deploy time, these win over Settings → Task source and lock it there.
    tiko_tracker: Literal["demo", "jira"] | None = None
    jira_base_url: str | None = None
    jira_tls_verify: bool = True
    jira_ca_bundle: str | None = None
    # Asks GitHub for the latest release every 6 hours to show "update available".
    update_check: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
