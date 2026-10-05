import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.domain.errors import (
    DependencyUnavailable,
    DomainError,
    HostMismatch,
    InvalidRef,
    NotFound,
    TaskNotFound,
    ValidationFailed,
    VersionConflict,
)

log = logging.getLogger(__name__)

_STATUS = {
    ValidationFailed: 422,
    NotFound: 404,
    DependencyUnavailable: 503,
    VersionConflict: 409,
    InvalidRef: 422,
    HostMismatch: 422,
    TaskNotFound: 404,
}


def error_body(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def domain_error(_: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            error_body(exc.code, exc.message), status_code=_STATUS.get(type(exc), 400)
        )

    @app.exception_handler(RequestValidationError)
    async def request_invalid(_: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0]
        field = ".".join(str(part) for part in first["loc"][1:]) or "body"
        return JSONResponse(
            error_body("invalid_request", f"{field}: {first['msg']}"), status_code=422
        )

    @app.exception_handler(Exception)
    async def unexpected(_: Request, exc: Exception) -> JSONResponse:
        log.exception("unhandled error")
        return JSONResponse(error_body("internal", "internal server error"), status_code=500)
