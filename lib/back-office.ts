export type BackOfficeStatus =
  | "pending"
  | "in_review"
  | "verified"
  | "rejected"
  | "escalated";

export type DecisionAction =
  | "allow"
  | "deny"
  | "manual_review"
  | "needs_more_evidence";

export type BackOfficeConcept =
  | "verification_cases"
  | "evidence_files"
  | "decisions"
  | "risk_scores"
  | "teams"
  | "api_keys";

export const backOfficeConcepts: BackOfficeConcept[] = [
  "verification_cases",
  "evidence_files",
  "decisions",
  "risk_scores",
  "teams",
  "api_keys",
];

export const backOfficeStatuses: BackOfficeStatus[] = [
  "pending",
  "in_review",
  "verified",
  "rejected",
  "escalated",
];

export const decisionActions: DecisionAction[] = [
  "allow",
  "deny",
  "manual_review",
  "needs_more_evidence",
];
