from tests.jira_fake import TOKEN


def board_with(client, *keys, name="b"):
    board = client.post("/api/boards", json={"name": name}).json()
    nodes = [
        {"id": f"n{i}", "type": "jira_card", "position": {"x": 0, "y": 0}, "data": {"key": k}}
        for i, k in enumerate(keys)
    ]
    client.put(f"/api/boards/{board['id']}", json={"version": 1, "doc": {"nodes": nodes}})
    return board["id"]


def test_demo_status_change_shows_on_refresh(client):
    board_id = board_with(client, "DEMO-1", "DEMO-1", "NOPE-1")
    changed = client.put("/api/demo/tasks/demo-1/status", json={"status": "Done"})
    assert changed.json()["task"]["status_category"] == "done"

    body = client.post(f"/api/boards/{board_id}/refresh").json()
    assert body["tasks"]["DEMO-1"]["status_category"] == "done"
    assert body["tasks"]["NOPE-1"]["state"] == "not_found"
    assert client.get(f"/api/boards/{board_id}").json()["tasks"]["DEMO-1"]["status_name"] == "Done"


def test_only_open_board_keys_are_polled(jira_client, fake_jira):
    jira_client.put(
        "/api/settings",
        json={"provider": "jira", "jira": {"base_url": "https://jira.example.com", "token": TOKEN}},
    )
    board_with(jira_client, "DEV-2", name="other")
    open_board = board_with(jira_client, "DEV-1")
    fake_jira.requests.clear()

    body = jira_client.post(f"/api/boards/{open_board}/refresh").json()
    assert set(body["tasks"]) == {"DEV-1"}
    assert body["sources"][0] | {"synced_at": None} == {
        "id": "jira",
        "name": "Jira Data Center",
        "state": "ok",
        "synced_at": None,
        "error": None,
    }
    assert len(fake_jira.requests) == 1


def test_rate_limited_refresh(jira_client, fake_jira):
    jira_client.put(
        "/api/settings",
        json={"provider": "jira", "jira": {"base_url": "https://jira.example.com", "token": TOKEN}},
    )
    board_id = board_with(jira_client, "DEV-1")
    fake_jira.fail = 429
    first = jira_client.post(f"/api/boards/{board_id}/refresh").json()["sources"][0]
    assert (first["state"], first["error"]["retry_after"]) == ("error", 60)
    fake_jira.fail = None
    fake_jira.requests.clear()
    second = jira_client.post(f"/api/boards/{board_id}/refresh")
    assert second.status_code == 200
    assert second.json()["sources"][0]["error"]["code"] == "jira_rate_limited"
    assert fake_jira.requests == []


def test_unknown_demo_task(client):
    assert client.put("/api/demo/tasks/NOPE-1/status", json={"status": "Done"}).status_code == 404


def test_refresh_missing_board(client):
    assert client.post("/api/boards/nope/refresh").status_code == 404


def test_settings_change_lifts_backoff(jira_client, fake_jira):
    jira_client.put(
        "/api/settings",
        json={"provider": "jira", "jira": {"base_url": "https://jira.example.com", "token": TOKEN}},
    )
    board_id = board_with(jira_client, "DEV-1")
    fake_jira.fail = 503
    refresh = f"/api/boards/{board_id}/refresh"
    assert jira_client.post(refresh).json()["sources"][0]["state"] == "error"
    fake_jira.fail = None
    jira_client.put("/api/settings", json={"jira": {"base_url": "https://jira.example.com"}})
    assert jira_client.post(refresh).json()["sources"][0]["state"] == "ok"
