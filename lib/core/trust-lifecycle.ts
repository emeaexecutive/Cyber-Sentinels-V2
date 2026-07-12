import type { EvidenceGraph, EvidenceGraphNode, EvidenceGraphRelationship } from "../evidence-graph/evidence-graph.ts";
import {
  createTrustMemoryEvent,
  type TrustMemoryActorType,
  type TrustMemoryEvent,
  type TrustMemoryEventKind,
} from "../trust-memory/trust-memory.ts";
import type { ReplaySession } from "../trust-replay/replay.ts";

export const TRUST_LIFECYCLE_PHASES = [
  "application",
  "identity_verification",
  "credential_validation",
  "device_assessment",
  "session_integrity",
  "interview_integrity",
  "assessment_integrity",
  "offer",
  "provisioning",
  "first_authentication",
  "runtime_trust",
  "periodic_review",
  "privilege_change",
  "incident",
  "governance_review",
  "trust_recovery",
  "offboarding",
  "archive",
] as const;

export type TrustLifecyclePhase = (typeof TRUST_LIFECYCLE_PHASES)[number];

export const TRUST_LIFECYCLE_TEMPLATES = [
  "hiring",
  "ai_agent",
  "vendor",
  "executive",
  "machine_identity",
  "financial_workflow",
  "healthcare",
  "government",
] as const;

export type TrustLifecycleTemplate = (typeof TRUST_LIFECYCLE_TEMPLATES)[number];

export type ContinuousTrustChange =
  | "lifecycle_transition"
  | "trust_gain"
  | "trust_decay"
  | "step_up_verification"
  | "manual_review"
  | "policy_change"
  | "runtime_anomaly"
  | "credential_rotation"
  | "identity_refresh";

export type LifecycleGovernanceState =
  | "clear"
  | "monitoring"
  | "review_required"
  | "in_review"
  | "resolved";

export type LifecycleGovernanceEvent = {
  id: string;
  workflow_id: string;
  phase: TrustLifecyclePhase;
  action: ContinuousTrustChange;
  state: LifecycleGovernanceState;
  reason: string;
  evidence_refs: string[];
  replay_ref: string;
  created_at: string;
};

export type TrustLifecycleWrite = {
  lifecycle_event_id: string;
  workflow_id: string;
  template: TrustLifecycleTemplate;
  phase: TrustLifecyclePhase;
  phase_index: number;
  action: ContinuousTrustChange;
  trust_posture: string;
  confidence_before: number;
  confidence_after: number;
  outstanding_actions: string[];
  evidence_completeness: number;
  governance_state: LifecycleGovernanceState;
  replay: ReplaySession;
  evidence_graph: EvidenceGraph;
  trust_memory: TrustMemoryEvent;
  governance_event: LifecycleGovernanceEvent;
  created_at: string;
};

export type TrustLifecycleInput = {
  tenantId?: string;
  workflowId: string;
  subjectId: string;
  actorId: string;
  actorType?: TrustMemoryActorType;
  template: TrustLifecycleTemplate;
  phase: TrustLifecyclePhase;
  action?: ContinuousTrustChange;
  currentPosture?: string;
  confidenceBefore: number;
  reason: string;
  evidenceRefs?: string[];
  providerRefs?: string[];
  outstandingActions?: string[];
  evidenceExpected?: number;
  governanceState?: LifecycleGovernanceState;
  createdAt?: string;
  profile?: (stage: "replay" | "governance" | "trust_memory" | "evidence_graph", latencyMs: number) => void;
};

export type LifecycleDashboardSnapshot = {
  currentStage: TrustLifecyclePhase;
  currentTrustPosture: string;
  outstandingActions: string[];
  evidenceCompleteness: number;
  governanceState: LifecycleGovernanceState;
  confidenceTrend: Array<{ at: string; confidence: number; change: ContinuousTrustChange }>;
  template: TrustLifecycleTemplate;
  replayAvailable: boolean;
  trustMemorySummary: string;
};

const confidenceEffects: Record<ContinuousTrustChange, number> = {
  lifecycle_transition: 0,
  trust_gain: 0.08,
  trust_decay: -0.08,
  step_up_verification: -0.03,
  manual_review: -0.05,
  policy_change: -0.04,
  runtime_anomaly: -0.18,
  credential_rotation: 0.05,
  identity_refresh: 0.07,
};

