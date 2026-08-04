from io import BytesIO

from app.main import app
from fastapi.testclient import TestClient
from pypdf import PdfWriter

client = TestClient(app)


def create_blank_pdf() -> bytes:
    buffer = BytesIO()

    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)
    writer.write(buffer)

    return buffer.getvalue()


def test_pdf_analysis_rejects_non_pdf_file() -> None:
    response = client.post(
        "/analysis/pdf",
        files={
            "cv_file": (
                "cv.txt",
                b"Python developer CV",
                "text/plain",
            )
        },
        data={
            "job_description": ("We need a Python developer with FastAPI experience.")
        },
    )

    assert response.status_code == 415
    assert response.json() == {"detail": "Only PDF files are supported."}


def test_pdf_analysis_rejects_pdf_without_readable_text() -> None:
    response = client.post(
        "/analysis/pdf",
        files={
            "cv_file": (
                "cv.pdf",
                create_blank_pdf(),
                "application/pdf",
            )
        },
        data={
            "job_description": ("We need a Python developer with FastAPI experience.")
        },
    )

    assert response.status_code == 422
    assert "No readable text was found" in response.json()["detail"]


def test_pdf_analysis_rejects_short_job_description() -> None:
    response = client.post(
        "/analysis/pdf",
        files={
            "cv_file": (
                "cv.pdf",
                create_blank_pdf(),
                "application/pdf",
            )
        },
        data={
            "job_description": "Python",
        },
    )

    assert response.status_code == 422
