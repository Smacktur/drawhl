import time

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field

from app.api.deps import AccountsDep, CurrentPerson, SessionsDep
from app.api.gate import COOKIE
from app.domain.accounts import Person
from app.domain.sessions import SESSION_TTL_S

router = APIRouter(prefix="/auth", tags=["auth"])


class SignInRequest(BaseModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=1024)


def me(person: Person) -> dict:
    return person.model_dump(include={"id", "username", "name", "role"})


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
    return {"signed_in": person is not None, "me": me(person) if person else None}


@router.post("/login", status_code=204)
def login(body: SignInRequest, request: Request, accounts: AccountsDep) -> Response:
    token = accounts.sign_in(body.username, body.password, time.time())
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
def logout(request: Request, sessions: SessionsDep) -> Response:
    if token := request.cookies.get(COOKIE):
        sessions.end(token)
    return _signed_out()


@router.post("/logout-all", status_code=204)
def logout_all(person: CurrentPerson, sessions: SessionsDep) -> Response:
    sessions.end_all(person.id)
    return _signed_out()
