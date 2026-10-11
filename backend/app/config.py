from functools import lru_cache
from typing import Literal

from pydantic import SecretStr, model_validator
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
    # Optional and read-only: raises GitHub's request limit for public issues from 60 to 5000
    # an hour. It is shared by everyone, so private repositories are never read with it.
    github_token: SecretStr | None = None
    # Asks GitHub for the latest release every 6 hours to show "update available".
    update_check: bool = True
    # A public demo: visitors start without an account, on the demo tasks only.
    tiko_demo: bool = False

    @model_validator(mode="after")
    def _demo_has_no_tracker(self) -> "Settings":
        if self.tiko_demo and self.tiko_tracker == "jira":
            raise ValueError("TIKO_DEMO=1 runs on the demo tasks; remove TIKO_TRACKER=jira")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
