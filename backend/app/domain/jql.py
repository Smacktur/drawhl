from pydantic import BaseModel

# Keywords offered after a complete condition; Jira's reserved-word list is mostly noise here.
KEYWORDS = ["AND", "OR", "NOT", "ORDER BY", "ASC", "DESC", "EMPTY", "NULL"]


class JqlField(BaseModel):
    name: str
    """What goes into the query: a plain name, a quoted name or cf[id]."""
    label: str
    operators: list[str]


class JqlVocabulary(BaseModel):
    fields: list[JqlField]
    functions: list[str]
    keywords: list[str] = KEYWORDS


class JqlValue(BaseModel):
    value: str
    """Ready to insert: Jira quotes values that need it."""
    label: str
