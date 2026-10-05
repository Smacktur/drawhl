from fastapi import Request

from app.domain.ports import BoardRepo, DemoTasks, SnapshotRepo, TaskProvider
from app.domain.refresh import RefreshService
from app.domain.settings import SettingsService
from app.domain.tasks import select_provider


def boards(request: Request) -> BoardRepo:
    return request.app.state.boards


def snapshots(request: Request) -> SnapshotRepo:
    return request.app.state.snapshots


def settings(request: Request) -> SettingsService:
    return request.app.state.settings


def provider(request: Request) -> TaskProvider:
    state = request.app.state
    return select_provider(state.settings.provider(), state.demo, state.jira)


def refresher(request: Request) -> RefreshService:
    return request.app.state.refresher


def demo(request: Request) -> DemoTasks:
    return request.app.state.demo
