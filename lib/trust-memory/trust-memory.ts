import type { ReviewedOutcomeRecord } from "../governance/reviewed-outcomes.ts";
import {
  calculateTrustDelta,
  classifyTrustChange,
  explainTrustChange,
  type TrustChangeClassification,
  type TrustChangeExplanation,
} from "./trust-evolution.ts";

export type TrustMemoryActorType = "human" | "ai_agent" | "machine_identity" | "workflow";

export type TrustMemoryEventKind =
  | "identity_change"
  | "runtime_change"
  | "provider_change"
  | "session_integrity_change"
  | "trust_gain"
  | "step_up_verification"
  | "policy_change"
  | "credential_rotation"
  | "provider_conflict"
  | "authority_revoked"
  | "authority_delegated"
  | "session_integrity_failure"
  | "lifecycle_completed"
  | "governance_decision"
  | "reviewer_override"
  | "false_positive_outcome"
  | "false_negative_outcome"
  | "trust_recovery"
  | "trust_confirmed"
  | "trust_decay"
  | "retention_tombstone";

export type TrustMemoryEvolutionState =
  | "established"
  | "strengthened"
  | "gained"
  | "challenged"
  | "reduced"
  | "restored"
  | "decayed"
  | "recovered"
  | "expired"
  | "suspended"
  | "inconclusive"
  | "revoked";

export type TrustMemoryOperationalState =
  | "Trust Established"
  | "Trust Strengthened"
  | "Trust Increased"
  | "Trust Reduced"
  | "Trust Challenged"
  | "Trust Restored"
  | "Trust Expired"
  | "Trust Revoked"
  | "Trust Suspended"
  | "Trust Inconclusive"
  | "Trust Delegated"
  | "Trust Reviewed"
  | "Trust Confirmed";

export type TrustMemoryContext = {
  purpose: string | null;
  action: string | null;
  environment: string | null;
};

export type TrustMemoryReassessment = {
  state: "scheduled" | "completed" | "not_scheduled";
  scheduled_for: string | null;
  trigger: string;
};

export type TrustMemoryEvidenceSource = {
  reference: string;
  source_type: "provider" | "policy" | "authority" | "governance" | "replay" | "reviewed_outcome" | "system";
};

export type TrustMemoryEvent = {
  id: string;
  actor_id: string;
  actor_type: TrustMemoryActorType;
  workflow_id: string;
  event_kind: TrustMemoryEventKind;
  trust_state_before: string;
  trust_state_after: string;
  trust_delta: number;
  trust_change: TrustChangeClassification;
  evolution_state: TrustMemoryEvolutionState;
  operational_state: TrustMemoryOperationalState;
  reason: string;
  evidence_refs: string[];
  replay_refs: string[];
  governance_refs: string[];
  provider_refs: string[];
  policy_refs: string[];
  authority_refs: string[];
  reviewed_outcome_ref: string | null;
  context: TrustMemoryContext;
  reassessment: TrustMemoryReassessment;
  evidence_sources: TrustMemoryEvidenceSource[];
  policy_history: Array<{ policy_ref: string; effective_at: string }>;
  confidence_before: number;
  confidence_after: number;
  explanation: TrustChangeExplanation;
  enterprise_operational_memory?: {
    ownership_status: "customer_owned" | "shared_provider_context" | "not_recorded";
    provider_visibility: "none" | "metadata_only" | "provider_visible";
    customer_ownership: boolean;
    local_retention: "enabled" | "planned" | "not_recorded";
    provider_dependency: "none" | "low" | "medium" | "high";
    trust_evolution: string;
    confidence_evolution: string;
    review_evolution: string;
  };
  created_at: string;
  tenant_id?: string;
};

export type TrustEvolutionSummary = {
  actor_id: string;
  actor_type: TrustMemoryActorType;
  workflow_id: string;
  event_count: number;
  latest_state: string;
  latest_operational_state: TrustMemoryOperationalState;
  net_trust_delta: number;
  confidence_before: number;
  confidence_after: number;
  reviewed_outcome_impacts: number;
  evidence_count: number;
  replay_count: number;
};

