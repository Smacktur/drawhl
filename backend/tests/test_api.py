def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_ready(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["ready"] is True


def test_metrics_exposed(client):
    client.get("/health")
    assert "http_requests_total" in client.get("/metrics").text


def test_hello_returns_greeting_and_request_id(client):
    response = client.get("/api/hello", params={"name": "Ada"}, headers={"x-request-id": "abc"})
    assert response.json() == {"message": "Hello, Ada!"}
    assert response.headers["x-request-id"] == "abc"


def test_domain_error_uses_unified_format(client):
    response = client.get("/api/hello", params={"name": " "})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_failed"
