from fastapi import FastAPI

from app.api.analysis import router as analysis_router
from app.api.health import router as health_router
from app.api.pdf_analysis import router as pdf_analysis_router

app = FastAPI(
    title="Job Application Quality Checker API",
    description="API for comparing CVs with job descriptions.",
    version="0.1.0",
)

app.include_router(health_router)
app.include_router(analysis_router)
app.include_router(pdf_analysis_router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Job Application Quality Checker API",
    }
