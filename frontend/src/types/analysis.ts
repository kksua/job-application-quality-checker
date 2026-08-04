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
}
