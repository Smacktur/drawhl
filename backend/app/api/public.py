from typing import Annotated

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.api import deps
from app.api.boards import RefreshOut
from app.domain.boards import task_keys
from app.domain.errors import NotFound
from app.domain.ports import BoardRepo
from app.domain.public import PublicBoard, PublicLinks, private_tasks, public_board
from app.domain.settings import SettingsService
from app.domain.tasks import now_iso

# Open without a session (see gate.py). Nothing here changes a board or names its people.
router = APIRouter(prefix="/public", tags=["public"])

Links = Annotated[PublicLinks, Depends(deps.public_links)]
Boards = Annotated[BoardRepo, Depends(deps.boards)]
Settings = Annotated[SettingsService, Depends(deps.settings)]


class VersionOut(BaseModel):
    version: int


@router.get("/{token}")
def get_public_board(
    token: str, request: Request, links: Links, boards: Boards, settings: Settings
) -> PublicBoard:
    board_id, _ = links.find(token)
    # Only the demo tasks belong to no person; anything else was fetched with someone's token.
    shared = request.app.state.snapshots if settings.provider() == "demo" else None
    return public_board(
        board_id, boards, shared, settings.base_url(), settings.refresh_interval_s()
    )


@router.get("/{token}/version")
def get_public_version(token: str, links: Links) -> VersionOut:
    return VersionOut(version=links.find(token)[1])


@router.post("/{token}/refresh")
def refresh_public_board(
    token: str, request: Request, links: Links, boards: Boards, settings: Settings
) -> RefreshOut:
    board_id, _ = links.find(token)
    state = request.app.state
    if settings.provider() == "demo":
        tasks, sources = state.refresher.refresh(
            board_id, settings.refresh_interval_s(), boards, state.snapshots, state.demo
        )
        return RefreshOut(tasks=tasks, fetched_at=now_iso(), sources=sources)
    record = boards.get(board_id)
    if record is None:
        raise NotFound("board not found")
    tasks = {task.key: task for task in private_tasks(task_keys(record.doc), settings.base_url())}
    return RefreshOut(tasks=tasks, fetched_at=now_iso(), sources=[])
