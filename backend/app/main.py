from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import ai_tailoring, cv
from app.api.analysis import router as analysis_router
from app.api.health import router as health_router
from app.api.pdf_analysis import router as pdf_analysis_router

app = FastAPI(
    title="Job Application Quality Checker API",
    description="API for comparing CVs with job descriptions.",
    version="0.1.0",
)

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(pdf_analysis_router, prefix="/api")
app.include_router(ai_tailoring.router, prefix="/api")
app.include_router(cv.router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Job Application Quality Checker API",
    }
