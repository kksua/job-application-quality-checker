from pydantic import BaseModel, Field


class PersonalInfo(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None

    linkedin: str | None = None
    github: str | None = None
    portfolio: str | None = None

    photo_url: str | None = None


class DateRange(BaseModel):
    start_date: str | None = None
    end_date: str | None = None


class ExperienceItem(BaseModel):
    company: str
    job_title: str

    location: str | None = None

    dates: DateRange = Field(
        default_factory=DateRange,
    )

    bullets: list[str] = Field(
        default_factory=list,
    )


class EducationItem(BaseModel):
    institution: str
    degree: str

    field_of_study: str | None = None
    location: str | None = None

    dates: DateRange = Field(
        default_factory=DateRange,
    )

    description: str | None = None

    details: list[str] = Field(
        default_factory=list,
    )


class ProjectItem(BaseModel):
    name: str

    subtitle: str | None = None
    organization: str | None = None
    location: str | None = None

    dates: DateRange = Field(
        default_factory=DateRange,
    )

    description: str | None = None

    bullets: list[str] = Field(
        default_factory=list,
    )

    technologies: list[str] = Field(
        default_factory=list,
    )

    url: str | None = None


class SkillGroup(BaseModel):
    category: str

    skills: list[str] = Field(
        default_factory=list,
    )


class AwardItem(BaseModel):
    title: str

    organization: str | None = None
    date: str | None = None
    placement: str | None = None

    description: str | None = None

    bullets: list[str] = Field(
        default_factory=list,
    )


class LanguageItem(BaseModel):
    language: str

    proficiency: str | None = None

    certification: str | None = None
    score: str | None = None


class CertificationItem(BaseModel):
    name: str

    issuer: str | None = None
    date: str | None = None
    credential_id: str | None = None
    url: str | None = None


class StructuredCv(BaseModel):
    personal_info: PersonalInfo = Field(
        default_factory=PersonalInfo,
    )

    headline: str | None = None
    summary: str | None = None

    experience: list[ExperienceItem] = Field(
        default_factory=list,
    )

    education: list[EducationItem] = Field(
        default_factory=list,
    )

    projects: list[ProjectItem] = Field(
        default_factory=list,
    )

    skill_groups: list[SkillGroup] = Field(
        default_factory=list,
    )

    awards: list[AwardItem] = Field(
        default_factory=list,
    )

    certifications: list[CertificationItem] = Field(
        default_factory=list,
    )

    languages: list[LanguageItem] = Field(
        default_factory=list,
    )
