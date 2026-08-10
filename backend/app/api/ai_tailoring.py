from fastapi import APIRouter, HTTPException

from app.schemas.analysis import (
    TailoringRequest,
    TailoringResponse,
)
from app.services.ai_tailoring import (
    generate_tailoring_suggestion,
)

router = APIRouter()


@router.post(
    "/tailoring",
    response_model=TailoringResponse,
)
def generate_tailoring(
    request: TailoringRequest,
) -> TailoringResponse:
    try:
        suggestion = generate_tailoring_suggestion(
            cv_text=request.cv_text,
            job_description=request.job_description,
        )
    except Exception as exc:
        print(f"AI tailoring error: {type(exc).__name__}: {exc}")

        raise HTTPException(
            status_code=502,
            detail="AI tailoring could not be generated.",
        ) from exc

    return TailoringResponse(
        headline=suggestion.headline,
        summary=suggestion.summary,
    )
