from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api import deps
from app.domain import boards as service
from app.domain.boards import BoardDoc, BoardName, BoardSummary, BoardView
from app.domain.ports import BoardRepo, SnapshotRepo

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
