from app.services.scoring.application_score import (
    calculate_application_score,
)


def test_uses_technical_skill_score_when_other_criteria_are_unknown() -> None:
    result = calculate_application_score(
        technical_skills_score=75,
    )

    assert result.match_score == 75
    assert result.technical_skills_score == 75
    assert result.evaluated_weight == 45
    assert result.total_weight == 100


def test_calculates_score_using_all_available_criteria() -> None:
    result = calculate_application_score(
        technical_skills_score=80,
        experience_relevance_score=70,
        role_alignment_score=90,
        education_qualifications_score=100,
        location_eligibility_score=60,
    )

    assert result.match_score == 80
    assert result.evaluated_weight == 100
    assert result.total_weight == 100


def test_normalises_score_when_location_is_unknown() -> None:
    result = calculate_application_score(
        technical_skills_score=80,
        experience_relevance_score=70,
        role_alignment_score=90,
        education_qualifications_score=100,
        location_eligibility_score=None,
    )

    assert result.match_score == 81
    assert result.evaluated_weight == 95
    assert result.total_weight == 100
