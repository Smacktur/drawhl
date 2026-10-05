import logging
import ssl

import httpx
from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse

from app.adapters.secrets.fernet import FernetSecretBox, NullSecretBox
from app.adapters.storage.sqlite import (
    Database,
    SqliteBoardRepo,
    SqliteSettingsRepo,
    SqliteSnapshotRepo,
)
from app.adapters.tasks.demo import DemoTaskProvider
from app.adapters.tasks.jira_dc import JiraDcProvider
from app.api.errors import register_error_handlers
from app.api.routes import router
from app.config import Settings, get_settings
from app.domain.refresh import RefreshService
from app.domain.settings import SettingsService
from app.observability import (
    RequestContextMiddleware,
    metrics_response,
    register_secret,
    setup_logging,
)

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


def create_app(
    settings: Settings | None = None, jira_transport: httpx.BaseTransport | None = None
) -> FastAPI:
    settings = settings or get_settings()
    setup_logging(settings.log_level)

    app = FastAPI(title=settings.app_name)
    app.add_middleware(RequestContextMiddleware)
    register_error_handlers(app)

    db = Database(settings.db_path)
    app.state.boards = SqliteBoardRepo(db)
    app.state.snapshots = SqliteSnapshotRepo(db)
    key = settings.drawhl_secret_key.get_secret_value() if settings.drawhl_secret_key else ""
    if key and len(key) < MIN_SECRET_KEY_LENGTH:
        log.warning("DRAWHL_SECRET_KEY is short; use openssl rand -base64 32")
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
