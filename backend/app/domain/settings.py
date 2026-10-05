from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, SecretStr, field_validator

from app.domain.errors import JiraNotConfigured, SecretUnreadable, ValidationFailed
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


def origin(url: str) -> tuple[str, str, int | None]:
    parsed = urlparse(url)
    return parsed.scheme, (parsed.hostname or "").lower(), parsed.port


def _clean(token: SecretStr | None) -> str | None:
    """Blank means "keep the stored token"; pasted tokens often carry a newline."""
    plain = token.get_secret_value().strip() if token else ""
    return plain or None


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
        on_change: Callable[[], None] = lambda: None,
    ) -> None:
        self._repo = repo
        self._box = box
        self._secret_key_configured = secret_key_configured
        # Lets the log formatter mask the token wherever it might appear.
        self._on_token = on_token
        self._on_change = on_change

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

    def refresh_interval_s(self) -> int:
        return int(self._repo.get_all().get("refresh_interval_s", DEFAULT_INTERVAL_S))

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
        stored = self._repo.get_all()
        values: dict[str, str | None] = {}
        if change.provider is not None:
            values["provider"] = change.provider
        if change.refresh_interval_s is not None:
            values["refresh_interval_s"] = str(change.refresh_interval_s)
        if change.jira is not None:
            plain = _clean(change.jira.token)
            old_url = stored.get("jira_base_url")
            moved = old_url is not None and origin(old_url) != origin(change.jira.base_url)
            # The stored token must never be sent to a host it was not entered for.
            if moved and plain is None and "jira_token_enc" in stored:
                raise ValidationFailed("Enter the token for the new Jira URL.")
            values["jira_base_url"] = change.jira.base_url
            if plain is not None:
                values["jira_token_enc"] = self._box.encrypt(plain)
                self._on_token(plain)
        self._repo.set_many(values)
        self._on_change()
        return self.view()

    def jira_credentials(
        self, base_url: str | None = None, token: SecretStr | None = None
    ) -> JiraCredentials:
        """Stored credentials, each overridable (used to test before saving)."""
        values = self._repo.get_all()
        stored_url = values.get("jira_base_url")
        try:
            url = normalize_base_url(base_url) if base_url else stored_url
        except ValueError as exc:
            raise ValidationFailed(str(exc)) from exc
        plain = _clean(token)
        if plain is not None:
            self._on_token(plain)
            secret = SecretStr(plain)
        else:
            if url and stored_url and origin(url) != origin(stored_url):
                raise JiraNotConfigured("Enter the token for this Jira URL.")
            state, secret = self._token(values)
            if state == "unreadable":
                raise JiraNotConfigured(
                    "The stored token cannot be read. Enter it again in Settings."
                )
        if not url or secret is None:
            raise JiraNotConfigured("Set the Jira URL and token in Settings.")
        return JiraCredentials(base_url=url, token=secret)
