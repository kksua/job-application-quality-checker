from app.services.scoring.role_alignment import (
    analyse_role_alignment,
    calculate_role_alignment_score,
    extract_roles,
)


def test_extracts_role_aliases() -> None:
    text = """
    Software Engineering Graduate

    Full-Stack Developer with experience building React and FastAPI
    applications.
    """

    roles = extract_roles(text)

    assert roles == {
        "full_stack_developer",
    }


def test_extracts_multiple_roles() -> None:
    text = """
    Worked as a Software Engineer and later contributed as an
    AI Engineer.
    """

    roles = extract_roles(text)

    assert roles == {
        "ai_engineer",
        "software_engineer",
    }


def test_returns_full_score_for_matching_roles() -> None:
    result = analyse_role_alignment(
        cv_text="Full-Stack Developer with React experience.",
        job_description="We are hiring a Junior Full-Stack Developer.",
    )

    assert result.score == 100
    assert result.cv_roles == ["full_stack_developer"]
    assert result.job_roles == ["full_stack_developer"]
    assert result.matched_roles == ["full_stack_developer"]


def test_returns_partial_score_for_related_roles() -> None:
    result = analyse_role_alignment(
        cv_text="Software Engineer with web application experience.",
        job_description="We are looking for a Full-Stack Developer.",
    )

    assert result.score == 85
    assert result.matched_roles == []


def test_uses_the_highest_related_role_score() -> None:
    score = calculate_role_alignment_score(
        cv_roles={
            "software_engineer",
            "frontend_developer",
        },
        job_roles={"full_stack_developer"},
    )

    assert score == 85


def test_returns_low_score_for_unrelated_roles() -> None:
    result = analyse_role_alignment(
        cv_text="Data Analyst with reporting experience.",
        job_description="We are hiring a Frontend Developer.",
    )

    assert result.score == 20
    assert result.matched_roles == []


def test_returns_unknown_when_job_role_is_not_detected() -> None:
    result = analyse_role_alignment(
        cv_text="Software Engineer with Python experience.",
        job_description="We are looking for someone to join our team.",
    )

    assert result.score is None
    assert result.job_roles == []


def test_returns_unknown_when_cv_role_is_not_detected() -> None:
    result = analyse_role_alignment(
        cv_text="Experienced with Python, React and PostgreSQL.",
        job_description="We are hiring a Software Engineer.",
    )

    assert result.score is None
    assert result.cv_roles == []
