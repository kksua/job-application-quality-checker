import re
from dataclasses import dataclass

ROLE_ALIASES: dict[str, set[str]] = {
    "full_stack_developer": {
        "full stack developer",
        "full-stack developer",
        "full stack engineer",
        "full-stack engineer",
    },
    "frontend_developer": {
        "frontend developer",
        "front-end developer",
        "frontend engineer",
        "front-end engineer",
        "react developer",
    },
    "backend_developer": {
        "backend developer",
        "back-end developer",
        "backend engineer",
        "back-end engineer",
    },
    "software_engineer": {
        "software engineer",
        "software developer",
        "application developer",
    },
    "ai_engineer": {
        "ai engineer",
        "artificial intelligence engineer",
        "machine learning engineer",
        "ml engineer",
        "generative ai engineer",
        "genai engineer",
    },
    "data_engineer": {
        "data engineer",
        "analytics engineer",
    },
    "data_analyst": {
        "data analyst",
        "business data analyst",
    },
    "qa_engineer": {
        "qa engineer",
        "quality assurance engineer",
        "test automation engineer",
        "automation test engineer",
        "software tester",
    },
    "devops_engineer": {
        "devops engineer",
        "platform engineer",
        "site reliability engineer",
        "sre engineer",
    },
    "product_manager": {
        "product manager",
        "technical product manager",
        "ai product manager",
        "product owner",
    },
    "project_manager": {
        "project manager",
        "technical project manager",
        "it project manager",
    },
    "business_analyst": {
        "business analyst",
        "business intelligence analyst",
        "functional analyst",
    },
    "ux_designer": {
        "ux designer",
        "ui ux designer",
        "ui/ux designer",
        "product designer",
    },
}


RELATED_ROLE_SCORES: dict[frozenset[str], int] = {
    frozenset({"full_stack_developer", "software_engineer"}): 85,
    frozenset({"full_stack_developer", "frontend_developer"}): 80,
    frozenset({"full_stack_developer", "backend_developer"}): 80,
    frozenset({"frontend_developer", "software_engineer"}): 70,
    frozenset({"backend_developer", "software_engineer"}): 70,
    frozenset({"ai_engineer", "software_engineer"}): 75,
    frozenset({"ai_engineer", "data_engineer"}): 70,
    frozenset({"data_engineer", "software_engineer"}): 65,
    frozenset({"data_engineer", "data_analyst"}): 60,
    frozenset({"data_analyst", "business_analyst"}): 65,
    frozenset({"qa_engineer", "software_engineer"}): 55,
    frozenset({"devops_engineer", "software_engineer"}): 55,
    frozenset({"product_manager", "project_manager"}): 70,
    frozenset({"product_manager", "business_analyst"}): 55,
    frozenset({"project_manager", "business_analyst"}): 55,
}


@dataclass(frozen=True)
class RoleAlignmentResult:
    score: int | None
    cv_roles: list[str]
    job_roles: list[str]
    matched_roles: list[str]


def normalize_role_text(text: str) -> str:
    normalized = text.lower()
    normalized = normalized.replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", normalized).strip()


def contains_role_alias(text: str, alias: str) -> bool:
    pattern = rf"(?<!\w){re.escape(alias.lower())}(?!\w)"
    return re.search(pattern, text) is not None


def extract_roles(text: str) -> set[str]:
    normalized_text = normalize_role_text(text)

    return {
        role_name
        for role_name, aliases in ROLE_ALIASES.items()
        if any(contains_role_alias(normalized_text, alias) for alias in aliases)
    }


def calculate_role_alignment_score(
    cv_roles: set[str],
    job_roles: set[str],
) -> int | None:
    if not job_roles or not cv_roles:
        return None

    if cv_roles & job_roles:
        return 100

    related_scores = [
        score
        for cv_role in cv_roles
        for job_role in job_roles
        if (score := RELATED_ROLE_SCORES.get(frozenset({cv_role, job_role})))
        is not None
    ]

    if related_scores:
        return max(related_scores)

    return 20


def analyse_role_alignment(
    cv_text: str,
    job_description: str,
) -> RoleAlignmentResult:
    cv_roles = extract_roles(cv_text)
    job_roles = extract_roles(job_description)
    matched_roles = cv_roles & job_roles

    score = calculate_role_alignment_score(
        cv_roles=cv_roles,
        job_roles=job_roles,
    )

    return RoleAlignmentResult(
        score=score,
        cv_roles=sorted(cv_roles),
        job_roles=sorted(job_roles),
        matched_roles=sorted(matched_roles),
    )
