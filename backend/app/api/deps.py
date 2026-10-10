from typing import Annotated

from fastapi import Depends, Request

from app.domain.accounts import Accounts, Person
from app.domain.errors import Forbidden, JiraNotConfigured
from app.domain.invites import Invites
from app.domain.members import BoardRole, Members
from app.domain.ports import BoardRepo, DemoTasks, LiveBoards, SnapshotRepo, TaskProvider
from app.domain.public import PublicLinks
from app.domain.refresh import RefreshService
from app.domain.sessions import Sessions
from app.domain.settings import SettingsService
from app.domain.tasks import NoTokenProvider


def boards(request: Request) -> BoardRepo:
    return request.app.state.boards


def live(request: Request) -> LiveBoards:
    return request.app.state.live


def is_demo(request: Request) -> bool:
    """Whether the instance is a public demo (TIKO_DEMO)."""
    return request.app.state.visitors is not None


def _owner(request: Request) -> str:
    """Whose task cache a request reads: the person's for Jira and on a demo instance, the
    shared one for demo tasks anywhere else."""
    if request.app.state.settings.provider() != "jira" and not is_demo(request):
        return ""
    return current_person(request).id


def snapshots(request: Request) -> SnapshotRepo:
    return request.app.state.snapshots.scoped(_owner(request))


def settings(request: Request) -> SettingsService:
    return request.app.state.settings


def provider(request: Request) -> TaskProvider:
    """The demo tasks, or Jira with the signed-in person's own token."""
    state = request.app.state
    if state.settings.provider() != "jira":
        return state.demo.scoped(_owner(request))
    settings: SettingsService = state.settings
    try:
        creds = settings.jira_credentials(current_person(request).id)
    except JiraNotConfigured as exc:
        return NoTokenProvider(settings.base_url(), exc)
    return state.jira(creds)


def owner(request: Request) -> str:
    return _owner(request)


def refresher(request: Request) -> RefreshService:
    return request.app.state.refresher


def demo(request: Request) -> DemoTasks:
    return request.app.state.demo.scoped(_owner(request))


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


def not_demo_visitor(request: Request) -> None:
    """Sharing and account changes wait until a demo visitor signs up."""
    if current_person(request).demo_expires_at:
        raise Forbidden("Sign up to do this.")


def not_on_demo(request: Request) -> None:
    if is_demo(request):
        raise Forbidden("This is switched off on the demo.")


def members(request: Request) -> Members:
    return request.app.state.members


def board_role(needed: BoardRole):
    """Dependency for a board route: the person's role on `board_id`, at least `needed`."""

    def check(board_id: str, request: Request) -> BoardRole:
        return members(request).require(current_person(request), board_id, needed)

    return Depends(check)


def public_links(request: Request) -> PublicLinks:
    return request.app.state.public_links


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
NotDemoVisitor = Depends(not_demo_visitor)
NotOnDemo = Depends(not_on_demo)
