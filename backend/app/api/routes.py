from fastapi import APIRouter
from pydantic import BaseModel

from app.domain.greeting import greet

router = APIRouter(prefix="/api")


class GreetingOut(BaseModel):
    message: str


@router.get("/hello")
def hello(name: str = "world") -> GreetingOut:
    return GreetingOut(message=greet(name))
