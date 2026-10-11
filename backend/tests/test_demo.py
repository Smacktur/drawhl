import time

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from starlette.websockets import WebSocketDisconnect

from app.config import Settings
from app.domain import demo
from app.main import create_app
from tests.conftest import signed_in

DAY = 24 * 3600
STICKY = {
    "id": "note",
    "type": "sticky",
    "position": {"x": 1, "y": 2},
    "width": 200,
    "height": 200,
    "data": {"text": "mine", "color": "yellow"},
}


@pytest.fixture
def app():
    return create_app(Settings(db_path=":memory:", tiko_demo=True))


def visitor(app, address: str = "203.0.113.1") -> TestClient:
    client = TestClient(app)
    response = client.post("/api/auth/demo", headers={"x-real-ip": address})
    assert response.status_code == 204, response.text
    return client


def me(client: TestClient) -> dict:
    return client.get("/api/auth/status").json()["me"]


def welcome(client: TestClient) -> str:
    return client.get("/api/boards").json()["boards"][0]["id"]


def edit(client: TestClient, board_id: str) -> None:
    body = {"version": 1, "doc": {"nodes": [STICKY], "edges": []}}
    assert client.put(f"/api/boards/{board_id}", json=body).is_success


def rows(app) -> str:
    """Everything the database holds, as text."""
    db = app.state.boards._db
    with db.transaction() as conn:
        tables = conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()
        found = [conn.execute(f"SELECT * FROM {t['name']}").fetchall() for t in tables]
    return repr([tuple(row) for table in found for row in table])


def test_without_the_switch_nothing_is_there(client):
    assert client.get("/api/auth/status").json().keys() == {"signed_in", "me"}
    assert TestClient(client.app).post("/api/auth/demo").status_code == 404
    assert client.post("/api/auth/demo").status_code == 404


def test_the_switch_does_not_go_with_jira():
    with pytest.raises(ValidationError, match="TIKO_TRACKER"):
        Settings(tiko_demo=True, tiko_tracker="jira")


def test_one_request_makes_a_person_with_a_board_they_can_edit(app):
    assert TestClient(app).get("/api/auth/status").json() == {
        "signed_in": False,
        "me": None,
        "demo": True,
    }
    client = visitor(app)
    person = me(client)
    assert person["role"] == "member" and person["name"] == "Demo visitor"
    assert person["demo_expires_at"]
    boards = client.get("/api/boards").json()["boards"]
    assert [board["name"] for board in boards] == ["Welcome to tiko"]
    edit(client, boards[0]["id"])
    assert client.get("/api/settings").json()["locked"] == ["provider"]


def test_a_session_in_hand_makes_nobody(app):
    client = visitor(app)
    first = me(client)["id"]
    assert client.post("/api/auth/demo").status_code == 204
    assert me(client)["id"] == first
    admin = signed_in(app)
    assert admin.post("/api/auth/demo").status_code == 204
    assert me(admin)["username"] == "admin"


def test_a_demo_visitor_cannot_sign_in_by_password(app):
    username = me(visitor(app))["username"]
    for password in ("!", "", "anything-long-enough"):
        response = TestClient(app).post(
            "/api/auth/login", json={"username": username, "password": password}
        )
        assert response.status_code == 401


def test_visitors_see_nothing_of_each_other(app):
    ann, bob = visitor(app), visitor(app, "203.0.113.2")
    board_id = welcome(ann)
    edit(ann, board_id)
    assert board_id not in [b["id"] for b in bob.get("/api/boards").json()["boards"]]
    save = {"version": 2, "doc": {"nodes": [], "edges": []}}
    for method, path, body in [
        ("get", f"/api/boards/{board_id}", None),
        ("put", f"/api/boards/{board_id}", save),
        ("patch", f"/api/boards/{board_id}", {"name": "Taken"}),
        ("delete", f"/api/boards/{board_id}", None),
        ("post", f"/api/boards/{board_id}/refresh", None),
        ("get", f"/api/boards/{board_id}/members", None),
    ]:
        assert bob.request(method, path, json=body).status_code == 404, path
    assert bob.get("/api/people").status_code == 403
    assert bob.get("/api/people/directory").json() == {"people": []}
    assert bob.get("/api/people/directory?q=admin").json() == {"people": []}
    assert ann.get(f"/api/boards/{board_id}").json()["doc"]["nodes"][0]["id"] == "note"

    with TestClient(app) as sockets:
        cookie = bob.cookies.get("tiko_session")
        with (
            pytest.raises(WebSocketDisconnect) as closed,
            sockets.websocket_connect(
                f"/api/boards/{board_id}/live", headers={"cookie": f"tiko_session={cookie}"}
            ) as socket,
        ):
            socket.receive_bytes()
        assert closed.value.code == 4403


