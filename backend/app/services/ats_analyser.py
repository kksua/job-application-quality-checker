import re
from typing import Literal, TypedDict

Severity = Literal["low", "medium", "high"]


class AtsIssue(TypedDict):
    category: str
    severity: Severity
    message: str


STANDARD_SECTIONS = {
    "experience": {
        "experience",
        "work experience",
        "professional experience",
        "employment history",
    },
    "education": {
        "education",
        "academic background",
        "qualifications",
    },
    "skills": {
        "skills",
        "technical skills",
        "core skills",
        "competencies",
    },
}


def normalize_line(line: str) -> str:
    normalized = line.lower().strip()
    normalized = re.sub(r"[:|]+$", "", normalized)
    return re.sub(r"\s+", " ", normalized)


def has_email(text: str) -> bool:
    pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
    return re.search(pattern, text) is not None


def has_phone_number(text: str) -> bool:
    pattern = r"(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)"
    return re.search(pattern, text) is not None


def find_detected_sections(text: str) -> set[str]:
    lines = {normalize_line(line) for line in text.splitlines() if line.strip()}

    return {
        canonical_name
        for canonical_name, aliases in STANDARD_SECTIONS.items()
        if lines & aliases
    }


def find_long_paragraphs(
    text: str,
    maximum_words: int = 80,
) -> list[str]:
    paragraphs = [
        paragraph.strip()
        for paragraph in re.split(r"\n\s*\n", text)
        if paragraph.strip()
    ]

    return [
        paragraph for paragraph in paragraphs if len(paragraph.split()) > maximum_words
    ]


def calculate_ats_readiness(
    *,
    email_present: bool,
    phone_present: bool,
    detected_sections: set[str],
    long_paragraph_count: int,
) -> int:
    score = 0

    if email_present:
        score += 15

    if phone_present:
        score += 10

    section_score = round(len(detected_sections) / len(STANDARD_SECTIONS) * 45)
    score += section_score

    if long_paragraph_count == 0:
        score += 30
    elif long_paragraph_count == 1:
        score += 15

    return min(score, 100)


def analyse_ats_readiness(
    cv_text: str,
) -> tuple[int, list[AtsIssue], list[str]]:
    email_present = has_email(cv_text)
    phone_present = has_phone_number(cv_text)
    detected_sections = find_detected_sections(cv_text)
    long_paragraphs = find_long_paragraphs(cv_text)

    issues: list[AtsIssue] = []
    passed_checks: list[str] = []

    if email_present:
        passed_checks.append("Email address detected")
    else:
        issues.append(
            {
                "category": "contact",
                "severity": "high",
                "message": "No email address was detected.",
            }
        )

    if phone_present:
        passed_checks.append("Phone number detected")
    else:
        issues.append(
            {
                "category": "contact",
                "severity": "medium",
                "message": "No phone number was detected.",
            }
        )

    for section in STANDARD_SECTIONS:
        if section in detected_sections:
            passed_checks.append(f"{section.title()} section detected")
        else:
            issues.append(
                {
                    "category": "structure",
                    "severity": "medium",
                    "message": (
                        f"No clearly labelled {section.title()} section was detected."
                    ),
                }
            )

    if long_paragraphs:
        issues.append(
            {
                "category": "readability",
                "severity": "medium",
                "message": (
                    f"{len(long_paragraphs)} paragraph(s) contain more than 80 words."
                ),
            }
        )
    else:
        passed_checks.append("No excessively long paragraphs detected")

    score = calculate_ats_readiness(
        email_present=email_present,
        phone_present=phone_present,
        detected_sections=detected_sections,
        long_paragraph_count=len(long_paragraphs),
    )

    return score, issues, passed_checks
