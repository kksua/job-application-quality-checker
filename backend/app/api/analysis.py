from fastapi import APIRouter

from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.application_analyser import analyse_application_text

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"],
)


@router.post("", response_model=AnalysisResponse)
def analyse_application(request: AnalysisRequest) -> AnalysisResponse:
    return analyse_application_text(
        cv_text=request.cv_text,
        job_description=request.job_description,
    )
