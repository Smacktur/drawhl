from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api import deps
from app.domain.ports import SnapshotRepo, TaskProvider
from app.domain.tasks import MAX_SEARCH, Task, resolve_task, search_tasks

router = APIRouter(prefix="/tasks", tags=["tasks"])


class ResolveIn(BaseModel):
    ref: str = Field(max_length=500)


class ResolveOut(BaseModel):
    task: Task


class SearchIn(BaseModel):
    jql: str = Field(min_length=1, max_length=2000)
    # 0 asks only for the match count, which also validates the query.
    limit: int = Field(default=50, ge=0, le=MAX_SEARCH)


class SearchOut(BaseModel):
    tasks: list[Task]
    total: int


@router.post("/search")
def search(
    body: SearchIn,
    provider: Annotated[TaskProvider, Depends(deps.provider)],
    snapshots: Annotated[SnapshotRepo, Depends(deps.snapshots)],
) -> SearchOut:
    tasks, total = search_tasks(body.jql, body.limit, provider, snapshots)
    return SearchOut(tasks=tasks, total=total)


@router.post("/resolve")
def resolve(
    body: ResolveIn,
    provider: Annotated[TaskProvider, Depends(deps.provider)],
    snapshots: Annotated[SnapshotRepo, Depends(deps.snapshots)],
) -> ResolveOut:
    return ResolveOut(task=resolve_task(body.ref, provider, snapshots))
