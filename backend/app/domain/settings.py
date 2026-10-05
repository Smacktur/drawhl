from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, SecretStr, field_validator

from app.domain.errors import JiraNotConfigured, SecretUnreadable
from app.domain.ports import SecretBox, SettingsRepo

Provider = Literal["demo", "jira"]
TokenState = Literal["none", "set", "unreadable"]

DEFAULT_INTERVAL_S = 30


def normalize_base_url(value: str) -> str:
    url = value.strip().rstrip("/")
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError("expected an http(s) URL like https://jira.example.com")
    return url


class JiraIn(BaseModel):
    base_url: str = Field(max_length=500)
    token: SecretStr | None = None

    @field_validator("base_url")
    @classmethod
    def _url(cls, value: str) -> str:
        return normalize_base_url(value)


class SettingsIn(BaseModel):
    provider: Provider | None = None
    refresh_interval_s: int | None = Field(default=None, ge=30, le=300)
    jira: JiraIn | None = None


class JiraView(BaseModel):
    base_url: str | None
    token_state: TokenState


class SettingsView(BaseModel):
    provider: Provider
    refresh_interval_s: int
    secret_key_configured: bool
    jira: JiraView


@dataclass(frozen=True)
class JiraCredentials:
    base_url: str
    token: SecretStr


class SettingsService:
    def __init__(
        self,
        repo: SettingsRepo,
        box: SecretBox,
        secret_key_configured: bool,
        on_token: Callable[[str], None] = lambda _: None,
    ) -> None:
        self._repo = repo
        self._box = box
        self._secret_key_configured = secret_key_configured
        # Lets the log formatter mask the token wherever it might appear.
        self._on_token = on_token

    def _token(self, values: dict[str, str]) -> tuple[TokenState, SecretStr | None]:
        encrypted = values.get("jira_token_enc")
        if encrypted is None:
            return "none", None
        try:
            plain = self._box.decrypt(encrypted)
        except SecretUnreadable:
            return "unreadable", None
        self._on_token(plain)
        return "set", SecretStr(plain)

    def provider(self) -> Provider:
        return "jira" if self._repo.get_all().get("provider") == "jira" else "demo"

    def view(self) -> SettingsView:
        values = self._repo.get_all()
        state, _ = self._token(values)
        return SettingsView(
            provider="jira" if values.get("provider") == "jira" else "demo",
            refresh_interval_s=int(values.get("refresh_interval_s", DEFAULT_INTERVAL_S)),
            secret_key_configured=self._secret_key_configured,
            jira=JiraView(base_url=values.get("jira_base_url"), token_state=state),
        )

    def update(self, change: SettingsIn) -> SettingsView:
        values: dict[str, str | None] = {}
        if change.provider is not None:
            values["provider"] = change.provider
        if change.refresh_interval_s is not None:
            values["refresh_interval_s"] = str(change.refresh_interval_s)
        if change.jira is not None:
            values["jira_base_url"] = change.jira.base_url
            if change.jira.token is not None:
                plain = change.jira.token.get_secret_value().strip()
                values["jira_token_enc"] = self._box.encrypt(plain) if plain else None
                if plain:
                    self._on_token(plain)
        self._repo.set_many(values)
        return self.view()

    def jira_credentials(
        self, base_url: str | None = None, token: SecretStr | None = None
    ) -> JiraCredentials:
        """Stored credentials, each overridable (used to test before saving)."""
        values = self._repo.get_all()
        url = base_url or values.get("jira_base_url")
        if token is None or not token.get_secret_value().strip():
            state, token = self._token(values)
            if state == "unreadable":
                raise JiraNotConfigured(
                    "The stored token cannot be read. Enter it again in Settings."
                )
        else:
            self._on_token(token.get_secret_value())
        if not url or token is None:
            raise JiraNotConfigured("Set the Jira URL and token in Settings.")
        return JiraCredentials(base_url=normalize_base_url(url), token=token)
