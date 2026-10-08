import time
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import AccountsDep, CurrentAdmin, InvitesDep
from app.domain.accounts import PersonRecord
from app.domain.invites import Invite

router = APIRouter(tags=["people"])


class PersonView(BaseModel):
    id: str
    username: str
    name: str
    role: Literal["admin", "member"]
    disabled: bool
    last_sign_in_at: str | None
    created_at: str


class PeopleList(BaseModel):
    people: list[PersonView]
    invites: list[Invite]


class PersonChange(BaseModel):
    role: Literal["admin", "member"] | None = None
    disabled: bool | None = None


class InviteLink(BaseModel):
    invite: Invite
    # Relative, so it works on whatever address the admin opened drawhl on.
    url: str


def link(invite: Invite, token: str) -> InviteLink:
    return InviteLink(invite=invite, url=f"/?{invite.kind}={token}")


def _view(person: PersonRecord) -> PersonView:
    return PersonView(**person.model_dump())


@router.get("/people")
def list_people(_: CurrentAdmin, accounts: AccountsDep, invites: InvitesDep) -> PeopleList:
    return PeopleList(
        people=[_view(person) for person in accounts.people()],
        invites=invites.pending(time.time()),
    )


@router.patch("/people/{user_id}")
def change_person(
    user_id: str, body: PersonChange, _: CurrentAdmin, accounts: AccountsDep
) -> PersonView:
    return _view(accounts.change(user_id, body.role, body.disabled))


@router.post("/people/{user_id}/reset", status_code=201)
def reset_link(user_id: str, admin: CurrentAdmin, invites: InvitesDep) -> InviteLink:
    return link(*invites.reset(admin.id, user_id, time.time()))
