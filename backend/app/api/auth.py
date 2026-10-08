import time

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field

from app.api.gate import COOKIE, signed_in
from app.domain.access import SESSION_TTL_S

router = APIRouter(prefix="/auth", tags=["auth"])


class SignInRequest(BaseModel):
    password: str = Field(max_length=1024)


def _https(request: Request) -> bool:
    # Railway and Render end TLS at their edge and pass the scheme on.
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    return proto.split(",")[0].strip() == "https"


@router.get("/status")
def status(request: Request) -> dict:
    return {"signed_in": signed_in(request, request.app.state.access)}


@router.post("/login", status_code=204)
async def login(body: SignInRequest, request: Request) -> Response:
    # Async on purpose: the failure counter is touched only from the event loop thread.
    token = request.app.state.access.sign_in(body.password, time.time())
    response = Response(status_code=204)
    response.set_cookie(
        COOKIE,
        token,
        max_age=SESSION_TTL_S,
        httponly=True,
        samesite="lax",
        secure=_https(request),
    )
    return response


@router.post("/logout", status_code=204)
def logout() -> Response:
    response = Response(status_code=204)
    response.delete_cookie(COOKIE, httponly=True, samesite="lax")
    return response
