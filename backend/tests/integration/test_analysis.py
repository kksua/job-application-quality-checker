from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_analysis_endpoint_returns_skill_analysis() -> None:
    response = client.post(
        "/analysis",
        json={
            "cv_text": ("Python developer with React and PostgreSQL experience."),
            "job_description": (
                "We need Python, FastAPI, PostgreSQL and Docker experience."
            ),
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "matching_skills": ["postgresql", "python"],
        "missing_skills": ["docker", "fastapi"],
        "match_score": 50,
    }


def test_analysis_endpoint_rejects_short_cv_text() -> None:
    response = client.post(
        "/analysis",
        json={
            "cv_text": "Python",
            "job_description": ("We need a Python developer with FastAPI experience."),
        },
    )

    assert response.status_code == 422
