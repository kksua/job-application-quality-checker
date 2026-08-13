import re
from collections.abc import Iterable

from app.schemas.cv import (
    AwardItem,
    CertificationItem,
    DateRange,
    EducationItem,
    ExperienceItem,
    LanguageItem,
    PersonalInfo,
    ProjectItem,
    SkillGroup,
    StructuredCv,
)

EMAIL_PATTERN = re.compile(
    r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
    re.IGNORECASE,
)
PHONE_PATTERN = re.compile(
    r"(?<!\w)(?:\+?\d{1,3}[\s().-]*)?(?:\d[\s().-]*){8,14}\d(?!\w)",
)
DATE_RANGE_PATTERN = re.compile(
    r"\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+"
    r"\d{4}|\d{4})\s*(?:-|–|—|to)\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|"
    r"Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}|Present|Current|Now)\b",
    re.IGNORECASE,
)
SINGLE_DATE_PATTERN = re.compile(
    r"\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+"
    r"\d{4}|(?:19|20)\d{2})\b",
    re.IGNORECASE,
)
YEAR_PATTERN = re.compile(r"\b(?:19|20)\d{2}\b")
URL_PATTERN = re.compile(
    r"\b(?:https?://)?(?:www\.)?[A-Z0-9][A-Z0-9.-]*\.[A-Z]{2,}"
    r"(?:/[^\s|,;]*)?",
    re.IGNORECASE,
)
LOCATION_PATTERN = re.compile(
    r"^[A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ' .-]+(?:,\s*[A-ZÀ-ÖØ-Ý]"
    r"[A-Za-zÀ-ÖØ-öø-ÿ' .-]+|\s*\(\d{2,5}\))$",
)
TITLE_KEYWORDS = {
    "analyst",
    "architect",
    "consultant",
    "designer",
    "developer",
    "engineer",
    "graduate",
    "intern",
    "lead",
    "manager",
    "product",
    "scientist",
    "software",
    "student",
}
DEGREE_KEYWORDS = {
    "bachelor",
    "ba",
    "bsc",
    "bs",
    "degree",
    "diploma",
    "engineering",
    "licence",
    "master",
    "msc",
    "ms",
    "phd",
}
INSTITUTION_KEYWORDS = {
    "academy",
    "college",
    "ecole",
    "école",
    "institute",
    "polytechnic",
    "school",
    "université",
    "university",
}
BULLET_PREFIX_PATTERN = re.compile(r"^(?:[-*•‣▪]\s+|\d+[.)]\s+)")
LABELED_VALUE_PATTERN = re.compile(r"^([A-Za-z ]+):\s*(.+)$")

SECTION_ALIASES = {
    "summary": {
        "summary",
        "professional summary",
        "profile",
        "professional profile",
    },
    "experience": {
        "experience",
        "professional experience",
        "work experience",
        "employment",
    },
    "education": {
        "education",
        "academic background",
        "formation",
    },
    "projects": {
        "projects",
        "personal projects",
        "academic projects",
        "projects hackathons",
        "selected projects",
    },
    "skills": {
        "skills",
        "technical skills",
        "technical skills tools",
        "competencies",
        "competences",
    },
    "languages": {
        "languages",
    },
    "awards": {
        "awards",
        "awards distinctions",
        "distinctions",
        "achievements",
    },
    "certifications": {
        "certifications",
        "certifications awards",
        "certificates",
    },
}


def normalize_heading(value: str) -> str:
    normalized = re.sub(r"[^a-z ]", " ", value.lower())

    return re.sub(r"\s+", " ", normalized).strip()


def detect_section(line: str) -> str | None:
    normalized = normalize_heading(line)

    for section, aliases in SECTION_ALIASES.items():
        if normalized in aliases:
            return section

    return None


