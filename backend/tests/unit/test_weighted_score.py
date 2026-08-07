import pytest
from app.services.scoring.weighted_score import (
    CriterionScore,
    calculate_weighted_score,
)


def test_calculates_weighted_score() -> None:
    criteria = [
        CriterionScore(
            name="technical_skills",
            score=80,
            weight=45,
        ),
        CriterionScore(
            name="experience_relevance",
            score=70,
            weight=25,
        ),
        CriterionScore(
            name="role_alignment",
            score=90,
            weight=15,
        ),
        CriterionScore(
            name="education_qualifications",
            score=100,
            weight=10,
        ),
        CriterionScore(
            name="location_eligibility",
            score=60,
            weight=5,
        ),
    ]

    result = calculate_weighted_score(criteria)

    assert result.final_score == 80
    assert result.evaluated_weight == 100
    assert result.total_weight == 100


def test_normalises_score_when_a_criterion_is_unknown() -> None:
    criteria = [
        CriterionScore(
            name="technical_skills",
            score=80,
            weight=45,
        ),
        CriterionScore(
            name="experience_relevance",
            score=70,
            weight=25,
        ),
        CriterionScore(
            name="role_alignment",
            score=90,
            weight=15,
        ),
        CriterionScore(
            name="education_qualifications",
            score=100,
            weight=10,
        ),
        CriterionScore(
            name="location_eligibility",
            score=None,
            weight=5,
        ),
    ]

    result = calculate_weighted_score(criteria)

    assert result.final_score == 81
    assert result.evaluated_weight == 95
    assert result.total_weight == 100


def test_returns_zero_when_all_scores_are_unknown() -> None:
    criteria = [
        CriterionScore(
            name="technical_skills",
            score=None,
            weight=45,
        ),
        CriterionScore(
            name="experience_relevance",
            score=None,
            weight=25,
        ),
    ]

    result = calculate_weighted_score(criteria)

    assert result.final_score == 0
    assert result.evaluated_weight == 0
    assert result.total_weight == 70


def test_rejects_an_empty_criteria_list() -> None:
    with pytest.raises(
        ValueError,
        match="At least one scoring criterion is required",
    ):
        calculate_weighted_score([])


def test_rejects_a_score_above_one_hundred() -> None:
    criteria = [
        CriterionScore(
            name="technical_skills",
            score=120,
            weight=45,
        ),
    ]

    with pytest.raises(
        ValueError,
        match="must be between 0 and 100",
    ):
        calculate_weighted_score(criteria)


def test_rejects_a_negative_score() -> None:
    criteria = [
        CriterionScore(
            name="technical_skills",
            score=-10,
            weight=45,
        ),
    ]

    with pytest.raises(
        ValueError,
        match="must be between 0 and 100",
    ):
        calculate_weighted_score(criteria)


def test_rejects_a_negative_weight() -> None:
    criteria = [
        CriterionScore(
            name="technical_skills",
            score=80,
            weight=-10,
        ),
    ]

    with pytest.raises(
        ValueError,
        match="cannot be negative",
    ):
        calculate_weighted_score(criteria)


def test_rejects_zero_total_weight() -> None:
    criteria = [
        CriterionScore(
            name="technical_skills",
            score=80,
            weight=0,
        ),
        CriterionScore(
            name="role_alignment",
            score=70,
            weight=0,
        ),
    ]

    with pytest.raises(
        ValueError,
        match="total criterion weight must be greater than zero",
    ):
        calculate_weighted_score(criteria)
