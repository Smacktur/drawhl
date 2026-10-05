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
from app.domain.settings import SettingsService
from app.observability import (
    RequestContextMiddleware,
    metrics_response,
    register_secret,
    setup_logging,
)


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
    key = settings.drawhl_secret_key
    box = FernetSecretBox(key.get_secret_value()) if key else NullSecretBox()
    service = SettingsService(
        SqliteSettingsRepo(db), box, secret_key_configured=key is not None, on_token=register_secret
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
