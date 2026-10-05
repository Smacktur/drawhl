def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_ready(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["ready"] is True


def test_metrics_exposed(client):
    client.get("/health")
    assert "http_requests_total" in client.get("/metrics").text


def test_request_id_is_echoed(client):
    response = client.get("/health", headers={"x-request-id": "abc"})
    assert response.headers["x-request-id"] == "abc"


def test_domain_error_uses_unified_format(client):
    response = client.get("/api/boards/missing")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
