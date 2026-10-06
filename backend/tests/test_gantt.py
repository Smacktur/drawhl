import pytest
from pydantic import ValidationError

from app.domain.modules.gantt import GanttContent

BASE = {"start": "2026-10-01", "end": "2026-12-31"}


def row(row_id, **extra):
    return {"id": row_id, "start": "2026-10-05", "end": "2026-10-09"} | extra


def gantt(**extra):
    return GanttContent.model_validate(BASE | extra)


def test_defaults():
    content = gantt()
    assert content.scale == "week" and content.labelWidth == 160
    assert content.rows == [] and content.milestones == [] and content.links == []


def test_links_serialize_with_from():
    content = gantt(rows=[row("a"), row("b")], links=[{"id": "l", "from": "a", "to": "b"}])
    assert content.model_dump(mode="json")["links"] == [{"id": "l", "from": "a", "to": "b"}]


@pytest.mark.parametrize(
    ("extra", "reason"),
    [
        ({"end": "2026-09-30"}, "end before start"),
        ({"end": "2029-10-03"}, "range over 3 years"),
        ({"scale": "year"}, "Input should be"),
        ({"labelWidth": 50}, "greater than or equal to 120"),
        ({"rows": [row("a", end="2026-10-01")]}, "row a ends before it starts"),
        ({"rows": [row("a", key="nope")]}, "invalid issue key"),
        ({"rows": [row("a"), row("a")]}, "duplicate row id a"),
        ({"milestones": [{"id": "m", "date": "2026-11-01"}] * 2}, "duplicate milestone id m"),
        ({"rows": [row("a")], "links": [{"id": "l", "from": "a", "to": "b"}]}, "missing row"),
        ({"rows": [row("a")], "links": [{"id": "l", "from": "a", "to": "a"}]}, "to itself"),
        (
            {
                "rows": [row("a"), row("b")],
                "links": [{"id": "l", "from": "a", "to": "b"}, {"id": "k", "from": "a", "to": "b"}],
            },
            "duplicates another link",
        ),
        ({"rows": [row(str(i)) for i in range(201)]}, "at most 200"),
    ],
)
def test_rules(extra, reason):
    with pytest.raises(ValidationError, match=reason):
        gantt(**extra)


def test_rows_may_lie_outside_the_range():
    content = gantt(rows=[row("a", start="2025-01-01", end="2027-01-01", key="DEV-1")])
    assert content.rows[0].key == "DEV-1"
