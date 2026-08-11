from app.services.cv_parser import (
    detect_section,
    normalize_heading,
    parse_cv_text,
)


def test_normalize_heading_removes_symbols_and_lowercases() -> None:
    assert normalize_heading("PROFESSIONAL EXPERIENCE:") == "professional experience"


def test_detect_section_recognizes_summary() -> None:
    assert detect_section("Professional Summary") == "summary"


def test_detect_section_recognizes_experience() -> None:
    assert detect_section("Work Experience") == "experience"


def test_detect_section_returns_none_for_regular_text() -> None:
    assert detect_section("React Developer at Example Company") is None


def test_detect_section_recognizes_common_heading_variants() -> None:
    assert detect_section("Awards & Distinctions") == "awards"
    assert detect_section("Projects & Hackathons") == "projects"
    assert detect_section("Selected Projects") == "projects"
    assert detect_section("Technical Skills & Tools") == "skills"
    assert detect_section("Professional Experience") == "experience"
    assert detect_section("Academic Projects") == "projects"
    assert detect_section("Certifications & Awards") == "certifications"


def test_parse_cv_text_extracts_summary() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate
    jane@example.com

    Professional Summary
    Software Engineering graduate with experience building
    React and FastAPI applications.

    Experience
    Example Company
    Software Engineering Intern
    """

    result = parse_cv_text(cv_text)

    assert result.headline == "Software Engineering Graduate"

    assert result.summary == (
        "Software Engineering graduate with experience building "
        "React and FastAPI applications."
    )


def test_parse_cv_text_extracts_name_and_headline() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Professional Summary
    Software Engineering graduate with web development experience.
    """

    result = parse_cv_text(cv_text)

    assert result.personal_info.full_name == "Jane Doe"
    assert result.headline == "Software Engineering Graduate"


def test_parse_cv_text_extracts_email_from_mixed_contact_line() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate
    jane@example.com | +33 7 49 14 96 78

    Professional Summary
    Software Engineering graduate with web development experience.
    """

    result = parse_cv_text(cv_text)

    assert result.personal_info.email == "jane@example.com"


def test_parse_cv_text_extracts_french_international_phone() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate
    +33 7 49 14 96 78

    Professional Summary
    Software Engineering graduate with web development experience.
    """

    result = parse_cv_text(cv_text)

    assert result.personal_info.phone == "+33 7 49 14 96 78"


def test_parse_cv_text_extracts_linkedin_url() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate
    https://www.linkedin.com/in/janedoe

    Professional Summary
    Software Engineering graduate with web development experience.
    """

    result = parse_cv_text(cv_text)

    assert result.personal_info.linkedin == "https://www.linkedin.com/in/janedoe"


def test_parse_cv_text_extracts_github_url() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate
    https://github.com/janedoe

    Professional Summary
    Software Engineering graduate with web development experience.
    """

    result = parse_cv_text(cv_text)

    assert result.personal_info.github == "https://github.com/janedoe"


def test_parse_cv_text_extracts_portfolio_url() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate
    https://janedoe.dev

    Professional Summary
    Software Engineering graduate with web development experience.
    """

    result = parse_cv_text(cv_text)

    assert result.personal_info.portfolio == "https://janedoe.dev"


def test_parse_cv_text_extracts_explicit_header_location() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate
    Paris, France

    Professional Summary
    Software Engineering graduate with web development experience.
    """

    result = parse_cv_text(cv_text)

    assert result.personal_info.location == "Paris, France"


