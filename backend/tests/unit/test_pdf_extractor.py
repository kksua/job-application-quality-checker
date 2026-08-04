import pytest
from app.services.pdf_extractor import (
    PdfExtractionError,
    extract_text_from_pdf,
)


def test_extract_text_from_pdf_rejects_empty_content() -> None:
    with pytest.raises(
        PdfExtractionError,
        match="The uploaded PDF is empty.",
    ):
        extract_text_from_pdf(b"")


def test_extract_text_from_pdf_rejects_invalid_pdf() -> None:
    with pytest.raises(
        PdfExtractionError,
        match="could not be read as a PDF",
    ):
        extract_text_from_pdf(b"This is not a PDF file.")
