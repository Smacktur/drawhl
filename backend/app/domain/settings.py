from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, SecretStr, field_validator

from app.domain.errors import JiraNotConfigured, SecretUnreadable, ValidationFailed
from app.domain.ports import CredentialRepo, SecretBox, SettingsRepo

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
    """Instance settings (provider, Jira URL, refresh interval) and each person's own token.

    A token is stored with the URL it was entered for and is only ever sent there: when the
    admin moves the instance to another Jira, every token waits to be entered again.
    """

    def __init__(
        self,
        repo: SettingsRepo,
        credentials: CredentialRepo,
        box: SecretBox,
        secret_key_configured: bool,
        on_token: Callable[[str], None] = lambda _: None,
        on_change: Callable[[], None] = lambda: None,
    ) -> None:
        self._repo = repo
        self._credentials = credentials
        self._box = box
        self._secret_key_configured = secret_key_configured
        # Lets the log formatter mask the token wherever it might appear.
        self._on_token = on_token
        self._on_change = on_change

    def _token(self, user_id: str, base_url: str | None) -> tuple[TokenState, SecretStr | None]:
        stored = self._credentials.get(user_id, "jira")
        if stored is None:
            return "none", None
        encrypted, token_url = stored
        if base_url is None or origin(token_url) != origin(base_url):
            return "unreadable", None
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

    def base_url(self) -> str | None:
        return self._repo.get_all().get("jira_base_url")

    def token_state(self, user_id: str) -> TokenState:
        return self._token(user_id, self.base_url())[0]

    def view(self, user_id: str) -> SettingsView:
        values = self._repo.get_all()
        return SettingsView(
            provider="jira" if values.get("provider") == "jira" else "demo",
            refresh_interval_s=int(values.get("refresh_interval_s", DEFAULT_INTERVAL_S)),
            secret_key_configured=self._secret_key_configured,
            jira=JiraView(
                base_url=values.get("jira_base_url"), token_state=self.token_state(user_id)
            ),
        )

    def update(self, change: SettingsIn, user_id: str) -> SettingsView:
        """Instance settings; a token in the change becomes this person's own."""
        values: dict[str, str | None] = {}
        if change.provider is not None:
            values["provider"] = change.provider
        if change.refresh_interval_s is not None:
            values["refresh_interval_s"] = str(change.refresh_interval_s)
        if change.jira is not None:
            values["jira_base_url"] = change.jira.base_url
        self._repo.set_many(values)
        if change.jira is not None and (plain := _clean(change.jira.token)) is not None:
            self.set_token(user_id, SecretStr(plain))
        self._on_change()
        return self.view(user_id)

    def set_token(self, user_id: str, token: SecretStr) -> TokenState:
        plain = _clean(token)
        url = self.base_url()
        if plain is None:
            raise ValidationFailed("token: enter your personal access token")
        if url is None:
            raise JiraNotConfigured("An admin sets the Jira URL in Settings first.")
        self._credentials.set(user_id, "jira", self._box.encrypt(plain), url)
        self._on_token(plain)
        self._on_change()
        return self.token_state(user_id)

    def remove_token(self, user_id: str) -> None:
        self._credentials.delete(user_id, "jira")
        self._on_change()

    def jira_credentials(
        self, user_id: str, base_url: str | None = None, token: SecretStr | None = None
    ) -> JiraCredentials:
        """This person's credentials, each overridable (used to test before saving)."""
        stored_url = self.base_url()
        try:
            url = normalize_base_url(base_url) if base_url else stored_url
        except ValueError as exc:
            raise ValidationFailed(str(exc)) from exc
        plain = _clean(token)
        if plain is not None:
            self._on_token(plain)
            secret: SecretStr | None = SecretStr(plain)
        else:
            if url and stored_url and origin(url) != origin(stored_url):
                raise JiraNotConfigured("Enter the token for this Jira URL.")
            state, secret = self._token(user_id, url)
            if state == "unreadable":
                raise JiraNotConfigured(
                    "Your stored token does not work here any more. Enter it again in Settings."
                )
        if not url:
            raise JiraNotConfigured("An admin sets the Jira URL in Settings first.")
        if secret is None:
            raise JiraNotConfigured("Connect your Jira token in Settings → My tracker.")
        return JiraCredentials(base_url=url, token=secret)
