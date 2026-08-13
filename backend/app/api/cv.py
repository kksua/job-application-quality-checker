from fastapi import APIRouter

from app.schemas.analysis import AnalysisRequest
from app.schemas.cv import StructuredCv
from app.services.cv_parser import parse_cv_text

router = APIRouter()


@router.post(
    "/cv/parse",
    response_model=StructuredCv,
)
def parse_cv(
    request: AnalysisRequest,
) -> StructuredCv:
    return parse_cv_text(request.cv_text)
