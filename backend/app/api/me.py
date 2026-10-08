from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field, SecretStr

from app.api import deps
from app.api.auth import me
from app.api.deps import AccountsDep, CurrentPerson
from app.domain.settings import SettingsService, TokenState

router = APIRouter(prefix="/me", tags=["me"])


class MeUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    username: str | None = Field(default=None, max_length=200)


class PasswordChange(BaseModel):
    current: str = Field(max_length=1024)
    new: str = Field(max_length=1024)


@router.patch("")
def update_me(body: MeUpdate, person: CurrentPerson, accounts: AccountsDep) -> dict:
    return me(accounts.update(person, body.name, body.username))


@router.put("/password", status_code=204)
def change_password(
    body: PasswordChange,
    request: Request,
    person: CurrentPerson,
    accounts: AccountsDep,
) -> Response:
    accounts.change_password(person, body.current, body.new, keep_token=request.state.session)
    return Response(status_code=204)


Settings = Annotated[SettingsService, Depends(deps.settings)]


class TrackerView(BaseModel):
    provider: str
    base_url: str | None
    token_state: TokenState


class TokenIn(BaseModel):
    token: SecretStr


def _tracker(person_id: str, settings: SettingsService) -> TrackerView:
    return TrackerView(
        provider=settings.provider(),
        base_url=settings.base_url(),
        token_state=settings.token_state(person_id),
    )


@router.get("/tracker")
def get_tracker(person: CurrentPerson, settings: Settings) -> TrackerView:
    return _tracker(person.id, settings)


@router.put("/tracker")
def set_tracker_token(body: TokenIn, person: CurrentPerson, settings: Settings) -> TrackerView:
    settings.set_token(person.id, body.token)
    return _tracker(person.id, settings)


@router.delete("/tracker", status_code=204)
def remove_tracker_token(person: CurrentPerson, settings: Settings) -> Response:
    settings.remove_token(person.id)
    return Response(status_code=204)
