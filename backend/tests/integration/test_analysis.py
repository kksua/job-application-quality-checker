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
        "vague_phrases": [],
        "repeated_words": {},
        "bullet_issues": [],
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


def test_analysis_endpoint_detects_text_quality_problems() -> None:
    response = client.post(
        "/analysis",
        json={
            "cv_text": (
                "I am a hard-working team player. I worked on Python "
                "projects. Python was used for automation. Python helped "
                "with various tasks."
            ),
            "job_description": (
                "We need a Python developer with automation experience."
            ),
        },
    )

    assert response.status_code == 200

    result = response.json()

    assert "hard-working" in result["vague_phrases"]
    assert "team player" in result["vague_phrases"]
    assert "various tasks" in result["vague_phrases"]
    assert result["repeated_words"]["python"] == 3


def test_analysis_endpoint_returns_bullet_issues() -> None:
    response = client.post(
        "/analysis",
        json={
            "cv_text": (
                "- Reduced manual review time by 60% using FastAPI.\n"
                "- Worked on projects.\n"
                "- Responsible for various tasks."
            ),
            "job_description": (
                "We need a Python and FastAPI developer with testing experience."
            ),
        },
    )

    assert response.status_code == 200

    result = response.json()

    assert len(result["bullet_issues"]) == 2
    assert result["bullet_issues"][0]["bullet"] == "Worked on projects."
    assert result["bullet_issues"][1]["bullet"] == "Responsible for various tasks."
