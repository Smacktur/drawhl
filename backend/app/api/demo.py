from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api import deps
from app.domain.ports import DemoTasks
from app.domain.tasks import Task

router = APIRouter(prefix="/demo", tags=["demo"])


class StatusIn(BaseModel):
    status: str = Field(min_length=1, max_length=50)


class TaskOut(BaseModel):
    task: Task


@router.put("/tasks/{key}/status")
def set_demo_status(
    key: str, body: StatusIn, demo: Annotated[DemoTasks, Depends(deps.demo)]
) -> TaskOut:
    # Boards see the change on their next refresh, the same way as a real Jira edit.
    return TaskOut(task=demo.set_status(key.upper(), body.status))
