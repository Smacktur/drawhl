"""SC-006: the Jira token never leaves the server, in responses or in logs."""

import logging

from tests.jira_fake import TOKEN

JIRA = {"base_url": "https://jira.example.com", "token": TOKEN}


def calls(client):
    board = client.post("/api/boards", json={"name": "leak"}).json()
    yield client.put("/api/settings", json={"provider": "jira", "jira": JIRA})
    yield client.get("/api/settings")
    yield client.post("/api/settings/jira/test", json={})
    yield client.post("/api/settings/jira/test", json=JIRA)
    yield client.post("/api/tasks/resolve", json={"ref": "SRE-1"})
    yield client.post("/api/tasks/resolve", json={"ref": "SRE-404"})
    yield client.get(f"/api/boards/{board['id']}")
    yield client.get("/api/boards")
    yield client.get("/metrics")


def test_token_absent_from_responses_and_logs(jira_client, fake_jira, caplog):
    caplog.set_level(logging.DEBUG)
    responses = list(calls(jira_client))
    fake_jira.fail = 401
    responses.append(jira_client.post("/api/tasks/resolve", json={"ref": "SRE-1"}))
    fake_jira.fail = 500
    responses.append(jira_client.post("/api/settings/jira/test", json=JIRA))

    for response in responses:
        assert TOKEN not in response.text
        assert all(TOKEN not in value for value in response.headers.values())

    formatter = logging.getLogger().handlers[0].formatter
    for record in caplog.records:
        assert TOKEN not in formatter.format(record)


def test_log_formatter_masks_token(jira_client, caplog):
    jira_client.put("/api/settings", json={"jira": JIRA})
    record = logging.LogRecord("x", logging.INFO, "", 0, f"oops {TOKEN}", None, None)
    assert TOKEN not in logging.getLogger().handlers[0].formatter.format(record)
