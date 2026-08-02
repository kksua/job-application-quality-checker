from fastapi import FastAPI

from app.api.health import router as health_router

app = FastAPI(
    title="Job Application Quality Checker API",
    description="API for comparing CVs with job descriptions.",
    version="0.1.0",
)

app.include_router(health_router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Job Application Quality Checker API",
    }
