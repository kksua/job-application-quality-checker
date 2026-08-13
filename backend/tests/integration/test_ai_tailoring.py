from unittest.mock import patch

from app.main import app
from app.services.ai_tailoring import BulletRewriteSuggestion, TailoringSuggestion
from fastapi.testclient import TestClient

client = TestClient(app)


@patch("app.api.ai_tailoring.generate_tailoring_suggestion")
def test_tailoring_endpoint_returns_ai_suggestion(
    mocked_generate,
) -> None:
    mocked_generate.return_value = TailoringSuggestion(
        headline=("Software Engineering Graduate | React, TypeScript & FastAPI"),
        summary=(
            "Software Engineering graduate with experience "
            "developing full-stack applications using React, "
            "TypeScript and FastAPI. Built web platforms and "
            "AI-assisted workflows, including a RAG solution "
            "that reduced manual document review by 60%. "
            "Experienced in frontend, backend and API "
            "development with PostgreSQL."
        ),
    )

    response = client.post(
        "/tailoring",
        json={
            "cv_text": (
                "Software Engineering graduate with "
                "React, TypeScript, FastAPI and PostgreSQL "
                "experience. Developed a RAG workflow that "
                "reduced manual review by 60%."
            ),
            "job_description": (
                "We are hiring a Junior Full-Stack Developer "
                "with React, TypeScript and FastAPI experience."
            ),
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["headline"] == (
        "Software Engineering Graduate | React, TypeScript & FastAPI"
    )

    assert "RAG" in data["summary"]

    mocked_generate.assert_called_once()


@patch("app.api.ai_tailoring.generate_tailoring_suggestion")
def test_tailoring_endpoint_handles_ai_failure(
    mocked_generate,
) -> None:
    mocked_generate.side_effect = RuntimeError("OpenAI request failed.")

    response = client.post(
        "/tailoring",
        json={
            "cv_text": (
                "Software Engineering graduate with React, "
                "TypeScript and FastAPI experience."
            ),
            "job_description": (
                "We are hiring a Junior Full-Stack Developer "
                "with React and TypeScript experience."
            ),
        },
    )

    assert response.status_code == 502
    assert response.json() == {"detail": "AI tailoring could not be generated."}


def test_tailoring_endpoint_rejects_short_cv() -> None:
    response = client.post(
        "/tailoring",
        json={
            "cv_text": "React",
            "job_description": (
                "We are hiring a Junior Full-Stack Developer "
                "with React and TypeScript experience."
            ),
        },
    )

    assert response.status_code == 422


@patch("app.api.ai_tailoring.generate_bullet_rewrite")
def test_bullet_rewrite_endpoint_returns_ai_suggestion(
    mocked_generate,
) -> None:
    mocked_generate.return_value = BulletRewriteSuggestion(
        rewritten_bullet=(
            "Built React frontend features for internal dashboard workflows."
        ),
    )

    response = client.post(
        "/tailoring/bullet",
        json={
            "bullet": "Responsible for frontend tasks.",
            "cv_context": (
                "Experience: Frontend Developer at Nova Digital\n"
                "Skills: React, TypeScript"
            ),
            "job_description": (
                "We need a frontend developer with React and TypeScript "
                "experience for dashboard products."
            ),
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "rewritten_bullet": (
            "Built React frontend features for internal dashboard workflows."
        ),
    }

    mocked_generate.assert_called_once_with(
        bullet="Responsible for frontend tasks.",
        cv_context=(
            "Experience: Frontend Developer at Nova Digital\nSkills: React, TypeScript"
        ),
        job_description=(
            "We need a frontend developer with React and TypeScript "
            "experience for dashboard products."
        ),
    )
