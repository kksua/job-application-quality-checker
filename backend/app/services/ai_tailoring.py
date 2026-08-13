import json
import os
import re
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(ENV_FILE)


@dataclass(frozen=True)
class TailoringSuggestion:
    headline: str
    summary: str


@dataclass(frozen=True)
class BulletRewriteSuggestion:
    rewritten_bullet: str


SYSTEM_INSTRUCTIONS = """
Role:
Act as an expert CV writer and ATS optimization specialist.

Task:
Write:
1. A concise, ATS-friendly CV headline.
2. A compelling professional summary in 3 to 4 sentences, under 75 words.

Context:
- Target Job Description: provided by the user
- Candidate CV: provided by the user

Instructions:
1. Identify the most important requirements and keywords in the job description.
2. Match them only to relevant skills, qualifications, achievements, 
and experience explicitly present in the CV.
3. Start the summary with the candidate's professional positioning or career stage.
4. Highlight the most relevant hard skills and qualifications.
5. Include measurable achievements when they exist in the CV.
6. Focus on the value the candidate can bring to the target role.
7. For entry-level candidates, graduates, or interns, emphasize hands-on experience, 
projects, technical foundation, achievements and career direction rather than seniority.
8. Keep the headline concise and relevant to the target role.
9. The headline should contain the target professional positioning 
and no more than 1 or 2 of the strongest relevant skills. 
Do not list the candidate's full tech stack.

Strict Guardrail:
Do not invent, estimate, infer, or exaggerate skills, metrics, companies,
job titles, responsibilities, qualifications, dates, or timeline facts that
are not explicitly present in the candidate's CV.

Output Format:
Return JSON only:

{
  "headline": "...",
  "summary": "..."
}
"""

BULLET_REWRITE_INSTRUCTIONS = """
Role:
Act as an expert CV editor.

Task:
Rewrite one selected experience or project bullet for the target job.

Apply all of these improvements in one rewrite:
1. Improve wording with a stronger action verb, cleaner phrasing, and less repetition.
2. Tailor to this job by emphasizing only parts of the existing bullet that are 
relevant to the job description.
3. Make the bullet more concise while preserving the core meaning.
4. Strengthen impact only when an existing metric, result, or outcome is already 
present.
5. Fix weak bullet wording, especially when the original lacks a strong action verb 
or clear impact.

Strict Fact Preservation:
Use only facts present in the original bullet or candidate CV context.
Do not add, infer, estimate, or imply new technologies, metrics, responsibilities,
employers, products, industries, outcomes, achievements, seniority, dates, or scope.
Do not invent measurable impact. For strengthen_impact, if no metric or result exists,
improve clarity without adding one.

Output:
Return JSON only:

{
  "rewritten_bullet": "..."
}
"""


def _numeric_tokens(value: str) -> set[str]:
    return set(re.findall(r"\b\d+(?:[.,]\d+)?%?\b", value))


def _contains_new_numeric_fact(
    rewritten_bullet: str,
    original_bullet: str,
    cv_context: str,
) -> bool:
    source_tokens = _numeric_tokens(f"{original_bullet}\n{cv_context}")
    rewritten_tokens = _numeric_tokens(rewritten_bullet)

    return not rewritten_tokens.issubset(source_tokens)


def generate_tailoring_suggestion(
    cv_text: str,
    job_description: str,
) -> TailoringSuggestion:
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise RuntimeError(f"OPENAI_API_KEY was not found in {ENV_FILE}")

    client = OpenAI(api_key=api_key)

    response = client.responses.create(
        model="gpt-5-mini",
        instructions=SYSTEM_INSTRUCTIONS,
        input=(
            f"CANDIDATE CV:\n{cv_text}\n\nTARGET JOB DESCRIPTION:\n{job_description}"
        ),
    )

    data = json.loads(response.output_text)

    return TailoringSuggestion(
        headline=data["headline"],
        summary=data["summary"],
    )


def generate_bullet_rewrite(
    bullet: str,
    cv_context: str,
    job_description: str,
) -> BulletRewriteSuggestion:
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise RuntimeError(f"OPENAI_API_KEY was not found in {ENV_FILE}")

    client = OpenAI(api_key=api_key)

    response = client.responses.create(
        model="gpt-5-mini",
        instructions=BULLET_REWRITE_INSTRUCTIONS,
        input=(
            f"ORIGINAL BULLET:\n{bullet}\n\n"
            f"RELEVANT CV CONTEXT:\n{cv_context}\n\n"
            f"TARGET JOB DESCRIPTION:\n{job_description}"
        ),
    )

    data = json.loads(response.output_text)
    rewritten_bullet = str(data["rewritten_bullet"]).strip()

    if not rewritten_bullet:
        raise RuntimeError("AI bullet rewrite returned an empty bullet.")

    if _contains_new_numeric_fact(
        rewritten_bullet=rewritten_bullet,
        original_bullet=bullet,
        cv_context=cv_context,
    ):
        raise RuntimeError("AI bullet rewrite introduced a new numeric fact.")

    return BulletRewriteSuggestion(rewritten_bullet=rewritten_bullet)