def test_nobody_is_shown_a_demo_visitor(app):
    ann = visitor(app)
    board_id = welcome(ann)
    admin = signed_in(app)
    assert [p["username"] for p in admin.get("/api/people").json()["people"]] == ["admin"]
    # On a demo instance the picker answers a whole username and nothing else.
    assert admin.get("/api/people/directory").json() == {"people": []}
    assert admin.get("/api/people/directory?q=adm").json() == {"people": []}
    found = admin.get("/api/people/directory?q=Admin").json()["people"]
    assert [p["username"] for p in found] == ["admin"]
    listed = admin.get("/api/boards").json()
    assert board_id not in [b["id"] for b in listed["boards"] + listed["all"]]
    # By its address the board still opens for an admin.
    assert admin.get(f"/api/boards/{board_id}").status_code == 200
    change = admin.patch(f"/api/people/{me(ann)['id']}", json={"role": "admin"})
    assert change.status_code == 404


def test_what_a_demo_visitor_is_refused(app):
    ann = visitor(app)
    board_id = welcome(ann)
    admin_id = me(signed_in(app))["id"]
    password = {"current": "!", "new": "long-enough-password"}
    for method, path, body in [
        ("put", f"/api/boards/{board_id}/members/{admin_id}", {"role": "editor"}),
        ("delete", f"/api/boards/{board_id}/members/{admin_id}", None),
        ("put", f"/api/boards/{board_id}/everyone", {"role": "viewer"}),
        ("put", f"/api/boards/{board_id}/public", {"public": True}),
        ("post", f"/api/boards/{board_id}/transfer", {"user_id": admin_id}),
        ("patch", "/api/me", {"username": "ann"}),
        ("put", "/api/me/password", password),
        ("put", "/api/me/tracker", {"token": "secret"}),
        ("post", "/api/invites", {"role": "member"}),
    ]:
        response = ann.request(method, path, json=body)
        assert response.status_code == 403, path
        assert response.json()["error"]["code"] == "forbidden"
    assert ann.get(f"/api/boards/{board_id}/members").json()["public"] is False


def test_a_demo_instance_has_no_everyone_role_and_keeps_no_tokens(app):
    admin = signed_in(app)
    board_id = admin.post("/api/boards", json={"name": "Roadmap"}).json()["id"]
    assert admin.put(f"/api/boards/{board_id}/everyone", json={"role": "viewer"}).status_code == 403
    assert admin.put("/api/me/tracker", json={"token": "secret"}).status_code == 403
    # An admin still publishes a board, as on any instance.
    assert admin.put(f"/api/boards/{board_id}/public", json={"public": True}).json()["public"]


def test_three_boards_with_the_welcome_board(app):
    ann = visitor(app)
    welcome(ann)
    for name in ("Second", "Third"):
        assert ann.post("/api/boards", json={"name": name}).status_code == 201
    response = ann.post("/api/boards", json={"name": "Fourth"})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "board_limit"
    admin = signed_in(app)
    for name in ("One", "Two", "Three", "Four"):
        assert admin.post("/api/boards", json={"name": name}).status_code == 201


def test_an_ordinary_instance_has_no_board_limit(client):
    for index in range(5):
        assert client.post("/api/boards", json={"name": f"Board {index}"}).status_code == 201


