import type { ReviewedOutcomeRecord } from "@/lib/governance/reviewed-outcomes";
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
  | "governance_decision"
  | "reviewer_override"
  | "false_positive_outcome"
  | "false_negative_outcome"
  | "trust_recovery"
  | "trust_decay";

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
  reason: string;
  evidence_refs: string[];
  replay_refs: string[];
  governance_refs: string[];
  provider_refs: string[];
  reviewed_outcome_ref: string | null;
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
};

export type TrustEvolutionSummary = {
  actor_id: string;
  actor_type: TrustMemoryActorType;
  workflow_id: string;
  event_count: number;
  latest_state: string;
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

export function createTrustMemoryEvent(
  input: Omit<TrustMemoryEvent, "id" | "trust_delta" | "trust_change" | "explanation" | "created_at"> & {
    id?: string;
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

  return {
    ...input,
    id: input.id ?? `tm_${input.workflow_id}_${input.actor_id}_${createdAt}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
    confidence_before: confidenceBefore,
    confidence_after: confidenceAfter,
    trust_delta: calculateTrustDelta(evolutionInput),
    trust_change: classifyTrustChange(evolutionInput),
    explanation: explainTrustChange(evolutionInput),
    evidence_refs: normalizeRefs(input.evidence_refs),
    replay_refs: normalizeRefs(input.replay_refs),
    governance_refs: normalizeRefs(input.governance_refs),
    provider_refs: normalizeRefs(input.provider_refs),
    created_at: createdAt,
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
          : "trust_recovery";
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
    reviewed_outcome_ref: null,
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
    reviewed_outcome_ref: null,
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
    reviewed_outcome_ref: null,
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
    reviewed_outcome_ref: "reviewed-outcome:screening-agent-7",
    confidence_before: 0.57,
    confidence_after: 0.73,
    created_at: "2026-07-10T08:22:00.000Z",
  }),
];
