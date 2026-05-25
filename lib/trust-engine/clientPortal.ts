export type ClientOwnedFields = {
  owner_email?: string | null;
  team_id?: string | null;
  client_id?: string | null;
};

export type ClientPortalSummary = {
  passport_count: number;
  open_verifications: number;
  reports_ready: number;
  evidence_required: number;
  exports_ready: number;
  api_usage: string;
  current_clearance: string;
  is_demo: boolean;
};

export const clientPortalSignals = [
  "client_portal_opened",
  "client_report_viewed",
  "client_export_requested",
  "client_evidence_requested",
] as const;

export const clientPortalAuditEvents = [
  "client_portal_accessed",
  "client_report_viewed",
  "client_export_requested",
] as const;

export const futureClientOwnershipFields = [
  "owner_email",
  "team_id",
  "client_id",
] as const;

export const demoClientSummary: ClientPortalSummary = {
  passport_count: 2,
  open_verifications: 3,
  reports_ready: 4,
  evidence_required: 1,
  exports_ready: 2,
  api_usage: "84 / 250",
  current_clearance: "Pro",
  is_demo: true,
};

export const demoClientPassports = [
  {
    id: "client-passport-human",
    subject_name: "Verified Human Passport",
    subject_type: "human",
    trust_score: 91,
    review_status: "verified",
  },
  {
    id: "client-passport-reality",
    subject_name: "Reality Passport Review",
    subject_type: "media",
    trust_score: 82,
    review_status: "in_review",
  },
];

export const demoClientVerificationCases = [
  {
    id: "client-case-hiring",
    subject_name: "Candidate verification",
    verification_status: "in_review",
    status: "in_review",
    trust_score: 78,
  },
  {
    id: "client-case-origin",
    subject_name: "Origin trace recalculation",
    verification_status: "pending",
    status: "pending",
    trust_score: 72,
  },
];

export const demoClientReports = [
  {
    id: "client-report-candidate",
    candidate_name: "Candidate Trust Report",
    review_status: "ready",
    trust_score: 84,
  },
  {
    id: "client-report-audit",
    candidate_name: "Decision Audit Report",
    review_status: "ready",
    trust_score: 79,
  },
];

export const demoClientEvidenceRequests = [
  {
    id: "client-evidence-liveness",
    file_name: "Fresh liveness prompt",
    scan_status: "requested",
  },
  {
    id: "client-evidence-origin",
    file_name: "Origin trace support document",
    scan_status: "pending",
  },
];

export const demoClientExports = [
  {
    report_id: "client-export-reality-passport",
    report_type: "Reality Passport Report",
    export_status: "ready",
  },
  {
    report_id: "client-export-evidence-chain",
    report_type: "Evidence Chain Report",
    export_status: "draft",
  },
];
