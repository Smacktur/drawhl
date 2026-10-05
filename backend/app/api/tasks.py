from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api import deps
from app.domain.ports import SnapshotRepo, TaskProvider
from app.domain.tasks import Task, resolve_task

router = APIRouter(prefix="/tasks", tags=["tasks"])


class ResolveIn(BaseModel):
    ref: str = Field(max_length=500)


class ResolveOut(BaseModel):
    task: Task


@router.post("/resolve")
def resolve(
    body: ResolveIn,
    provider: Annotated[TaskProvider, Depends(deps.provider)],
    snapshots: Annotated[SnapshotRepo, Depends(deps.snapshots)],
) -> ResolveOut:
    return ResolveOut(task=resolve_task(body.ref, provider, snapshots))
