import { normalizeEntityIdentity, type EntityIdentityInput } from "./entity-identity.ts";
import { evaluateAuthorizationGateway } from "./authorization-gateway.ts";
import { evaluateTrustEnforcement } from "./trust-enforcement.ts";
import {
  writeTrustLifecyclePhase,
  type ContinuousTrustChange,
  type TrustLifecyclePhase,
  type TrustLifecycleTemplate,
} from "./trust-lifecycle.ts";
import { runTrustAlgorithm, type TrustAlgorithmDecision } from "../trust/trust-algorithm.ts";
import { recordRuntimeProfile } from "../performance/runtime-profiler.ts";

export const LIFECYCLE_DECISIONS = [
  "allow",
  "deny",
  "step_up",
  "review",
  "escalate",
  "block",
  "insufficient_evidence",
] as const;

export type LifecycleDecision = (typeof LIFECYCLE_DECISIONS)[number];
export type LifecycleProviderState =
  | "Live"
  | "Test Mode"
  | "Simulated"
  | "Awaiting Credentials"
  | "Degraded"
  | "Timeout"
  | "Failed"
  | "Disabled"
  | "Unsupported";

export type LifecycleProviderSignal = {
  providerName: string;
  state: LifecycleProviderState;
  identityConfidence?: number | null;
  sessionIntegrity?: number | null;
  evidenceReferences?: string[];
  limitations?: string[];
  latencyMs?: number | null;
};

export type TrustLifecycleExecutionInput = {
  tenantId: string;
  entityId: string;
  entityType: EntityIdentityInput["type"];
  workflowId: string;
  lifecycleStage: TrustLifecyclePhase;
  lifecycleTemplate?: TrustLifecycleTemplate;
  requestedAction: string;
  authorityContext: {
    owner: string;
    humanAuthority: string;
    authenticated: boolean;
    requestedPurpose: string;
    allowedActions: string[];
    allowedPurposes: string[];
    humanApprovalPresent?: boolean;
    stepUpSatisfied?: boolean;
    delegationValid: boolean;
    nonce: string | null;
    seenNonces?: string[];
  };
  providerSignals: LifecycleProviderSignal[];
  runtimeContext: {
    sessionIntegrity?: number | null;
    anomalyRisk?: number | null;
    deviceChannelIntegrity?: number | null;
    provenanceConfidence?: number | null;
    previousTrustScore?: number | null;
    evidenceReferences?: string[];
    failureInjection?:
      | "provider_timeout"
      | "provider_conflict"
      | "duplicate_event"
      | "out_of_order_event"
      | "replay_write_failure"
      | "trust_memory_write_failure"
      | "governance_queue_delay"
      | "cache_miss";
  };
  policyContext: {
    policyVersion: string | null;
    requiredArguments?: string[];
    arguments?: Record<string, unknown>;
    governanceStatus?: string;
    minimumEvidence?: number;
    validationStatus?: "reviewed" | "incomplete" | "not_run";
  };
  correlationId: string;
  createdAt?: string;
};

