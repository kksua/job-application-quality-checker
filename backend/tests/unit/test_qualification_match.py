from app.services.scoring.qualification_match import (
    analyse_qualification_match,
    degree_score,
    extract_degree_level,
    extract_languages,
    extract_technical_fields,
    field_score,
    language_score,
)


def test_extracts_master_degree() -> None:
    assert extract_degree_level("Master's degree in Software Engineering.") == "master"


def test_engineering_degree_counts_as_master_level() -> None:
    assert (
        extract_degree_level("Diplôme d'ingénieur in Digital Service Engineering.")
        == "master"
    )


def test_extracts_bachelor_degree() -> None:
    assert extract_degree_level("Bachelor's degree in Computer Science.") == "bachelor"


def test_extracts_technical_fields() -> None:
    result = extract_technical_fields(
        "Master's degree in Software Engineering and Computer Science."
    )

    assert result == {
        "computer science",
        "engineering",
        "software engineering",
    }


def test_extracts_languages() -> None:
    result = extract_languages("Fluent English and French required.")

    assert result == {
        "english",
        "french",
    }


def test_higher_degree_satisfies_lower_requirement() -> None:
    score = degree_score(
        candidate_degree="master",
        required_degree="bachelor",
    )

    assert score == 100


def test_lower_degree_does_not_satisfy_master_requirement() -> None:
    score = degree_score(
        candidate_degree="bachelor",
        required_degree="master",
    )

    assert score == 0


def test_degree_score_is_unknown_without_requirement() -> None:
    score = degree_score(
        candidate_degree="master",
        required_degree=None,
    )

    assert score is None


def test_exact_field_match_scores_full() -> None:
    score = field_score(
        candidate_fields={"software engineering"},
        required_fields={"software engineering"},
    )

    assert score == 100


def test_general_engineering_gets_partial_field_match() -> None:
    score = field_score(
        candidate_fields={"engineering"},
        required_fields={"computer science"},
    )

    assert score == 80


def test_language_score_matches_all_required_languages() -> None:
    score = language_score(
        candidate_languages={"english", "french"},
        required_languages={"english", "french"},
    )

    assert score == 100


def test_language_score_detects_partial_match() -> None:
    score = language_score(
        candidate_languages={"english"},
        required_languages={"english", "french"},
    )

    assert score == 50


def test_qualification_analysis_combines_detected_requirements() -> None:
    result = analyse_qualification_match(
        cv_text=("Diplôme d'ingénieur in Software Engineering. Fluent English."),
        job_description=(
            "Bachelor's degree in Computer Science or related "
            "engineering field required. Fluent English required."
        ),
    )

    assert result.candidate_degree == "master"
    assert result.required_degree == "bachelor"
    assert result.score == 100


def test_returns_unknown_when_job_has_no_qualification_requirements() -> None:
    result = analyse_qualification_match(
        cv_text="Master's degree in Software Engineering.",
        job_description=("We are looking for a developer with Python experience."),
    )

    assert result.score is None
