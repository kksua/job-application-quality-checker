import re
from typing import TypedDict


class BulletIssue(TypedDict):
    bullet: str
    issues: list[str]


ACTION_VERBS = {
    "automated",
    "built",
    "created",
    "designed",
    "developed",
    "implemented",
    "improved",
    "integrated",
    "launched",
    "led",
    "managed",
    "mentored",
    "optimized",
    "reduced",
    "refactored",
    "tested",
}


VAGUE_BULLET_PHRASES = {
    "assisted with",
    "helped with",
    "responsible for",
    "worked on",
    "various tasks",
}


def extract_bullets(text: str) -> list[str]:
    bullets: list[str] = []

    for line in text.splitlines():
        cleaned_line = line.strip()

        if re.match(r"^[-•*]\s+", cleaned_line):
            bullet = re.sub(r"^[-•*]\s+", "", cleaned_line).strip()

            if bullet:
                bullets.append(bullet)

    return bullets


def starts_with_action_verb(bullet: str) -> bool:
    words = re.findall(r"[a-zA-Z]+", bullet.lower())

    if not words:
        return False

    return words[0] in ACTION_VERBS


def contains_measurable_impact(bullet: str) -> bool:
    patterns = [
        r"\d+%",
        r"\d+\s*(hours?|days?|weeks?|months?)",
        r"\d+\s*(users?|clients?|customers?)",
        r"€\s?\d+",
        r"\$\s?\d+",
        r"\b\d+x\b",
    ]

    return any(re.search(pattern, bullet.lower()) for pattern in patterns)


def find_vague_bullet_phrases(bullet: str) -> list[str]:
    normalized_bullet = bullet.lower()

    return sorted(
        phrase for phrase in VAGUE_BULLET_PHRASES if phrase in normalized_bullet
    )


def analyse_bullet(bullet: str) -> BulletIssue:
    issues: list[str] = []

    if len(bullet.split()) < 6:
        issues.append("Bullet is too short")

    if not starts_with_action_verb(bullet):
        issues.append("Bullet does not start with a strong action verb")

    if not contains_measurable_impact(bullet):
        issues.append("Bullet does not include measurable impact")

    vague_phrases = find_vague_bullet_phrases(bullet)

    if vague_phrases:
        issues.append(f"Bullet contains vague wording: {', '.join(vague_phrases)}")

    return {
        "bullet": bullet,
        "issues": issues,
    }


def analyse_cv_bullets(cv_text: str) -> list[BulletIssue]:
    bullets = extract_bullets(cv_text)

    return [
        result for bullet in bullets if (result := analyse_bullet(bullet))["issues"]
    ]
