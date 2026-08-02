from app.services.skill_matcher import (
    analyse_skill_match,
    calculate_match_score,
    extract_skills,
    normalize_text,
)


def test_normalize_text_converts_text_to_lowercase() -> None:
    result = normalize_text("  Python   AND React  ")

    assert result == "python and react"


def test_extract_skills_returns_detected_skills() -> None:
    text = "I have experience with Python, FastAPI and PostgreSQL."

    result = extract_skills(text)

    assert result == {"python", "fastapi", "postgresql"}


def test_extract_skills_is_case_insensitive() -> None:
    text = "PYTHON, React and TypeScript"

    result = extract_skills(text)

    assert result == {"python", "react", "typescript"}


def test_calculate_match_score_returns_percentage() -> None:
    result = calculate_match_score(
        matching_skills={"python", "react"},
        required_skills={"python", "react", "docker", "fastapi"},
    )

    assert result == 50


def test_calculate_match_score_returns_zero_without_required_skills() -> None:
    result = calculate_match_score(
        matching_skills=set(),
        required_skills=set(),
    )

    assert result == 0


def test_analyse_skill_match_returns_matching_and_missing_skills() -> None:
    cv_text = "Python developer with React and PostgreSQL experience."
    job_description = "We need Python, FastAPI, PostgreSQL and Docker experience."

    matching, missing, score = analyse_skill_match(
        cv_text=cv_text,
        job_description=job_description,
    )

    assert matching == ["postgresql", "python"]
    assert missing == ["docker", "fastapi"]
    assert score == 50