def test_parse_cv_text_extracts_supported_header_fields() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate
    jane@example.com | +33 7 49 14 96 78
    Paris, France
    https://www.linkedin.com/in/janedoe
    https://github.com/janedoe
    https://janedoe.dev

    Professional Summary
    Software Engineering graduate with experience building React and FastAPI
    applications.
    """

    result = parse_cv_text(cv_text)

    assert result.personal_info.full_name == "Jane Doe"
    assert result.headline == "Software Engineering Graduate"
    assert result.personal_info.email == "jane@example.com"
    assert result.personal_info.phone == "+33 7 49 14 96 78"
    assert result.personal_info.location == "Paris, France"
    assert result.personal_info.linkedin == "https://www.linkedin.com/in/janedoe"
    assert result.personal_info.github == "https://github.com/janedoe"
    assert result.personal_info.portfolio == "https://janedoe.dev"
    assert result.summary == (
        "Software Engineering graduate with experience building React and FastAPI "
        "applications."
    )


def test_parse_cv_text_leaves_missing_contact_fields_as_none() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Professional Summary
    Software Engineering graduate with web development experience.
    """

    result = parse_cv_text(cv_text)

    assert result.personal_info.email is None
    assert result.personal_info.phone is None
    assert result.personal_info.location is None
    assert result.personal_info.linkedin is None
    assert result.personal_info.github is None
    assert result.personal_info.portfolio is None


def test_parse_cv_text_extracts_role_first_experience_entry() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Experience
    Software Engineering Intern
    Example Company
    Paris, France
    June 2024 - September 2024
    - Built FastAPI endpoints for internal workflow automation.
    - Improved React dashboard loading states.
    """

    result = parse_cv_text(cv_text)

    assert len(result.experience) == 1

    experience = result.experience[0]
    assert experience.job_title == "Software Engineering Intern"
    assert experience.company == "Example Company"
    assert experience.location == "Paris, France"
    assert experience.dates.start_date == "June 2024"
    assert experience.dates.end_date == "September 2024"
    assert experience.bullets == [
        "Built FastAPI endpoints for internal workflow automation.",
        "Improved React dashboard loading states.",
    ]


def test_parse_cv_text_extracts_company_first_experience_entry() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Experience
    Example Company
    Software Engineering Intern
    Jun 2024 - Present | Paris, France
    • Built FastAPI endpoints for internal workflow automation.
    """

    result = parse_cv_text(cv_text)

    assert len(result.experience) == 1

    experience = result.experience[0]
    assert experience.company == "Example Company"
    assert experience.job_title == "Software Engineering Intern"
    assert experience.location == "Paris, France"
    assert experience.dates.start_date == "Jun 2024"
    assert experience.dates.end_date == "Present"
    assert experience.bullets == [
        "Built FastAPI endpoints for internal workflow automation.",
    ]


def test_parse_cv_text_extracts_combined_experience_header() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Experience
    Backend Developer at Example Company
    2023 - 2024
    * Developed PostgreSQL-backed APIs.
    """

    result = parse_cv_text(cv_text)

    assert len(result.experience) == 1

    experience = result.experience[0]
    assert experience.company == "Example Company"
    assert experience.job_title == "Backend Developer"
    assert experience.dates.start_date == "2023"
    assert experience.dates.end_date == "2024"
    assert experience.bullets == [
        "Developed PostgreSQL-backed APIs.",
    ]


def test_parse_cv_text_extracts_multiple_experience_entries() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Experience
    Backend Developer
    Example Company
    Jan 2024 - Present
    - Built FastAPI services.
    Software Engineering Intern
    Other Company
    Jun 2023 - Dec 2023
    - Shipped React features.
    """

    result = parse_cv_text(cv_text)

    assert [item.job_title for item in result.experience] == [
        "Backend Developer",
        "Software Engineering Intern",
    ]
    assert [item.company for item in result.experience] == [
        "Example Company",
        "Other Company",
    ]
    assert result.experience[0].bullets == ["Built FastAPI services."]
    assert result.experience[1].bullets == ["Shipped React features."]


def test_parse_cv_text_skips_ambiguous_experience_entry() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Experience
    Freelance projects and coursework
    - Built small web applications.
    """

    result = parse_cv_text(cv_text)

    assert result.experience == []


def test_parse_cv_text_extracts_institution_first_education_entry() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Education
    Example University
    Master of Engineering in Computer Science
    Paris, France
    2022 - 2024
    - Relevant coursework: distributed systems and databases.
    """

    result = parse_cv_text(cv_text)

    assert len(result.education) == 1

    education = result.education[0]
    assert education.institution == "Example University"
    assert education.degree == "Master of Engineering in Computer Science"
    assert education.field_of_study == "Computer Science"
    assert education.location == "Paris, France"
    assert education.dates.start_date == "2022"
    assert education.dates.end_date == "2024"
    assert education.details == [
        "Relevant coursework: distributed systems and databases.",
    ]


