from typing import Literal

from pydantic import BaseModel

from app.domain.accounts import Person
from app.domain.errors import Forbidden, NotFound, OwnerRequired, ValidationFailed
from app.domain.ports import MemberRepo, UserRepo

BoardRole = Literal["owner", "editor", "viewer"]
ShareRole = Literal["editor", "viewer"]
_RANK = {None: 0, "viewer": 1, "editor": 2, "owner": 3}


class MemberUser(BaseModel):
    id: str
    username: str
    name: str


class Member(BaseModel):
    user: MemberUser
    role: BoardRole


def granted_role(member: BoardRole | None, everyone: ShareRole | None) -> BoardRole | None:
    """The higher of the person's own role and the board's "everyone" role."""
    return member if _RANK[member] >= _RANK[everyone] else everyone


def effective_role(
    person: Person, member: BoardRole | None, everyone: ShareRole | None
) -> BoardRole | None:
    """The granted role, except that admins act as owner on every board."""
    return "owner" if person.role == "admin" else granted_role(member, everyone)


class Members:
    """Who may do what on a board; every board route asks here."""

    def __init__(self, repo: MemberRepo, users: UserRepo) -> None:
        self._repo = repo
        self._users = users

    def require(self, person: Person, board_id: str, needed: BoardRole) -> BoardRole:
        found = self._repo.roles(board_id, person.id)
        role = effective_role(person, *found) if found else None
        # A board the person cannot see answers like a missing one, so its existence stays private.
        if role is None:
            raise NotFound("board not found")
        if _RANK[role] < _RANK[needed]:
            raise Forbidden(
                "You can only view this board."
                if role == "viewer"
                else "Only the board's owner can do this."
            )
        return role

    def list(self, board_id: str) -> tuple[list[Member], ShareRole | None]:
        return self._repo.members(board_id), self._repo.everyone(board_id)

    def _active(self, user_id: str) -> Person:
        person = self._users.get(user_id)
        if person is None or person.disabled:
            raise NotFound("person not found")
        return person

    def share(self, board_id: str, user_id: str, role: ShareRole) -> Member:
        person = self._active(user_id)
        if self._repo.role(board_id, user_id) == "owner":
            raise OwnerRequired("Transfer the board to change its owner's role.")
        self._repo.set_role(board_id, user_id, role)
        return Member(user=MemberUser(**person.model_dump()), role=role)

    def remove(self, board_id: str, user_id: str) -> None:
        if self._repo.role(board_id, user_id) == "owner":
            raise OwnerRequired("A board needs its owner. Transfer it first.")
        self._repo.remove(board_id, user_id)

    def set_everyone(self, board_id: str, role: ShareRole | None) -> None:
        self._repo.set_everyone(board_id, role)

    def transfer(self, board_id: str, user_id: str) -> None:
        """The new owner takes over; the old one stays as an editor."""
        self._active(user_id)
        if self._repo.role(board_id, user_id) == "owner":
            raise ValidationFailed("This person already owns the board.")
        self._repo.transfer(board_id, user_id)
