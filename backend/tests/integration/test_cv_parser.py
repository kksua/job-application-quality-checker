from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_cv_parse_endpoint_extracts_realistic_full_cv() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate
    jane@example.com | +33 7 49 14 96 78
    Paris, France
    https://www.linkedin.com/in/janedoe
    https://github.com/janedoe
    https://janedoe.dev

    Professional Summary
    Software engineering graduate building reliable React and FastAPI products.

    Professional Experience
    Backend Developer
    Example Labs
    Jan 2025 - Present | Paris, France
    - Built FastAPI services for internal hiring workflows.
    Software Engineering Intern
    Startup Studio
    Jun 2024 - Dec 2024
    - Shipped React features for recruiter dashboards.

    Education
    Example University
    Master of Engineering in Computer Science
    2024 - 2026
    Example College
    Bachelor of Science in Software Engineering
    2021 - 2024

    Projects & Hackathons
    AI Resume Checker
    Full-stack CV analysis tool
    March 2026
    Technologies: React, FastAPI, PostgreSQL
    https://github.com/janedoe/ai-resume-checker
    - Parsed pasted CV text into structured profile sections.

    Technical Skills & Tools
    Languages: Python, TypeScript
    Frameworks: React, FastAPI
    Tools: Docker, Git

    Languages
    English - Fluent (TOEIC 950)
    French: Native

    Awards & Distinctions
    First Place - Example Hackathon
    2026
    - Built a working prototype in 24 hours.

    Certifications
    AWS Certified Cloud Practitioner
    Issuer: Amazon Web Services
    Issued: 2026
    Credential ID: ABC-123
    """

    response = client.post(
        "/cv/parse",
        json={
            "cv_text": cv_text,
            "job_description": "Parse this realistic CV into structured sections.",
        },
    )

    assert response.status_code == 200

    result = response.json()

    assert result["personal_info"]["full_name"] == "Jane Doe"
    assert result["personal_info"]["email"] == "jane@example.com"
    assert result["personal_info"]["phone"] == "+33 7 49 14 96 78"
    assert result["personal_info"]["location"] == "Paris, France"
    assert result["personal_info"]["linkedin"] == (
        "https://www.linkedin.com/in/janedoe"
    )
    assert result["personal_info"]["github"] == "https://github.com/janedoe"
    assert result["personal_info"]["portfolio"] == "https://janedoe.dev"
    assert result["headline"] == "Software Engineering Graduate"
    assert result["summary"] == (
        "Software engineering graduate building reliable React and FastAPI products."
    )

    assert [item["company"] for item in result["experience"]] == [
        "Example Labs",
        "Startup Studio",
    ]
    assert result["experience"][0]["job_title"] == "Backend Developer"
    assert result["experience"][0]["dates"]["start_date"] == "Jan 2025"
    assert result["experience"][0]["dates"]["end_date"] == "Present"
    assert result["experience"][1]["bullets"] == [
        "Shipped React features for recruiter dashboards.",
    ]

    assert [item["institution"] for item in result["education"]] == [
        "Example University",
        "Example College",
    ]
    assert result["education"][0]["degree"] == (
        "Master of Engineering in Computer Science"
    )
    assert result["education"][0]["field_of_study"] == "Computer Science"

    assert result["projects"][0]["name"] == "AI Resume Checker"
    assert result["projects"][0]["dates"]["start_date"] == "March 2026"
    assert result["projects"][0]["dates"]["end_date"] is None
    assert result["projects"][0]["technologies"] == [
        "React",
        "FastAPI",
        "PostgreSQL",
    ]

    assert [group["category"] for group in result["skill_groups"]] == [
        "Languages",
        "Frameworks",
        "Tools",
    ]
    assert result["skill_groups"][1]["skills"] == ["React", "FastAPI"]

    assert result["languages"][0]["language"] == "English"
    assert result["languages"][0]["certification"] == "TOEIC"
    assert result["languages"][0]["score"] == "950"
    assert result["languages"][1]["proficiency"] == "Native"

    assert result["awards"][0]["title"] == "First Place"
    assert result["awards"][0]["organization"] == "Example Hackathon"
    assert result["awards"][0]["date"] == "2026"

    assert result["certifications"][0]["name"] == "AWS Certified Cloud Practitioner"
    assert result["certifications"][0]["issuer"] == "Amazon Web Services"
    assert result["certifications"][0]["date"] == "2026"
    assert result["certifications"][0]["credential_id"] == "ABC-123"
