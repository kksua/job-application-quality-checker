import re
from dataclasses import dataclass

REMOTE_SIGNALS = {
    "remote",
    "fully remote",
    "work remotely",
}

HYBRID_SIGNALS = {
    "hybrid",
    "hybrid working",
    "hybrid work",
}

ONSITE_SIGNALS = {
    "on-site",
    "onsite",
    "on site",
    "office-based",
    "office based",
}

RELOCATION_SIGNALS = {
    "relocation",
    "willing to relocate",
    "open to relocation",
    "relocate",
}

WORK_AUTHORIZATION_SIGNALS = {
    "authorized to work",
    "authorised to work",
    "work authorization",
    "work authorisation",
    "valid work permit",
    "work permit",
    "residence permit",
    "titre de séjour",
    "titre de sejour",
}

SPONSORSHIP_REQUIRED_SIGNALS = {
    "visa sponsorship required",
    "requires visa sponsorship",
    "require visa sponsorship",
    "need visa sponsorship",
    "needs visa sponsorship",
}

NO_SPONSORSHIP_SIGNALS = {
    "no visa sponsorship",
    "visa sponsorship is not available",
    "unable to sponsor",
    "cannot sponsor",
    "must already be authorized to work",
    "must already be authorised to work",
}

COUNTRIES = {
    "france",
    "germany",
    "italy",
    "spain",
    "belgium",
    "netherlands",
    "ireland",
    "united kingdom",
    "uk",
    "canada",
    "united states",
    "usa",
    "malaysia",
    "singapore",
    "sri lanka",
}


@dataclass(frozen=True)
class LocationEligibilityResult:
    score: int | None
    candidate_locations: list[str]
    job_locations: list[str]
    candidate_work_modes: list[str]
    job_work_modes: list[str]
    candidate_has_work_authorization: bool | None
    job_requires_existing_authorization: bool
    candidate_requires_sponsorship: bool | None


def normalize_text(text: str) -> str:
    normalized = text.lower()
    normalized = normalized.replace("’", "'")
    return re.sub(r"\s+", " ", normalized).strip()


def contains_phrase(text: str, phrase: str) -> bool:
    pattern = rf"(?<!\w){re.escape(phrase.lower())}(?!\w)"
    return re.search(pattern, text) is not None


def extract_locations(text: str) -> set[str]:
    normalized = normalize_text(text)

    return {country for country in COUNTRIES if contains_phrase(normalized, country)}


def extract_work_modes(text: str) -> set[str]:
    normalized = normalize_text(text)
    modes: set[str] = set()

    if any(contains_phrase(normalized, phrase) for phrase in REMOTE_SIGNALS):
        modes.add("remote")

    if any(contains_phrase(normalized, phrase) for phrase in HYBRID_SIGNALS):
        modes.add("hybrid")

    if any(contains_phrase(normalized, phrase) for phrase in ONSITE_SIGNALS):
        modes.add("onsite")

    return modes


def detect_work_authorization(text: str) -> bool | None:
    normalized = normalize_text(text)

    if any(
        contains_phrase(normalized, phrase) for phrase in WORK_AUTHORIZATION_SIGNALS
    ):
        return True

    return None


def detect_sponsorship_requirement(text: str) -> bool | None:
    normalized = normalize_text(text)

    if any(
        contains_phrase(normalized, phrase) for phrase in SPONSORSHIP_REQUIRED_SIGNALS
    ):
        return True

    return None


def job_requires_existing_authorization(text: str) -> bool:
    normalized = normalize_text(text)

    return any(contains_phrase(normalized, phrase) for phrase in NO_SPONSORSHIP_SIGNALS)


def calculate_location_score(
    candidate_locations: set[str],
    job_locations: set[str],
    candidate_work_modes: set[str],
    job_work_modes: set[str],
    candidate_has_work_authorization: bool | None,
    job_requires_authorization: bool,
    candidate_requires_sponsorship: bool | None,
) -> int | None:
    scores: list[int] = []

    if job_locations and candidate_locations:
        scores.append(100 if candidate_locations & job_locations else 0)

    if job_work_modes and candidate_work_modes:
        scores.append(100 if candidate_work_modes & job_work_modes else 0)

    if job_requires_authorization:
        if candidate_has_work_authorization is True:
            scores.append(100)
        elif candidate_requires_sponsorship is True:
            scores.append(0)

    if not scores:
        return None

    return round(sum(scores) / len(scores))


def analyse_location_eligibility(
    cv_text: str,
    job_description: str,
) -> LocationEligibilityResult:
    candidate_locations = extract_locations(cv_text)
    job_locations = extract_locations(job_description)

    candidate_work_modes = extract_work_modes(cv_text)
    job_work_modes = extract_work_modes(job_description)

    candidate_has_work_authorization = detect_work_authorization(cv_text)

    candidate_requires_sponsorship = detect_sponsorship_requirement(cv_text)

    requires_existing_authorization = job_requires_existing_authorization(
        job_description
    )

    score = calculate_location_score(
        candidate_locations=candidate_locations,
        job_locations=job_locations,
        candidate_work_modes=candidate_work_modes,
        job_work_modes=job_work_modes,
        candidate_has_work_authorization=(candidate_has_work_authorization),
        job_requires_authorization=(requires_existing_authorization),
        candidate_requires_sponsorship=(candidate_requires_sponsorship),
    )

    return LocationEligibilityResult(
        score=score,
        candidate_locations=sorted(candidate_locations),
        job_locations=sorted(job_locations),
        candidate_work_modes=sorted(candidate_work_modes),
        job_work_modes=sorted(job_work_modes),
        candidate_has_work_authorization=(candidate_has_work_authorization),
        job_requires_existing_authorization=(requires_existing_authorization),
        candidate_requires_sponsorship=(candidate_requires_sponsorship),
    )
