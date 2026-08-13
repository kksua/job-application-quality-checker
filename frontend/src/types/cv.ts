export interface PersonalInfo {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;

  linkedin: string | null;
  github: string | null;
  portfolio: string | null;

  photoUrl: string | null;
}

export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

export interface ExperienceItem {
  company: string;
  jobTitle: string;

  location: string | null;

  dates: DateRange;

  bullets: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;

  fieldOfStudy: string | null;
  location: string | null;

  dates: DateRange;

  description: string | null;
  details: string[];
}

export interface ProjectItem {
  name: string;

  subtitle: string | null;
  organization: string | null;
  location: string | null;

  dates: DateRange;

  description: string | null;

  bullets: string[];
  technologies: string[];

  url: string | null;
}

export interface SkillGroup {
  category: string;
  skills: string[];
}

export interface AwardItem {
  title: string;

  organization: string | null;
  date: string | null;
  placement: string | null;

  description: string | null;
  bullets: string[];
}

export interface LanguageItem {
  language: string;

  proficiency: string | null;

  certification: string | null;
  score: string | null;
}

export interface CertificationItem {
  name: string;

  issuer: string | null;
  date: string | null;
  credentialId: string | null;
  url: string | null;
}

export interface StructuredCv {
  personalInfo: PersonalInfo;

  headline: string | null;
  summary: string | null;

  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];

  skillGroups: SkillGroup[];

  awards: AwardItem[];
  certifications: CertificationItem[];
  languages: LanguageItem[];
}