export type TrustMemorySnapshot = {
  events: TrustMemoryEvent[];
  summaries: TrustEvolutionSummary[];
  generated_at: string;
  boundary: string;
};

function confidence(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, Number(value.toFixed(2))));
}

function normalizeRefs(value: string[] | undefined) {
  return [...new Set((value ?? []).map((item) => item.trim()).filter(Boolean))].slice(0, 20);
}

function evidenceSource(reference: string): TrustMemoryEvidenceSource["source_type"] {
  if (/^provider:/i.test(reference)) return "provider";
  if (/^policy:/i.test(reference)) return "policy";
  if (/^authority:/i.test(reference)) return "authority";
  if (/^(governance|override):/i.test(reference)) return "governance";
  if (/^(replay:|\/.*replay)/i.test(reference)) return "replay";
  if (/^reviewed-outcome:/i.test(reference)) return "reviewed_outcome";
  return "system";
}

function evolutionState(input: {
  eventKind: TrustMemoryEventKind;
  stateAfter: string;
  classification: TrustChangeClassification;
  delta: number;
}): TrustMemoryEvolutionState {
  const stateAfter = input.stateAfter.toLowerCase();
  if (input.classification === "established") return "established";
  if (input.eventKind === "authority_revoked" || stateAfter.includes("revok")) return "revoked";
  if (stateAfter.includes("expir")) return "expired";
  if (stateAfter.includes("suspend") || stateAfter === "paused") return "suspended";
  if (input.eventKind === "trust_decay" || input.classification === "decayed") return "decayed";
  if (input.eventKind === "trust_recovery" || input.classification === "recovered") return "recovered";
  if (input.classification === "restored") return "restored";
  if (["provider_conflict", "session_integrity_failure", "step_up_verification"].includes(input.eventKind) || ["escalated", "challenged"].includes(input.classification)) return "challenged";
  if (input.delta < 0 || ["decreased", "reduced", "blocked"].includes(input.classification)) return "reduced";
  if (input.classification === "strengthened") return "strengthened";
  if (input.delta > 0 || input.classification === "increased") return "gained";
  return "inconclusive";
}

function operationalState(input: {
  eventKind: TrustMemoryEventKind;
  stateAfter: string;
  classification: TrustChangeClassification;
  delta: number;
}): TrustMemoryOperationalState {
  const stateAfter = input.stateAfter.toLowerCase();
  if (input.classification === "established") return "Trust Established";
  if (input.eventKind === "authority_revoked" || stateAfter.includes("revok")) return "Trust Revoked";
  if (stateAfter.includes("expir")) return "Trust Expired";
  if (stateAfter.includes("suspend") || stateAfter === "paused") return "Trust Suspended";
  if (input.eventKind === "authority_delegated") return "Trust Delegated";
  if (["reviewer_override", "governance_decision"].includes(input.eventKind)) return "Trust Reviewed";
  if (["trust_confirmed", "lifecycle_completed"].includes(input.eventKind)) return "Trust Confirmed";
  if (input.eventKind === "trust_recovery" || input.classification === "restored" || input.classification === "recovered") return "Trust Restored";
  if (["provider_conflict", "session_integrity_failure", "step_up_verification"].includes(input.eventKind) || ["escalated", "challenged"].includes(input.classification)) return "Trust Challenged";
  if (input.delta < 0 || ["decreased", "reduced", "blocked", "decayed"].includes(input.classification)) return "Trust Reduced";
  if (input.classification === "strengthened") return "Trust Strengthened";
  if (input.delta > 0 || input.classification === "increased") return "Trust Increased";
  return "Trust Inconclusive";
}

