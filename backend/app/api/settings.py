from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, SecretStr

from app.api import deps
from app.domain.settings import JiraCredentials, SettingsIn, SettingsService, SettingsView

router = APIRouter(prefix="/settings", tags=["settings"])

Settings = Annotated[SettingsService, Depends(deps.settings)]


class TestIn(BaseModel):
    base_url: str | None = Field(default=None, max_length=500)
    token: SecretStr | None = None


class TestOut(BaseModel):
    ok: bool
    user: str


@router.get("")
def get_settings(settings: Settings) -> SettingsView:
    return settings.view()


@router.put("")
def put_settings(body: SettingsIn, settings: Settings) -> SettingsView:
    return settings.update(body)


@router.post("/jira/test")
def test_jira(body: TestIn, settings: Settings, request: Request) -> TestOut:
    creds = settings.jira_credentials(body.base_url, body.token)
    check: Callable[[JiraCredentials], str] = request.app.state.check_jira
    return TestOut(ok=True, user=check(creds))
