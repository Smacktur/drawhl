import json
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ValidationError

from app.domain.modules import gantt

MAX_CONTENT_BYTES = 256 * 1024
KIND_PATTERN = r"^[a-z][a-z0-9_]{0,39}$"


@dataclass(frozen=True)
class ModuleKind:
    content: type[BaseModel]
    keys: Callable[[Any], set[str]]


MODULES: dict[str, ModuleKind] = {
    "gantt": ModuleKind(gantt.GanttContent, gantt.task_keys),
}


def validate_module(kind: str, content: dict[str, Any]) -> dict[str, Any]:
    """Normalized content of a known kind; unknown kinds pass through so newer boards survive."""
    if len(json.dumps(content)) > MAX_CONTENT_BYTES:
        raise ValueError(f"{kind}: content over {MAX_CONTENT_BYTES // 1024} KB")
    module = MODULES.get(kind)
    if module is None:
        return content
    try:
        model = module.content.model_validate(content)
    except ValidationError as exc:
        first = exc.errors()[0]
        where = ".".join(str(part) for part in first["loc"])
        reason = first["msg"].removeprefix("Value error, ")
        raise ValueError(f"{kind}: {where + ': ' if where else ''}{reason}") from None
    return model.model_dump(mode="json", exclude_none=True)


def module_keys(kind: str, content: dict[str, Any]) -> set[str]:
    module = MODULES.get(kind)
    if module is None:
        return set()
    return module.keys(module.content.model_validate(content))
