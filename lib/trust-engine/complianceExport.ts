export const complianceReportTypes = [
  "Trust Passport Report",
  "Human Presence Report",
  "Origin Trace Report",
  "Reality Passport Report",
  "Candidate Trust Report",
  "Agent Passport Report",
  "Evidence Chain Report",
  "Decision Audit Report",
  "Revocation / Recovery Report",
] as const;

export const exportStatuses = [
  "draft",
  "ready",
  "exported",
  "expired",
  "restricted",
] as const;

export const complianceSignals = [
  "compliance_export_created",
  "trust_report_generated",
  "audit_pack_ready",
  "report_exported",
] as const;

export const complianceAuditEvents = [
  "compliance_export_created",
  "trust_report_generated",
  "audit_pack_exported",
] as const;

export type ComplianceReportType = (typeof complianceReportTypes)[number];
export type ExportStatus = (typeof exportStatuses)[number];

export type ComplianceReport = {
  report_id: string;
  report_type: ComplianceReportType;
  subject_name: string;
  subject_type: string;
  trust_score: number | null;
  human_presence_index: number | null;
  origin_trace_score: number | null;
  decision: string;
  policy_result: string;
  risk_level: string;
  evidence_summary: string;
  signals_summary: string;
  audit_summary: string;
  created_at: string;
  export_status: ExportStatus;
};

export const demoComplianceReports: ComplianceReport[] = [
  {
    report_id: "report-reality-passport-demo",
    report_type: "Reality Passport Report",
    subject_name: "Reality Passport Demo",
    subject_type: "media",
    trust_score: 88,
    human_presence_index: 81,
    origin_trace_score: 84,
    decision: "manual_review",
    policy_result: "warning",
    risk_level: "medium",
    evidence_summary: "3 linked artefacts, provenance intact",
    signals_summary: "decision_recommended, evidence_scan_completed",
    audit_summary: "2 audit events ready for export",
    created_at: new Date().toISOString(),
    export_status: "ready",
  },
  {
    report_id: "report-hpi-demo",
    report_type: "Human Presence Report",
    subject_name: "Verified Human Demo",
    subject_type: "human",
    trust_score: 91,
    human_presence_index: 93,
    origin_trace_score: 78,
    decision: "allow",
    policy_result: "pass",
    risk_level: "low",
    evidence_summary: "Liveness and step-up signals available",
    signals_summary: "trust_allow_recommended",
    audit_summary: "Human presence review logged",
    created_at: new Date().toISOString(),
    export_status: "ready",
  },
  {
    report_id: "report-origin-trace-demo",
    report_type: "Origin Trace Report",
    subject_name: "Origin Trace Demo",
    subject_type: "document",
    trust_score: 74,
    human_presence_index: null,
    origin_trace_score: 71,
    decision: "manual_review",
    policy_result: "warning",
    risk_level: "medium",
    evidence_summary: "Origin recalculation attached",
    signals_summary: "revocation_review_started, trust_recovery_requested",
    audit_summary: "Origin trace recalculation logged",
    created_at: new Date().toISOString(),
    export_status: "draft",
  },
  {
    report_id: "report-candidate-demo",
    report_type: "Candidate Trust Report",
    subject_name: "Candidate Trust Demo",
    subject_type: "candidate",
    trust_score: 82,
    human_presence_index: 79,
    origin_trace_score: 76,
    decision: "manual_review",
    policy_result: "warning",
    risk_level: "medium",
    evidence_summary: "LinkedIn, identity and liveness evidence summarized",
    signals_summary: "manual_review_required",
    audit_summary: "Candidate report generated",
    created_at: new Date().toISOString(),
    export_status: "ready",
  },
  {
    report_id: "report-evidence-chain-demo",
    report_type: "Evidence Chain Report",
    subject_name: "Evidence Chain Demo",
    subject_type: "evidence",
    trust_score: null,
    human_presence_index: null,
    origin_trace_score: 68,
    decision: "needs_more_evidence",
    policy_result: "warning",
    risk_level: "high",
    evidence_summary: "Chain of custody has one incomplete handoff",
    signals_summary: "evidence_tamper_detected, evidence_locked",
    audit_summary: "Evidence chain update available",
    created_at: new Date().toISOString(),
    export_status: "restricted",
  },
  {
    report_id: "report-admin-decision-demo",
    report_type: "Decision Audit Report",
    subject_name: "Admin Decision Audit Demo",
    subject_type: "admin_review",
    trust_score: 69,
    human_presence_index: 61,
    origin_trace_score: 58,
    decision: "manual_review",
    policy_result: "fail",
    risk_level: "high",
    evidence_summary: "Decision, policy and review evidence bundled",
    signals_summary: "policy_manual_review_required",
    audit_summary: "Admin decision audit pack ready",
    created_at: new Date().toISOString(),
    export_status: "ready",
  },
];

export function createComplianceReport(
  reportType: ComplianceReportType,
  subjectId: string
) {
  const slug = reportType
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return {
    export_status: "draft" as ExportStatus,
    report_id: `report_${slug}_${subjectId.slice(0, 12)}`,
    message:
      "Compliance export placeholder created. PDF generation can be attached later.",
  };
}
