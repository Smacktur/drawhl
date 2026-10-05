from app.domain.errors import TaskNotFound
from app.domain.tasks import StatusCategory, Task, now_iso

DEMO_HOST = "jira.example.com"

_CATEGORY: dict[str, StatusCategory] = {
    "To Do": "new",
    "Backlog": "new",
    "In Progress": "indeterminate",
    "In Review": "indeterminate",
    "Done": "done",
    "Closed": "done",
}

# Made-up tasks so the whole scenario runs without a Jira instance.
_SEED = [
    (
        "DEMO-1",
        "Story",
        "Show live task status on the team board",
        "In Progress",
        "Alex Rivera",
        "High",
    ),
    (
        "DEMO-2",
        "Bug",
        "Login page times out behind the corporate proxy",
        "To Do",
        "Sam Lee",
        "Highest",
    ),
    ("DEMO-3", "Task", "Rotate service account credentials", "Done", "Jordan Kim", "Medium"),
    ("DEMO-4", "Epic", "Q4 reliability goals", "In Progress", None, "High"),
    ("DEMO-5", "Story", "Export board as PNG for the weekly review", "Backlog", None, "Low"),
    ("DEMO-6", "Task", "Write the on-call handbook draft", "In Review", "Taylor Morgan", "Medium"),
    ("DEMO-7", "Bug", "Duplicate alerts after deploy", "In Progress", "Alex Rivera", "High"),
    ("DEMO-8", "Sub-task", "Add retry to the nightly export job", "To Do", "Sam Lee", "Medium"),
    ("DEMO-9", "Story", "Quarterly capacity planning", "To Do", "Jordan Kim", "Medium"),
    ("DEMO-10", "Task", "Clean up stale feature flags", "Closed", "Taylor Morgan", "Low"),
    ("DEMO-11", "Bug", "Dashboard shows wrong time zone", "In Review", None, "Medium"),
    ("DEMO-12", "Epic", "Migrate CI runners", "Backlog", "Alex Rivera", "High"),
]


class DemoTaskProvider:
    base_host = DEMO_HOST

    def __init__(self) -> None:
        self._tasks = {
            key: {
                "type_name": type_name,
                "summary": summary,
                "status_name": status,
                "assignee_name": assignee,
                "priority_name": priority,
                "updated": "2026-10-01T09:00:00+00:00",
            }
            for key, type_name, summary, status, assignee, priority in _SEED
        }

    def _task(self, key: str) -> Task:
        fields = self._tasks[key]
        return Task(
            key=key,
            status_category=_CATEGORY.get(fields["status_name"], "new"),
            url=f"https://{DEMO_HOST}/browse/{key}",
            fetched_at=now_iso(),
            **fields,
        )

    def resolve(self, key: str) -> Task:
        if key not in self._tasks:
            raise TaskNotFound(f"{key} not found")
        return self._task(key)

    def poll(self, keys: list[str]) -> list[Task]:
        return [
            self._task(key)
            if key in self._tasks
            else Task(
                key=key,
                state="not_found",
                url=f"https://{DEMO_HOST}/browse/{key}",
                fetched_at=now_iso(),
            )
            for key in keys
        ]

    def check(self) -> str:
        return "Demo User"
