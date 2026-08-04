from io import BytesIO

from pypdf import PdfReader
from pypdf.errors import PdfReadError


class PdfExtractionError(ValueError):
    pass


def extract_text_from_pdf(pdf_content: bytes) -> str:
    if not pdf_content:
        raise PdfExtractionError("The uploaded PDF is empty.")

    try:
        reader = PdfReader(BytesIO(pdf_content))
    except PdfReadError as error:
        raise PdfExtractionError(
            "The uploaded file could not be read as a PDF."
        ) from error

    if reader.is_encrypted:
        raise PdfExtractionError("Password-protected PDFs are not supported.")

    page_texts: list[str] = []

    for page in reader.pages:
        extracted_text = page.extract_text()

        if extracted_text:
            page_texts.append(extracted_text.strip())

    combined_text = "\n\n".join(text for text in page_texts if text).strip()

    if len(combined_text) < 20:
        raise PdfExtractionError(
            "No readable text was found in the PDF. "
            "Please upload a text-based PDF or paste the CV text."
        )

    return combined_text
