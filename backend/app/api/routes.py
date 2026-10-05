from fastapi import APIRouter

from app.api import boards, tasks

router = APIRouter(prefix="/api")
router.include_router(boards.router)
router.include_router(tasks.router)