const memoryKind: Record<ContinuousTrustChange, TrustMemoryEventKind> = {
  lifecycle_transition: "runtime_change",
  trust_gain: "trust_gain",
  trust_decay: "trust_decay",
  step_up_verification: "step_up_verification",
  manual_review: "governance_decision",
  policy_change: "policy_change",
  runtime_anomaly: "runtime_change",
  credential_rotation: "credential_rotation",
  identity_refresh: "identity_change",
};

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}

function unique(values: string[] = []) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 20);
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
}

function profileClock() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function postureFor(action: ContinuousTrustChange, currentPosture = "current") {
  if (action === "runtime_anomaly") return "elevated_risk";
  if (action === "step_up_verification") return "step_up_required";
  if (action === "manual_review" || action === "policy_change") return "review_required";
  if (action === "trust_decay") return "decaying";
  if (["trust_gain", "credential_rotation", "identity_refresh"].includes(action)) return "current";
  return currentPosture;
}

function governanceFor(action: ContinuousTrustChange, requested?: LifecycleGovernanceState) {
  if (requested) return requested;
  if (action === "manual_review") return "in_review";
  if (["runtime_anomaly", "step_up_verification", "policy_change"].includes(action)) return "review_required";
  if (action === "trust_decay") return "monitoring";
  return "clear";
}

function buildLifecycleEvidenceGraph(input: {
  lifecycleEventId: string;
  workflowId: string;
  phase: TrustLifecyclePhase;
  template: TrustLifecycleTemplate;
  posture: string;
  confidence: number;
  evidenceRefs: string[];
  replay: ReplaySession;
  governanceEvent: LifecycleGovernanceEvent;
  trustMemory: TrustMemoryEvent;
  createdAt: string;
}): EvidenceGraph {
  const workflowId = `workflow:${input.workflowId}`;
  const replayId = `replay_event:${input.replay.id}`;
  const governanceId = `governance_review:${input.governanceEvent.id}`;
  const memoryId = `trust_memory_event:${input.trustMemory.id}`;
  const postureId = `trust_posture:${input.lifecycleEventId}`;
  const nodes: EvidenceGraphNode[] = [
    { id: workflowId, type: "workflow", label: phaseLabel(input.phase), summary: "Lifecycle workflow phase.", metadata: { template: input.template, phase: input.phase } },
    ...input.evidenceRefs.map((id): EvidenceGraphNode => ({ id: `evidence:${safeId(id)}`, type: "evidence", label: id, summary: "Lifecycle evidence reference.", metadata: { lifecycle_phase: input.phase } })),
    { id: replayId, type: "replay_event", label: input.replay.id, summary: input.replay.replay_summary ?? "Lifecycle replay.", metadata: { generated_by: input.replay.generated_by } },
    { id: governanceId, type: "governance_review", label: input.governanceEvent.state, summary: input.governanceEvent.reason, metadata: { action: input.governanceEvent.action } },
    { id: memoryId, type: "trust_memory_event", label: input.trustMemory.event_kind, summary: input.trustMemory.reason, metadata: { confidence_after: input.confidence } },
    { id: postureId, type: "trust_posture", label: input.posture, summary: "Current lifecycle trust posture.", metadata: { confidence: input.confidence } },
  ];
  const relationship = (
    from: string,
    to: string,
    type: EvidenceGraphRelationship["type"],
    source: string
  ): EvidenceGraphRelationship => ({
    id: `${from}->${type}->${to}`,
    from,
    to,
    type,
    timestamp: input.createdAt,
    confidence: input.confidence,
    source,
    replayReference: input.replay.id,
  });
  const relationships = [
    ...input.evidenceRefs.map((id) => relationship(`evidence:${safeId(id)}`, workflowId, "supports", "trust_lifecycle")),
    relationship(workflowId, replayId, "generated", "trust_lifecycle"),
    relationship(governanceId, workflowId, "reviewed", "trust_lifecycle"),
    relationship(workflowId, memoryId, "generated", "trust_lifecycle"),
    relationship(memoryId, postureId, input.confidence >= input.trustMemory.confidence_before ? "supports" : "blocked", "trust_lifecycle"),
  ];

  return {
    nodes,
    relationships,
    generatedAt: input.createdAt,
    boundary: "Lifecycle graph writes connect existing evidence, replay, governance and Trust Memory references. They do not expose secrets or create a parallel system of record.",
    acceptanceCriteria: [
      "Every lifecycle phase retains evidence, replay, governance and Trust Memory linkage.",
      "Confidence changes remain explainable and bounded.",
      "Lifecycle graph writes use the canonical Evidence Graph schema.",
    ],
  };
}

