from app.schemas.analysis import (
    AnalysisResponse,
    AtsIssueResponse,
    BulletIssueResponse,
    CriterionScoreResponse,
    ScoreBreakdownResponse,
)
from app.services.ats_analyser import analyse_ats_readiness
from app.services.bullet_analyser import analyse_cv_bullets
from app.services.scoring.application_score import (
    EDUCATION_QUALIFICATIONS_WEIGHT,
    EXPERIENCE_RELEVANCE_WEIGHT,
    LOCATION_ELIGIBILITY_WEIGHT,
    ROLE_ALIGNMENT_WEIGHT,
    TECHNICAL_SKILLS_WEIGHT,
    calculate_application_score,
)
from app.services.scoring.experience_relevance import (
    analyse_experience_relevance,
)
from app.services.scoring.location_eligibility import (
    analyse_location_eligibility,
)
from app.services.scoring.qualification_match import (
    analyse_qualification_match,
)
from app.services.scoring.role_alignment import analyse_role_alignment
from app.services.skill_matcher import analyse_skill_match
from app.services.text_quality_analyser import (
    find_repeated_words,
    find_vague_phrases,
)


def analyse_application_text(
    cv_text: str,
    job_description: str,
) -> AnalysisResponse:
    matching_skills, missing_skills, technical_skills_score = analyse_skill_match(
        cv_text=cv_text,
        job_description=job_description,
    )

    role_alignment = analyse_role_alignment(
        cv_text=cv_text,
        job_description=job_description,
    )

    experience_relevance = analyse_experience_relevance(
        cv_text=cv_text,
        job_description=job_description,
    )

    qualification_match = analyse_qualification_match(
        cv_text=cv_text,
        job_description=job_description,
    )
    location_eligibility = analyse_location_eligibility(
        cv_text=cv_text,
        job_description=job_description,
    )
    application_score = calculate_application_score(
        technical_skills_score=technical_skills_score,
        experience_relevance_score=experience_relevance.score,
        role_alignment_score=role_alignment.score,
        education_qualifications_score=qualification_match.score,
        location_eligibility_score=location_eligibility.score,
    )

    vague_phrases = find_vague_phrases(cv_text)
    repeated_words = find_repeated_words(cv_text)

    bullet_issues = [
        BulletIssueResponse(**issue) for issue in analyse_cv_bullets(cv_text)
    ]

    ats_score, ats_issues_raw, ats_passed_checks = analyse_ats_readiness(cv_text)

    ats_issues = [AtsIssueResponse(**issue) for issue in ats_issues_raw]

    score_breakdown = ScoreBreakdownResponse(
        technical_skills=CriterionScoreResponse(
            score=technical_skills_score,
            weight=TECHNICAL_SKILLS_WEIGHT,
        ),
        experience_relevance=CriterionScoreResponse(
            score=experience_relevance.score,
            weight=EXPERIENCE_RELEVANCE_WEIGHT,
        ),
        role_alignment=CriterionScoreResponse(
            score=role_alignment.score,
            weight=ROLE_ALIGNMENT_WEIGHT,
        ),
        education_qualifications=CriterionScoreResponse(
            score=qualification_match.score,
            weight=EDUCATION_QUALIFICATIONS_WEIGHT,
        ),
        location_eligibility=CriterionScoreResponse(
            score=location_eligibility.score,
            weight=LOCATION_ELIGIBILITY_WEIGHT,
        ),
    )

    return AnalysisResponse(
        matching_skills=matching_skills,
        missing_skills=missing_skills,
        vague_phrases=vague_phrases,
        repeated_words=repeated_words,
        bullet_issues=bullet_issues,
        ats_readiness_score=ats_score,
        ats_issues=ats_issues,
        ats_passed_checks=ats_passed_checks,
        match_score=application_score.match_score,
        score_breakdown=score_breakdown,
    )
