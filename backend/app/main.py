from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse

from app.adapters.storage.sqlite import Database, SqliteBoardRepo, SqliteSnapshotRepo
from app.adapters.tasks.demo import DemoTaskProvider
from app.api.errors import register_error_handlers
from app.api.routes import router
from app.config import Settings, get_settings
from app.observability import RequestContextMiddleware, metrics_response, setup_logging


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    setup_logging(settings.log_level)

    app = FastAPI(title=settings.app_name)
    app.add_middleware(RequestContextMiddleware)
    register_error_handlers(app)

    db = Database(settings.db_path)
    app.state.boards = SqliteBoardRepo(db)
    app.state.snapshots = SqliteSnapshotRepo(db)
    app.state.provider = DemoTaskProvider()
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