export function phaseLabel(phase: TrustLifecyclePhase) {
  return phase.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

export function writeTrustLifecyclePhase(input: TrustLifecycleInput): TrustLifecycleWrite {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const action = input.action ?? "lifecycle_transition";
  const confidenceBefore = clamp(input.confidenceBefore);
  const confidenceAfter = clamp(confidenceBefore + confidenceEffects[action]);
  const posture = postureFor(action, input.currentPosture);
  const governanceState = governanceFor(action, input.governanceState);
  const evidenceRefs = unique(input.evidenceRefs);
  const lifecycleEventId = safeId(`lifecycle_${input.workflowId}_${input.phase}_${createdAt}`);
  const replayRef = safeId(`replay_${input.workflowId}_${input.phase}_${createdAt}`);
  const governanceRef = safeId(`governance_${input.workflowId}_${input.phase}_${createdAt}`);
  const evidenceExpected = Math.max(1, Math.floor(input.evidenceExpected ?? (evidenceRefs.length || 1)));
  const evidenceCompleteness = Math.min(100, Math.round((evidenceRefs.length / evidenceExpected) * 100));
  const outstandingActions = unique([
    ...(input.outstandingActions ?? []),
    ...(governanceState === "review_required" ? ["Assign accountable governance reviewer"] : []),
    ...(action === "step_up_verification" ? ["Complete step-up verification"] : []),
    ...(evidenceCompleteness < 100 ? ["Complete lifecycle evidence"] : []),
  ]);
  let profileStarted = profileClock();
  const replay: ReplaySession = {
    id: replayRef,
    subject_type: "trust_lifecycle",
    subject_id: input.subjectId,
    replay_summary: `${phaseLabel(input.phase)} recorded: ${input.reason}`,
    generated_by: "trust_lifecycle_engine",
    created_at: createdAt,
  };
  input.profile?.("replay", profileClock() - profileStarted);
  profileStarted = profileClock();
  const governanceEvent: LifecycleGovernanceEvent = {
    id: governanceRef,
    workflow_id: input.workflowId,
    phase: input.phase,
    action,
    state: governanceState,
    reason: input.reason,
    evidence_refs: evidenceRefs,
    replay_ref: replayRef,
    created_at: createdAt,
  };
  input.profile?.("governance", profileClock() - profileStarted);
  profileStarted = profileClock();
  const trustMemory = createTrustMemoryEvent({
    tenant_id: input.tenantId,
    actor_id: input.actorId,
    actor_type: input.actorType ?? "workflow",
    workflow_id: input.workflowId,
    event_kind: memoryKind[action],
    trust_state_before: input.currentPosture ?? "current",
    trust_state_after: posture,
    reason: input.reason,
    evidence_refs: evidenceRefs,
    replay_refs: [replayRef],
    governance_refs: [governanceRef],
    provider_refs: unique(input.providerRefs),
    reviewed_outcome_ref: null,
    confidence_before: confidenceBefore,
    confidence_after: confidenceAfter,
    created_at: createdAt,
  });
  input.profile?.("trust_memory", profileClock() - profileStarted);
  profileStarted = profileClock();
  const evidenceGraph = buildLifecycleEvidenceGraph({
    lifecycleEventId,
    workflowId: input.workflowId,
    phase: input.phase,
    template: input.template,
    posture,
    confidence: confidenceAfter,
    evidenceRefs,
    replay,
    governanceEvent,
    trustMemory,
    createdAt,
  });
  input.profile?.("evidence_graph", profileClock() - profileStarted);

  return {
    lifecycle_event_id: lifecycleEventId,
    workflow_id: input.workflowId,
    template: input.template,
    phase: input.phase,
    phase_index: TRUST_LIFECYCLE_PHASES.indexOf(input.phase),
    action,
    trust_posture: posture,
    confidence_before: confidenceBefore,
    confidence_after: confidenceAfter,
    outstanding_actions: outstandingActions,
    evidence_completeness: evidenceCompleteness,
    governance_state: governanceState,
    replay,
    evidence_graph: evidenceGraph,
    trust_memory: trustMemory,
    governance_event: governanceEvent,
    created_at: createdAt,
  };
}

export function buildLifecycleDashboard(writes: TrustLifecycleWrite[]): LifecycleDashboardSnapshot {
  const ordered = [...writes].sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at));
  const latest = ordered.at(-1);
  if (!latest) {
    return {
      currentStage: "application",
      currentTrustPosture: "not_started",
      outstandingActions: ["Begin lifecycle evidence collection"],
      evidenceCompleteness: 0,
      governanceState: "clear",
      confidenceTrend: [],
      template: "hiring",
      replayAvailable: false,
      trustMemorySummary: "No lifecycle events recorded.",
    };
  }

  return {
    currentStage: latest.phase,
    currentTrustPosture: latest.trust_posture,
    outstandingActions: latest.outstanding_actions,
    evidenceCompleteness: latest.evidence_completeness,
    governanceState: latest.governance_state,
    confidenceTrend: ordered.map((write) => ({
      at: write.created_at,
      confidence: write.confidence_after,
      change: write.action,
    })),
    template: latest.template,
    replayAvailable: ordered.every((write) => Boolean(write.replay.id)),
    trustMemorySummary: `${ordered.length} lifecycle event(s) retained from ${phaseLabel(ordered[0].phase)} through ${phaseLabel(latest.phase)}.`,
  };
}

