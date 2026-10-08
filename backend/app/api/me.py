from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field

from app.api.auth import me
from app.api.deps import AccountsDep, CurrentPerson

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