def test_five_demos_an_hour_from_one_address(app):
    for _ in range(demo.PER_ADDRESS):
        visitor(app)
    response = TestClient(app).post("/api/auth/demo", headers={"x-real-ip": "203.0.113.1"})
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "too_many_attempts"
    assert int(response.headers["retry-after"]) > 0
    visitor(app, "203.0.113.2")
    # Signing in is not held back by it.
    signed_in(app)


def test_an_ipv6_network_counts_as_one_address():
    assert demo.address_key("2001:db8:1:2:aaaa::1") == demo.address_key("2001:db8:1:2:bbbb::9")
    assert demo.address_key("2001:db8:1:2::1") != demo.address_key("2001:db8:1:3::1")
    assert demo.address_key("203.0.113.7") == "203.0.113.7"
    assert demo.address_key("not an address") == "not an address"


def test_a_full_demo_gives_the_place_of_one_who_changed_nothing(app, monkeypatch):
    monkeypatch.setattr(demo, "MAX_ALIVE", 2)
    idle = visitor(app, "203.0.113.1")
    busy = visitor(app, "203.0.113.2")
    idle_board = welcome(idle)
    edit(busy, welcome(busy))

    newcomer = visitor(app, "203.0.113.3")
    assert idle.get("/api/boards").status_code == 401
    assert busy.get("/api/boards").status_code == 200
    assert idle_board not in rows(app)

    edit(newcomer, welcome(newcomer))
    response = TestClient(app).post("/api/auth/demo", headers={"x-real-ip": "203.0.113.4"})
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "demo_full"
    signed_in(app)


def test_the_cleanup_takes_everything_of_a_visitor_who_stayed_away(app):
    ann, bob = visitor(app), visitor(app, "203.0.113.2")
    ann_id, board_id = me(ann)["id"], welcome(ann)
    edit(ann, board_id)
    ann.put("/api/demo/tasks/DEMO-1/status", json={"status": "Done"})
    ann.post(f"/api/boards/{board_id}/refresh")
    edit(bob, welcome(bob))
    visitors = app.state.visitors
    assert ann_id in rows(app)

    assert visitors.cleanup(time.time() + 6 * DAY) == 0
    # Bob came back on day 6; Ann did not.
    app.state.accounts._users.touch_demo(me(bob)["id"], demo.iso(time.time() + 13 * DAY))
    assert visitors.cleanup(time.time() + 8 * DAY) == 1
    assert visitors.cleanup(time.time() + 8 * DAY) == 0

    assert ann.get("/api/boards").status_code == 401
    left = rows(app)
    assert ann_id not in left and board_id not in left
    assert bob.get("/api/boards").status_code == 200


def test_a_visitor_who_changed_nothing_goes_within_the_hour(app):
    idle, busy = visitor(app), visitor(app, "203.0.113.2")
    welcome(idle)
    edit(busy, welcome(busy))
    assert app.state.visitors.cleanup(time.time() + 30 * 60) == 0
    assert app.state.visitors.cleanup(time.time() + 2 * 3600) == 1
    assert idle.get("/api/boards").status_code == 401
    assert busy.get("/api/boards").status_code == 200


def test_an_expired_visitor_is_refused_before_the_cleanup(app, monkeypatch):
    ann = visitor(app)
    assert ann.get("/api/boards").status_code == 200
    later = time.time() + 8 * DAY
    monkeypatch.setattr(time, "time", lambda: later)
    assert ann.get("/api/boards").status_code == 401


def test_requests_move_the_expiry_on(app, monkeypatch):
    ann = visitor(app)
    first = me(ann)["demo_expires_at"]
    later = time.time() + 3 * DAY
    monkeypatch.setattr(time, "time", lambda: later)
    assert me(ann)["demo_expires_at"] > first
    much_later = later + 6 * DAY
    monkeypatch.setattr(time, "time", lambda: much_later)
    assert ann.get("/api/boards").status_code == 200