def parse_cv_text(cv_text: str) -> StructuredCv:
    lines = [line.strip() for line in cv_text.splitlines() if line.strip()]

    sections: dict[str, list[str]] = {}
    current_section: str | None = None
    header_lines: list[str] = []

    for line in lines:
        detected_section = detect_section(line)

        if detected_section:
            current_section = detected_section
            sections.setdefault(current_section, [])
            continue

        if current_section is None:
            header_lines.append(line)
        else:
            sections[current_section].append(line)

    personal_info = parse_personal_info(header_lines)

    return StructuredCv(
        personal_info=personal_info,
        headline=parse_headline(
            header_lines,
            full_name=personal_info.full_name,
        ),
        summary=parse_summary(sections.get("summary", [])),
        experience=parse_experience(
            sections.get("experience", []),
        ),
        education=parse_education(
            sections.get("education", []),
        ),
        projects=parse_projects(
            sections.get("projects", []),
        ),
        skill_groups=parse_skill_groups(
            sections.get("skills", []),
        ),
        awards=parse_awards(
            sections.get("awards", []),
        ),
        certifications=parse_certifications(
            sections.get("certifications", []),
        ),
        languages=parse_languages(
            sections.get("languages", []),
        ),
    )


def parse_personal_info(
    lines: list[str],
) -> PersonalInfo:
    return PersonalInfo(
        full_name=parse_full_name(lines),
        email=extract_email(lines),
        phone=extract_phone(lines),
        location=extract_location(lines),
        linkedin=extract_linkedin(lines),
        github=extract_github(lines),
        portfolio=extract_portfolio(lines),
    )


def parse_headline(
    lines: list[str],
    full_name: str | None = None,
) -> str | None:
    for line in lines:
        if line == full_name:
            continue

        if not is_contact_line(line) and not is_location_line(line):
            return line

    return None


def extract_email(lines: Iterable[str]) -> str | None:
    for line in lines:
        match = EMAIL_PATTERN.search(line)
        if match:
            return match.group(0)

    return None


def extract_phone(lines: Iterable[str]) -> str | None:
    for line in lines:
        for match in PHONE_PATTERN.finditer(line):
            phone = normalize_phone(match.group(0))
            digits = re.sub(r"\D", "", phone)

            if 9 <= len(digits) <= 15:
                return phone

    return None


def extract_urls(lines: Iterable[str]) -> list[str]:
    urls: list[str] = []

    for line in lines:
        line_without_emails = EMAIL_PATTERN.sub(
            "",
            line,
        )
        urls.extend(
            match.group(0).rstrip(").,;")
            for match in URL_PATTERN.finditer(line_without_emails)
        )

    return urls


def extract_linkedin(lines: Iterable[str]) -> str | None:
    return find_url_for_domain(
        lines,
        "linkedin.com",
    )


def extract_github(lines: Iterable[str]) -> str | None:
    return find_url_for_domain(
        lines,
        "github.com",
    )


def extract_portfolio(lines: Iterable[str]) -> str | None:
    for url in extract_urls(lines):
        lower_url = url.lower()

        if "linkedin.com" not in lower_url and "github.com" not in lower_url:
            return url

    return None


def extract_location(lines: Iterable[str]) -> str | None:
    for line in lines:
        if is_location_line(line):
            return line

    return None


def parse_full_name(lines: Iterable[str]) -> str | None:
    for line in lines:
        if is_plausible_name_line(line):
            return line

    return None


def find_url_for_domain(
    lines: Iterable[str],
    domain: str,
) -> str | None:
    for url in extract_urls(lines):
        if domain in url.lower():
            return url

    return None


def normalize_phone(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip(" |,;"))


def is_contact_line(line: str) -> bool:
    return (
        extract_email([line]) is not None
        or extract_phone([line]) is not None
        or extract_urls([line]) != []
    )


def is_location_line(line: str) -> bool:
    if is_contact_line(line):
        return False

    return LOCATION_PATTERN.fullmatch(line.strip()) is not None


