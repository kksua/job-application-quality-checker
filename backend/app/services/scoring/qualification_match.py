import re
from dataclasses import dataclass

DEGREE_LEVELS = {
    "bachelor": {
        "bachelor",
        "bachelor's",
        "bachelors",
        "bac+3",
        "bac +3",
    },
    "master": {
        "master",
        "master's",
        "masters",
        "msc",
        "m.sc",
        "bac+5",
        "bac +5",
        "engineering degree",
        "engineer degree",
        "diplôme d'ingénieur",
        "diplome d'ingenieur",
    },
    "phd": {
        "phd",
        "ph.d",
        "doctorate",
        "doctoral degree",
    },
}


TECHNICAL_FIELDS = {
    "computer science",
    "software engineering",
    "computer engineering",
    "information technology",
    "information systems",
    "data science",
    "artificial intelligence",
    "machine learning",
    "engineering",
}


LANGUAGE_REQUIREMENTS = {
    "english": {
        "english",
        "fluent english",
        "english fluency",
    },
    "french": {
        "french",
        "fluent french",
        "french fluency",
    },
}


@dataclass(frozen=True)
class QualificationMatchResult:
    score: int | None
    required_degree: str | None
    candidate_degree: str | None
    required_fields: list[str]
    candidate_fields: list[str]
    matched_fields: list[str]
    required_languages: list[str]
    candidate_languages: list[str]


def normalize_text(text: str) -> str:
    normalized = text.lower()
    normalized = normalized.replace("’", "'")
    return re.sub(r"\s+", " ", normalized).strip()


def contains_phrase(text: str, phrase: str) -> bool:
    pattern = rf"(?<!\w){re.escape(phrase.lower())}(?!\w)"
    return re.search(pattern, text) is not None


def extract_degree_level(text: str) -> str | None:
    normalized = normalize_text(text)

    detected_levels = {
        level
        for level, aliases in DEGREE_LEVELS.items()
        if any(contains_phrase(normalized, alias) for alias in aliases)
    }

    if "phd" in detected_levels:
        return "phd"

    if "master" in detected_levels:
        return "master"

    if "bachelor" in detected_levels:
        return "bachelor"

    return None


def extract_technical_fields(text: str) -> set[str]:
    normalized = normalize_text(text)

    return {field for field in TECHNICAL_FIELDS if contains_phrase(normalized, field)}


def extract_languages(text: str) -> set[str]:
    normalized = normalize_text(text)

    return {
        language
        for language, aliases in LANGUAGE_REQUIREMENTS.items()
        if any(contains_phrase(normalized, alias) for alias in aliases)
    }


def degree_score(
    candidate_degree: str | None,
    required_degree: str | None,
) -> int | None:
    if required_degree is None:
        return None

    if candidate_degree is None:
        return 0

    ranking = {
        "bachelor": 1,
        "master": 2,
        "phd": 3,
    }

    if ranking[candidate_degree] >= ranking[required_degree]:
        return 100

    return 0


def field_score(
    candidate_fields: set[str],
    required_fields: set[str],
) -> int | None:
    if not required_fields:
        return None

    if not candidate_fields:
        return 0

    matched = candidate_fields & required_fields

    if matched:
        return 100

    if "engineering" in candidate_fields and required_fields & TECHNICAL_FIELDS:
        return 80

    return 0


def language_score(
    candidate_languages: set[str],
    required_languages: set[str],
) -> int | None:
    if not required_languages:
        return None

    matched = candidate_languages & required_languages

    return round(len(matched) / len(required_languages) * 100)


def analyse_qualification_match(
    cv_text: str,
    job_description: str,
) -> QualificationMatchResult:
    candidate_degree = extract_degree_level(cv_text)
    required_degree = extract_degree_level(job_description)

    candidate_fields = extract_technical_fields(cv_text)
    required_fields = extract_technical_fields(job_description)

    candidate_languages = extract_languages(cv_text)
    required_languages = extract_languages(job_description)

    component_scores = [
        score
        for score in (
            degree_score(
                candidate_degree=candidate_degree,
                required_degree=required_degree,
            ),
            field_score(
                candidate_fields=candidate_fields,
                required_fields=required_fields,
            ),
            language_score(
                candidate_languages=candidate_languages,
                required_languages=required_languages,
            ),
        )
        if score is not None
    ]

    if not component_scores:
        final_score = None
    else:
        final_score = round(sum(component_scores) / len(component_scores))

    return QualificationMatchResult(
        score=final_score,
        required_degree=required_degree,
        candidate_degree=candidate_degree,
        required_fields=sorted(required_fields),
        candidate_fields=sorted(candidate_fields),
        matched_fields=sorted(candidate_fields & required_fields),
        required_languages=sorted(required_languages),
        candidate_languages=sorted(candidate_languages),
    )
