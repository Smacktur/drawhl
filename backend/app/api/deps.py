from fastapi import Request

from app.domain.ports import BoardRepo, SnapshotRepo, TaskProvider


def boards(request: Request) -> BoardRepo:
    return request.app.state.boards


def snapshots(request: Request) -> SnapshotRepo:
    return request.app.state.snapshots


def provider(request: Request) -> TaskProvider:
    return request.app.state.provider
