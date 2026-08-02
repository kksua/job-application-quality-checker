import re

SUPPORTED_SKILLS = {
    "aws",
    "docker",
    "fastapi",
    "firebase",
    "git",
    "github actions",
    "javascript",
    "kubernetes",
    "mongodb",
    "next.js",
    "node.js",
    "playwright",
    "postgresql",
    "python",
    "react",
    "redis",
    "rest api",
    "sql",
    "supabase",
    "typescript",
    "vitest",
}


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def contains_skill(text: str, skill: str) -> bool:
    pattern = rf"(?<!\w){re.escape(skill)}(?!\w)"
    return re.search(pattern, text) is not None


def extract_skills(text: str) -> set[str]:
    normalized_text = normalize_text(text)

    return {
        skill for skill in SUPPORTED_SKILLS if contains_skill(normalized_text, skill)
    }


def calculate_match_score(
    matching_skills: set[str],
    required_skills: set[str],
) -> int:
    if not required_skills:
        return 0

    score = len(matching_skills) / len(required_skills) * 100
    return round(score)


def analyse_skill_match(
    cv_text: str,
    job_description: str,
) -> tuple[list[str], list[str], int]:
    cv_skills = extract_skills(cv_text)
    required_skills = extract_skills(job_description)

    matching_skills = cv_skills & required_skills
    missing_skills = required_skills - cv_skills

    score = calculate_match_score(
        matching_skills=matching_skills,
        required_skills=required_skills,
    )

    return (
        sorted(matching_skills),
        sorted(missing_skills),
        score,
    )
