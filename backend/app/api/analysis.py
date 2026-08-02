from fastapi import APIRouter

from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.skill_matcher import analyse_skill_match

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

    return AnalysisResponse(
        matching_skills=matching_skills,
        missing_skills=missing_skills,
        match_score=match_score,
    )