def test_parse_cv_text_extracts_degree_first_education_entry() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Education
    Bachelor of Science in Software Engineering
    Example Institute of Technology
    2019 - 2022 | Berlin, Germany
    """

    result = parse_cv_text(cv_text)

    assert len(result.education) == 1

    education = result.education[0]
    assert education.institution == "Example Institute of Technology"
    assert education.degree == "Bachelor of Science in Software Engineering"
    assert education.field_of_study == "Software Engineering"
    assert education.location == "Berlin, Germany"
    assert education.dates.start_date == "2019"
    assert education.dates.end_date == "2022"


def test_parse_cv_text_extracts_combined_education_header() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Education
    MSc Computer Science - Example University
    2021 - 2023
    Thesis on resume parsing systems.
    """

    result = parse_cv_text(cv_text)

    assert len(result.education) == 1

    education = result.education[0]
    assert education.institution == "Example University"
    assert education.degree == "MSc Computer Science"
    assert education.description == "Thesis on resume parsing systems."
    assert education.dates.start_date == "2021"
    assert education.dates.end_date == "2023"


def test_parse_cv_text_extracts_multiple_education_entries() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Education
    Example University
    Master of Engineering in Computer Science
    2022 - 2024
    Example College
    Bachelor of Science in Software Engineering
    2019 - 2022
    """

    result = parse_cv_text(cv_text)

    assert [item.institution for item in result.education] == [
        "Example University",
        "Example College",
    ]
    assert [item.degree for item in result.education] == [
        "Master of Engineering in Computer Science",
        "Bachelor of Science in Software Engineering",
    ]


def test_parse_cv_text_skips_ambiguous_education_entry() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Education
    Online coursework and self-study
    - Completed backend development tutorials.
    """

    result = parse_cv_text(cv_text)

    assert result.education == []


def test_parse_cv_text_extracts_project_entry() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Projects
    AI Resume Checker
    Full-stack CV analysis tool
    Organization: Example University
    Paris, France
    2024 - Present
    Technologies: React, FastAPI, PostgreSQL
    https://github.com/janedoe/ai-resume-checker
    Built a deterministic parser for pasted CV text.
    - Parsed structured profile, experience, and education sections.
    - Added test coverage for realistic pasted CV examples.
    """

    result = parse_cv_text(cv_text)

    assert len(result.projects) == 1

    project = result.projects[0]
    assert project.name == "AI Resume Checker"
    assert project.subtitle == "Full-stack CV analysis tool"
    assert project.organization == "Example University"
    assert project.location == "Paris, France"
    assert project.dates.start_date == "2024"
    assert project.dates.end_date == "Present"
    assert project.technologies == ["React", "FastAPI", "PostgreSQL"]
    assert project.url == "https://github.com/janedoe/ai-resume-checker"
    assert project.description == "Built a deterministic parser for pasted CV text."
    assert project.bullets == [
        "Parsed structured profile, experience, and education sections.",
        "Added test coverage for realistic pasted CV examples.",
    ]


def test_parse_cv_text_extracts_project_with_date_location_line() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Projects
    Portfolio Website
    Personal website for engineering projects
    2023 - 2024 | Berlin, Germany
    Tech stack: TypeScript | React | Vite
    https://janedoe.dev
    • Published selected projects and case studies.
    """

    result = parse_cv_text(cv_text)

    assert len(result.projects) == 1

    project = result.projects[0]
    assert project.name == "Portfolio Website"
    assert project.subtitle == "Personal website for engineering projects"
    assert project.location == "Berlin, Germany"
    assert project.dates.start_date == "2023"
    assert project.dates.end_date == "2024"
    assert project.technologies == ["TypeScript", "React", "Vite"]
    assert project.url == "https://janedoe.dev"
    assert project.bullets == [
        "Published selected projects and case studies.",
    ]


