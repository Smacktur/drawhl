from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.domain.errors import NotFound, ValidationFailed
from app.domain.ports import BoardRepo, SnapshotRepo
from app.domain.tasks import KEY_RE, Task

MAX_NODES = 2000

BoardName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class _Strict(BaseModel):
    # xyflow adds transient fields (selected, dragging, measured); they are not part of the doc.
    model_config = ConfigDict(extra="ignore", allow_inf_nan=False)


class Position(_Strict):
    x: float
    y: float


class JiraCardData(_Strict):
    key: str
    collapsed: bool = False

    @field_validator("key")
    @classmethod
    def _key(cls, value: str) -> str:
        if not KEY_RE.match(value):
            raise ValueError("invalid issue key")
        return value


class FrameData(_Strict):
    title: str = Field(default="", max_length=200)


class StickyData(_Strict):
    text: str = Field(default="", max_length=5000)
    color: str = Field(default="yellow", max_length=20)


class TextData(_Strict):
    text: str = Field(default="", max_length=5000)


class _NodeBase(_Strict):
    id: str = Field(min_length=1, max_length=100)
    position: Position
    width: float | None = None
    height: float | None = None
    parentId: str | None = Field(default=None, max_length=100)  # noqa: N815 - mirrors xyflow


class JiraCardNode(_NodeBase):
    type: Literal["jira_card"]
    data: JiraCardData


class FrameNode(_NodeBase):
    type: Literal["frame"]
    data: FrameData


class StickyNode(_NodeBase):
    type: Literal["sticky"]
    data: StickyData


class TextNode(_NodeBase):
    type: Literal["text"]
    data: TextData


Node = Annotated[JiraCardNode | FrameNode | StickyNode | TextNode, Field(discriminator="type")]


class Edge(_Strict):
    id: str = Field(min_length=1, max_length=100)
    source: str = Field(max_length=100)
    target: str = Field(max_length=100)
    sourceHandle: str | None = Field(default=None, max_length=100)  # noqa: N815
    targetHandle: str | None = Field(default=None, max_length=100)  # noqa: N815


class Viewport(_Strict):
    x: float = 0
    y: float = 0
    zoom: float = 1


class BoardDoc(_Strict):
    nodes: list[Node] = Field(default_factory=list, max_length=MAX_NODES)
    edges: list[Edge] = Field(default_factory=list, max_length=MAX_NODES * 2)
    viewport: Viewport = Field(default_factory=Viewport)


class BoardSummary(BaseModel):
    id: str
    name: str
    updated_at: str


class BoardRecord(BoardSummary):
    version: int
    doc: BoardDoc


class BoardView(BoardSummary):
    version: int
    # Plain dict so optional xyflow fields stay absent instead of coming back as null.
    doc: dict[str, Any]
    tasks: dict[str, Task]


def check_doc(doc: BoardDoc) -> None:
    """Rules the schema cannot express: references and xyflow's parent-before-child order."""
    seen: dict[str, str] = {}
    for node in doc.nodes:
        if node.id in seen:
            raise ValidationFailed(f"duplicate node id {node.id}")
        if node.parentId is not None:
            if node.type == "frame":
                raise ValidationFailed("frames cannot be nested")
            if seen.get(node.parentId) != "frame":
                raise ValidationFailed(f"node {node.id} must follow its parent frame")
        seen[node.id] = node.type
    edge_ids: set[str] = set()
    for edge in doc.edges:
        if edge.id in edge_ids:
            raise ValidationFailed(f"duplicate edge id {edge.id}")
        edge_ids.add(edge.id)
        if edge.source not in seen or edge.target not in seen:
            raise ValidationFailed(f"edge {edge.id} points at a missing node")


def card_keys(doc: BoardDoc) -> list[str]:
    return sorted({node.data.key for node in doc.nodes if isinstance(node, JiraCardNode)})


def create_board(name: str, boards: BoardRepo) -> BoardSummary:
    return boards.create(name, BoardDoc())


def get_board(board_id: str, boards: BoardRepo, snapshots: SnapshotRepo) -> BoardView:
    record = boards.get(board_id)
    if record is None:
        raise NotFound("board not found")
    tasks = snapshots.get_many(card_keys(record.doc))
    return BoardView(
        id=record.id,
        name=record.name,
        updated_at=record.updated_at,
        version=record.version,
        doc=record.doc.model_dump(exclude_none=True),
        tasks=tasks,
    )


def save_board(board_id: str, version: int, doc: BoardDoc, boards: BoardRepo) -> int:
    check_doc(doc)
    return boards.save(board_id, version, doc)
