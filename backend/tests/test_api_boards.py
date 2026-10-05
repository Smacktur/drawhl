DOC = {
    "nodes": [
        {
            "id": "f",
            "type": "frame",
            "position": {"x": 0, "y": 0},
            "width": 400,
            "height": 300,
            "data": {"title": "Now"},
        },
        {
            "id": "a",
            "type": "jira_card",
            "position": {"x": 20, "y": 40},
            "parentId": "f",
            "data": {"key": "DEMO-1", "collapsed": False},
        },
        {
            "id": "b",
            "type": "jira_card",
            "position": {"x": 600, "y": 40},
            "data": {"key": "DEMO-2", "collapsed": True},
        },
        {
            "id": "s",
            "type": "sticky",
            "position": {"x": 200, "y": 40},
            "width": 200,
            "height": 200,
            "parentId": "f",
            "data": {"text": "Rotate certs", "color": "blue"},
        },
        {
            "id": "t",
            "type": "text",
            "position": {"x": 600, "y": -80},
            "width": 240,
            "data": {"text": "Q4 risks"},
        },
    ],
    "edges": [
        {"id": "e", "source": "a", "target": "b", "sourceHandle": "r", "targetHandle": "l"},
        {"id": "e2", "source": "s", "target": "t", "sourceHandle": "t", "targetHandle": "b"},
    ],
    "viewport": {"x": 10.0, "y": -5.0, "zoom": 1.25},
}


def create(client, name="Q4"):
    response = client.post("/api/boards", json={"name": name})
    assert response.status_code == 201
    return response.json()


def test_board_round_trip(client):
    board = create(client)
    assert client.get("/api/boards").json()["boards"][0]["id"] == board["id"]
    for key in ("DEMO-1", "DEMO-2"):
        client.post("/api/tasks/resolve", json={"ref": key})

    saved = client.put(f"/api/boards/{board['id']}", json={"version": 1, "doc": DOC})
    assert saved.json() == {"version": 2}

    body = client.get(f"/api/boards/{board['id']}").json()
    assert body["doc"] == DOC
    assert body["version"] == 2
    assert set(body["tasks"]) == {"DEMO-1", "DEMO-2"}


def test_stale_version_conflicts(client):
    board = create(client)
    client.put(f"/api/boards/{board['id']}", json={"version": 1, "doc": DOC})
    response = client.put(f"/api/boards/{board['id']}", json={"version": 1, "doc": DOC})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "version_conflict"


def test_invalid_doc_rejected(client):
    board = create(client)
    nested = {"nodes": [DOC["nodes"][0], DOC["nodes"][0] | {"id": "g", "parentId": "f"}]}
    response = client.put(f"/api/boards/{board['id']}", json={"version": 1, "doc": nested})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_failed"


def test_child_before_its_frame_rejected(client):
    board = create(client)
    frame, card = DOC["nodes"][0], DOC["nodes"][1]
    doc = {"nodes": [card, frame]}
    response = client.put(f"/api/boards/{board['id']}", json={"version": 1, "doc": doc})
    assert response.status_code == 422


def test_blank_name_rejected(client):
    assert client.post("/api/boards", json={"name": "  "}).status_code == 422


def test_missing_board(client):
    assert client.put("/api/boards/nope", json={"version": 1, "doc": DOC}).status_code == 404


def test_resolve_by_key_and_link(client):
    by_key = client.post("/api/tasks/resolve", json={"ref": "demo-1"}).json()["task"]
    assert by_key["key"] == "DEMO-1" and by_key["state"] == "ok"
    link = "https://jira.example.com/browse/DEMO-2"
    assert client.post("/api/tasks/resolve", json={"ref": link}).json()["task"]["key"] == "DEMO-2"


def test_resolve_errors(client):
    cases = [
        ("NOPE-1", 404, "task_not_found"),
        ("https://other.example.org/browse/DEMO-1", 422, "host_mismatch"),
        ("hello", 422, "invalid_ref"),
        ("", 422, "invalid_ref"),
    ]
    for ref, status, code in cases:
        response = client.post("/api/tasks/resolve", json={"ref": ref})
        assert (response.status_code, response.json()["error"]["code"]) == (status, code)


def test_non_finite_numbers_rejected(client):
    board = create(client)
    viewport = '{"x": 0, "y": 0, "zoom": Infinity}'
    body = f'{{"version": 1, "doc": {{"nodes": [], "edges": [], "viewport": {viewport}}}}}'
    response = client.put(
        f"/api/boards/{board['id']}", content=body, headers={"content-type": "application/json"}
    )
    assert response.status_code == 422
    assert client.get(f"/api/boards/{board['id']}").status_code == 200
