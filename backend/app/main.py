import logging
import ssl

import httpx
from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse

from app.adapters import password_file
from app.adapters.releases.github import GitHubReleaseFeed
from app.adapters.secrets.fernet import FernetSecretBox, NullSecretBox
from app.adapters.storage.sqlite import (
    Database,
    SqliteBoardRepo,
    SqliteSessionRepo,
    SqliteSettingsRepo,
    SqliteSnapshotRepo,
    SqliteUserRepo,
)
from app.adapters.tasks.demo import DemoTaskProvider
from app.adapters.tasks.jira_dc import JiraDcProvider
from app.api.errors import register_error_handlers
from app.api.gate import PasswordGate
from app.api.routes import router
from app.config import Settings, get_settings
from app.domain.accounts import Accounts
from app.domain.ports import ReleaseFeed
from app.domain.refresh import RefreshService
from app.domain.sessions import Sessions
from app.domain.settings import SettingsService
from app.domain.updates import UpdateService
from app.domain.upgrade import bootstrap_admin
from app.observability import (
    RequestContextMiddleware,
    metrics_response,
    register_secret,
    setup_logging,
)
from app.version import VERSION

log = logging.getLogger(__name__)

# The Fernet key is a plain SHA-256 of this string, so a short one is easy to brute-force.
MIN_SECRET_KEY_LENGTH = 32


def _jira_client(settings: Settings, transport: httpx.BaseTransport | None) -> httpx.Client:
    verify: ssl.SSLContext | bool = settings.jira_tls_verify
    if settings.jira_ca_bundle:
        verify = ssl.create_default_context(cafile=settings.jira_ca_bundle)
    return httpx.Client(
        verify=verify, timeout=httpx.Timeout(15.0, connect=5.0), transport=transport
    )


def _password(settings: Settings) -> str:
    """The first admin's password: DRAWHL_PASSWORD, or one generated into the password file."""
    if settings.drawhl_password and settings.drawhl_password.get_secret_value():
        password = settings.drawhl_password.get_secret_value()
    else:
        password, created = password_file.load_or_create(settings.password_file)
        if created:
            # Printed once on purpose: without ENV this is the only way the owner learns it.
            log.warning("drawhl password: %s (saved to %s)", password, settings.password_file)
        else:
            log.info("drawhl password is in %s", settings.password_file)
    register_secret(password)
    return password


def create_app(
    settings: Settings | None = None,
    jira_transport: httpx.BaseTransport | None = None,
    release_feed: ReleaseFeed | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    setup_logging(settings.log_level)

    key = settings.drawhl_secret_key.get_secret_value() if settings.drawhl_secret_key else ""
    if key and len(key) < MIN_SECRET_KEY_LENGTH:
        log.warning("DRAWHL_SECRET_KEY is short; use openssl rand -base64 32")
    app = FastAPI(title=settings.app_name)
    db = Database(settings.db_path)
    users = SqliteUserRepo(db)
    app.state.sessions = Sessions(SqliteSessionRepo(db))
    app.state.accounts = Accounts(users, app.state.sessions)
    created = bootstrap_admin(app.state.accounts, users, lambda: _password(settings))
    env_password = settings.drawhl_password and settings.drawhl_password.get_secret_value()
    if not created and env_password:
        log.info("DRAWHL_PASSWORD is not used once people exist; each signs in with their own")
    # Added before the request context, so it runs inside it and 401s are logged and counted.
    app.add_middleware(PasswordGate, sessions=app.state.sessions)
    app.add_middleware(RequestContextMiddleware)
    register_error_handlers(app)

    app.state.boards = SqliteBoardRepo(db)
    app.state.snapshots = SqliteSnapshotRepo(db)
    box = FernetSecretBox(key) if key else NullSecretBox()
    app.state.refresher = RefreshService()
    service = SettingsService(
        SqliteSettingsRepo(db),
        box,
        secret_key_configured=bool(key),
        on_token=register_secret,
        on_change=app.state.refresher.reset,
    )
    app.state.settings = service
    app.state.demo = DemoTaskProvider()
    client = _jira_client(settings, jira_transport)
    app.state.jira = JiraDcProvider(service.jira_credentials, client)
    app.state.check_jira = lambda creds: JiraDcProvider(lambda: creds, client).check()
    if release_feed is None and settings.update_check:
        release_feed = GitHubReleaseFeed("Smacktur/drawhl", httpx.Client(timeout=5.0))
    app.state.updates = UpdateService(VERSION, release_feed if settings.update_check else None)
    app.include_router(router)

    @app.get("/health", include_in_schema=False)
    def health() -> dict:
        return {"status": "ok"}

    @app.get("/ready", include_in_schema=False)
    def ready() -> JSONResponse:
        checks = {"db": db.ping()}
        status = 200 if all(checks.values()) else 503
        return JSONResponse({"ready": status == 200, "checks": checks}, status_code=status)

    @app.get("/metrics", include_in_schema=False)
    def metrics() -> Response:
        return metrics_response()

    return app