def is_plausible_name_line(line: str) -> bool:
    stripped_line = line.strip()

    if (
        stripped_line == ""
        or is_contact_line(stripped_line)
        or is_location_line(stripped_line)
    ):
        return False

    words = stripped_line.split()
    if not 2 <= len(words) <= 5:
        return False

    normalized_words = {normalize_heading(word) for word in words}
    if normalized_words & TITLE_KEYWORDS:
        return False

    return all(any(character.isalpha() for character in word) for word in words)


def parse_summary(
    lines: list[str],
) -> str | None:
    if not lines:
        return None

    return " ".join(lines)


def parse_experience(
    lines: list[str],
) -> list[ExperienceItem]:
    entries: list[ExperienceItem] = []
    header_lines: list[str] = []
    bullets: list[str] = []

    for line in lines:
        if is_bullet_line(line):
            bullets.append(clean_bullet(line))
            continue

        if bullets and header_lines:
            entry = parse_experience_entry(
                header_lines,
                bullets,
            )
            if entry is not None:
                entries.append(entry)

            header_lines = [line]
            bullets = []
            continue

        header_lines.append(line)

    entry = parse_experience_entry(
        header_lines,
        bullets,
    )
    if entry is not None:
        entries.append(entry)

    return entries


def parse_experience_entry(
    header_lines: list[str],
    bullets: list[str],
) -> ExperienceItem | None:
    if not header_lines:
        return None

    dates = extract_date_range(header_lines)
    location = extract_experience_location(header_lines)
    title_and_company_lines = [
        line
        for line in header_lines
        if not contains_date_range(line) and not is_location_line(line)
    ]

    job_title, company = parse_job_title_and_company(title_and_company_lines)
    if job_title is None or company is None:
        return None

    return ExperienceItem(
        company=company,
        job_title=job_title,
        location=location,
        dates=dates,
        bullets=bullets,
    )


def parse_job_title_and_company(
    lines: list[str],
) -> tuple[str | None, str | None]:
    if not lines:
        return None, None

    for line in lines:
        parsed_line = parse_combined_title_company_line(line)
        if parsed_line != (None, None):
            return parsed_line

    if len(lines) < 2:
        return None, None

    first_line = lines[0]
    second_line = lines[1]
    first_looks_like_title = is_likely_job_title(first_line)
    second_looks_like_title = is_likely_job_title(second_line)

    if first_looks_like_title and not second_looks_like_title:
        return first_line, second_line

    if second_looks_like_title and not first_looks_like_title:
        return second_line, first_line

    return first_line, second_line


def parse_combined_title_company_line(line: str) -> tuple[str | None, str | None]:
    at_match = re.fullmatch(
        r"(.+?)\s+at\s+(.+)",
        line,
        re.IGNORECASE,
    )
    if at_match:
        return at_match.group(1).strip(), at_match.group(2).strip()

    for separator in (" | ", " - ", " – ", " — "):
        if separator in line:
            first_part, second_part = [
                part.strip() for part in line.split(separator, maxsplit=1)
            ]
            if first_part and second_part:
                return first_part, second_part

    return None, None


def extract_date_range(lines: Iterable[str]) -> DateRange:
    for line in lines:
        match = DATE_RANGE_PATTERN.search(line)
        if match:
            return DateRange(
                start_date=match.group(1),
                end_date=match.group(2),
            )

    return DateRange()


def extract_experience_location(lines: Iterable[str]) -> str | None:
    for line in lines:
        if is_location_line(line):
            return line

        if contains_date_range(line) and "|" in line:
            for part in line.split("|"):
                stripped_part = part.strip()
                if is_location_line(stripped_part):
                    return stripped_part

    return None


def contains_date_range(line: str) -> bool:
    return DATE_RANGE_PATTERN.search(line) is not None


def contains_single_date(line: str) -> bool:
    return SINGLE_DATE_PATTERN.fullmatch(line.strip()) is not None


def is_bullet_line(line: str) -> bool:
    return BULLET_PREFIX_PATTERN.match(line.strip()) is not None


def clean_bullet(line: str) -> str:
    return BULLET_PREFIX_PATTERN.sub(
        "",
        line.strip(),
        count=1,
    ).strip()