def test_parse_cv_text_extracts_project_single_dates() -> None:
    examples = [
        "March 2026",
        "Mar 2026",
        "2026",
    ]

    for date in examples:
        cv_text = f"""
        Jane Doe
        Software Engineering Graduate

        Selected Projects
        AI Resume Checker
        Full-stack CV analysis tool
        {date}
        Technologies: React, FastAPI
        - Parsed pasted CV text into structured sections.
        """

        result = parse_cv_text(cv_text)

        assert len(result.projects) == 1
        assert result.projects[0].dates.start_date == date
        assert result.projects[0].dates.end_date is None
        assert result.projects[0].subtitle == "Full-stack CV analysis tool"


def test_parse_cv_text_extracts_multiple_project_entries() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Projects
    AI Resume Checker
    CV analysis tool
    Technologies: React, FastAPI
    - Parsed CV text into structured sections.
    Portfolio Website
    Personal engineering portfolio
    Technologies: TypeScript, Vite
    - Showcased selected projects.
    """

    result = parse_cv_text(cv_text)

    assert [project.name for project in result.projects] == [
        "AI Resume Checker",
        "Portfolio Website",
    ]
    assert [project.technologies for project in result.projects] == [
        ["React", "FastAPI"],
        ["TypeScript", "Vite"],
    ]
    assert result.projects[0].bullets == [
        "Parsed CV text into structured sections.",
    ]
    assert result.projects[1].bullets == [
        "Showcased selected projects.",
    ]


def test_parse_cv_text_skips_empty_project_section() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Projects
    """

    result = parse_cv_text(cv_text)

    assert result.projects == []


def test_parse_cv_text_extracts_labeled_skill_groups() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Skills
    Programming Languages: Python, TypeScript
    Frameworks: FastAPI | React
    Tools: Docker, Git
    """

    result = parse_cv_text(cv_text)

    assert [group.category for group in result.skill_groups] == [
        "Programming Languages",
        "Frameworks",
        "Tools",
    ]
    assert [group.skills for group in result.skill_groups] == [
        ["Python", "TypeScript"],
        ["FastAPI", "React"],
        ["Docker", "Git"],
    ]


def test_parse_cv_text_extracts_uncategorized_skills() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Skills
    Python, TypeScript
    - FastAPI
    - React
    """

    result = parse_cv_text(cv_text)

    assert len(result.skill_groups) == 1
    assert result.skill_groups[0].category == "Skills"
    assert result.skill_groups[0].skills == [
        "Python",
        "TypeScript",
        "FastAPI",
        "React",
    ]


def test_parse_cv_text_extracts_languages() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Languages
    English - Fluent (TOEIC 950)
    French: Native
    Spanish (B2)
    """

    result = parse_cv_text(cv_text)

    assert len(result.languages) == 3
    assert result.languages[0].language == "English"
    assert result.languages[0].proficiency == "Fluent"
    assert result.languages[0].certification == "TOEIC"
    assert result.languages[0].score == "950"
    assert result.languages[1].language == "French"
    assert result.languages[1].proficiency == "Native"
    assert result.languages[2].language == "Spanish"
    assert result.languages[2].proficiency == "B2"


def test_parse_cv_text_extracts_awards() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Distinctions
    First Place - Example Hackathon
    Date: 2024
    Placement: 1st
    - Built a prototype application in 24 hours.
    Academic Excellence Award
    Organization: Example University
    2023
    - Recognized for top academic performance.
    """

    result = parse_cv_text(cv_text)

    assert len(result.awards) == 2
    assert result.awards[0].title == "First Place"
    assert result.awards[0].organization == "Example Hackathon"
    assert result.awards[0].date == "2024"
    assert result.awards[0].placement == "1st"
    assert result.awards[0].bullets == [
        "Built a prototype application in 24 hours.",
    ]
    assert result.awards[1].title == "Academic Excellence Award"
    assert result.awards[1].organization == "Example University"
    assert result.awards[1].date == "2023"


