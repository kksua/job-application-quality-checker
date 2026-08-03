from fastapi import APIRouter

from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    BulletIssueResponse,
)
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

    return AnalysisResponse(
        matching_skills=matching_skills,
        missing_skills=missing_skills,
        vague_phrases=vague_phrases,
        repeated_words=repeated_words,
        bullet_issues=bullet_issues,
        match_score=match_score,
    )
