export type EnterpriseTrustCentreRole =
  | "VIEWER"
  | "ANALYST"
  | "INVESTIGATOR"
  | "ADMINISTRATOR"
  | "SUPER_ADMINISTRATOR";

export type TrustCentreCapability =
  | "read"
  | "export"
  | "comment"
  | "triage"
  | "assign"
  | "simulate";

export type TrustCentreRow = Record<string, unknown>;

export type TrustDnaDimension = {
  dimension: string;
  score: number | null;
  confidence: number;
  weight: number;
  trend: "improving" | "stable" | "declining" | "unavailable";
  explanation: string;
  evidenceCount: number;
  comparedWith: number | null;
};

export type TrustCentreSnapshot = {
  generatedAt: string;
  organisation: { id: string; name: string; role: EnterpriseTrustCentreRole };
  overview: {
    subjectCount: number;
    currentTrustHealth: number | null;
    openAlertCount: number;
    highRiskCount: number;
    pendingReviewCount: number;
    providerCount: number;
    replayActivityCount: number;
    policyCount: number;
  };
  distribution: Array<{ label: string; count: number }>;
  runtime: TrustCentreRow[];
  highRiskEntities: TrustCentreRow[];
  alerts: TrustCentreRow[];
  providerHealth: TrustCentreRow[];
  evidence: TrustCentreRow[];
  assessments: TrustCentreRow[];
  policies: TrustCentreRow[];
  replayActivity: TrustCentreRow[];
  aiAgents: TrustCentreRow[];
  verificationQueue: TrustCentreRow[];
  manualReviews: TrustCentreRow[];
  trustDna: TrustDnaDimension[];
  capabilities: TrustCentreCapability[];
  dataAvailability: Record<string, boolean>;
};

export type TrustCentreSearchResult = {
  id: string;
  type: string;
  label: string;
  description: string;
  href: string;
  occurredAt: string | null;
};