export function createTrustMemoryEvent(
  input: Omit<TrustMemoryEvent, "id" | "trust_delta" | "trust_change" | "evolution_state" | "operational_state" | "explanation" | "policy_refs" | "authority_refs" | "context" | "reassessment" | "evidence_sources" | "policy_history" | "created_at"> & {
    id?: string;
    policy_refs?: string[];
    authority_refs?: string[];
    context?: Partial<TrustMemoryContext>;
    reassessment?: Partial<TrustMemoryReassessment>;
    created_at?: string;
  }
): TrustMemoryEvent {
  const confidenceBefore = confidence(input.confidence_before);
  const confidenceAfter = confidence(input.confidence_after);
  const evolutionInput = {
    trustStateBefore: input.trust_state_before,
    trustStateAfter: input.trust_state_after,
    confidenceBefore,
    confidenceAfter,
    evidenceRefs: normalizeRefs(input.evidence_refs),
    governanceRefs: normalizeRefs(input.governance_refs),
    reviewedOutcomeRef: input.reviewed_outcome_ref,
    reason: input.reason,
  };
  const createdAt = input.created_at ?? new Date().toISOString();
  const trustDelta = calculateTrustDelta(evolutionInput);
  const trustChange = classifyTrustChange(evolutionInput);
  const policyRefs = normalizeRefs(input.policy_refs);
  const authorityRefs = normalizeRefs(input.authority_refs);
  const evidenceRefs = normalizeRefs(input.evidence_refs);
  const replayRefs = normalizeRefs(input.replay_refs);
  const governanceRefs = normalizeRefs(input.governance_refs);
  const providerRefs = normalizeRefs(input.provider_refs);
  const reviewedOutcomeRefs = input.reviewed_outcome_ref ? [input.reviewed_outcome_ref] : [];

  return {
    ...input,
    id: input.id ?? `tm_${input.workflow_id}_${input.actor_id}_${createdAt}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
    confidence_before: confidenceBefore,
    confidence_after: confidenceAfter,
    trust_delta: trustDelta,
    trust_change: trustChange,
    evolution_state: evolutionState({ eventKind: input.event_kind, stateAfter: input.trust_state_after, classification: trustChange, delta: trustDelta }),
    operational_state: operationalState({ eventKind: input.event_kind, stateAfter: input.trust_state_after, classification: trustChange, delta: trustDelta }),
    explanation: explainTrustChange(evolutionInput),
    evidence_refs: evidenceRefs,
    replay_refs: replayRefs,
    governance_refs: governanceRefs,
    provider_refs: providerRefs,
    policy_refs: policyRefs,
    authority_refs: authorityRefs,
    context: {
      purpose: input.context?.purpose?.trim() || null,
      action: input.context?.action?.trim() || null,
      environment: input.context?.environment?.trim() || null,
    },
    reassessment: {
      state: input.reassessment?.state ?? "not_scheduled",
      scheduled_for: input.reassessment?.scheduled_for ?? null,
      trigger: input.reassessment?.trigger?.trim() || "No reassessment schedule was recorded for this event.",
    },
    evidence_sources: [...evidenceRefs, ...providerRefs, ...policyRefs, ...authorityRefs, ...governanceRefs, ...replayRefs, ...reviewedOutcomeRefs]
      .map((reference) => ({ reference, source_type: evidenceSource(reference) })),
    policy_history: policyRefs.map((policy_ref) => ({ policy_ref, effective_at: createdAt })),
    created_at: createdAt,
  };
}

export function buildWhyTrustChanged(event: TrustMemoryEvent) {
  return {
    previousPosture: event.trust_state_before,
    newPosture: event.trust_state_after,
    evidenceResponsible: event.evidence_sources,
    authorityImpact: event.authority_refs.length ? event.authority_refs : ["No authority lineage change was recorded."],
    policyApplied: event.policy_refs.length ? event.policy_refs : ["No policy version was recorded."],
    reviewer: event.reviewed_outcome_ref ?? null,
    replayLink: event.replay_refs[0] ?? null,
    confidenceChange: event.explanation.confidenceChange,
    reassessment: event.reassessment,
    context: event.context,
  };
}

export function summarizeTrustEvolution(events: TrustMemoryEvent[]): TrustEvolutionSummary[] {
  const groups = new Map<string, TrustMemoryEvent[]>();

  for (const event of events) {
    const key = `${event.actor_type}:${event.actor_id}:${event.workflow_id}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return [...groups.values()].map((group) => {
    const ordered = [...group].sort(
      (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    );
    const first = ordered[0];
    const latest = ordered.at(-1) ?? first;

    return {
      actor_id: first.actor_id,
      actor_type: first.actor_type,
      workflow_id: first.workflow_id,
      event_count: ordered.length,
      latest_state: latest.trust_state_after,
      latest_operational_state: latest.operational_state,
      net_trust_delta: Number(ordered.reduce((total, event) => total + event.trust_delta, 0).toFixed(2)),
      confidence_before: first.confidence_before,
      confidence_after: latest.confidence_after,
      reviewed_outcome_impacts: ordered.filter((event) => event.reviewed_outcome_ref).length,
      evidence_count: new Set(ordered.flatMap((event) => event.evidence_refs)).size,
      replay_count: new Set(ordered.flatMap((event) => event.replay_refs)).size,
    };
  });
}

export function buildTrustMemorySnapshot(events: TrustMemoryEvent[]): TrustMemorySnapshot {
  const ordered = [...events].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );

  return {
    events: ordered,
    summaries: summarizeTrustEvolution(ordered),
    generated_at: new Date().toISOString(),
    boundary:
      "Trust Memory is Enterprise Operational Memory for explainable trust, confidence, provider and review evolution. It does not claim autonomous learning, legal finality or first-party ML accuracy.",
  };
}

export function validateTrustMemoryIntegrity(
  events: TrustMemoryEvent[],
  input: { tenantId: string; evidenceRefs?: string[]; replayRefs?: string[]; governanceRefs?: string[]; policyRefs?: string[]; authorityRefs?: string[] }
) {
  const ordered = [...events].sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at));
  const evidence = new Set(input.evidenceRefs ?? events.flatMap((event) => event.evidence_refs));
  const replay = new Set(input.replayRefs ?? events.flatMap((event) => event.replay_refs));
  const governance = new Set(input.governanceRefs ?? events.flatMap((event) => event.governance_refs));
  const policy = new Set(input.policyRefs ?? events.flatMap((event) => event.policy_refs));
  const authority = new Set(input.authorityRefs ?? events.flatMap((event) => event.authority_refs));
  const duplicateIds = events.filter((event, index) => events.findIndex((candidate) => candidate.id === event.id) !== index).map((event) => event.id);
  const unresolved = events.flatMap((event) => [
    ...event.evidence_refs.filter((ref) => !evidence.has(ref)).map((ref) => `evidence:${ref}`),
    ...event.replay_refs.filter((ref) => !replay.has(ref)).map((ref) => `replay:${ref}`),
    ...event.governance_refs.filter((ref) => !governance.has(ref)).map((ref) => `governance:${ref}`),
    ...event.policy_refs.filter((ref) => !policy.has(ref)).map((ref) => `policy:${ref}`),
    ...event.authority_refs.filter((ref) => !authority.has(ref)).map((ref) => `authority:${ref}`),
  ]);
  const checks = {
    chronologyValid: ordered.every((event, index) => index === 0 || Date.parse(event.created_at) >= Date.parse(ordered[index - 1].created_at)),
    referencesResolve: unresolved.length === 0,
    tenantIsolationPreserved: events.every((event) => event.tenant_id === input.tenantId),
    reviewedOutcomesAttributable: events.filter((event) => event.reviewed_outcome_ref).every((event) => event.governance_refs.length > 0),
    reasonsPresent: events.every((event) => event.reason.trim().length > 0),
    evidenceSourcesAttributable: events.every((event) => event.evidence_sources.every((source) => source.reference.length > 0)),
    policyHistoryTraceable: events.every((event) => event.policy_history.length === event.policy_refs.length),
    reassessmentTraceable: events.every((event) => event.reassessment.trigger.trim().length > 0 && (event.reassessment.state !== "scheduled" || Boolean(event.reassessment.scheduled_for))),
    appendOnlyIds: duplicateIds.length === 0,
  };
  return {
    valid: Object.values(checks).every(Boolean),
    checks,
    duplicateIds: [...new Set(duplicateIds)],
    unresolvedReferences: [...new Set(unresolved)],
    eventCount: events.length,
    boundary: "Integrity validation detects continuity failures; it does not silently repair or overwrite Trust Memory.",
  };
}

