from fastapi import Request

from app.domain.ports import BoardRepo, SnapshotRepo, TaskProvider
from app.domain.settings import SettingsService


def boards(request: Request) -> BoardRepo:
    return request.app.state.boards


def snapshots(request: Request) -> SnapshotRepo:
    return request.app.state.snapshots


def settings(request: Request) -> SettingsService:
    return request.app.state.settings


def provider(request: Request) -> TaskProvider:
    state = request.app.state
    return state.jira if state.settings.provider() == "jira" else state.demo
