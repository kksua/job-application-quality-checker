from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    cv_text: str = Field(
        min_length=20,
        description="The candidate's CV content.",
    )
    job_description: str = Field(
        min_length=20,
        description="The target job description.",
    )


class BulletIssueResponse(BaseModel):
    bullet: str
    issues: list[str]


class AnalysisResponse(BaseModel):
    matching_skills: list[str]
    missing_skills: list[str]
    vague_phrases: list[str]
    repeated_words: dict[str, int]
    bullet_issues: list[BulletIssueResponse]
    match_score: int
