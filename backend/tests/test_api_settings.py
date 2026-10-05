from tests.jira_fake import TOKEN

JIRA = {"base_url": "https://jira.example.com/", "token": TOKEN}


def connect(client):
    response = client.put("/api/settings", json={"provider": "jira", "jira": JIRA})
    assert response.status_code == 200
    return response.json()


def test_defaults(client):
    assert client.get("/api/settings").json() == {
        "provider": "demo",
        "refresh_interval_s": 30,
        "secret_key_configured": False,
        "jira": {"base_url": None, "token_state": "none"},
    }


def test_saving_token_needs_secret_key(client):
    response = client.put("/api/settings", json={"jira": JIRA})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "secret_key_missing"


def test_connect_and_resolve_real_card(jira_client):
    body = connect(jira_client)
    assert body["jira"] == {"base_url": "https://jira.example.com", "token_state": "set"}
    task = jira_client.post("/api/tasks/resolve", json={"ref": "sre-1"}).json()["task"]
    assert task["url"] == "https://jira.example.com/browse/SRE-1"
    link = jira_client.post(
        "/api/tasks/resolve", json={"ref": "https://jira.example.com/browse/SRE-2"}
    )
    assert link.json()["task"]["status_category"] == "done"


def test_token_kept_when_omitted(jira_client):
    connect(jira_client)
    jira_client.put("/api/settings", json={"jira": {"base_url": "https://jira.example.com"}})
    assert jira_client.get("/api/settings").json()["jira"]["token_state"] == "set"


def test_interval_bounds(jira_client):
    assert jira_client.put("/api/settings", json={"refresh_interval_s": 29}).status_code == 422
    assert jira_client.put("/api/settings", json={"refresh_interval_s": 300}).status_code == 200


def test_bad_url_rejected(jira_client):
    response = jira_client.put("/api/settings", json={"jira": {"base_url": "ftp://x"}})
    assert response.status_code == 422


def test_connection_test(jira_client, fake_jira):
    ok = jira_client.post("/api/settings/jira/test", json=JIRA)
    assert ok.json() == {"ok": True, "user": "Alex Rivera"}
    bad = jira_client.post("/api/settings/jira/test", json=JIRA | {"token": "wrong-token"})
    assert (bad.status_code, bad.json()["error"]["code"]) == (401, "jira_unauthorized")
    fake_jira.fail = 503
    down = jira_client.post("/api/settings/jira/test", json=JIRA)
    assert (down.status_code, down.json()["error"]["code"]) == (503, "jira_unavailable")


def test_jira_not_configured(jira_client):
    jira_client.put("/api/settings", json={"provider": "jira"})
    response = jira_client.post("/api/tasks/resolve", json={"ref": "SRE-1"})
    assert (response.status_code, response.json()["error"]["code"]) == (400, "jira_not_configured")


def test_rate_limit_passes_retry_after(jira_client, fake_jira):
    connect(jira_client)
    fake_jira.fail = 429
    response = jira_client.post("/api/tasks/resolve", json={"ref": "SRE-1"})
    assert response.status_code == 429
    assert response.headers["retry-after"] == "42"


def test_changed_secret_key_makes_token_unreadable(tmp_path, fake_jira):
    import httpx
    from fastapi.testclient import TestClient

    from app.config import Settings
    from app.main import create_app

    db = str(tmp_path / "app.db")
    transport = httpx.MockTransport(fake_jira)
    first = TestClient(create_app(Settings(db_path=db, drawhl_secret_key="one"), transport))
    connect(first)
    second = TestClient(create_app(Settings(db_path=db, drawhl_secret_key="two"), transport))
    assert second.get("/api/settings").json()["jira"]["token_state"] == "unreadable"
    response = second.post("/api/tasks/resolve", json={"ref": "SRE-1"})
    assert response.json()["error"]["code"] == "jira_not_configured"
