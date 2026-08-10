import json
import os
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
