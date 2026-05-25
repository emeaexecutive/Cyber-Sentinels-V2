export const trustLedgerEventTypes = [
  "trust_score_changed",
  "human_presence_changed",
  "origin_trace_changed",
  "passport_verified",
  "passport_revoked",
  "passport_restored",
  "agent_verified",
  "agent_restricted",
  "evidence_added",
  "evidence_tampered",
  "decision_created",
  "policy_evaluated",
  "permission_denied",
  "step_up_completed",
  "recovery_approved",
] as const;

export const trustLedgerSignals = [
  "trust_ledger_updated",
  "trust_score_changed",
  "ledger_event_created",
] as const;

export const trustLedgerAuditEvents = ["trust_ledger_event_created"] as const;

export type TrustLedgerEventType = (typeof trustLedgerEventTypes)[number];

export type TrustLedgerEvent = {
  id: string;
  subject_id: string;
  subject_type: "human" | "agent" | "company" | "candidate" | "media" | "passport";
  event_type: TrustLedgerEventType;
  previous_value: string | number | null;
  new_value: string | number | null;
  reason_code: string;
  actor: string;
  source: string;
  created_at: string;
  audit_log_id: string | null;
  signal_id: string | null;
};

export const publicSafeLedgerFields = [
  "id",
  "subject_id",
  "subject_type",
  "event_type",
  "previous_value",
  "new_value",
  "reason_code",
  "actor",
  "source",
  "created_at",
  "audit_log_id",
  "signal_id",
] as const;

export const demoTrustLedgerEvents: TrustLedgerEvent[] = [
  {
    id: "ledger-trust-score-up",
    subject_id: "demo-verified-human",
    subject_type: "human",
    event_type: "trust_score_changed",
    previous_value: 72,
    new_value: 91,
    reason_code: "evidence_verified",
    actor: "system",
    source: "trust_score_engine",
    created_at: "2026-05-24T09:20:00Z",
    audit_log_id: "audit-demo-score",
    signal_id: "signal-demo-score",
  },
  {
    id: "ledger-hpi-up",
    subject_id: "demo-verified-human",
    subject_type: "human",
    event_type: "human_presence_changed",
    previous_value: 65,
    new_value: 88,
    reason_code: "hpi_recalculated",
    actor: "system",
    source: "human_presence_index",
    created_at: "2026-05-24T09:15:00Z",
    audit_log_id: "audit-demo-hpi",
    signal_id: "signal-demo-hpi",
  },
  {
    id: "ledger-origin-up",
    subject_id: "demo-reality-passport",
    subject_type: "passport",
    event_type: "origin_trace_changed",
    previous_value: 40,
    new_value: 71,
    reason_code: "origin_chain_strengthened",
    actor: "reviewer",
    source: "origin_trace",
    created_at: "2026-05-23T17:05:00Z",
    audit_log_id: "audit-demo-origin",
    signal_id: "signal-demo-origin",
  },
  {
    id: "ledger-passport-revoked",
    subject_id: "demo-revoked-passport",
    subject_type: "passport",
    event_type: "passport_revoked",
    previous_value: "active",
    new_value: "revoked",
    reason_code: "policy_violation",
    actor: "admin",
    source: "revocation_engine",
    created_at: "2026-05-22T12:10:00Z",
    audit_log_id: "audit-demo-revoke",
    signal_id: "signal-demo-revoke",
  },
  {
    id: "ledger-trust-restored",
    subject_id: "demo-verified-human",
    subject_type: "human",
    event_type: "passport_restored",
    previous_value: "restricted",
    new_value: "active",
    reason_code: "recovery_approved",
    actor: "admin",
    source: "trust_recovery",
    created_at: "2026-05-21T15:45:00Z",
    audit_log_id: "audit-demo-recovery",
    signal_id: "signal-demo-recovery",
  },
  {
    id: "ledger-evidence-tampered",
    subject_id: "demo-media-evidence",
    subject_type: "media",
    event_type: "evidence_tampered",
    previous_value: "clean",
    new_value: "tampered",
    reason_code: "metadata_mismatch",
    actor: "system",
    source: "evidence_vault",
    created_at: "2026-05-20T11:30:00Z",
    audit_log_id: "audit-demo-tamper",
    signal_id: "signal-demo-tamper",
  },
  {
    id: "ledger-agent-restricted",
    subject_id: "demo-orion-research-agent",
    subject_type: "agent",
    event_type: "agent_restricted",
    previous_value: "verified",
    new_value: "restricted",
    reason_code: "permission_scope_violation",
    actor: "policy_engine",
    source: "agent_registry",
    created_at: "2026-05-19T14:00:00Z",
    audit_log_id: "audit-demo-agent",
    signal_id: "signal-demo-agent",
  },
];

export function getLedgerEventsForSubject(subjectId: string) {
  return demoTrustLedgerEvents.filter((event) => event.subject_id === subjectId);
}

export function toPublicTrustLedgerJson(event: TrustLedgerEvent) {
  return {
    id: event.id,
    subject_id: event.subject_id,
    subject_type: event.subject_type,
    event_type: event.event_type,
    previous_value: event.previous_value,
    new_value: event.new_value,
    reason_code: event.reason_code,
    actor: event.actor,
    source: event.source,
    created_at: event.created_at,
    audit_log_id: event.audit_log_id,
    signal_id: event.signal_id,
  };
}