export type TrustLifecycleExecutionOutput = {
  correlation_id: string;
  tenant_id: string;
  entity_id: string;
  workflow_id: string;
  lifecycle_stage: TrustLifecyclePhase;
  trust_posture: string;
  trust_decision: LifecycleDecision;
  confidence_band: "low" | "medium" | "high";
  evidence_references: string[];
  authority_result: ReturnType<typeof evaluateAuthorizationGateway>;
  enforcement_action: ReturnType<typeof evaluateTrustEnforcement>["decision"] | "BLOCK" | "REVIEW";
  execution_receipt_reference: string;
  replay_reference: string | null;
  evidence_graph_reference: string | null;
  trust_memory_reference: string | null;
  governance_status: string;
  limitations: string[];
  next_required_action: string;
  provider_reality: Array<{ provider: string; state: LifecycleProviderState; evidence: string[] }>;
  continuity: {
    valid: boolean;
    chain: string[];
    missing: string[];
    tenant_isolated: boolean;
  };
  performance: Record<string, number>;
  engine_trace: string[];
};

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function elapsed(start: number) {
  return Number((nowMs() - start).toFixed(3));
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function toLifecycleDecision(
  algorithm: TrustAlgorithmDecision,
  authority: ReturnType<typeof evaluateAuthorizationGateway>["decision"]
): LifecycleDecision {
  if (authority === "DENY") return "deny";
  if (authority === "STEP-UP REQUIRED") return "step_up";
  if (authority === "APPROVAL REQUIRED") return "review";
  return algorithm === "insufficient evidence" ? "insufficient_evidence" : algorithm;
}

function changeForDecision(decision: LifecycleDecision): ContinuousTrustChange {
  if (decision === "allow") return "trust_gain";
  if (decision === "step_up") return "step_up_verification";
  if (decision === "review" || decision === "escalate") return "manual_review";
  if (decision === "block" || decision === "deny") return "runtime_anomaly";
  return "trust_decay";
}

function nextAction(decision: LifecycleDecision) {
  const actions: Record<LifecycleDecision, string> = {
    allow: "Continue the governed workflow and retain the execution receipt.",
    deny: "Correct authority or policy scope before requesting the action again.",
    step_up: "Complete step-up verification before execution.",
    review: "Assign an accountable reviewer and preserve the evidence chain.",
    escalate: "Route the case to the high-risk governance queue.",
    block: "Keep the action blocked and investigate the retained evidence.",
    insufficient_evidence: "Collect the missing evidence before making an execution decision.",
  };
  return actions[decision];
}

function addContinuityNodes(
  graph: ReturnType<typeof writeTrustLifecyclePhase>["evidence_graph"],
  input: TrustLifecycleExecutionInput,
  decision: LifecycleDecision,
  receiptId: string
) {
  const tenant = { tenant_id: input.tenantId };
  const nodes = [
    ["human", `human:${input.authorityContext.humanAuthority}`, "Responsible Human"],
    ["organization", `organization:${input.authorityContext.owner}`, "Organization"],
    ["ai_agent", `ai_agent:${input.entityId}`, "AI Agent"],
    ["machine_identity", `machine_identity:${input.entityId}`, "Machine Identity"],
    ["credential", `credential:${input.correlationId}`, "Credential"],
    ["authorization", `authorization:grant:${input.correlationId}`, "Authority Grant"],
    ["authorization", `authorization:decision:${input.correlationId}`, "Authorization Decision"],
    ["execution", `execution:${receiptId}`, "Execution Receipt"],
  ] as const;
  for (const [type, id, label] of nodes) {
    if (!graph.nodes.some((node) => node.id === id)) {
      graph.nodes.push({ id, type, label, summary: `${label} linked by lifecycle orchestration.`, metadata: tenant });
    }
  }
  for (const node of graph.nodes) node.metadata = { ...node.metadata, ...tenant };
  const workflow = `workflow:${input.workflowId}`;
  const pairs: Array<[string, string, "owns" | "uses" | "authorizes" | "executes" | "generated"]> = [
    [`organization:${input.authorityContext.owner}`, `human:${input.authorityContext.humanAuthority}`, "owns"],
    [`human:${input.authorityContext.humanAuthority}`, `ai_agent:${input.entityId}`, "delegates" as "owns"],
    [`ai_agent:${input.entityId}`, `machine_identity:${input.entityId}`, "uses"],
    [`machine_identity:${input.entityId}`, `credential:${input.correlationId}`, "uses"],
    [`authorization:grant:${input.correlationId}`, workflow, "authorizes"],
    [workflow, `authorization:decision:${input.correlationId}`, "generated"],
    [`authorization:decision:${input.correlationId}`, `execution:${receiptId}`, "authorizes"],
    [`execution:${receiptId}`, workflow, "executes"],
  ];
  for (const [from, to, type] of pairs) {
    graph.relationships.push({
      id: `${from}->${type}->${to}`,
      from,
      to,
      type,
      timestamp: input.createdAt ?? new Date().toISOString(),
      confidence: decision === "allow" ? 0.8 : 0.55,
      source: "trust_lifecycle_orchestrator",
      replayReference: null,
    });
  }
}

export function executeTrustLifecycle(input: TrustLifecycleExecutionInput): TrustLifecycleExecutionOutput {
  const totalStart = nowMs();
  const timings: Record<string, number> = {};
  const providerStart = nowMs();
  const providerEvidence = input.providerSignals.flatMap((signal) => signal.evidenceReferences ?? []);
  const evidence = unique([...providerEvidence, ...(input.runtimeContext.evidenceReferences ?? [])]);
  const providerLimitations = input.providerSignals.flatMap((signal) => signal.limitations ?? []);
  const failures = input.runtimeContext.failureInjection;
  const providerTimeout = failures === "provider_timeout" || input.providerSignals.some((signal) => signal.state === "Timeout");
  const contributingProviderSignals = input.providerSignals.filter(
    (signal) => ["Live", "Test Mode", "Simulated", "Degraded"].includes(signal.state) && typeof signal.identityConfidence === "number"
  );
  const providerConfidence = contributingProviderSignals.length
    ? contributingProviderSignals.reduce((sum, signal) => sum + Number(signal.identityConfidence), 0) / contributingProviderSignals.length
    : null;
  const providerConfidenceValues = contributingProviderSignals.map((signal) => Number(signal.identityConfidence));
  const providerConflict = failures === "provider_conflict" || (
    providerConfidenceValues.length > 1 && Math.max(...providerConfidenceValues) - Math.min(...providerConfidenceValues) > 0.35
  );
  timings.provider = elapsed(providerStart);

  let started = nowMs();
  const entity = normalizeEntityIdentity({
    id: input.entityId,
    type: input.entityType,
    owner: input.authorityContext.owner,
    authority: input.authorityContext.humanAuthority,
    verification_status: evidence.length ? "partially_verified" : "awaiting_evidence",
    evidence_refs: evidence,
  });
  timings.entity_identity = elapsed(started);

  started = nowMs();
  const algorithm = runTrustAlgorithm({
    identityConfidence: providerConfidence,
    agentIdentity: input.entityType === "ai_agent" ? "verified" : "unknown",
    nhiOwnership: input.authorityContext.owner ? "known" : "orphaned",
    sessionIntegrity: input.runtimeContext.sessionIntegrity,
    deviceChannelIntegrity: input.runtimeContext.deviceChannelIntegrity,
    provenanceConfidence: input.runtimeContext.provenanceConfidence,
    intentRisk: input.authorityContext.allowedActions.includes(input.requestedAction) ? 18 : 88,
    runtimeBehavior: input.runtimeContext.anomalyRisk,
    providerSignals: providerConfidence,
    evidenceRefs: evidence,
    sourceLabels: input.providerSignals.some((signal) => signal.state === "Live") ? ["Provider API"] : ["Heuristic Baseline"],
  });
  timings.trust_engine = elapsed(started);

  started = nowMs();
  const authority = evaluateAuthorizationGateway({
    subjectId: entity.id,
    subjectType: input.entityType === "regulated_workflow" ? "workflow" : input.entityType,
    authenticated: input.authorityContext.authenticated,
    requestedAction: input.requestedAction,
    requestedPurpose: input.authorityContext.requestedPurpose,
    allowedActions: input.authorityContext.allowedActions,
    allowedPurposes: input.authorityContext.allowedPurposes,
    humanApprovalPresent: input.authorityContext.humanApprovalPresent,
    stepUpSatisfied: input.authorityContext.stepUpSatisfied,
    governanceStatus: input.policyContext.governanceStatus,
    runtimeLocation: "external_gateway",
  });
  timings.authorization = elapsed(started);
  let decision = toLifecycleDecision(algorithm.decision, authority.decision);
  if (providerTimeout && decision === "allow") decision = "review";
  if (providerConflict && ["allow", "step_up"].includes(decision)) decision = "review";
  if (evidence.length < (input.policyContext.minimumEvidence ?? 1)) decision = "insufficient_evidence";

  started = nowMs();
  const enforcement = evaluateTrustEnforcement({
    workflowId: input.workflowId,
    purpose: input.authorityContext.requestedPurpose,
    allowedPurposes: input.authorityContext.allowedPurposes,
    arguments: input.policyContext.arguments ?? { action: input.requestedAction, workflowId: input.workflowId },
    requiredArguments: input.policyContext.requiredArguments ?? ["action", "workflowId"],
    delegationValid: input.authorityContext.delegationValid,
    nonce: input.authorityContext.nonce,
    seenNonces: failures === "duplicate_event"
      ? [...(input.authorityContext.seenNonces ?? []), String(input.authorityContext.nonce)]
      : input.authorityContext.seenNonces,
    timestamp: failures === "out_of_order_event" ? "2000-01-01T00:00:00.000Z" : input.createdAt ?? new Date().toISOString(),
    authorization: authority,
    policyVersion: input.policyContext.policyVersion ?? undefined,
  });
  timings.enforcement = elapsed(started);
  if (enforcement.decision === "DENY" && decision === "allow") decision = "deny";

  started = nowMs();
  const lifecycle = writeTrustLifecyclePhase({
    tenantId: input.tenantId,
    workflowId: input.workflowId,
    subjectId: input.entityId,
    actorId: input.entityId,
    actorType: input.entityType === "regulated_workflow" ? "workflow" : input.entityType,
    template: input.lifecycleTemplate ?? "ai_agent",
    phase: input.lifecycleStage,
    action: changeForDecision(decision),
    currentPosture: algorithm.trust_level,
    confidenceBefore: (input.runtimeContext.previousTrustScore ?? algorithm.trust_score) / 100,
    reason: `${decision}: ${authority.reason}`,
    evidenceRefs: evidence,
    providerRefs: input.providerSignals.map((signal) => `${signal.providerName}:${signal.state}`),
    evidenceExpected: input.policyContext.minimumEvidence ?? 1,
    governanceState: ["review", "escalate", "block"].includes(decision) ? "review_required" : undefined,
    createdAt: input.createdAt,
    profile: (stage, latencyMs) => {
      timings[stage] = Number(latencyMs.toFixed(3));
    },
  });
  timings.lifecycle_write = elapsed(started);
  addContinuityNodes(lifecycle.evidence_graph, input, decision, enforcement.executionReceipt.receiptId);

  const replayFailed = failures === "replay_write_failure";
  const memoryFailed = failures === "trust_memory_write_failure";
  const graphTypes = new Set(lifecycle.evidence_graph.nodes.map((node) => node.type));
  const requiredTypes = ["human", "organization", "ai_agent", "machine_identity", "credential", "authorization", "execution", "evidence", "replay_event", "governance_review", "trust_memory_event", "trust_posture"];
  const missing = requiredTypes.filter((type) => !graphTypes.has(type as never));
  const tenantIsolated = lifecycle.evidence_graph.nodes.every((node) => node.metadata.tenant_id === input.tenantId);
  timings.total = elapsed(totalStart);

  for (const [stage, latencyMs] of Object.entries(timings)) {
    const stageMap: Record<string, Parameters<typeof recordRuntimeProfile>[0]["stage"]> = {
      trust_engine: "trust_latency",
      authorization: "authorization_latency",
      enforcement: "enforcement_latency",
      lifecycle_write: "lifecycle_orchestration_latency",
      provider: "provider_latency",
      replay: "replay_latency",
      governance: "governance_queue_latency",
      trust_memory: "trust_memory_latency",
      evidence_graph: "evidence_graph_latency",
      total: "workflow_latency",
    };
    if (stageMap[stage]) recordRuntimeProfile({ stage: stageMap[stage], latencyMs, ok: true, degraded: Boolean(failures), metadata: { correlationId: input.correlationId, label: stage } });
  }

  const limitations = unique([
    ...algorithm.limitations,
    ...authority.limitations,
    ...providerLimitations,
    ...(input.policyContext.validationStatus !== "reviewed" ? ["Calibration incomplete — insufficient reviewed ground truth."] : []),
    ...(providerTimeout ? ["Provider timeout: decision degraded to human review."] : []),
    ...(providerConflict ? ["Provider conflict: no provider result was treated as autonomous truth."] : []),
    ...(replayFailed ? ["Replay write failed in injected test mode; execution must not proceed."] : []),
    ...(memoryFailed ? ["Trust Memory write failed in injected test mode; evidence was retained for recovery."] : []),
    ...(failures === "governance_queue_delay" ? ["Governance queue delay injected; case remains pending without execution."] : []),
  ]);

  return {
    correlation_id: input.correlationId,
    tenant_id: input.tenantId,
    entity_id: input.entityId,
    workflow_id: input.workflowId,
    lifecycle_stage: input.lifecycleStage,
    trust_posture: lifecycle.trust_posture,
    trust_decision: replayFailed || memoryFailed ? "block" : decision,
    confidence_band: algorithm.confidence_band.toLowerCase() as "low" | "medium" | "high",
    evidence_references: evidence,
    authority_result: authority,
    enforcement_action: replayFailed || memoryFailed || decision === "block" ? "BLOCK" : ["review", "escalate"].includes(decision) ? "REVIEW" : enforcement.decision,
    execution_receipt_reference: enforcement.executionReceipt.receiptId,
    replay_reference: replayFailed ? null : lifecycle.replay.id,
    evidence_graph_reference: `evidence-graph:${lifecycle.lifecycle_event_id}`,
    trust_memory_reference: memoryFailed ? null : lifecycle.trust_memory.id,
    governance_status: failures === "governance_queue_delay" ? "delayed" : lifecycle.governance_state,
    limitations,
    next_required_action: replayFailed || memoryFailed ? "Retry the failed evidence write before execution." : nextAction(decision),
    provider_reality: input.providerSignals.map((signal) => ({ provider: signal.providerName, state: signal.state, evidence: signal.evidenceReferences ?? [] })),
    continuity: { valid: !missing.length && tenantIsolated && !replayFailed && !memoryFailed, chain: requiredTypes, missing, tenant_isolated: tenantIsolated },
    performance: timings,
    engine_trace: ["Entity Identity", "Trust Engine", "Runtime Context", "Authorization Gateway", "Enforcement Layer", "Replay Engine", "Governance Engine", "Evidence Graph", "Trust Memory™", "Validation Gate"],
  };
}

export function buildRegulatedAiAgentDemo(decisionPath: "allow" | "review" | "block" = "review") {
  const scenario = {
    allow: { action: "read_regulated_report", allowed: ["read_regulated_report"], anomaly: 0.05, approval: true, session: 0.94 },
    review: { action: "export_regulated_report", allowed: ["export_regulated_report"], anomaly: 0.48, approval: false, session: 0.65 },
    block: { action: "transfer_regulated_funds", allowed: ["read_regulated_report"], anomaly: 0.92, approval: false, session: 0.28 },
  }[decisionPath];
  return executeTrustLifecycle({
    tenantId: "demo-financial-enterprise",
    entityId: "agent-regulated-finance-01",
    entityType: "ai_agent",
    workflowId: `regulated-financial-${decisionPath}`,
    lifecycleStage: "runtime_trust",
    lifecycleTemplate: "financial_workflow",
    requestedAction: scenario.action,
    authorityContext: {
      owner: "Demo Financial Enterprise",
      humanAuthority: "Accountable Risk Officer",
      authenticated: true,
      requestedPurpose: "regulated_financial_review",
      allowedActions: scenario.allowed,
      allowedPurposes: ["regulated_financial_review"],
      humanApprovalPresent: scenario.approval,
      stepUpSatisfied: true,
      delegationValid: true,
      nonce: `demo-${decisionPath}-001`,
    },
    providerSignals: [
      { providerName: "Supabase Auth", state: "Test Mode", identityConfidence: 0.85, evidenceReferences: ["demo:supabase-session"], limitations: ["Local demo session; not a production health result."] },
      { providerName: "World ID", state: "Awaiting Credentials", evidenceReferences: [], limitations: ["No provider call made."] },
    ],
    runtimeContext: { sessionIntegrity: scenario.session, anomalyRisk: scenario.anomaly, deviceChannelIntegrity: 0.8, provenanceConfidence: 0.7, evidenceReferences: ["demo:agent-passport", "demo:machine-credential", "demo:authority-grant"] },
    policyContext: { policyVersion: "financial-workflow-demo-0.9.3", governanceStatus: decisionPath === "review" ? "review_required" : "clear", minimumEvidence: 3, validationStatus: "incomplete" },
    correlationId: `demo-financial-${decisionPath}`,
    createdAt: new Date().toISOString(),
  });
}
