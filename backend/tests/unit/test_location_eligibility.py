from app.services.scoring.location_eligibility import (
    analyse_location_eligibility,
    calculate_location_score,
    detect_work_authorization,
    extract_locations,
    extract_work_modes,
    job_requires_existing_authorization,
)


def test_extracts_location() -> None:
    result = extract_locations("Software Engineer based in France.")

    assert result == {"france"}


def test_extracts_multiple_locations() -> None:
    result = extract_locations("Open to opportunities in France and Germany.")

    assert result == {
        "france",
        "germany",
    }


def test_extracts_remote_work_mode() -> None:
    result = extract_work_modes("Looking for a fully remote position.")

    assert result == {"remote"}


def test_extracts_hybrid_work_mode() -> None:
    result = extract_work_modes("Open to hybrid working.")

    assert result == {"hybrid"}


def test_extracts_onsite_work_mode() -> None:
    result = extract_work_modes("Available for an on-site role.")

    assert result == {"onsite"}


def test_detects_work_authorization() -> None:
    result = detect_work_authorization("Candidate holds a valid work permit in France.")

    assert result is True


def test_detects_existing_authorization_requirement() -> None:
    result = job_requires_existing_authorization(
        "Candidates must already be authorized to work in France."
    )

    assert result is True


def test_matching_location_scores_full() -> None:
    score = calculate_location_score(
        candidate_locations={"france"},
        job_locations={"france"},
        candidate_work_modes=set(),
        job_work_modes=set(),
        candidate_has_work_authorization=None,
        job_requires_authorization=False,
        candidate_requires_sponsorship=None,
    )

    assert score == 100


def test_different_location_scores_zero() -> None:
    score = calculate_location_score(
        candidate_locations={"france"},
        job_locations={"germany"},
        candidate_work_modes=set(),
        job_work_modes=set(),
        candidate_has_work_authorization=None,
        job_requires_authorization=False,
        candidate_requires_sponsorship=None,
    )

    assert score == 0


def test_matching_work_mode_scores_full() -> None:
    score = calculate_location_score(
        candidate_locations=set(),
        job_locations=set(),
        candidate_work_modes={"remote"},
        job_work_modes={"remote"},
        candidate_has_work_authorization=None,
        job_requires_authorization=False,
        candidate_requires_sponsorship=None,
    )

    assert score == 100


def test_authorized_candidate_satisfies_requirement() -> None:
    score = calculate_location_score(
        candidate_locations=set(),
        job_locations=set(),
        candidate_work_modes=set(),
        job_work_modes=set(),
        candidate_has_work_authorization=True,
        job_requires_authorization=True,
        candidate_requires_sponsorship=None,
    )

    assert score == 100


def test_sponsorship_requirement_conflicts_with_no_sponsorship_job() -> None:
    score = calculate_location_score(
        candidate_locations=set(),
        job_locations=set(),
        candidate_work_modes=set(),
        job_work_modes=set(),
        candidate_has_work_authorization=None,
        job_requires_authorization=True,
        candidate_requires_sponsorship=True,
    )

    assert score == 0


def test_returns_unknown_without_enough_information() -> None:
    score = calculate_location_score(
        candidate_locations=set(),
        job_locations={"france"},
        candidate_work_modes=set(),
        job_work_modes={"hybrid"},
        candidate_has_work_authorization=None,
        job_requires_authorization=False,
        candidate_requires_sponsorship=None,
    )

    assert score is None


def test_combines_location_and_work_mode() -> None:
    result = analyse_location_eligibility(
        cv_text=("Software Engineer based in France. Open to hybrid working."),
        job_description=("Hybrid Software Engineer position in France."),
    )

    assert result.score == 100
    assert result.candidate_locations == ["france"]
    assert result.job_locations == ["france"]
    assert result.candidate_work_modes == ["hybrid"]
    assert result.job_work_modes == ["hybrid"]


def test_partial_location_eligibility_score() -> None:
    result = analyse_location_eligibility(
        cv_text=("Software Engineer based in France. Looking for remote work."),
        job_description=("On-site Software Engineer position in France."),
    )

    # Location = 100
    # Work mode = 0
    # Average = 50
    assert result.score == 50
