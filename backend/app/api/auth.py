import time

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field

from app.api.deps import AccountsDep, CurrentPerson, SessionsDep
from app.api.gate import COOKIE
from app.domain.accounts import Person
from app.domain.demo import DemoVisitors
from app.domain.errors import NotFound
from app.domain.sessions import SESSION_TTL_S

router = APIRouter(prefix="/auth", tags=["auth"])


class SignInRequest(BaseModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=1024)


def me(person: Person, demo: bool = False) -> dict:
    fields = {"id", "username", "name", "role"}
    # Only a demo instance tells who is a demo visitor; elsewhere the answer is as it was.
    return person.model_dump(include=fields | {"demo_expires_at"} if demo else fields)


def _https(request: Request) -> bool:
    # Railway and Render end TLS at their edge and pass the scheme on.
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    return proto.split(",")[0].strip() == "https"


def _signed_out() -> Response:
    response = Response(status_code=204)
    response.delete_cookie(COOKIE, httponly=True, samesite="lax")
    return response


@router.get("/status")
def status(request: Request) -> dict:
    person = getattr(request.state, "person", None)
    if request.app.state.visitors is None:
        return {"signed_in": person is not None, "me": me(person) if person else None}
    signed_in = person is not None
    return {"signed_in": signed_in, "me": me(person, True) if person else None, "demo": True}


def signed_in(request: Request, token: str) -> Response:
    """A 204 that starts the session in this browser."""
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


@router.post("/login", status_code=204)
def login(body: SignInRequest, request: Request, accounts: AccountsDep) -> Response:
    return signed_in(request, accounts.sign_in(body.username, body.password, time.time()))


def _address(request: Request) -> str:
    # The web container's nginx works the client out and is the only way in to a demo.
    peer = request.client.host if request.client else ""
    return request.headers.get("x-real-ip") or peer


@router.post("/demo", status_code=204)
def start_demo(request: Request) -> Response:
    """Makes a demo visitor and signs them in; only on a demo instance."""
    visitors: DemoVisitors | None = request.app.state.visitors
    if visitors is None:
        raise NotFound("not found")
    if getattr(request.state, "person", None) is not None:
        return Response(status_code=204)
    return signed_in(request, visitors.create(_address(request), time.time()))


@router.post("/logout", status_code=204)
def logout(request: Request, sessions: SessionsDep) -> Response:
    if token := request.cookies.get(COOKIE):
        sessions.end(token)
    return _signed_out()


@router.post("/logout-all", status_code=204)
def logout_all(person: CurrentPerson, sessions: SessionsDep) -> Response:
    sessions.end_all(person.id)
    return _signed_out()
