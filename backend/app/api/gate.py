import time

from starlette.requests import HTTPConnection
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.api.errors import error_body
from app.domain.sessions import Sessions

COOKIE = "tiko_session"
# Platform health checks must pass before anyone signs in.
OPEN_PATHS = {
    "/health",
    "/ready",
    "/api/auth/status",
    "/api/auth/login",
    "/api/auth/logout",
    # Answers 404 unless the instance is a demo.
    "/api/auth/demo",
}
INVITES = "/api/invites/"
# Boards shown by their public link; the routes there only read.
PUBLIC = "/api/public/"


def is_open(scope: Scope) -> bool:
    path = scope["path"]
    if path in OPEN_PATHS or path.startswith(PUBLIC):
        return True
    # Reading an invite link and accepting it come before the person has an account.
    token = path.removeprefix(INVITES)
    if token == path or not token:
        return False
    method = scope.get("method")
    return (method == "GET" and "/" not in token) or (
        method == "POST" and token.count("/") == 1 and token.endswith("/accept")
    )


class PasswordGate:
    """Puts the signed-in person on the request and closes every route except OPEN_PATHS
    to requests without one."""

    def __init__(self, app: ASGIApp, sessions: Sessions) -> None:
        self.app = app
        self.sessions = sessions

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "lifespan":
            await self.app(scope, receive, send)
            return
        token = HTTPConnection(scope).cookies.get(COOKIE)
        person = self.sessions.resolve(token, time.time()) if token else None
        if person is not None:
            state = scope.setdefault("state", {})
            state["person"], state["session"] = person, token
        if person is not None or is_open(scope):
            await self.app(scope, receive, send)
            return
        if scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 1008})
            return
        response = JSONResponse(error_body("auth_required", "sign in to tiko"), status_code=401)
        await response(scope, receive, send)