def is_likely_job_title(line: str) -> bool:
    normalized_words = {normalize_heading(word) for word in line.split()}

    return bool(normalized_words & TITLE_KEYWORDS)


def parse_education(
    lines: list[str],
) -> list[EducationItem]:
    entries: list[EducationItem] = []

    for block in split_education_blocks(lines):
        entry = parse_education_entry(block)
        if entry is not None:
            entries.append(entry)

    return entries


def split_education_blocks(lines: list[str]) -> list[list[str]]:
    blocks: list[list[str]] = []
    current_block: list[str] = []

    for line in lines:
        if current_block and starts_new_education_entry(
            line,
            current_block,
        ):
            blocks.append(current_block)
            current_block = [line]
            continue

        current_block.append(line)

    if current_block:
        blocks.append(current_block)

    return blocks


def starts_new_education_entry(
    line: str,
    current_block: list[str],
) -> bool:
    if is_bullet_line(line):
        return False

    parsed_current_entry = parse_education_entry(current_block)
    if parsed_current_entry is None:
        return False

    return is_likely_institution(line) or is_likely_degree(line)


def parse_education_entry(
    lines: list[str],
) -> EducationItem | None:
    dates = extract_date_range(lines)
    location = extract_education_location(lines)
    core_lines = [
        line
        for line in lines
        if not is_bullet_line(line)
        and not contains_date_range(line)
        and not is_location_line(line)
    ]
    degree, institution = parse_degree_and_institution(core_lines)

    if degree is None or institution is None:
        return None

    field_of_study = extract_field_of_study(degree)
    description = extract_education_description(
        lines,
        degree=degree,
        institution=institution,
    )

    return EducationItem(
        institution=institution,
        degree=degree,
        field_of_study=field_of_study,
        location=location,
        dates=dates,
        description=description,
        details=extract_details(lines),
    )


def parse_degree_and_institution(
    lines: list[str],
) -> tuple[str | None, str | None]:
    if not lines:
        return None, None

    for line in lines:
        parsed_line = parse_combined_degree_institution_line(line)
        if parsed_line != (None, None):
            return parsed_line

    degree = next(
        (line for line in lines if is_likely_degree(line)),
        None,
    )
    institution = next(
        (line for line in lines if is_likely_institution(line)),
        None,
    )

    if degree is not None and institution is not None:
        return degree, institution

    if len(lines) < 2:
        return None, None

    first_line = lines[0]
    second_line = lines[1]
    first_looks_like_degree = is_likely_degree(first_line)
    second_looks_like_degree = is_likely_degree(second_line)

    if first_looks_like_degree and not second_looks_like_degree:
        return first_line, second_line

    if second_looks_like_degree and not first_looks_like_degree:
        return second_line, first_line

    return None, None


def parse_combined_degree_institution_line(line: str) -> tuple[str | None, str | None]:
    for separator in (" | ", " - ", " – ", " — "):
        if separator in line:
            first_part, second_part = [
                part.strip() for part in line.split(separator, maxsplit=1)
            ]
            if not first_part or not second_part:
                continue

            if is_likely_degree(first_part):
                return first_part, second_part

            if is_likely_degree(second_part):
                return second_part, first_part

    return None, None


def extract_field_of_study(degree: str) -> str | None:
    in_match = re.search(
        r"\bin\s+(.+)$",
        degree,
        re.IGNORECASE,
    )
    if in_match:
        return in_match.group(1).strip()

    comma_parts = [part.strip() for part in degree.split(",", maxsplit=1)]
    if len(comma_parts) == 2 and comma_parts[1]:
        return comma_parts[1]

    return None


def extract_education_location(lines: Iterable[str]) -> str | None:
    for line in lines:
        if is_location_line(line):
            return line

        if contains_date_range(line) and "|" in line:
            for part in line.split("|"):
                stripped_part = part.strip()
                if is_location_line(stripped_part):
                    return stripped_part

    return None


