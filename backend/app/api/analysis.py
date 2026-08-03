from fastapi import APIRouter

from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    AtsIssueResponse,
    BulletIssueResponse,
)
from app.services.ats_analyser import analyse_ats_readiness
from app.services.bullet_analyser import analyse_cv_bullets
from app.services.skill_matcher import analyse_skill_match
from app.services.text_quality_analyser import (
    find_repeated_words,
    find_vague_phrases,
)

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"],
)


@router.post("", response_model=AnalysisResponse)
def analyse_application(request: AnalysisRequest) -> AnalysisResponse:
    matching_skills, missing_skills, match_score = analyse_skill_match(
        cv_text=request.cv_text,
        job_description=request.job_description,
    )

    vague_phrases = find_vague_phrases(request.cv_text)
    repeated_words = find_repeated_words(request.cv_text)

    bullet_issues = [
        BulletIssueResponse(**issue) for issue in analyse_cv_bullets(request.cv_text)
    ]

    ats_score, ats_issues_raw, ats_passed_checks = analyse_ats_readiness(
        request.cv_text
    )

    ats_issues = [AtsIssueResponse(**issue) for issue in ats_issues_raw]

    return AnalysisResponse(
        matching_skills=matching_skills,
        missing_skills=missing_skills,
        vague_phrases=vague_phrases,
        repeated_words=repeated_words,
        bullet_issues=bullet_issues,
        ats_readiness_score=ats_score,
        ats_issues=ats_issues,
        ats_passed_checks=ats_passed_checks,
        match_score=match_score,
    )