export function trustMemoryEventFromReviewedOutcome(
  record: ReviewedOutcomeRecord,
  input: {
    actorId?: string;
    actorType?: TrustMemoryActorType;
    workflowId?: string;
    createdAt?: string;
  } = {}
): TrustMemoryEvent {
  const reviewedOutcomeRef = `reviewed-outcome:${record.caseId}`;
  const evidenceRefs = record.replayLinkage.evidenceReferences.length
    ? record.replayLinkage.evidenceReferences
    : record.replayLinkage.sampleReference
      ? [record.replayLinkage.sampleReference]
      : [];
  const governanceRefs = [
    record.governanceOutcome ? `governance:${record.governanceOutcome}` : null,
    record.governanceOverride?.reviewerId ? `override:${record.governanceOverride.reviewerId}` : null,
  ].filter((item): item is string => Boolean(item));
  const replayRefs = record.replayLink ? [record.replayLink] : [];

  const eventKind: TrustMemoryEventKind = record.falsePositive
    ? "false_positive_outcome"
    : record.falseNegative
      ? "false_negative_outcome"
      : record.governanceOverride
        ? "reviewer_override"
        : record.confirmedEscalation
          ? "governance_decision"
          : "trust_confirmed";
  const trustAfter = record.falseNegative || record.confirmedEscalation ? "escalated" : record.falsePositive ? "review_required" : "reviewed";
  const confidenceAfter = record.falseNegative
    ? Math.max(0.2, record.reviewConfidence - 0.2)
    : record.falsePositive
      ? Math.max(0.25, record.reviewConfidence - 0.1)
      : Math.min(1, record.reviewConfidence + 0.08);

  return createTrustMemoryEvent({
    actor_id: input.actorId ?? `case:${record.caseId}`,
    actor_type: input.actorType ?? "workflow",
    workflow_id: input.workflowId ?? `validation:${record.caseId}`,
    event_kind: eventKind,
    trust_state_before: record.originalSystemDecision === "not_run" ? "unreviewed" : record.originalSystemDecision,
    trust_state_after: trustAfter,
    reason:
      record.overrideReason ??
      record.reviewerNotes ??
      (record.falsePositive
        ? "Reviewer marked a false positive; future confidence should be recalibrated."
        : record.falseNegative
          ? "Reviewer marked a false negative; future confidence should be treated more cautiously."
          : "Reviewed outcome confirmed the trust decision."),
    evidence_refs: evidenceRefs,
    replay_refs: replayRefs,
    governance_refs: governanceRefs,
    provider_refs: [],
    reviewed_outcome_ref: reviewedOutcomeRef,
    confidence_before: Math.max(0, record.reviewConfidence - 0.18),
    confidence_after: confidenceAfter,
    created_at: input.createdAt,
  });
}

