import re
from dataclasses import dataclass

from app.services.bullet_analyser import (
    contains_measurable_impact,
    extract_bullets,
    starts_with_action_verb,
)
from app.services.scoring.weighted_score import (
    CriterionScore,
    calculate_weighted_score,
)

EXPERIENCE_SIGNALS: dict[str, set[str]] = {
    "analyse": {
        "analyse",
        "analysed",
        "analyze",
        "analyzed",
        "analysis",
    },
    "automate": {
        "automate",
        "automated",
        "automation",
    },
    "build": {
        "build",
        "built",
        "building",
    },
    "collaborate": {
        "collaborate",
        "collaborated",
        "collaboration",
        "work closely with",
        "worked closely with",
    },
    "deploy": {
        "deploy",
        "deployed",
        "deployment",
    },
    "design": {
        "design",
        "designed",
        "designing",
    },
    "develop": {
        "develop",
        "developed",
        "developing",
        "development",
    },
    "document": {
        "document",
        "documented",
        "documentation",
    },
    "implement": {
        "implement",
        "implemented",
        "implementation",
    },
    "integrate": {
        "integrate",
        "integrated",
        "integration",
    },
    "lead": {
        "lead",
        "led",
        "leading",
    },
    "maintain": {
        "maintain",
        "maintained",
        "maintenance",
    },
    "manage": {
        "manage",
        "managed",
        "management",
    },
    "mentor": {
        "mentor",
        "mentored",
        "mentoring",
    },
    "monitor": {
        "monitor",
        "monitored",
        "monitoring",
    },
    "optimize": {
        "optimize",
        "optimized",
        "optimise",
        "optimised",
        "optimization",
        "optimisation",
    },
    "refactor": {
        "refactor",
        "refactored",
        "refactoring",
    },
    "test": {
        "test",
        "tested",
        "testing",
    },
    "troubleshoot": {
        "troubleshoot",
        "troubleshooting",
        "debug",
        "debugged",
        "debugging",
    },
}


@dataclass(frozen=True)
class ExperienceRelevanceResult:
    score: int | None
    job_signals: list[str]
    cv_signals: list[str]
    matched_signals: list[str]
    responsibility_score: int | None
    evidence_quality_score: int | None


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def contains_signal(text: str, alias: str) -> bool:
    pattern = rf"(?<!\w){re.escape(alias.lower())}(?!\w)"
    return re.search(pattern, text) is not None


def extract_experience_signals(text: str) -> set[str]:
    normalized_text = normalize_text(text)

    return {
        signal
        for signal, aliases in EXPERIENCE_SIGNALS.items()
        if any(contains_signal(normalized_text, alias) for alias in aliases)
    }


def calculate_responsibility_score(
    cv_signals: set[str],
    job_signals: set[str],
) -> int | None:
    if not job_signals:
        return None

    matched_signals = cv_signals & job_signals

    return round(len(matched_signals) / len(job_signals) * 100)


def calculate_evidence_quality_score(
    cv_text: str,
) -> int | None:
    bullets = extract_bullets(cv_text)

    if not bullets:
        return None

    action_verb_count = sum(starts_with_action_verb(bullet) for bullet in bullets)

    measurable_count = sum(contains_measurable_impact(bullet) for bullet in bullets)

    action_verb_score = action_verb_count / len(bullets) * 100
    measurable_score = measurable_count / len(bullets) * 100

    return round(action_verb_score * 0.6 + measurable_score * 0.4)


def analyse_experience_relevance(
    cv_text: str,
    job_description: str,
) -> ExperienceRelevanceResult:
    cv_signals = extract_experience_signals(cv_text)
    job_signals = extract_experience_signals(job_description)

    responsibility_score = calculate_responsibility_score(
        cv_signals=cv_signals,
        job_signals=job_signals,
    )

    if responsibility_score is None:
        return ExperienceRelevanceResult(
            score=None,
            job_signals=sorted(job_signals),
            cv_signals=sorted(cv_signals),
            matched_signals=[],
            responsibility_score=None,
            evidence_quality_score=None,
        )

    evidence_quality_score = calculate_evidence_quality_score(cv_text)

    score_result = calculate_weighted_score(
        [
            CriterionScore(
                name="responsibility_relevance",
                score=responsibility_score,
                weight=80,
            ),
            CriterionScore(
                name="evidence_quality",
                score=evidence_quality_score,
                weight=20,
            ),
        ]
    )

    matched_signals = cv_signals & job_signals

    return ExperienceRelevanceResult(
        score=score_result.final_score,
        job_signals=sorted(job_signals),
        cv_signals=sorted(cv_signals),
        matched_signals=sorted(matched_signals),
        responsibility_score=responsibility_score,
        evidence_quality_score=evidence_quality_score,
    )
