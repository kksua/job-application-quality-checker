import type { StructuredCv } from "../types/cv";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

interface ParseCvRequest {
  cvText: string;
  jobDescription: string;
}

interface BackendDateRange {
  start_date: string | null;
  end_date: string | null;
}

interface BackendStructuredCv {
  personal_info: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    linkedin: string | null;
    github: string | null;
    portfolio: string | null;
    photo_url: string | null;
  };
  headline: string | null;
  summary: string | null;
  experience: Array<{
    company: string;
    job_title: string;
    location: string | null;
    dates: BackendDateRange;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field_of_study: string | null;
    location: string | null;
    dates: BackendDateRange;
    description: string | null;
    details: string[];
  }>;
  projects: Array<{
    name: string;
    subtitle: string | null;
    organization: string | null;
    location: string | null;
    dates: BackendDateRange;
    description: string | null;
    bullets: string[];
    technologies: string[];
    url: string | null;
  }>;
  skill_groups: Array<{
    category: string;
    skills: string[];
  }>;
  awards: Array<{
    title: string;
    organization: string | null;
    date: string | null;
    placement: string | null;
    description: string | null;
    bullets: string[];
  }>;
  certifications: Array<{
    name: string;
    issuer: string | null;
    date: string | null;
    credential_id: string | null;
    url: string | null;
  }>;
  languages: Array<{
    language: string;
    proficiency: string | null;
    certification: string | null;
    score: string | null;
  }>;
}

function mapStructuredCv(data: BackendStructuredCv): StructuredCv {
  return {
    personalInfo: {
      fullName: data.personal_info.full_name,
      email: data.personal_info.email,
      phone: data.personal_info.phone,
      location: data.personal_info.location,
      linkedin: data.personal_info.linkedin,
      github: data.personal_info.github,
      portfolio: data.personal_info.portfolio,
      photoUrl: data.personal_info.photo_url,
    },
    headline: data.headline,
    summary: data.summary,
    experience: data.experience.map((item) => ({
      company: item.company,
      jobTitle: item.job_title,
      location: item.location,
      dates: {
        startDate: item.dates.start_date,
        endDate: item.dates.end_date,
      },
      bullets: item.bullets,
    })),
    education: data.education.map((item) => ({
      institution: item.institution,
      degree: item.degree,
      fieldOfStudy: item.field_of_study,
      location: item.location,
      dates: {
        startDate: item.dates.start_date,
        endDate: item.dates.end_date,
      },
      description: item.description,
      details: item.details,
    })),
    projects: data.projects.map((item) => ({
      name: item.name,
      subtitle: item.subtitle,
      organization: item.organization,
      location: item.location,
      dates: {
        startDate: item.dates.start_date,
        endDate: item.dates.end_date,
      },
      description: item.description,
      bullets: item.bullets,
      technologies: item.technologies,
      url: item.url,
    })),
    skillGroups: data.skill_groups,
    awards: data.awards,
    certifications: data.certifications.map((item) => ({
      name: item.name,
      issuer: item.issuer,
      date: item.date,
      credentialId: item.credential_id,
      url: item.url,
    })),
    languages: data.languages,
  };
}

export async function parseCv({
  cvText,
  jobDescription,
}: ParseCvRequest): Promise<StructuredCv> {
  const response = await fetch(`${API_BASE_URL}/cv/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cv_text: cvText,
      job_description: jobDescription,
    }),
  });

  if (!response.ok) {
    throw new Error("The CV could not be converted into structured data.");
  }

  const data = (await response.json()) as BackendStructuredCv;

  return mapStructuredCv(data);
}
