from app.services.ats_analyser import (
    analyse_ats_readiness,
    find_detected_sections,
    find_long_paragraphs,
    has_email,
    has_phone_number,
)


def test_has_email_detects_valid_email() -> None:
    assert has_email("Contact: supipi@example.com")


def test_has_email_returns_false_without_email() -> None:
    assert not has_email("Contact details available on request")


def test_has_phone_number_detects_phone() -> None:
    assert has_phone_number("+33 6 12 34 56 78")


def test_find_detected_sections_returns_standard_sections() -> None:
    text = """
Professional Experience

Education

Technical Skills
"""

    result = find_detected_sections(text)

    assert result == {"experience", "education", "skills"}


def test_find_long_paragraphs_detects_large_paragraph() -> None:
    paragraph = " ".join(["word"] * 81)

    result = find_long_paragraphs(paragraph)

    assert result == [paragraph]


def test_analyse_ats_readiness_returns_full_score() -> None:
    cv_text = """
Supipi Amarajeeva
supipi@example.com
+33 6 12 34 56 78

Experience
- Developed a FastAPI application.

Education
- Engineering degree.

Skills
- Python, React, PostgreSQL.
"""

    score, issues, passed_checks = analyse_ats_readiness(cv_text)

    assert score == 100
    assert issues == []
    assert "Email address detected" in passed_checks


def test_analyse_ats_readiness_reports_missing_information() -> None:
    cv_text = """
Profile

Python developer with backend experience.
"""

    score, issues, _ = analyse_ats_readiness(cv_text)

    assert score < 100
    assert any(issue["message"] == "No email address was detected." for issue in issues)
    assert any(issue["category"] == "structure" for issue in issues)
