from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_health_check_returns_healthy_status() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_root_returns_application_message() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Job Application Quality Checker API",
    }
