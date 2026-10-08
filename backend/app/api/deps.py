from typing import Annotated

from fastapi import Depends, Request

from app.domain.accounts import Accounts, Person
from app.domain.errors import Forbidden
from app.domain.invites import Invites
from app.domain.members import BoardRole, Members
from app.domain.ports import BoardRepo, DemoTasks, SnapshotRepo, TaskProvider
from app.domain.refresh import RefreshService
from app.domain.sessions import Sessions
from app.domain.settings import SettingsService
from app.domain.tasks import select_provider


def boards(request: Request) -> BoardRepo:
    return request.app.state.boards


def snapshots(request: Request) -> SnapshotRepo:
    return request.app.state.snapshots


def settings(request: Request) -> SettingsService:
    return request.app.state.settings


def provider(request: Request) -> TaskProvider:
    state = request.app.state
    return select_provider(state.settings.provider(), state.demo, state.jira)


def refresher(request: Request) -> RefreshService:
    return request.app.state.refresher


def demo(request: Request) -> DemoTasks:
    return request.app.state.demo


def accounts(request: Request) -> Accounts:
    return request.app.state.accounts


def sessions(request: Request) -> Sessions:
    return request.app.state.sessions


def current_person(request: Request) -> Person:
    """Set by PasswordGate; every route outside its open paths has one."""
    return request.state.person


def current_admin(request: Request) -> Person:
    person = current_person(request)
    if person.role != "admin":
        raise Forbidden("Only an admin can do this.")
    return person


def members(request: Request) -> Members:
    return request.app.state.members


def board_role(needed: BoardRole):
    """Dependency for a board route: the person's role on `board_id`, at least `needed`."""

    def check(board_id: str, request: Request) -> BoardRole:
        return members(request).require(current_person(request), board_id, needed)

    return Depends(check)


def invites(request: Request) -> Invites:
    return request.app.state.invites


CurrentPerson = Annotated[Person, Depends(current_person)]
AccountsDep = Annotated[Accounts, Depends(accounts)]
SessionsDep = Annotated[Sessions, Depends(sessions)]
CurrentAdmin = Annotated[Person, Depends(current_admin)]
InvitesDep = Annotated[Invites, Depends(invites)]
MembersDep = Annotated[Members, Depends(members)]
CanView = Annotated[BoardRole, board_role("viewer")]
CanEdit = Annotated[BoardRole, board_role("editor")]
IsOwner = Annotated[BoardRole, board_role("owner")]