def extract_education_description(
    lines: list[str],
    degree: str,
    institution: str,
) -> str | None:
    for line in lines:
        if (
            line != degree
            and line != institution
            and parse_combined_degree_institution_line(line) == (None, None)
            and not is_bullet_line(line)
            and not contains_date_range(line)
            and not is_location_line(line)
        ):
            return line

    return None


def extract_details(lines: Iterable[str]) -> list[str]:
    return [clean_bullet(line) for line in lines if is_bullet_line(line)]


def is_likely_degree(line: str) -> bool:
    normalized_words = {
        normalize_heading(word) for word in line.replace(".", "").split()
    }

    return bool(normalized_words & DEGREE_KEYWORDS)


def is_likely_institution(line: str) -> bool:
    normalized_words = {normalize_heading(word) for word in line.split()}

    return bool(normalized_words & INSTITUTION_KEYWORDS)


def parse_projects(
    lines: list[str],
) -> list[ProjectItem]:
    entries: list[ProjectItem] = []
    header_lines: list[str] = []
    bullets: list[str] = []

    for line in lines:
        if is_bullet_line(line):
            bullets.append(clean_bullet(line))
            continue

        if bullets and header_lines:
            entry = parse_project_entry(
                header_lines,
                bullets,
            )
            if entry is not None:
                entries.append(entry)

            header_lines = [line]
            bullets = []
            continue

        header_lines.append(line)

    entry = parse_project_entry(
        header_lines,
        bullets,
    )
    if entry is not None:
        entries.append(entry)

    return entries


def parse_project_entry(
    header_lines: list[str],
    bullets: list[str],
) -> ProjectItem | None:
    if not header_lines:
        return None

    dates = extract_project_dates(header_lines)
    location = extract_project_location(header_lines)
    url = extract_project_url(header_lines)
    technologies = extract_project_technologies(header_lines)
    organization = extract_labeled_value(
        header_lines,
        "organization",
    )
    core_lines = [
        line
        for line in header_lines
        if not contains_date_range(line)
        and not contains_single_date(line)
        and not is_location_line(line)
        and not is_url_only_line(line)
        and extract_labeled_value([line], "technologies") is None
        and extract_labeled_value([line], "technology") is None
        and extract_labeled_value([line], "tech stack") is None
        and extract_labeled_value([line], "organization") is None
    ]

    if not core_lines:
        return None

    name = core_lines[0]
    subtitle = core_lines[1] if len(core_lines) > 1 else None
    description = " ".join(core_lines[2:]) if len(core_lines) > 2 else None

    return ProjectItem(
        name=name,
        subtitle=subtitle,
        organization=organization,
        location=location,
        dates=dates,
        description=description,
        bullets=bullets,
        technologies=technologies,
        url=url,
    )


def extract_project_location(lines: Iterable[str]) -> str | None:
    for line in lines:
        if is_location_line(line):
            return line

        if contains_date_range(line) and "|" in line:
            for part in line.split("|"):
                stripped_part = part.strip()
                if is_location_line(stripped_part):
                    return stripped_part

    return None


def extract_project_dates(lines: Iterable[str]) -> DateRange:
    date_range = extract_date_range(lines)
    if date_range.start_date is not None:
        return date_range

    for line in lines:
        match = SINGLE_DATE_PATTERN.fullmatch(line.strip())
        if match:
            return DateRange(
                start_date=match.group(1),
            )

    return DateRange()


def extract_project_url(lines: Iterable[str]) -> str | None:
    urls = extract_urls(lines)
    if not urls:
        return None

    return urls[0]


def extract_project_technologies(lines: Iterable[str]) -> list[str]:
    value = (
        extract_labeled_value(
            lines,
            "technologies",
        )
        or extract_labeled_value(
            lines,
            "technology",
        )
        or extract_labeled_value(
            lines,
            "tech stack",
        )
    )
    if value is None:
        return []

    return [
        technology.strip()
        for technology in re.split(r",|\|", value)
        if technology.strip()
    ]


