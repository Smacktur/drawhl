from typing import Annotated

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel

from app.api import deps
from app.domain import boards as service
from app.domain.boards import BoardDoc, BoardName, BoardSummary, BoardView
from app.domain.ports import BoardRepo, SnapshotRepo, TaskProvider
from app.domain.refresh import RefreshService, SourceStatus
from app.domain.settings import SettingsService
from app.domain.tasks import Task, now_iso

router = APIRouter(prefix="/boards", tags=["boards"])

Boards = Annotated[BoardRepo, Depends(deps.boards)]
Snapshots = Annotated[SnapshotRepo, Depends(deps.snapshots)]


class BoardIn(BaseModel):
    name: BoardName


class BoardList(BaseModel):
    boards: list[BoardSummary]


class SaveIn(BaseModel):
    version: int
    doc: BoardDoc


class SaveOut(BaseModel):
    version: int


class RefreshOut(BaseModel):
    tasks: dict[str, Task]
    fetched_at: str
    sources: list[SourceStatus]


@router.get("")
def list_boards(boards: Boards) -> BoardList:
    return BoardList(boards=boards.list())


@router.post("", status_code=201)
def create_board(body: BoardIn, boards: Boards) -> BoardSummary:
    return service.create_board(body.name, boards)


@router.get("/{board_id}")
def get_board(board_id: str, boards: Boards, snapshots: Snapshots) -> BoardView:
    return service.get_board(board_id, boards, snapshots)


@router.put("/{board_id}")
def save_board(board_id: str, body: SaveIn, boards: Boards) -> SaveOut:
    return SaveOut(version=service.save_board(board_id, body.version, body.doc, boards))


@router.patch("/{board_id}")
def rename_board(board_id: str, body: BoardIn, boards: Boards) -> BoardSummary:
    return service.rename_board(board_id, body.name, boards)


@router.delete("/{board_id}", status_code=204)
def delete_board(board_id: str, boards: Boards) -> Response:
    service.delete_board(board_id, boards)
    return Response(status_code=204)


@router.post("/{board_id}/refresh")
def refresh_board(
    board_id: str,
    boards: Boards,
    snapshots: Snapshots,
    settings: Annotated[SettingsService, Depends(deps.settings)],
    provider: Annotated[TaskProvider, Depends(deps.provider)],
    refresher: Annotated[RefreshService, Depends(deps.refresher)],
) -> RefreshOut:
    tasks, sources = refresher.refresh(
        board_id, settings.refresh_interval_s(), boards, snapshots, provider
    )
    return RefreshOut(tasks=tasks, fetched_at=now_iso(), sources=sources)
