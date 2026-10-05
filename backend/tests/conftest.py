import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from tests.jira_fake import FakeJira


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(Settings(db_path=":memory:")))


@pytest.fixture
def fake_jira() -> FakeJira:
    return FakeJira()


@pytest.fixture
def jira_client(fake_jira) -> TestClient:
    """App with a secret key and a fake Jira DC behind the HTTP transport."""
    settings = Settings(db_path=":memory:", drawhl_secret_key="test-secret-key")
    return TestClient(create_app(settings, jira_transport=httpx.MockTransport(fake_jira)))
