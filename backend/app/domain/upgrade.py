from collections.abc import Callable

from app.domain.accounts import Accounts
from app.domain.errors import UsernameTaken
from app.domain.ports import UserRepo

ADMIN = "admin"


def bootstrap_admin(accounts: Accounts, users: UserRepo, password: Callable[[], str]) -> bool:
    """Turns the instance password into the first admin's; True when it created them."""
    if users.count():
        return False
    try:
        accounts.create(ADMIN, "Admin", password(), "admin")
    except UsernameTaken:
        # Another worker created the admin first.
        return False
    return True
