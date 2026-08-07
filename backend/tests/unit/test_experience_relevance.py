from app.services.scoring.experience_relevance import (
    analyse_experience_relevance,
    calculate_evidence_quality_score,
    calculate_responsibility_score,
    extract_experience_signals,
)


def test_extracts_experience_signals() -> None:
    text = (
        "Developed backend services, integrated external APIs "
        "and automated internal workflows."
    )

    result = extract_experience_signals(text)

    assert result == {
        "automate",
        "develop",
        "integrate",
    }


def test_aliases_map_to_same_experience_signal() -> None:
    result = extract_experience_signals("Responsible for development and testing.")

    assert result == {
        "develop",
        "test",
    }


def test_calculates_full_responsibility_match() -> None:
    score = calculate_responsibility_score(
        cv_signals={
            "develop",
            "integrate",
            "test",
        },
        job_signals={
            "develop",
            "integrate",
            "test",
        },
    )

    assert score == 100


def test_calculates_partial_responsibility_match() -> None:
    score = calculate_responsibility_score(
        cv_signals={
            "develop",
            "test",
        },
        job_signals={
            "develop",
            "integrate",
            "test",
            "monitor",
        },
    )

    assert score == 50


def test_returns_unknown_when_job_has_no_experience_signals() -> None:
    score = calculate_responsibility_score(
        cv_signals={"develop"},
        job_signals=set(),
    )

    assert score is None


def test_calculates_evidence_quality_for_strong_bullets() -> None:
    cv_text = (
        "- Reduced manual review time by 60% using FastAPI.\n"
        "- Automated a workflow used by 20 users."
    )

    score = calculate_evidence_quality_score(cv_text)

    assert score == 100


def test_calculates_partial_evidence_quality() -> None:
    cv_text = (
        "- Developed a FastAPI service for document analysis.\n"
        "- Responsible for various frontend tasks."
    )

    score = calculate_evidence_quality_score(cv_text)

    # One of two bullets starts with an action verb = 50.
    # No bullet contains measurable impact = 0.
    # 50 × 0.6 + 0 × 0.4 = 30.
    assert score == 30


def test_returns_unknown_evidence_quality_without_bullets() -> None:
    score = calculate_evidence_quality_score(
        "Developed FastAPI services and integrated external APIs."
    )

    assert score is None


def test_combines_responsibility_and_evidence_scores() -> None:
    result = analyse_experience_relevance(
        cv_text=(
            "- Developed backend services using FastAPI.\n"
            "- Tested APIs and reduced defects by 30%."
        ),
        job_description=(
            "You will develop backend services, test APIs "
            "and monitor production systems."
        ),
    )

    # Responsibility:
    # develop + test matched out of develop + test + monitor
    # 2 / 3 = 67
    #
    # Evidence:
    # Both bullets start with action verbs = 100
    # One of two has measurable impact = 50
    # 100 × 0.6 + 50 × 0.4 = 80
    #
    # Final:
    # 67 × 0.8 + 80 × 0.2 = 69.6 -> 70

    assert result.responsibility_score == 67
    assert result.evidence_quality_score == 80
    assert result.score == 70

    assert result.matched_signals == [
        "develop",
        "test",
    ]


def test_experience_relevance_can_score_zero() -> None:
    result = analyse_experience_relevance(
        cv_text=("Data reporting specialist with dashboard experience."),
        job_description=("You will develop, test and deploy backend services."),
    )

    assert result.responsibility_score == 0
    assert result.score == 0
    assert result.matched_signals == []


def test_experience_relevance_is_unknown_without_job_signals() -> None:
    result = analyse_experience_relevance(
        cv_text="Developed several Python applications.",
        job_description=("We are looking for someone to join our growing team."),
    )

    assert result.score is None
    assert result.responsibility_score is None