def extract_labeled_value(
    lines: Iterable[str],
    label: str,
) -> str | None:
    normalized_label = normalize_heading(label)

    for line in lines:
        match = LABELED_VALUE_PATTERN.fullmatch(line)
        if match and normalize_heading(match.group(1)) == normalized_label:
            return match.group(2).strip()

    return None


def parse_skill_groups(
    lines: list[str],
) -> list[SkillGroup]:
    groups: list[SkillGroup] = []
    uncategorized_skills: list[str] = []

    for line in lines:
        clean_line = clean_bullet(line) if is_bullet_line(line) else line
        labeled_value = parse_labeled_line(clean_line)

        if labeled_value is not None:
            category, value = labeled_value
            groups.append(
                SkillGroup(
                    category=category,
                    skills=split_list_values(value),
                )
            )
            continue

        uncategorized_skills.extend(split_list_values(clean_line))

    if uncategorized_skills:
        groups.append(
            SkillGroup(
                category="Skills",
                skills=uncategorized_skills,
            )
        )

    return groups


def parse_languages(
    lines: list[str],
) -> list[LanguageItem]:
    languages: list[LanguageItem] = []

    for line in lines:
        clean_line = clean_bullet(line) if is_bullet_line(line) else line
        language = parse_language_line(clean_line)
        if language is not None:
            languages.append(language)

    return languages


def parse_language_line(line: str) -> LanguageItem | None:
    labeled_value = parse_labeled_line(line)
    if labeled_value is not None:
        language, value = labeled_value
        return LanguageItem(
            language=language,
            proficiency=extract_language_proficiency(value),
            certification=extract_language_certification(value),
            score=extract_language_score(value),
        )

    for separator in (" - ", " – ", " — ", ", "):
        if separator in line:
            language, proficiency = [
                part.strip() for part in line.split(separator, maxsplit=1)
            ]
            if language and proficiency:
                return LanguageItem(
                    language=language,
                    proficiency=extract_language_proficiency(proficiency),
                    certification=extract_language_certification(proficiency),
                    score=extract_language_score(proficiency),
                )

    match = re.fullmatch(r"(.+?)\s+\((.+)\)", line)
    if match:
        return LanguageItem(
            language=match.group(1).strip(),
            proficiency=match.group(2).strip(),
        )

    if line.strip():
        return LanguageItem(
            language=line.strip(),
        )

    return None


def extract_language_proficiency(value: str) -> str:
    return re.sub(r"\s*\(.+\)\s*$", "", value).strip()


def extract_language_certification(value: str) -> str | None:
    match = re.search(r"\((.+)\)", value)
    if match:
        certification = match.group(1).strip()
        certification_match = re.fullmatch(r"(.+?)\s+(\d{2,4})", certification)
        if certification_match:
            return certification_match.group(1).strip()

        if any(character.isalpha() for character in certification):
            return certification

    return None


def extract_language_score(value: str) -> str | None:
    match = re.search(r"\b\d{2,4}\b", value)
    if match:
        return match.group(0)

    return None


def parse_awards(
    lines: list[str],
) -> list[AwardItem]:
    awards: list[AwardItem] = []

    for block in split_metadata_blocks(lines):
        award = parse_award_entry(block)
        if award is not None:
            awards.append(award)

    return awards


def parse_award_entry(lines: list[str]) -> AwardItem | None:
    if not lines:
        return None

    bullets = extract_details(lines)
    core_lines = [
        line
        for line in lines
        if not is_bullet_line(line)
        and extract_labeled_value([line], "organization") is None
        and extract_labeled_value([line], "placement") is None
        and not is_date_metadata_line(line)
        and not is_year_line(line)
    ]
    title, organization = parse_title_and_optional_organization(core_lines)

    if title is None:
        return None

    return AwardItem(
        title=title,
        organization=organization
        or extract_labeled_value(
            lines,
            "organization",
        ),
        date=extract_single_date(lines),
        placement=extract_labeled_value(
            lines,
            "placement",
        ),
        description=extract_award_description(
            core_lines,
            title=title,
            organization=organization,
        ),
        bullets=bullets,
    )


