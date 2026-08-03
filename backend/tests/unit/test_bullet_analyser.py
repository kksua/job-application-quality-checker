from app.services.bullet_analyser import (
    analyse_bullet,
    analyse_cv_bullets,
    contains_measurable_impact,
    extract_bullets,
    starts_with_action_verb,
)


def test_extract_bullets_returns_cv_bullets() -> None:
    text = """
Experience

- Built a FastAPI application.
• Reduced manual work by 60%.
* Worked on frontend tasks.
"""

    result = extract_bullets(text)

    assert result == [
        "Built a FastAPI application.",
        "Reduced manual work by 60%.",
        "Worked on frontend tasks.",
    ]


def test_starts_with_action_verb_returns_true() -> None:
    assert starts_with_action_verb("Developed a React dashboard for internal users.")


def test_starts_with_action_verb_returns_false() -> None:
    assert not starts_with_action_verb("Responsible for frontend development.")


def test_contains_measurable_impact_detects_percentage() -> None:
    assert contains_measurable_impact("Reduced review time by 60%.")


def test_contains_measurable_impact_returns_false_without_metric() -> None:
    assert not contains_measurable_impact(
        "Built a FastAPI service for document analysis."
    )


def test_analyse_bullet_detects_weak_bullet() -> None:
    result = analyse_bullet("Responsible for various tasks.")

    assert result["bullet"] == "Responsible for various tasks."
    assert "Bullet is too short" in result["issues"]
    assert "Bullet does not start with a strong action verb" in result["issues"]
    assert "Bullet does not include measurable impact" in result["issues"]


def test_analyse_bullet_accepts_strong_bullet() -> None:
    result = analyse_bullet("Reduced manual document review time by 60% using FastAPI.")

    assert result["issues"] == []


def test_analyse_cv_bullets_only_returns_problematic_bullets() -> None:
    cv_text = """
- Reduced manual review time by 60% using FastAPI.
- Worked on projects.
"""

    result = analyse_cv_bullets(cv_text)

    assert len(result) == 1
    assert result[0]["bullet"] == "Worked on projects."