export function projectOperationalStateToLifecycle(input: {
  activeTrustLevel: number | null;
  activeTrustLabel: string;
  evidenceCount: number;
  reviewCount: number;
  anomalyCount: number;
  contextChangeCount: number;
  latestEventAt?: string | null;
}): LifecycleDashboardSnapshot {
  const currentStage: TrustLifecyclePhase = input.anomalyCount
    ? "incident"
    : input.reviewCount
      ? "governance_review"
      : input.evidenceCount
        ? "runtime_trust"
        : "application";
  const governanceState: LifecycleGovernanceState = input.reviewCount
    ? "review_required"
    : input.contextChangeCount
      ? "monitoring"
      : "clear";
  const outstandingActions = unique([
    ...(input.reviewCount ? [`Resolve ${input.reviewCount} governance review(s)`] : []),
    ...(input.anomalyCount ? [`Assess ${input.anomalyCount} runtime anomaly event(s)`] : []),
    ...(input.evidenceCount < 6 ? ["Complete lifecycle evidence"] : []),
  ]);
  const confidence = clamp((input.activeTrustLevel ?? 0) / 100);

  return {
    currentStage,
    currentTrustPosture: input.activeTrustLabel,
    outstandingActions,
    evidenceCompleteness: Math.min(100, Math.round((input.evidenceCount / 6) * 100)),
    governanceState,
    confidenceTrend: input.activeTrustLevel === null
      ? []
      : [{
          at: input.latestEventAt ?? new Date().toISOString(),
          confidence,
          change: input.anomalyCount ? "runtime_anomaly" : input.contextChangeCount ? "policy_change" : "trust_gain",
        }],
    template: "hiring",
    replayAvailable: input.evidenceCount > 0,
    trustMemorySummary: input.evidenceCount
      ? `${input.evidenceCount} operational event(s) contribute to the current lifecycle posture.`
      : "No lifecycle evidence has been recorded yet.",
  };
}

export const demoContinuousTrustLifecycle = [
  writeTrustLifecyclePhase({
    workflowId: "demo-lifecycle-001",
    subjectId: "subject-demo-001",
    actorId: "workflow:demo-lifecycle-001",
    template: "ai_agent",
    phase: "identity_verification",
    action: "trust_gain",
    currentPosture: "pending",
    confidenceBefore: 0.56,
    reason: "Identity evidence and accountable ownership were confirmed.",
    evidenceRefs: ["evidence:identity", "evidence:owner"],
    evidenceExpected: 2,
    createdAt: "2026-07-12T08:00:00.000Z",
  }),
  writeTrustLifecyclePhase({
    workflowId: "demo-lifecycle-001",
    subjectId: "subject-demo-001",
    actorId: "ai-agent:demo-001",
    actorType: "ai_agent",
    template: "ai_agent",
    phase: "runtime_trust",
    action: "runtime_anomaly",
    currentPosture: "current",
    confidenceBefore: 0.78,
    reason: "Runtime scope changed beyond the recorded authorization boundary.",
    evidenceRefs: ["evidence:runtime-scope-change"],
    evidenceExpected: 2,
    createdAt: "2026-07-12T08:10:00.000Z",
  }),
] as const;

export const demoLifecycleDashboard = buildLifecycleDashboard([...demoContinuousTrustLifecycle]);
