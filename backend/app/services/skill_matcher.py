import re

SKILL_ALIASES = {
    "aws": {"aws", "amazon web services"},
    "docker": {"docker"},
    "fastapi": {"fastapi", "fast api"},
    "firebase": {"firebase"},
    "git": {"git"},
    "github actions": {"github actions", "github action"},
    "javascript": {"javascript", "js"},
    "kubernetes": {"kubernetes", "k8s"},
    "mongodb": {"mongodb", "mongo db"},
    "next.js": {"next.js", "nextjs", "next js"},
    "node.js": {"node.js", "nodejs", "node js"},
    "playwright": {"playwright"},
    "postgresql": {"postgresql", "postgres", "postgre sql"},
    "python": {"python"},
    "react": {"react", "react.js", "reactjs"},
    "redis": {"redis"},
    "rest api": {"rest api", "rest APIs", "restful api", "restful APIs"},
    "sql": {"sql"},
    "supabase": {"supabase"},
    "typescript": {"typescript", "ts"},
    "vitest": {"vitest"},
}


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def contains_skill(text: str, alias: str) -> bool:
    pattern = rf"(?<!\w){re.escape(alias.lower())}(?!\w)"
    return re.search(pattern, text) is not None


def extract_skills(text: str) -> set[str]:
    normalized_text = normalize_text(text)

    return {
        canonical_name
        for canonical_name, aliases in SKILL_ALIASES.items()
        if any(contains_skill(normalized_text, alias) for alias in aliases)
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
