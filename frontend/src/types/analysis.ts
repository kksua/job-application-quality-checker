export type Severity = "low" | "medium" | "high";

export interface BulletIssue {
  bullet: string;
  issues: string[];
}

export interface AtsIssue {
  category: string;
  severity: Severity;
  message: string;
}

export interface CriterionScore {
  score: number | null;
  weight: number;
}

export interface ScoreBreakdown {
  technical_skills: CriterionScore;
  experience_relevance: CriterionScore;
  role_alignment: CriterionScore;
  education_qualifications: CriterionScore;
  location_eligibility: CriterionScore;
}

export interface AnalysisResponse {
  matching_skills: string[];
  missing_skills: string[];
  vague_phrases: string[];
  repeated_words: Record<string, number>;
  bullet_issues: BulletIssue[];
  ats_readiness_score: number;
  ats_issues: AtsIssue[];
  ats_passed_checks: string[];
  match_score: number;
  score_breakdown: ScoreBreakdown;
}

export interface TailoringResponse {
  headline: string;
  summary: string;
}

export interface BulletRewriteResponse {
  rewrittenBullet: string;
}