export const demoTrustMemoryEvents: TrustMemoryEvent[] = [
  createTrustMemoryEvent({
    actor_id: "human:recruiter-102",
    actor_type: "human",
    workflow_id: "wf-enterprise-hiring-42",
    event_kind: "identity_change",
    trust_state_before: "unverified",
    trust_state_after: "verified",
    reason: "Enterprise SSO and step-up verification matched the assigned reviewer.",
    evidence_refs: ["evidence:sso-step-up-102", "evidence:device-continuity-102"],
    replay_refs: ["/trust-replay?workflow_id=wf-enterprise-hiring-42"],
    governance_refs: [],
    provider_refs: ["provider:identity:Live"],
    policy_refs: ["policy:enterprise-access:v3"],
    authority_refs: ["authority:reviewer-role:v2"],
    reviewed_outcome_ref: null,
    context: { purpose: "Enterprise workflow review", action: "Establish reviewer identity", environment: "Controlled demo" },
    reassessment: { state: "scheduled", scheduled_for: "2026-07-11T08:00:00.000Z", trigger: "Reassess identity and authority before the next consequential action." },
    confidence_before: 0.48,
    confidence_after: 0.82,
    created_at: "2026-07-10T08:00:00.000Z",
  }),
  createTrustMemoryEvent({
    actor_id: "ai-agent:screening-agent-7",
    actor_type: "ai_agent",
    workflow_id: "wf-enterprise-hiring-42",
    event_kind: "runtime_change",
    trust_state_before: "verified",
    trust_state_after: "review_required",
    reason: "Agent requested broader candidate-data scope than the workflow policy allowed.",
    evidence_refs: ["evidence:scope-drift-7"],
    replay_refs: ["/trust-replay?workflow_id=wf-enterprise-hiring-42"],
    governance_refs: ["governance:queued-review-778"],
    provider_refs: ["provider:runtime:Heuristic Baseline"],
    policy_refs: ["policy:candidate-data-scope:v5"],
    authority_refs: ["authority:screening-agent:v4"],
    reviewed_outcome_ref: null,
    context: { purpose: "Candidate screening", action: "Request candidate data", environment: "Controlled demo" },
    reassessment: { state: "scheduled", scheduled_for: "2026-07-10T08:37:00.000Z", trigger: "Reassess after governance confirms the requested data scope." },
    confidence_before: 0.78,
    confidence_after: 0.57,
    created_at: "2026-07-10T08:07:00.000Z",
  }),
  createTrustMemoryEvent({
    actor_id: "machine:ats-webhook-prod",
    actor_type: "machine_identity",
    workflow_id: "wf-enterprise-hiring-42",
    event_kind: "session_integrity_change",
    trust_state_before: "verified",
    trust_state_after: "escalated",
    reason: "Webhook signature changed during a restricted workflow export.",
    evidence_refs: ["evidence:webhook-signature-change", "evidence:restricted-export"],
    replay_refs: ["/trust-replay?workflow_id=wf-enterprise-hiring-42"],
    governance_refs: ["governance:signature-review-991"],
    provider_refs: ["provider:ats:Awaiting Credentials"],
    policy_refs: ["policy:restricted-export:v2"],
    authority_refs: ["authority:ats-webhook:v3"],
    reviewed_outcome_ref: null,
    context: { purpose: "Restricted workflow export", action: "Transmit signed event", environment: "Controlled demo" },
    reassessment: { state: "scheduled", scheduled_for: "2026-07-10T08:43:00.000Z", trigger: "Reassess after signature continuity is restored and reviewed." },
    confidence_before: 0.74,
    confidence_after: 0.44,
    created_at: "2026-07-10T08:13:00.000Z",
  }),
  createTrustMemoryEvent({
    actor_id: "ai-agent:screening-agent-7",
    actor_type: "ai_agent",
    workflow_id: "wf-enterprise-hiring-42",
    event_kind: "reviewer_override",
    trust_state_before: "review_required",
    trust_state_after: "restored",
    reason: "Reviewer confirmed the action was within a delegated exception and required a narrower future scope.",
    evidence_refs: ["evidence:delegated-exception-7", "evidence:reviewer-rationale-778"],
    replay_refs: ["/trust-replay?workflow_id=wf-enterprise-hiring-42"],
    governance_refs: ["governance:review-778"],
    provider_refs: [],
    policy_refs: ["policy:delegated-exception:v2"],
    authority_refs: ["authority:screening-agent:v4", "authority:reviewer-778:v1"],
    reviewed_outcome_ref: "reviewed-outcome:screening-agent-7",
    context: { purpose: "Candidate screening", action: "Approve bounded exception", environment: "Controlled demo" },
    reassessment: { state: "completed", scheduled_for: "2026-07-10T08:22:00.000Z", trigger: "Governance review completed with a narrower future scope." },
    confidence_before: 0.57,
    confidence_after: 0.73,
    created_at: "2026-07-10T08:22:00.000Z",
  }),
];
