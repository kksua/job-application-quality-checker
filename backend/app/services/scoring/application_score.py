from dataclasses import dataclass

from app.services.scoring.weighted_score import (
    CriterionScore,
    calculate_weighted_score,
)

TECHNICAL_SKILLS_WEIGHT = 45
EXPERIENCE_RELEVANCE_WEIGHT = 25
ROLE_ALIGNMENT_WEIGHT = 15
EDUCATION_QUALIFICATIONS_WEIGHT = 10
LOCATION_ELIGIBILITY_WEIGHT = 5


@dataclass(frozen=True)
class ApplicationScoreResult:
    match_score: int
    technical_skills_score: int
    evaluated_weight: float
    total_weight: float


def calculate_application_score(
    technical_skills_score: int,
    experience_relevance_score: int | None = None,
    role_alignment_score: int | None = None,
    education_qualifications_score: int | None = None,
    location_eligibility_score: int | None = None,
) -> ApplicationScoreResult:
    result = calculate_weighted_score(
        [
            CriterionScore(
                name="technical_skills",
                score=technical_skills_score,
                weight=TECHNICAL_SKILLS_WEIGHT,
            ),
            CriterionScore(
                name="experience_relevance",
                score=experience_relevance_score,
                weight=EXPERIENCE_RELEVANCE_WEIGHT,
            ),
            CriterionScore(
                name="role_alignment",
                score=role_alignment_score,
                weight=ROLE_ALIGNMENT_WEIGHT,
            ),
            CriterionScore(
                name="education_qualifications",
                score=education_qualifications_score,
                weight=EDUCATION_QUALIFICATIONS_WEIGHT,
            ),
            CriterionScore(
                name="location_eligibility",
                score=location_eligibility_score,
                weight=LOCATION_ELIGIBILITY_WEIGHT,
            ),
        ]
    )

    return ApplicationScoreResult(
        match_score=result.final_score,
        technical_skills_score=technical_skills_score,
        evaluated_weight=result.evaluated_weight,
        total_weight=result.total_weight,
    )
