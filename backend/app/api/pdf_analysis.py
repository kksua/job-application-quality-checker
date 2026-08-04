from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.schemas.analysis import AnalysisResponse
from app.services.application_analyser import analyse_application_text
from app.services.pdf_extractor import (
    PdfExtractionError,
    extract_text_from_pdf,
)

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"],
)

MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024


@router.post("/pdf", response_model=AnalysisResponse)
async def analyse_pdf_application(
    cv_file: Annotated[UploadFile, File()],
    job_description: Annotated[str, Form(min_length=20)],
) -> AnalysisResponse:
    if cv_file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF files are supported.",
        )

    pdf_content = await cv_file.read()

    if len(pdf_content) > MAX_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="The PDF must be 5 MB or smaller.",
        )

    try:
        cv_text = extract_text_from_pdf(pdf_content)
    except PdfExtractionError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    return analyse_application_text(
        cv_text=cv_text,
        job_description=job_description,
    )
