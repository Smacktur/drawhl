from datetime import date
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain.tasks import KEY_RE

MAX_RANGE_DAYS = 1096
MAX_DEPTH = 5

ItemId = Annotated[str, Field(min_length=1, max_length=40)]
Title = Annotated[str, Field(max_length=200)]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="ignore")


class Row(_Strict):
    id: ItemId
    key: str | None = None
    title: Title = ""
    start: date
    end: date
    parent: str | None = Field(default=None, max_length=40)
    collapsed: bool = False

    @field_validator("key")
    @classmethod
    def _key(cls, value: str | None) -> str | None:
        if value is not None and not KEY_RE.match(value):
            raise ValueError("invalid issue key")
        return value

    @model_validator(mode="after")
    def _dates(self) -> Self:
        if self.end < self.start:
            raise ValueError(f"row {self.id} ends before it starts")
        return self


class Milestone(_Strict):
    id: ItemId
    date: date
    title: Title = ""


class Link(_Strict):
    id: ItemId
    from_: str = Field(alias="from", max_length=40)
    to: str = Field(max_length=40)

    model_config = ConfigDict(extra="ignore", populate_by_name=True, serialize_by_alias=True)


class GanttContent(_Strict):
    start: date
    end: date
    scale: Literal["day", "week", "month", "quarter"] = "week"
    labelWidth: int = Field(default=160, ge=120, le=480)  # noqa: N815 - mirrors the frontend
    rows: list[Row] = Field(default_factory=list, max_length=200)
    milestones: list[Milestone] = Field(default_factory=list, max_length=100)
    links: list[Link] = Field(default_factory=list, max_length=400)

    @model_validator(mode="after")
    def _rules(self) -> Self:
        if self.end < self.start:
            raise ValueError("end before start")
        if (self.end - self.start).days > MAX_RANGE_DAYS:
            raise ValueError("range over 3 years")
        for label, items in (("row", self.rows), ("milestone", self.milestones)):
            _unique(label, [item.id for item in items])
        _unique("link", [link.id for link in self.links])
        _check_tree(self.rows)
        rows = {row.id for row in self.rows}
        pairs: set[tuple[str, str]] = set()
        for link in self.links:
            if link.from_ not in rows or link.to not in rows:
                raise ValueError(f"link {link.id} points at a missing row")
            if link.from_ == link.to:
                raise ValueError(f"link {link.id} connects a row to itself")
            if (link.from_, link.to) in pairs:
                raise ValueError(f"link {link.id} duplicates another link")
            pairs.add((link.from_, link.to))
        return self


def _check_tree(rows: list[Row]) -> None:
    # Rows are in display order, so a parent is the row above or one of its ancestors.
    ancestors: list[str] = []
    for row in rows:
        if row.parent is None:
            ancestors = []
        elif row.parent in ancestors:
            ancestors = ancestors[: ancestors.index(row.parent) + 1]
        else:
            raise ValueError(f"row {row.id} must follow its parent {row.parent}")
        if len(ancestors) >= MAX_DEPTH:
            raise ValueError(f"row {row.id} is nested deeper than {MAX_DEPTH} levels")
        ancestors.append(row.id)


def _unique(label: str, ids: list[str]) -> None:
    seen: set[str] = set()
    for item_id in ids:
        if item_id in seen:
            raise ValueError(f"duplicate {label} id {item_id}")
        seen.add(item_id)


def task_keys(content: GanttContent) -> set[str]:
    return {row.key for row in content.rows if row.key}
