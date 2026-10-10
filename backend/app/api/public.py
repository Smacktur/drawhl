from typing import Annotated

import anyio.to_thread
from fastapi import APIRouter, Depends, Request, WebSocket
from pydantic import BaseModel

from app.api import deps
from app.api.boards import RefreshOut
from app.api.live import serve
from app.domain.boards import task_keys
from app.domain.errors import NotFound, TooManyAttempts
from app.domain.live import ACCESS_CHANGED, ROOM_FULL
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
    # A rename changes this and not the version.
    updated_at: str


@router.get("/{token}")
def get_public_board(
    token: str, request: Request, links: Links, boards: Boards, settings: Settings
) -> PublicBoard:
    board_id, *_ = links.find(token)
    # Only the demo tasks belong to no person; anything else was fetched with someone's token.
    shared = request.app.state.snapshots if settings.provider() == "demo" else None
    return public_board(
        board_id, boards, shared, settings.base_url(), settings.refresh_interval_s()
    )


@router.get("/{token}/version")
def get_public_version(token: str, links: Links) -> VersionOut:
    _, version, updated_at = links.find(token)
    return VersionOut(version=version, updated_at=updated_at)


@router.post("/{token}/refresh")
def refresh_public_board(
    token: str, request: Request, links: Links, boards: Boards, settings: Settings
) -> RefreshOut:
    board_id, *_ = links.find(token)
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


@router.websocket("/{token}/live")
async def live_public_board(websocket: WebSocket, token: str) -> None:
    state = websocket.app.state
    links: PublicLinks = state.public_links
    # Accepted before the link is checked: a refused upgrade cannot carry a close code.
    await websocket.accept()
    try:
        board_id, *_ = await anyio.to_thread.run_sync(links.find, token)
    except NotFound:
        await websocket.close(ACCESS_CHANGED)
        return
    except TooManyAttempts:
        await websocket.close(ROOM_FULL)
        return
    guest = await state.live.join_guest(board_id)
    if isinstance(guest, int):
        await websocket.close(guest)
        return
    room = guest.room

    def alive() -> bool:
        return links.alive(token, board_id)

    try:
        # The link may have been turned off while this guest was on the way in.
        if not await anyio.to_thread.run_sync(alive):
            await websocket.close(ACCESS_CHANGED)
            return
        await serve(
            websocket,
            board_id,
            guest,
            lambda data: room.answer(guest, data),
            alive,
            ACCESS_CHANGED,
        )
    finally:
        room.leave_guest(guest)
