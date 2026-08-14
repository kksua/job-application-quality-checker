from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_analysis_endpoint_returns_skill_analysis() -> None:
    response = client.post(
        "/api/analysis",
        json={
            "cv_text": ("Python developer with React and PostgreSQL experience."),
            "job_description": (
                "We need Python, FastAPI, PostgreSQL and Docker experience."
            ),
        },
    )

    assert response.status_code == 200

    result = response.json()

    assert result["matching_skills"] == ["postgresql", "python"]
    assert result["missing_skills"] == ["docker", "fastapi"]
    assert result["vague_phrases"] == []
    assert result["repeated_words"] == {}
    assert result["bullet_issues"] == []
    assert result["match_score"] == 50

    assert "ats_readiness_score" in result
    assert "ats_issues" in result
    assert "ats_passed_checks" in result

    assert "score_breakdown" in result

    assert result["score_breakdown"]["technical_skills"]["score"] == 50
    assert result["score_breakdown"]["technical_skills"]["weight"] == 45

    assert result["score_breakdown"]["experience_relevance"]["weight"] == 25
    assert result["score_breakdown"]["role_alignment"]["weight"] == 15
    assert result["score_breakdown"]["education_qualifications"]["weight"] == 10

    assert result["score_breakdown"]["location_eligibility"]["score"] is None
    assert result["score_breakdown"]["location_eligibility"]["weight"] == 5


def test_analysis_endpoint_rejects_short_cv_text() -> None:
    response = client.post(
        "/api/analysis",
        json={
            "cv_text": "Python",
            "job_description": ("We need a Python developer with FastAPI experience."),
        },
    )

    assert response.status_code == 422


def test_analysis_endpoint_detects_text_quality_problems() -> None:
    response = client.post(
        "/api/analysis",
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
        "/api/analysis",
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


def test_analysis_endpoint_returns_ats_readiness_results() -> None:
    response = client.post(
        "/api/analysis",
        json={
            "cv_text": (
                "Supipi Amarajeeva\n"
                "supipi@example.com\n"
                "+33 6 12 34 56 78\n\n"
                "Experience\n"
                "- Developed a FastAPI application.\n\n"
                "Education\n"
                "- Engineering degree.\n\n"
                "Skills\n"
                "- Python, React, PostgreSQL."
            ),
            "job_description": ("We need a Python developer with FastAPI experience."),
        },
    )

    assert response.status_code == 200

    result = response.json()

    assert result["ats_readiness_score"] == 100
    assert result["ats_issues"] == []
    assert "Email address detected" in result["ats_passed_checks"]
    assert "Phone number detected" in result["ats_passed_checks"]
    assert "Experience section detected" in result["ats_passed_checks"]
    assert "Education section detected" in result["ats_passed_checks"]
    assert "Skills section detected" in result["ats_passed_checks"]


def test_analysis_combines_skill_and_role_alignment_scores() -> None:
    response = client.post(
        "/api/analysis",
        json={
            "cv_text": ("Full-Stack Developer with Python and React experience."),
            "job_description": (
                "We are hiring a Full-Stack Developer with Python, "
                "React, Docker and AWS experience."
            ),
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["matching_skills"] == ["python", "react"]
    assert data["missing_skills"] == ["aws", "docker"]

    # Technical skills: 50
    # Role alignment: 100
    # Experience relevance may also be detected depending on wording.
    assert "score_breakdown" in data
    assert data["score_breakdown"]["technical_skills"]["score"] == 50
    assert data["score_breakdown"]["technical_skills"]["weight"] == 45
    assert data["score_breakdown"]["role_alignment"]["score"] == 100
    assert data["score_breakdown"]["role_alignment"]["weight"] == 15

    assert data["match_score"] == 62