def parse_certifications(
    lines: list[str],
) -> list[CertificationItem]:
    certifications: list[CertificationItem] = []

    for block in split_metadata_blocks(lines):
        certification = parse_certification_entry(block)
        if certification is not None:
            certifications.append(certification)

    return certifications


def parse_certification_entry(lines: list[str]) -> CertificationItem | None:
    if not lines:
        return None

    name, issuer = parse_title_and_optional_organization(
        [
            line
            for line in lines
            if not is_bullet_line(line)
            and extract_labeled_value([line], "issuer") is None
            and extract_labeled_value([line], "credential id") is None
            and not is_date_metadata_line(line)
            and not is_url_only_line(line)
            and not is_year_line(line)
        ]
    )
    if name is None:
        return None

    return CertificationItem(
        name=name,
        issuer=issuer
        or extract_labeled_value(
            lines,
            "issuer",
        ),
        date=extract_single_date(lines),
        credential_id=extract_labeled_value(
            lines,
            "credential id",
        ),
        url=extract_project_url(lines),
    )


def split_metadata_blocks(lines: list[str]) -> list[list[str]]:
    blocks: list[list[str]] = []
    current_block: list[str] = []

    for line in lines:
        if current_block and starts_new_metadata_block(line, current_block):
            blocks.append(current_block)
            current_block = [line]
            continue

        current_block.append(line)

    if current_block:
        blocks.append(current_block)

    return blocks


def starts_new_metadata_block(
    line: str,
    current_block: list[str],
) -> bool:
    if is_bullet_line(line) or parse_labeled_line(line) is not None:
        return False

    return is_plain_metadata_title(line) and any(
        is_bullet_line(current_line)
        or is_date_metadata_line(current_line)
        or is_year_line(current_line)
        or is_url_only_line(current_line)
        for current_line in current_block
    )


def parse_title_and_optional_organization(
    lines: list[str],
) -> tuple[str | None, str | None]:
    if not lines:
        return None, None

    for line in lines:
        for separator in (" | ", " - ", " – ", " — "):
            if separator in line:
                title, parsed_organization = [
                    part.strip() for part in line.split(separator, maxsplit=1)
                ]
                if title and parsed_organization:
                    return title, parsed_organization

    title = lines[0]
    organization: str | None = lines[1] if len(lines) > 1 else None

    return title, organization


def extract_award_description(
    lines: list[str],
    title: str,
    organization: str | None,
) -> str | None:
    combined_title = None
    if organization is not None:
        combined_title = f"{title} - {organization}"

    description_lines = [
        line
        for line in lines
        if line != title and line != organization and line != combined_title
    ]
    if not description_lines:
        return None

    return " ".join(description_lines)


def extract_single_date(lines: Iterable[str]) -> str | None:
    for line in lines:
        date_range = extract_date_range([line])
        if date_range.start_date and date_range.end_date:
            return f"{date_range.start_date} - {date_range.end_date}"

        match = YEAR_PATTERN.search(line)
        if match:
            return match.group(0)

    return None


def is_year_line(line: str) -> bool:
    return YEAR_PATTERN.fullmatch(line.strip()) is not None


def is_date_metadata_line(line: str) -> bool:
    return (
        extract_labeled_value([line], "date") is not None
        or extract_labeled_value([line], "issued") is not None
    )


def is_url_only_line(line: str) -> bool:
    return URL_PATTERN.fullmatch(line.strip()) is not None


def is_plain_metadata_title(line: str) -> bool:
    return (
        not is_bullet_line(line)
        and parse_labeled_line(line) is None
        and not is_year_line(line)
        and not is_url_only_line(line)
    )


def parse_labeled_line(line: str) -> tuple[str, str] | None:
    match = LABELED_VALUE_PATTERN.fullmatch(line)
    if match is None:
        return None

    return match.group(1).strip(), match.group(2).strip()


def split_list_values(value: str) -> list[str]:
    return [item.strip() for item in re.split(r",|\|", value) if item.strip()]
