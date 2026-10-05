from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api import deps
from app.domain.jql import JqlValue, JqlVocabulary
from app.domain.ports import TaskProvider

router = APIRouter(prefix="/jql", tags=["jql"])

Provider = Annotated[TaskProvider, Depends(deps.provider)]


class ValuesOut(BaseModel):
    values: list[JqlValue]


@router.get("/vocabulary")
def vocabulary(provider: Provider) -> JqlVocabulary:
    return provider.jql_vocabulary()


@router.get("/values")
def values(
    provider: Provider,
    field: Annotated[str, Query(min_length=1, max_length=200)],
    prefix: Annotated[str, Query(max_length=200)] = "",
) -> ValuesOut:
    return ValuesOut(values=provider.jql_values(field, prefix))
