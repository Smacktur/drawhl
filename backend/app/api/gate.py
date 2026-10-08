import time

from starlette.requests import HTTPConnection
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.api.errors import error_body
from app.domain.access import Access

COOKIE = "drawhl_session"
# Platform health checks must pass before anyone signs in.
OPEN_PATHS = {"/health", "/ready", "/api/auth/status", "/api/auth/login", "/api/auth/logout"}


def signed_in(connection: HTTPConnection, access: Access) -> bool:
    token = connection.cookies.get(COOKIE)
    return bool(token) and access.is_valid(token, time.time())


class PasswordGate:
    """Closes every route except OPEN_PATHS to requests without a valid session cookie."""

    def __init__(self, app: ASGIApp, access: Access) -> None:
        self.app = app
        self.access = access

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if (
            scope["type"] == "lifespan"
            or scope["path"] in OPEN_PATHS
            or signed_in(HTTPConnection(scope), self.access)
        ):
            await self.app(scope, receive, send)
            return
        if scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 1008})
            return
        response = JSONResponse(error_body("auth_required", "sign in to drawhl"), status_code=401)
        await response(scope, receive, send)
