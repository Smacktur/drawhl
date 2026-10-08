import os
import stat

import pytest
from fastapi.testclient import TestClient

from app.adapters import password_file
from app.config import Settings
from app.domain.access import FAILURE_WINDOW_S, MAX_FAILURES, SESSION_TTL_S, Access
from app.domain.errors import InvalidPassword, TooManyAttempts
from app.main import create_app
from tests.conftest import PASSWORD, signed_in

NOW = 1_800_000_000.0


def test_token_is_valid_until_it_expires():
    access = Access("pw", "key")
    token = access.sign_in("pw", NOW)
    assert access.is_valid(token, NOW + SESSION_TTL_S - 1)
    assert not access.is_valid(token, NOW + SESSION_TTL_S)


@pytest.mark.parametrize("token", ["", "garbage", "123.abc", ".", "9999999999999.00"])
def test_forged_tokens_are_rejected(token):
    assert not Access("pw").is_valid(token, NOW)


def test_tampered_expiry_is_rejected():
    access = Access("pw")
    expires, _, signature = access.sign_in("pw", NOW).partition(".")
    assert not access.is_valid(f"{int(expires) + 10**6}.{signature}", NOW)


@pytest.mark.parametrize("other", [Access("new-pw", "key"), Access("pw", "new-key")])
def test_changing_password_or_secret_key_signs_everyone_out(other):
    token = Access("pw", "key").sign_in("pw", NOW)
    assert not other.is_valid(token, NOW)


def test_wrong_password_is_refused():
    with pytest.raises(InvalidPassword):
        Access("pw").sign_in("nope", NOW)


def test_too_many_failures_lock_even_the_right_password():
    access = Access("pw")
    for i in range(MAX_FAILURES):
        with pytest.raises(InvalidPassword):
            access.sign_in("nope", NOW + i)
    with pytest.raises(TooManyAttempts) as error:
        access.sign_in("pw", NOW + MAX_FAILURES)
    assert error.value.retry_after == FAILURE_WINDOW_S - MAX_FAILURES
    assert access.sign_in("pw", NOW + FAILURE_WINDOW_S + MAX_FAILURES)


def test_password_file_is_created_once_and_private(tmp_path):
    path = str(tmp_path / "data" / "password")
    password, created = password_file.load_or_create(path)
    assert created and len(password) == 20
    assert stat.S_IMODE(os.stat(path).st_mode) == 0o600
    assert password_file.load_or_create(path) == (password, False)


@pytest.fixture
def gated() -> TestClient:
    return TestClient(create_app(Settings(db_path=":memory:")))


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/api/boards"),
        ("POST", "/api/boards"),
        ("GET", "/api/boards/any"),
        ("GET", "/api/settings"),
        ("PUT", "/api/settings"),
        ("POST", "/api/tasks/resolve"),
        ("GET", "/api/version"),
        ("GET", "/metrics"),
        ("GET", "/docs"),
        ("GET", "/openapi.json"),
        ("GET", "/api/unknown"),
    ],
)
def test_routes_are_closed_without_a_session(gated, method, path):
    response = gated.request(method, path)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "auth_required"


@pytest.mark.parametrize("path", ["/health", "/ready", "/api/auth/status"])
def test_health_and_status_stay_open(gated, path):
    assert gated.get(path).status_code == 200


def test_sign_in_sets_a_session_cookie(gated):
    assert gated.get("/api/auth/status").json() == {"signed_in": False}
    response = gated.post("/api/auth/login", json={"password": PASSWORD})
    assert response.status_code == 204
    cookie = response.headers["set-cookie"]
    assert "drawhl_session=" in cookie and "HttpOnly" in cookie and "SameSite=lax" in cookie
    assert "Secure" not in cookie
    assert gated.get("/api/auth/status").json() == {"signed_in": True}
    assert gated.get("/api/boards").status_code == 200


def test_cookie_is_secure_behind_https(gated):
    response = gated.post(
        "/api/auth/login", json={"password": PASSWORD}, headers={"x-forwarded-proto": "https"}
    )
    assert "Secure" in response.headers["set-cookie"]


def test_wrong_password_then_rate_limit(gated):
    for _ in range(MAX_FAILURES):
        response = gated.post("/api/auth/login", json={"password": "nope"})
        assert response.json()["error"]["code"] == "invalid_password"
        assert response.status_code == 401
    response = gated.post("/api/auth/login", json={"password": PASSWORD})
    assert response.status_code == 429
    assert int(response.headers["retry-after"]) > 0


def test_sign_out_closes_the_instance_again(gated):
    client = signed_in(gated.app)
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/boards").status_code == 401


def test_without_env_the_password_is_generated_and_logged_once(tmp_path, monkeypatch, capsys):
    monkeypatch.delenv("DRAWHL_PASSWORD")
    path = tmp_path / "password"
    settings = Settings(db_path=":memory:", password_file=str(path))
    first = TestClient(create_app(settings))
    password = path.read_text().strip()
    assert capsys.readouterr().err.count(password) == 1
    assert first.post("/api/auth/login", json={"password": password}).status_code == 204
    second = TestClient(create_app(settings))
    assert password not in capsys.readouterr().err
    assert second.post("/api/auth/login", json={"password": password}).status_code == 204