def test_the_cleanup_closes_an_open_board(app):
    ann = visitor(app)
    board_id = welcome(ann)
    edit(ann, board_id)
    cookie = ann.cookies.get("tiko_session")
    with (
        TestClient(app) as sockets,
        sockets.websocket_connect(
            f"/api/boards/{board_id}/live", headers={"cookie": f"tiko_session={cookie}"}
        ) as socket,
    ):
        socket.receive_bytes()
        assert app.state.visitors.cleanup(time.time() + 8 * DAY) == 1
        with pytest.raises(WebSocketDisconnect) as closed:
            while True:
                socket.receive_bytes()
        assert closed.value.code == 4401


def test_task_statuses_are_each_persons_own(app):
    ann, bob = visitor(app), visitor(app, "203.0.113.2")
    assert ann.put("/api/demo/tasks/DEMO-1/status", json={"status": "Done"}).is_success

    def status(client: TestClient) -> str:
        return client.post("/api/tasks/resolve", json={"ref": "DEMO-1"}).json()["task"][
            "status_name"
        ]

    assert status(ann) == "Done"
    assert status(bob) == "In Progress"
    found = bob.post("/api/tasks/search", json={"jql": '"DEMO-1"'}).json()["tasks"]
    assert found[0]["status_name"] == "In Progress"
    board = ann.post(f"/api/boards/{welcome(ann)}/refresh").json()
    assert board["tasks"]["demo:DEMO-1"]["status_name"] == "Done"
    board = bob.post(f"/api/boards/{welcome(bob)}/refresh").json()
    assert board["tasks"]["demo:DEMO-1"]["status_name"] == "In Progress"


def test_a_guest_sees_the_statuses_of_the_boards_owner(app):
    admin = signed_in(app)
    board_id = welcome(admin)
    admin.put("/api/demo/tasks/DEMO-1/status", json={"status": "Done"})
    visitor(app).put("/api/demo/tasks/DEMO-1/status", json={"status": "Closed"})
    token = admin.put(f"/api/boards/{board_id}/public", json={"public": True}).json()[
        "public_token"
    ]
    guest = TestClient(app)
    tasks = guest.post(f"/api/public/{token}/refresh").json()["tasks"]
    assert tasks["demo:DEMO-1"]["status_name"] == "Done"
    assert guest.get(f"/api/public/{token}").json()["tasks"]["demo:DEMO-1"]["status_name"] == "Done"


def test_statuses_survive_a_restart(tmp_path):
    settings = Settings(db_path=str(tmp_path / "app.db"), tiko_demo=True)
    admin = signed_in(create_app(settings))
    admin.put("/api/demo/tasks/DEMO-2/status", json={"status": "Done"})
    again = signed_in(create_app(settings))
    task = again.post("/api/tasks/resolve", json={"ref": "DEMO-2"}).json()["task"]
    assert task["status_name"] == "Done"


def test_an_ordinary_instance_still_shares_statuses(client):
    client.put("/api/demo/tasks/DEMO-1/status", json={"status": "Done"})
    url = client.post("/api/invites", json={"role": "member"}).json()["url"]
    other = TestClient(client.app)
    other.post(
        f"/api/invites/{url.split('=', 1)[1]}/accept",
        json={"username": "ann", "name": "Ann", "password": "long-enough-password"},
    )
    task = other.post("/api/tasks/resolve", json={"ref": "DEMO-1"}).json()["task"]
    assert task["status_name"] == "Done"


def test_a_board_list_stays_fast_among_many_strangers(app):
    boards = app.state.boards
    users = app.state.accounts._users
    for index in range(demo.MAX_ALIVE - 1):
        person = demo.Person(
            id=f"{index:032x}",
            username=f"~{index:012x}",
            name="Demo visitor",
            role="member",
            demo_expires_at=demo.iso(time.time() + DAY),
        )
        users.add(person, demo.NO_PASSWORD)
        for name in ("One", "Two", "Three"):
            boards.create(name, demo_doc(), person.id)
    ann = visitor(app)
    welcome(ann)
    started = time.perf_counter()
    listed = ann.get("/api/boards").json()
    assert time.perf_counter() - started < 0.1
    assert len(listed["boards"]) == 1 and listed["all"] == []


def demo_doc():
    from app.domain.boards import BoardDoc

    return BoardDoc()
