from fastapi import APIRouter, HTTPException

from app.schemas.analysis import (
    BulletRewriteRequest,
    BulletRewriteResponse,
    CvConversationRequest,
    CvConversationResponse,
    TailoringRequest,
    TailoringResponse,
)
from app.services.ai_tailoring import (
    generate_bullet_rewrite,
    generate_cv_conversation_response,
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


@router.post(
    "/tailoring/bullet",
    response_model=BulletRewriteResponse,
)
def rewrite_bullet(
    request: BulletRewriteRequest,
) -> BulletRewriteResponse:
    try:
        suggestion = generate_bullet_rewrite(
            bullet=request.bullet,
            cv_context=request.cv_context,
            job_description=request.job_description,
        )
    except Exception as exc:
        print(f"AI bullet rewrite error: {type(exc).__name__}: {exc}")

        raise HTTPException(
            status_code=502,
            detail="AI bullet rewrite could not be generated.",
        ) from exc

    return BulletRewriteResponse(rewritten_bullet=suggestion.rewritten_bullet)


@router.post(
    "/tailoring/conversation",
    response_model=CvConversationResponse,
)
def edit_cv_in_conversation(
    request: CvConversationRequest,
) -> CvConversationResponse:
    try:
        suggestion = generate_cv_conversation_response(
            structured_cv=request.structured_cv,
            job_description=request.job_description,
            messages=[message.model_dump() for message in request.messages],
        )
    except Exception as exc:
        print(f"AI CV conversation error: {type(exc).__name__}: {exc}")

        raise HTTPException(
            status_code=502,
            detail="The CV could not be updated from this conversation.",
        ) from exc

    return CvConversationResponse(
        reply=suggestion.reply,
        structured_cv=suggestion.structured_cv,
    )
