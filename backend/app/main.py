from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse

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
    app.include_router(router)

    @app.get("/health", include_in_schema=False)
    def health() -> dict:
        return {"status": "ok"}

    @app.get("/ready", include_in_schema=False)
    def ready() -> JSONResponse:
        # Add a probe here for every dependency the service cannot work without.
        checks: dict[str, bool] = {}
        status = 200 if all(checks.values()) else 503
        return JSONResponse({"ready": status == 200, "checks": checks}, status_code=status)

    @app.get("/metrics", include_in_schema=False)
    def metrics() -> Response:
        return metrics_response()

    return app
