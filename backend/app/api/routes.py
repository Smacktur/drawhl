from fastapi import APIRouter

from app.api import boards, settings, tasks

router = APIRouter(prefix="/api")
router.include_router(boards.router)
router.include_router(tasks.router)
router.include_router(settings.router)
