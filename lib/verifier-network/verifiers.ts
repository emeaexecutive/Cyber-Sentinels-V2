export const verifierTypes = [
  "internal_admin",
  "external_reviewer",
  "recruiter_verifier",
  "cyber_analyst",
  "identity_partner",
  "legal_reviewer",
  "compliance_partner",
  "ai_agent_reviewer",
] as const;

export const verifierStatuses = [
  "pending",
  "approved",
  "suspended",
  "revoked",
  "under_review",
] as const;

export const verifierCapabilities = [
  "review_human_presence",
  "review_origin_trace",
  "review_linkedin_signal",
  "review_candidate_report",
  "review_evidence",
  "approve_low_risk_case",
  "escalate_high_risk_case",
  "export_report",
] as const;

export const verifierSignals = [
  "verifier_application_created",
  "verifier_approved",
  "verifier_suspended",
  "case_assigned_to_verifier",
  "verifier_review_completed",
] as const;

export const verifierAuditEvents = [
  "verifier_created",
  "verifier_approved",
  "verifier_suspended",
  "verifier_review_completed",
] as const;

export type VerifierType = (typeof verifierTypes)[number];
export type VerifierStatus = (typeof verifierStatuses)[number];
export type VerifierCapability = (typeof verifierCapabilities)[number];

export type VerifierRow = {
  id?: string;
  verifier_name: string | null;
  verifier_type: VerifierType | string | null;
  organisation: string | null;
  email: string | null;
  status: VerifierStatus | string | null;
  capabilities: VerifierCapability[] | string[] | null;
  trust_score: number | null;
  assigned_cases: number | null;
  completed_reviews: number | null;
  created_at?: string | null;
};

export type VerifierSummary = {
  id: string;
  verifier_name: string;
  verifier_type: VerifierType | string;
  organisation: string;
  email: string;
  status: VerifierStatus | string;
  capabilities: VerifierCapability[] | string[];
  trust_score: number;
  assigned_cases: number;
  completed_reviews: number;
  created_at: string | null;
};

export const demoVerifiers: VerifierSummary[] = [
  {
    id: "verifier-admin",
    verifier_name: "Cyber Sentinels Admin",
    verifier_type: "internal_admin",
    organisation: "Cyber Sentinels",
    email: "admin@example.com",
    status: "approved",
    capabilities: [
      "review_human_presence",
      "review_origin_trace",
      "approve_low_risk_case",
      "escalate_high_risk_case",
    ],
    trust_score: 96,
    assigned_cases: 4,
    completed_reviews: 42,
    created_at: new Date().toISOString(),
  },
  {
    id: "verifier-hiring",
    verifier_name: "Hiring Shield Reviewer",
    verifier_type: "recruiter_verifier",
    organisation: "Hiring Shield",
    email: "hiring-reviewer@example.com",
    status: "approved",
    capabilities: ["review_candidate_report", "review_linkedin_signal"],
    trust_score: 88,
    assigned_cases: 7,
    completed_reviews: 28,
    created_at: new Date().toISOString(),
  },
  {
    id: "verifier-origin",
    verifier_name: "Origin Trace Analyst",
    verifier_type: "cyber_analyst",
    organisation: "Origin Trace",
    email: "origin@example.com",
    status: "pending",
    capabilities: ["review_origin_trace", "review_evidence"],
    trust_score: 82,
    assigned_cases: 2,
    completed_reviews: 11,
    created_at: new Date().toISOString(),
  },
  {
    id: "verifier-evidence",
    verifier_name: "Evidence Vault Reviewer",
    verifier_type: "identity_partner",
    organisation: "Evidence Vault",
    email: "evidence@example.com",
    status: "under_review",
    capabilities: ["review_evidence", "escalate_high_risk_case"],
    trust_score: 79,
    assigned_cases: 3,
    completed_reviews: 17,
    created_at: new Date().toISOString(),
  },
  {
    id: "verifier-compliance",
    verifier_name: "Compliance Partner",
    verifier_type: "compliance_partner",
    organisation: "Compliance Partner",
    email: "compliance@example.com",
    status: "approved",
    capabilities: ["export_report", "review_candidate_report"],
    trust_score: 90,
    assigned_cases: 1,
    completed_reviews: 24,
    created_at: new Date().toISOString(),
  },
];

export function normalizeVerifier(row: VerifierRow): VerifierSummary {
  return {
    id: row.id ?? `verifier-${row.email ?? row.verifier_name ?? "placeholder"}`,
    verifier_name: row.verifier_name ?? "Unnamed verifier",
    verifier_type: row.verifier_type ?? "external_reviewer",
    organisation: row.organisation ?? "Independent",
    email: row.email ?? "unknown@example.com",
    status: row.status ?? "pending",
    capabilities: row.capabilities ?? ["review_evidence"],
    trust_score: row.trust_score ?? 50,
    assigned_cases: row.assigned_cases ?? 0,
    completed_reviews: row.completed_reviews ?? 0,
    created_at: row.created_at ?? null,
  };
}

export function normalizeVerifiers(rows: VerifierRow[] | null | undefined) {
  return rows?.map(normalizeVerifier) ?? [];
}