def test_parse_cv_text_extracts_certifications() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate

    Certifications
    AWS Certified Cloud Practitioner
    Issuer: Amazon Web Services
    Issued: 2024
    Credential ID: ABC-123
    https://aws.amazon.com/verification
    Professional Scrum Master I - Scrum.org
    2023
    """

    result = parse_cv_text(cv_text)

    assert len(result.certifications) == 2
    assert result.certifications[0].name == "AWS Certified Cloud Practitioner"
    assert result.certifications[0].issuer == "Amazon Web Services"
    assert result.certifications[0].date == "2024"
    assert result.certifications[0].credential_id == "ABC-123"
    assert result.certifications[0].url == "https://aws.amazon.com/verification"
    assert result.certifications[1].name == "Professional Scrum Master I"
    assert result.certifications[1].issuer == "Scrum.org"
    assert result.certifications[1].date == "2023"


def test_parse_cv_text_extracts_realistic_full_cv() -> None:
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

    result = parse_cv_text(cv_text)

    assert result.personal_info.full_name == "Jane Doe"
    assert result.personal_info.email == "jane@example.com"
    assert result.headline == "Software Engineering Graduate"
    assert result.summary == (
        "Software engineering graduate building reliable React and FastAPI products."
    )
    assert [item.company for item in result.experience] == [
        "Example Labs",
        "Startup Studio",
    ]
    assert result.experience[0].dates.end_date == "Present"
    assert [item.institution for item in result.education] == [
        "Example University",
        "Example College",
    ]
    assert result.projects[0].name == "AI Resume Checker"
    assert result.projects[0].dates.start_date == "March 2026"
    assert result.projects[0].dates.end_date is None
    assert result.projects[0].technologies == ["React", "FastAPI", "PostgreSQL"]
    assert [group.category for group in result.skill_groups] == [
        "Languages",
        "Frameworks",
        "Tools",
    ]
    assert result.languages[0].certification == "TOEIC"
    assert result.languages[0].score == "950"
    assert result.awards[0].title == "First Place"
    assert result.awards[0].organization == "Example Hackathon"
    assert result.certifications[0].name == "AWS Certified Cloud Practitioner"
    assert result.certifications[0].issuer == "Amazon Web Services"


def test_parse_cv_text_extracts_remaining_structured_sections() -> None:
    cv_text = """
    Jane Doe
    Software Engineering Graduate
    jane@example.com

    Experience
    Example Company
    Software Engineering Intern

    Education
    Example University
    Master of Engineering in Computer Science

    Projects
    AI Resume Checker
    CV analysis tool

    Skills
    Languages: Python, TypeScript
    Frameworks: React, FastAPI

    Languages
    English - Fluent
    French: Native

    Awards
    First Place - Example Hackathon
    2024

    Certifications
    AWS Certified Cloud Practitioner
    Issuer: Amazon Web Services
    """

    result = parse_cv_text(cv_text)

    assert len(result.experience) == 1
    assert result.experience[0].company == "Example Company"
    assert result.experience[0].job_title == "Software Engineering Intern"
    assert len(result.education) == 1
    assert result.education[0].institution == "Example University"
    assert result.education[0].degree == "Master of Engineering in Computer Science"
    assert len(result.projects) == 1
    assert result.projects[0].name == "AI Resume Checker"
    assert result.projects[0].subtitle == "CV analysis tool"
    assert [group.category for group in result.skill_groups] == [
        "Languages",
        "Frameworks",
    ]
    assert [language.language for language in result.languages] == [
        "English",
        "French",
    ]
    assert len(result.awards) == 1
    assert result.awards[0].title == "First Place"
    assert result.awards[0].organization == "Example Hackathon"
    assert len(result.certifications) == 1
    assert result.certifications[0].name == "AWS Certified Cloud Practitioner"
    assert result.certifications[0].issuer == "Amazon Web Services"
