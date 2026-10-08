from fastapi import APIRouter

from app.api import auth, boards, demo, jql, settings, tasks, version

router = APIRouter(prefix="/api")
router.include_router(auth.router)
router.include_router(boards.router)
router.include_router(tasks.router)
router.include_router(jql.router)
router.include_router(settings.router)
router.include_router(demo.router)
router.include_router(version.router)
