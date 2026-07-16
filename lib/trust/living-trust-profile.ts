import { evaluateAuthorityGraph, type AuthorityGraphResult, type AuthorityGrant } from "../core/authority-graph.ts";
import { normalizeEntityIdentity, type EntityIdentity, type EntityIdentityType } from "../core/entity-identity.ts";
import { createLiveTrustSnapshot, type LiveTrustSnapshot } from "../core/live-trust-session.ts";
import type { ReviewedOutcomeRecord } from "../governance/reviewed-outcomes.ts";
import type { ProviderNeutralEvidence } from "../providers/hopae-rc1.ts";
import { createTrustMemoryEvent, type TrustMemoryEvent } from "../trust-memory/trust-memory.ts";

export const LIVING_TRUST_CONTEXT_BOUNDARY =
  "Valid for this organization, workflow, purpose and assessment time.";

export const TRUST_DNA_PRODUCT_BOUNDARY =
  "Trust DNA™ shows how operational trust has evolved within a defined enterprise context.";

export type LivingTrustEntityType = Extract<
  EntityIdentityType,
  "human" | "ai_agent" | "machine_identity" | "organization" | "workflow"
>;

export type RuntimeAuthorizationOutcome =
  | "allow"
  | "allow_with_constraints"
  | "step_up"
  | "require_approval"
  | "review"
  | "pause"
  | "terminate"
  | "block"
  | "insufficient_evidence";

export type AssuranceState =
  | "current"
  | "constrained"
  | "review_required"
  | "insufficient_evidence"
  | "expired"
  | "revoked"
  | "unavailable";

export type AssuranceDimensionName =
  | "identity_assurance"
  | "authority_assurance"
  | "credential_assurance"
  | "runtime_integrity"
  | "evidence_quality"
  | "behavioural_consistency"
  | "governance_status"
  | "decision_confidence";

export type AssuranceDimension = {
  name: AssuranceDimensionName;
  label: string;
  state: AssuranceState;
  reason: string;
  sourceEvidence: string[];
  lastChanged: string | null;
  expiry: string | null;
  limitation: string;
  reviewerStatus: "not_required" | "required" | "pending" | "completed" | "not_recorded";
};

export type LivingTrustProfileKey = {
  tenantId: string;
  entityId: string;
  entityType: LivingTrustEntityType;
  workflowId: string;
  purpose: string;
  requestedAction: string;
  policyVersion: string;
  assessedAt: string;
};

export type LivingTrustChange = {
  id: string;
  transition:
    | "established"
    | "strengthened"
    | "challenged"
    | "reduced"
    | "decayed"
    | "expired"
    | "suspended"
    | "revoked"
    | "recovered"
    | "restored"
    | "inconclusive";
  whatChanged: string;
  why: string;
  evidenceChanged: string[];
  policyApplied: string[];
  reviewedBy: string | null;
  authorityChanged: boolean;
  recommendedAction: string;
  changedAt: string;
};

export type LivingTrustProfile = {
  profileKey: LivingTrustProfileKey;
  entityId: string;
  tenantId: string;
  entityType: LivingTrustEntityType;
  purpose: string;
  workflowContext: {
    workflowId: string;
    requestedAction: string;
    policyVersion: string;
    assessedAt: string;
  };
  currentPosture: RuntimeAuthorizationOutcome;
  dimensionalAssurance: Record<AssuranceDimensionName, AssuranceDimension>;
  activeAuthority: {
    state: "active" | "constrained" | "expired" | "revoked" | "missing";
    reference: string | null;
    accountableHumanId: string | null;
    effectiveScope: string[];
    limitations: string[];
  };
  evidenceCompleteness: {
    state: "complete" | "partial" | "insufficient";
    present: number;
    expected: number;
    missing: string[];
  };
  confidenceBand: "low" | "medium" | "high";
  recentTrustChanges: LivingTrustChange[];
  unresolvedRisks: Array<{ id: string; reason: string; evidenceRefs: string[] }>;
  governanceState: "clear" | "review_required" | "in_review" | "escalated" | "blocked";
  expiryOrReassessmentDate: string | null;
  reasons: string[];
  limitations: string[];
  sourceReferences: string[];
  replayAvailable: boolean;
  recommendedAction: string;
  contextBoundary: typeof LIVING_TRUST_CONTEXT_BOUNDARY;
  productBoundary: typeof TRUST_DNA_PRODUCT_BOUNDARY;
  universalTransferable: false;
  calculatedPersistence: "derived_not_persisted";
};

export type LivingTrustProfileInput = {
  key: LivingTrustProfileKey;
  entity: EntityIdentity;
  authority: AuthorityGraphResult;
  credential?: {
    status: "current" | "rotation_due" | "expired" | "revoked" | "unknown";
    expiresAt?: string | null;
    evidenceRefs?: string[];
    reason?: string;
  };
  providerEvidence?: ProviderNeutralEvidence[];
  runtimeSnapshots?: LiveTrustSnapshot[];
  runtimeRisks?: Array<{
    id: string;
    severity: "low" | "medium" | "high" | "critical";
    reason: string;
    evidenceRefs?: string[];
    observedAt: string;
    resolved?: boolean;
  }>;
  evidenceRelationships?: Array<{ id: string; sourceReference?: string; targetReference?: string }>;
  replayReferences?: string[];
  trustMemoryEvents?: TrustMemoryEvent[];
  reviewedOutcomes?: ReviewedOutcomeRecord[];
  governanceActions?: Array<{
    id: string;
    status: "pending" | "in_review" | "escalated" | "approved" | "rejected" | "resolved";
    reason: string;
    reviewerId?: string | null;
    evidenceRefs?: string[];
  }>;
  minimumEvidence?: number;
  reassessmentAt?: string | null;
};

export type RuntimeActionContext = {
  requestedAction: string;
  tool: string;
  resource: string;
  workflowStage: string;
  delegationChainVersion: string;
  authorityExpiresAt?: string | null;
  authorityRevoked?: boolean;
  runtimeRisk: "low" | "medium" | "high" | "critical";
  providerEvidenceExpiresAt?: string | null;
  policyVersion: string;
  subAgentCreated?: boolean;
  transactionValue?: number | null;
  approvalThreshold?: number | null;
};

export type ContinuousAuthorizationResult = {
  evaluatedAt: string;
  reauthorizationRequired: boolean;
  triggers: string[];
  outcome: RuntimeAuthorizationOutcome;
  reason: string;
  constraints: string[];
  authorityReference: string | null;
  profileReference: LivingTrustProfileKey;
  enforcementPath: "existing_trust_enforcement";
  receiptRequired: true;
  replayRequired: true;
  trustMemoryRequired: true;
};

export type GovernedControlAction = {
  id: string;
  action:
    | "revoke_authority"
    | "pause_agent"
    | "terminate_session"
    | "disable_credential"
    | "quarantine_workflow"
    | "block_tool_invocation"
    | "require_human_takeover";
  actor: string;
  reason: string;
  scope: string[];
  timestamp: string;
  affectedEntity: string;
  affectedWorkflow: string;
  policy: string;
  evidence: string[];
  replayReference: string;
  trustMemoryUpdate: {
    eventKind: "authority_revoked" | "runtime_change" | "governance_decision";
    transition: "suspended" | "revoked" | "challenged";
  };
  recoveryRequirements: string[];
  executionState: "recorded" | "externally_confirmed";
  externalExecutionReceipt: string | null;
  limitation: string;
};

export type TrustMemoryRetentionPolicy = {
  tenantId: string;
  retentionDays: number;
  evidenceExpiryDays: number;
  subjectAccessRequestState: "none" | "requested" | "in_review" | "fulfilled";
  deletionRequestState: "none" | "requested" | "in_review" | "approved" | "denied" | "completed";
  legalHold: boolean;
  redactionRequired: boolean;
  providerReferenceDeletion: "not_requested" | "requested" | "confirmed" | "unavailable";
  approvedBy: string;
  policyVersion: string;
};

export type TrustMemoryTombstone = {
  id: string;
  tenantId: string;
  sourceEventReference: string;
  action: "redacted" | "deleted_after_retention" | "provider_reference_deleted";
  actor: string;
  reason: string;
  createdAt: string;
  legalHoldChecked: true;
  auditPreserved: true;
  rawValueRetained: false;
  recalculationRequired: true;
};

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function validDate(value?: string | null) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function latest(values: Array<string | null | undefined>) {
  return unique(values)
    .map(validDate)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
}

function earliestFuture(values: Array<string | null | undefined>, assessedAt: string) {
  const assessed = Date.parse(assessedAt);
  return unique(values)
    .map(validDate)
    .filter((value): value is string => typeof value === "string")
    .filter((value) => Date.parse(value) > assessed)
    .sort()
    .at(0) ?? null;
}

function dimension(input: AssuranceDimension): AssuranceDimension {
  return { ...input, sourceEvidence: unique(input.sourceEvidence) };
}

function transitionFor(event: TrustMemoryEvent): LivingTrustChange["transition"] {
  if (event.event_kind === "authority_delegated") return "established";
  if (event.event_kind === "authority_revoked" || event.evolution_state === "revoked") return "revoked";
  if (event.evolution_state === "expired") return "expired";
  if (event.evolution_state === "decayed") return "decayed";
  if (event.evolution_state === "recovered") return "recovered";
  if (event.evolution_state === "restored") return "restored";
  if (event.evolution_state === "reduced") return "reduced";
  if (event.evolution_state === "challenged") return "challenged";
  if (event.evolution_state === "gained") return "strengthened";
  return "inconclusive";
}

function recommendedForTransition(transition: LivingTrustChange["transition"]) {
  if (["revoked", "suspended", "expired"].includes(transition)) return "Keep execution blocked until authority is restored through governance.";
  if (["challenged", "reduced", "decayed", "inconclusive"].includes(transition)) return "Review current evidence and reassess before the next critical action.";
  return "Continue within the recorded workflow, purpose and policy constraints.";
}

function memoryChanges(events: TrustMemoryEvent[], key: LivingTrustProfileKey) {
  return events
    .filter((event) => event.tenant_id === key.tenantId && event.actor_id === key.entityId && event.workflow_id === key.workflowId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, 8)
    .map((event): LivingTrustChange => {
      const transition = transitionFor(event);
      return {
        id: event.id,
        transition,
        whatChanged: `${event.trust_state_before} → ${event.trust_state_after}`,
        why: event.reason,
        evidenceChanged: unique([...event.evidence_refs, ...event.provider_refs]),
        policyApplied: event.policy_refs,
        reviewedBy: event.reviewed_outcome_ref,
        authorityChanged: ["authority_delegated", "authority_revoked"].includes(event.event_kind),
        recommendedAction: recommendedForTransition(transition),
        changedAt: event.created_at,
      };
    });
}

export function livingTrustProfileReference(key: LivingTrustProfileKey) {
  return [key.tenantId, key.entityId, key.workflowId, key.purpose, key.requestedAction, key.policyVersion, key.assessedAt].join("::");
}

export function providerEvidenceFromRecords(rows: Array<Record<string, unknown>>, tenantId: string, workflowId: string) {
  return rows.flatMap((row) => {
    const evidence = row.normalized_evidence;
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return [];
    const candidate = evidence as Record<string, unknown>;
    if (candidate.schemaVersion !== 1 || candidate.tenantId !== tenantId || candidate.workflowId !== workflowId) return [];
    if (candidate.providerId !== "hopae_connect" || candidate.retentionStatus !== "normalized_only") return [];
    return [candidate as ProviderNeutralEvidence];
  });
}

export function trustMemoryEventsFromTimelineRecords(rows: Array<Record<string, unknown>>, tenantId: string, workflowId: string, entityId: string) {
  return rows.flatMap((row) => {
    if (row.event_type !== "trust_memory_event" || row.workspace_id !== tenantId) return [];
    const metadata = row.metadata;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
    const candidate = metadata as Record<string, unknown>;
    if (candidate.workflow_id !== workflowId || candidate.actor_id !== entityId || typeof candidate.id !== "string") return [];
    if (!Array.isArray(candidate.evidence_refs) || !Array.isArray(candidate.replay_refs)) return [];
    return [{ ...candidate, tenant_id: tenantId, created_at: String(row.created_at ?? candidate.created_at ?? "") } as TrustMemoryEvent];
  });
}

export function deriveLivingTrustProfile(input: LivingTrustProfileInput): LivingTrustProfile {
  const { key } = input;
  if (input.entity.tenant_id !== key.tenantId || input.entity.id !== key.entityId || input.entity.type !== key.entityType) {
    throw new Error("Living Trust Profile context does not match the tenant-scoped entity.");
  }
  const providerEvidence = (input.providerEvidence ?? []).filter((item) => item.tenantId === key.tenantId && item.workflowId === key.workflowId);
  const memory = (input.trustMemoryEvents ?? []).filter((event) => event.tenant_id === key.tenantId && event.workflow_id === key.workflowId);
  const replayReferences = unique([...(input.replayReferences ?? []), ...memory.flatMap((event) => event.replay_refs)]);
  const governance = input.governanceActions ?? [];
  const openGovernance = governance.filter((item) => ["pending", "in_review", "escalated"].includes(item.status));
  const runtimeRisks = (input.runtimeRisks ?? []).filter((risk) => !risk.resolved);
  const providerExpired = providerEvidence.some((item) => item.evidenceStatus === "expired" || item.freshness.status === "stale");
  const providerConflict = providerEvidence.some((item) => item.reasonCodes.some((code) => code.includes("conflict")));
  const credentialExpired = ["expired", "revoked"].includes(input.credential?.status ?? "unknown");
  const authorityExpired = input.authority.checks.some((check) => check.name === "active grants" && !check.passed);
  const authorityState: LivingTrustProfile["activeAuthority"]["state"] = input.authority.valid
    ? input.authority.limitations.length ? "constrained" : "active"
    : input.authority.checks.some((check) => /revok/i.test(check.detail)) ? "revoked"
      : authorityExpired ? "expired" : "missing";

  const identityRefs = unique(input.entity.evidence_refs);
  const authorityRefs = unique([input.authority.authorityReference, ...input.authority.evidenceRefs]);
  const credentialRefs = unique(input.credential?.evidenceRefs ?? []);
  const providerRefs = unique(providerEvidence.map((item) => item.providerReference));
  const runtimeRefs = unique((input.runtimeSnapshots ?? []).flatMap((item) => [item.id, item.replayReference, ...item.providerEvidence]));
  const graphRefs = unique((input.evidenceRelationships ?? []).flatMap((item) => [item.id, item.sourceReference, item.targetReference]));
  const reviewRefs = unique((input.reviewedOutcomes ?? []).map((item) => item.caseId));
  const governanceRefs = unique(governance.map((item) => item.id));
  const allReferences = unique([...identityRefs, ...authorityRefs, ...credentialRefs, ...providerRefs, ...runtimeRefs, ...graphRefs, ...replayReferences, ...memory.map((event) => event.id), ...reviewRefs, ...governanceRefs, `policy:${key.policyVersion}`]);
  const expectedEvidence = Math.max(1, Math.min(20, input.minimumEvidence ?? 5));
  const evidencePresent = new Set([
    identityRefs.length ? "identity" : null,
    authorityRefs.length ? "authority" : null,
    credentialRefs.length ? "credential" : null,
    providerRefs.length ? "provider" : null,
    runtimeRefs.length ? "runtime" : null,
    graphRefs.length ? "evidence_graph" : null,
    replayReferences.length ? "replay" : null,
    memory.length ? "trust_memory" : null,
    reviewRefs.length ? "reviewed_outcome" : null,
    governanceRefs.length ? "governance" : null,
  ].filter((item): item is string => Boolean(item)));
  const expectedCategories = ["identity", "authority", "credential", "provider", "runtime", "evidence_graph", "replay", "trust_memory", "governance"];
  const missing = expectedCategories.filter((item) => !evidencePresent.has(item));
  const enoughEvidence = evidencePresent.size >= expectedEvidence;

  const criticalRisk = runtimeRisks.some((risk) => risk.severity === "critical");
  const highRisk = runtimeRisks.some((risk) => ["high", "critical"].includes(risk.severity));
  const governanceState: LivingTrustProfile["governanceState"] = governance.some((item) => item.status === "rejected")
    ? "blocked"
    : governance.some((item) => item.status === "escalated") ? "escalated"
      : governance.some((item) => item.status === "in_review") ? "in_review"
        : openGovernance.length ? "review_required" : "clear";

  let posture: RuntimeAuthorizationOutcome = "allow_with_constraints";
  if (!input.authority.valid || credentialExpired || governanceState === "blocked") posture = "block";
  else if (criticalRisk) posture = "pause";
  else if (!enoughEvidence) posture = "insufficient_evidence";
  else if (providerExpired) posture = "step_up";
  else if (providerConflict || highRisk || ["in_review", "escalated"].includes(governanceState)) posture = "review";
  else if (openGovernance.length) posture = "require_approval";

  const reviewed = (input.reviewedOutcomes ?? []).length > 0;
  const latestMemoryChange = latest(memory.map((event) => event.created_at));
  const latestProviderChange = latest(providerEvidence.map((item) => item.receivedTimestamp));
  const latestRuntimeChange = latest((input.runtimeSnapshots ?? []).map((item) => item.capturedAt));
  const dimensions: Record<AssuranceDimensionName, AssuranceDimension> = {
    identity_assurance: dimension({ name: "identity_assurance", label: "Identity assurance", state: input.entity.verification_status === "verified" ? "current" : input.entity.verification_status === "blocked" ? "revoked" : "review_required", reason: `Entity verification is ${input.entity.verification_status.replaceAll("_", " ")}.`, sourceEvidence: identityRefs, lastChanged: input.entity.lifecycle.updated_at, expiry: input.entity.lifecycle.expires_at, limitation: "Identity evidence does not itself grant authority.", reviewerStatus: reviewed ? "completed" : "not_recorded" }),
    authority_assurance: dimension({ name: "authority_assurance", label: "Authority assurance", state: input.authority.valid ? "constrained" : authorityState === "revoked" ? "revoked" : authorityState === "expired" ? "expired" : "insufficient_evidence", reason: input.authority.reason, sourceEvidence: authorityRefs, lastChanged: latestMemoryChange, expiry: earliestFuture(input.authority.chain.map((grant) => grant.expiresAt), key.assessedAt), limitation: "Authority is limited to this tenant, workflow, action, purpose, resource and assessment time.", reviewerStatus: input.authority.accountableHumanId ? "completed" : "required" }),
    credential_assurance: dimension({ name: "credential_assurance", label: "Credential assurance", state: input.credential?.status === "current" ? "current" : input.credential?.status === "rotation_due" ? "review_required" : credentialExpired ? input.credential?.status === "revoked" ? "revoked" : "expired" : "insufficient_evidence", reason: input.credential?.reason ?? `Credential status is ${input.credential?.status ?? "unknown"}.`, sourceEvidence: credentialRefs, lastChanged: null, expiry: validDate(input.credential?.expiresAt), limitation: "Missing credential evidence remains unknown; it is never inferred as current.", reviewerStatus: "not_recorded" }),
    runtime_integrity: dimension({ name: "runtime_integrity", label: "Runtime integrity", state: criticalRisk ? "revoked" : highRisk ? "review_required" : runtimeRefs.length ? "current" : "insufficient_evidence", reason: runtimeRisks.length ? `${runtimeRisks.length} unresolved runtime risk(s) are recorded.` : runtimeRefs.length ? "Recorded runtime snapshots show no unresolved risk." : "No runtime snapshot is available.", sourceEvidence: runtimeRefs, lastChanged: latestRuntimeChange, expiry: null, limitation: "Runtime state is valid only for the recorded session and observation window.", reviewerStatus: highRisk ? "required" : "not_required" }),
    evidence_quality: dimension({ name: "evidence_quality", label: "Evidence quality", state: providerConflict ? "review_required" : providerExpired ? "expired" : enoughEvidence ? "current" : "insufficient_evidence", reason: `${evidencePresent.size} observed evidence categories are present; ${expectedEvidence} are required by this profile context.`, sourceEvidence: unique([...providerRefs, ...graphRefs]), lastChanged: latestProviderChange, expiry: input.reassessmentAt ?? null, limitation: "Completeness counts observed source categories, not truth or accuracy; an expiry is shown only when policy records one.", reviewerStatus: providerConflict ? "required" : "not_recorded" }),
    behavioural_consistency: dimension({ name: "behavioural_consistency", label: "Behavioural consistency", state: criticalRisk ? "revoked" : highRisk ? "review_required" : runtimeRefs.length ? "current" : "unavailable", reason: runtimeRisks.length ? runtimeRisks.map((risk) => risk.reason).join("; ") : "No unresolved observed runtime behaviour risk is recorded.", sourceEvidence: unique(runtimeRisks.flatMap((risk) => [risk.id, ...(risk.evidenceRefs ?? [])])), lastChanged: latest(runtimeRisks.map((risk) => risk.observedAt)), expiry: null, limitation: "Observed behaviour is contextual evidence, not a fraud label or prediction.", reviewerStatus: highRisk ? "required" : "not_recorded" }),
    governance_status: dimension({ name: "governance_status", label: "Governance status", state: governanceState === "clear" ? "current" : governanceState === "blocked" ? "revoked" : "review_required", reason: openGovernance.length ? `${openGovernance.length} governance action(s) remain unresolved.` : "No unresolved governance action is recorded for this context.", sourceEvidence: governanceRefs, lastChanged: latestMemoryChange, expiry: null, limitation: "Human review remains authoritative for approval, override, revocation and restoration.", reviewerStatus: openGovernance.length ? "pending" : reviewed ? "completed" : "not_required" }),
    decision_confidence: dimension({ name: "decision_confidence", label: "Decision confidence", state: posture === "allow_with_constraints" ? "constrained" : ["block", "terminate"].includes(posture) ? "revoked" : posture === "insufficient_evidence" ? "insufficient_evidence" : "review_required", reason: `The contextual runtime outcome is ${posture.replaceAll("_", " ")}.`, sourceEvidence: allReferences, lastChanged: key.assessedAt, expiry: input.reassessmentAt ?? null, limitation: "This is a bounded confidence band for one decision context, never a universal person or entity rating.", reviewerStatus: ["review", "require_approval", "pause"].includes(posture) ? "required" : "not_required" }),
  };

  const unresolvedRisks = [
    ...runtimeRisks.map((risk) => ({ id: risk.id, reason: risk.reason, evidenceRefs: unique(risk.evidenceRefs ?? []) })),
    ...openGovernance.map((item) => ({ id: item.id, reason: item.reason, evidenceRefs: unique(item.evidenceRefs ?? []) })),
    ...(providerConflict ? [{ id: "provider-conflict", reason: "Provider evidence conflict remains unresolved.", evidenceRefs: providerRefs }] : []),
    ...(providerExpired ? [{ id: "provider-expired", reason: "Provider evidence is stale or expired.", evidenceRefs: providerRefs }] : []),
  ];
  const confidenceBand: LivingTrustProfile["confidenceBand"] = posture === "allow_with_constraints" && enoughEvidence && !unresolvedRisks.length
    ? "high" : ["block", "terminate", "insufficient_evidence"].includes(posture) ? "low" : "medium";
  const reasons = unique([
    input.authority.reason,
    dimensions.evidence_quality.reason,
    dimensions.runtime_integrity.reason,
    dimensions.governance_status.reason,
  ]);
  const limitations = unique([
    ...Object.values(dimensions).map((item) => item.limitation),
    ...providerEvidence.flatMap((item) => item.limitations),
    TRUST_DNA_PRODUCT_BOUNDARY,
    LIVING_TRUST_CONTEXT_BOUNDARY,
  ]);

  return {
    profileKey: key,
    entityId: key.entityId,
    tenantId: key.tenantId,
    entityType: key.entityType,
    purpose: key.purpose,
    workflowContext: { workflowId: key.workflowId, requestedAction: key.requestedAction, policyVersion: key.policyVersion, assessedAt: key.assessedAt },
    currentPosture: posture,
    dimensionalAssurance: dimensions,
    activeAuthority: { state: authorityState, reference: input.authority.authorityReference, accountableHumanId: input.authority.accountableHumanId, effectiveScope: input.authority.effectiveScope, limitations: input.authority.limitations },
    evidenceCompleteness: { state: enoughEvidence ? missing.length ? "partial" : "complete" : "insufficient", present: evidencePresent.size, expected: expectedEvidence, missing },
    confidenceBand,
    recentTrustChanges: memoryChanges(memory, key),
    unresolvedRisks,
    governanceState,
    expiryOrReassessmentDate: input.reassessmentAt ?? earliestFuture([input.entity.lifecycle.expires_at, input.credential?.expiresAt, ...input.authority.chain.map((grant) => grant.expiresAt)], key.assessedAt),
    reasons,
    limitations,
    sourceReferences: allReferences,
    replayAvailable: replayReferences.length > 0,
    recommendedAction: posture === "allow_with_constraints" ? "Proceed only within the recorded authority and policy constraints." : posture === "block" ? "Do not execute; resolve authority, credential or governance failure." : posture === "pause" ? "Pause execution and require accountable human review." : "Reassess current evidence and authorization before execution.",
    contextBoundary: LIVING_TRUST_CONTEXT_BOUNDARY,
    productBoundary: TRUST_DNA_PRODUCT_BOUNDARY,
    universalTransferable: false,
    calculatedPersistence: "derived_not_persisted",
  };
}

export function evaluateContinuousAuthorization(input: {
  previous?: RuntimeActionContext | null;
  current: RuntimeActionContext;
  profile: LivingTrustProfile;
  authority: AuthorityGraphResult;
  evaluatedAt?: string;
}): ContinuousAuthorizationResult {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const previous = input.previous;
  const current = input.current;
  const triggers = unique([
    !previous ? "initial_authorization" : null,
    previous && previous.requestedAction !== current.requestedAction ? "requested_action_changed" : null,
    previous && previous.tool !== current.tool ? "tool_changed" : null,
    previous && previous.resource !== current.resource ? "resource_changed" : null,
    previous && previous.workflowStage !== current.workflowStage ? "workflow_stage_changed" : null,
    previous && previous.delegationChainVersion !== current.delegationChainVersion ? "delegation_chain_changed" : null,
    current.authorityRevoked ? "authority_revoked" : null,
    current.authorityExpiresAt && Date.parse(current.authorityExpiresAt) <= Date.parse(evaluatedAt) ? "authority_expired" : null,
    previous && previous.runtimeRisk !== current.runtimeRisk ? "runtime_risk_changed" : null,
    current.providerEvidenceExpiresAt && Date.parse(current.providerEvidenceExpiresAt) <= Date.parse(evaluatedAt) ? "provider_evidence_expired" : null,
    previous && previous.policyVersion !== current.policyVersion ? "policy_changed" : null,
    current.subAgentCreated ? "sub_agent_created" : null,
    current.transactionValue != null && current.approvalThreshold != null && current.transactionValue >= current.approvalThreshold ? "transaction_threshold_crossed" : null,
  ]);
  let outcome: RuntimeAuthorizationOutcome = input.profile.currentPosture;
  if (!input.authority.valid || current.authorityRevoked || triggers.includes("authority_expired")) outcome = "block";
  else if (current.runtimeRisk === "critical") outcome = "pause";
  else if (triggers.includes("provider_evidence_expired")) outcome = "step_up";
  else if (triggers.includes("transaction_threshold_crossed")) outcome = "require_approval";
  else if (current.runtimeRisk === "high") outcome = "review";
  else if (["allow", "allow_with_constraints"].includes(outcome) && triggers.some((trigger) => trigger !== "initial_authorization")) outcome = "allow_with_constraints";
  const constraints = unique([
    ...input.authority.limitations,
    ...input.authority.effectiveScope.map((scope) => `scope:${scope}`),
    `tool:${current.tool}`,
    `resource:${current.resource}`,
    `workflow_stage:${current.workflowStage}`,
  ]);
  return {
    evaluatedAt,
    reauthorizationRequired: triggers.length > 0,
    triggers,
    outcome,
    reason: triggers.length ? `Authorization was re-evaluated because ${triggers.join(", ").replaceAll("_", " ")}.` : "No material context change was observed; the current bounded authorization result remains in force.",
    constraints,
    authorityReference: input.authority.authorityReference,
    profileReference: input.profile.profileKey,
    enforcementPath: "existing_trust_enforcement",
    receiptRequired: true,
    replayRequired: true,
    trustMemoryRequired: true,
  };
}

export function createGovernedControlAction(input: Omit<GovernedControlAction, "id" | "timestamp" | "executionState" | "trustMemoryUpdate" | "limitation"> & { id?: string; timestamp?: string }): GovernedControlAction {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const transition = input.action === "revoke_authority" || input.action === "disable_credential" ? "revoked" : input.action === "pause_agent" || input.action === "terminate_session" || input.action === "quarantine_workflow" ? "suspended" : "challenged";
  return {
    ...input,
    id: input.id ?? `control_${input.action}_${input.affectedEntity}_${timestamp}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
    timestamp,
    scope: unique(input.scope),
    evidence: unique(input.evidence),
    recoveryRequirements: unique(input.recoveryRequirements),
    trustMemoryUpdate: { eventKind: input.action === "revoke_authority" ? "authority_revoked" : input.action === "require_human_takeover" ? "governance_decision" : "runtime_change", transition },
    executionState: input.externalExecutionReceipt ? "externally_confirmed" : "recorded",
    limitation: input.externalExecutionReceipt
      ? "The external control outcome is supported by the referenced integration receipt."
      : "The governed control is recorded and must fail closed, but external runtime interruption is not claimed without an integration receipt.",
  };
}

export function createTrustMemoryTombstone(input: {
  policy: TrustMemoryRetentionPolicy;
  sourceEventReference: string;
  action: TrustMemoryTombstone["action"];
  actor: string;
  reason: string;
  createdAt?: string;
}): TrustMemoryTombstone {
  if (input.policy.legalHold) throw new Error("Trust Memory deletion or redaction is blocked by legal hold.");
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    id: `tombstone_${input.policy.tenantId}_${input.sourceEventReference}_${createdAt}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
    tenantId: input.policy.tenantId,
    sourceEventReference: input.sourceEventReference,
    action: input.action,
    actor: input.actor,
    reason: input.reason,
    createdAt,
    legalHoldChecked: true,
    auditPreserved: true,
    rawValueRetained: false,
    recalculationRequired: true,
  };
}

export function createTrustMemoryTombstoneEvent(input: {
  tombstone: TrustMemoryTombstone;
  workflowId: string;
  actorId: string;
  actorType: "human" | "ai_agent" | "machine_identity" | "workflow";
  currentState: string;
}) {
  return createTrustMemoryEvent({
    id: `memory:${input.tombstone.id}`,
    tenant_id: input.tombstone.tenantId,
    actor_id: input.actorId,
    actor_type: input.actorType,
    workflow_id: input.workflowId,
    event_kind: "retention_tombstone",
    trust_state_before: input.currentState,
    trust_state_after: input.currentState,
    reason: `Governed retention action ${input.tombstone.action}: ${input.tombstone.reason}`,
    evidence_refs: [input.tombstone.id, input.tombstone.sourceEventReference],
    replay_refs: [],
    governance_refs: [],
    provider_refs: [],
    policy_refs: [],
    authority_refs: [],
    reviewed_outcome_ref: null,
    confidence_before: 0,
    confidence_after: 0,
    created_at: input.tombstone.createdAt,
  });
}

export function queryLivingTrustProfiles(profiles: LivingTrustProfile[]) {
  const observed = [...profiles];
  return {
    agentsWithAuthorityRisks: () => observed.filter((profile) => profile.entityType === "ai_agent" && profile.activeAuthority.state !== "active"),
    machineCredentialsExpiringBefore: (date: string) => observed.filter((profile) => profile.entityType === "machine_identity" && profile.expiryOrReassessmentDate && Date.parse(profile.expiryOrReassessmentDate) <= Date.parse(date)),
    workflowsWithTrustDegradation: () => observed.filter((profile) => profile.recentTrustChanges.some((change) => ["challenged", "reduced", "decayed", "suspended", "revoked"].includes(change.transition))),
    revokedDelegations: () => observed.filter((profile) => profile.activeAuthority.state === "revoked"),
    profilesRequiringReassessmentBefore: (date: string) => observed.filter((profile) => profile.expiryOrReassessmentDate && Date.parse(profile.expiryOrReassessmentDate) <= Date.parse(date)),
    unresolvedProviderConflicts: () => observed.filter((profile) => profile.unresolvedRisks.some((risk) => risk.id === "provider-conflict")),
    entitiesWithIncompleteEvidence: () => observed.filter((profile) => profile.evidenceCompleteness.state !== "complete"),
    boundary: "Observed evidence only. These helpers do not forecast future trust or risk.",
  };
}

export function mapProfileToComplianceEvidence(profile: LivingTrustProfile, reviewDate: string) {
  const mappings = [
    ["EU AI Act", ["authority", "decision", "governance", "replay"]],
    ["NIST AI RMF", ["identity", "runtime", "evidence", "governance"]],
    ["ISO/IEC 42001", ["policy", "governance", "reviewed_outcome", "replay"]],
    ["ISO 27001", ["identity", "credential", "authority", "audit"]],
    ["DORA", ["runtime", "provider", "replay", "recovery"]],
    ["GDPR", ["purpose", "retention", "redaction", "access_request"]],
    ["Customer policies", ["policy", "authority", "decision", "receipt"]],
  ] as const;
  return mappings.map(([framework, categories]) => {
    const supportingEvidence = profile.sourceReferences.filter((reference) => categories.some((category) => reference.toLowerCase().includes(category)));
    return {
      framework,
      supportingEvidence,
      missingEvidence: categories.filter((category) => !supportingEvidence.some((reference) => reference.toLowerCase().includes(category))),
      responsibleOwner: profile.activeAuthority.accountableHumanId ?? "Owner not recorded",
      reviewDate,
      limitation: "Operational evidence mapping only; Cyber Sentinels does not claim certification or legal compliance.",
    };
  });
}

export function buildRc2LivingTrustDemo() {
  const assessedAt = "2026-07-16T12:00:00.000Z";
  const tenantId = "tenant:rc2-demo";
  const workflowId = "workflow:regulated-payment";
  const entityId = "agent:treasury-review";
  const grants: AuthorityGrant[] = [
    {
      id: "authority:organization-human",
      tenantId,
      grantorId: "organization:rc2-demo",
      grantorType: "organization",
      granteeId: "human:finance-owner",
      granteeType: "human",
      scope: ["prepare_payment", "approve_payment"],
      purpose: "regulated_payment_review",
      permittedActions: ["prepare_payment", "approve_payment"],
      prohibitedActions: ["change_beneficiary", "export_credentials"],
      resourceScope: ["invoice:approved-vendors"],
      approvalRequirements: ["finance_owner"],
      policyVersion: "payment-policy:2.1",
      evidenceReference: "evidence:board-mandate",
      constraints: { workflowIds: [workflowId], actions: ["prepare_payment", "approve_payment"], purposes: ["regulated_payment_review"], prohibitedActions: ["change_beneficiary", "export_credentials"], resourceScope: ["invoice:approved-vendors"], approvalRequirements: ["finance_owner"] },
      maxDelegationDepth: 1,
      issuedAt: "2026-07-16T08:00:00.000Z",
      expiresAt: "2026-07-17T08:00:00.000Z",
      evidenceRefs: ["evidence:board-mandate"],
    },
    {
      id: "authority:human-agent",
      tenantId,
      grantorId: "human:finance-owner",
      grantorType: "human",
      granteeId: entityId,
      granteeType: "ai_agent",
      scope: ["prepare_payment", "approve_payment"],
      purpose: "regulated_payment_review",
      permittedActions: ["prepare_payment", "approve_payment"],
      prohibitedActions: ["change_beneficiary", "export_credentials"],
      resourceScope: ["invoice:approved-vendors"],
      approvalRequirements: ["finance_owner"],
      policyVersion: "payment-policy:2.1",
      evidenceReference: "evidence:delegation-receipt",
      constraints: { workflowIds: [workflowId], actions: ["prepare_payment", "approve_payment"], purposes: ["regulated_payment_review"], prohibitedActions: ["change_beneficiary", "export_credentials"], resourceScope: ["invoice:approved-vendors"], approvalRequirements: ["finance_owner"] },
      parentGrantId: "authority:organization-human",
      maxDelegationDepth: 0,
      issuedAt: "2026-07-16T08:05:00.000Z",
      expiresAt: "2026-07-16T18:00:00.000Z",
      evidenceRefs: ["evidence:delegation-receipt"],
    },
  ];
  const authority = evaluateAuthorityGraph({ tenantId, subjectId: entityId, workflowId, action: "approve_payment", purpose: "regulated_payment_review", resource: "invoice:approved-vendors", approvals: ["finance_owner"], policyVersion: "payment-policy:2.1", grants, evaluatedAt: assessedAt });
  const memory = [
    createTrustMemoryEvent({ id: "memory:authority-established", tenant_id: tenantId, actor_id: entityId, actor_type: "ai_agent", workflow_id: workflowId, event_kind: "authority_delegated", trust_state_before: "insufficient_evidence", trust_state_after: "established", reason: "A finance owner delegated constrained payment-review authority.", evidence_refs: ["evidence:delegation-receipt"], replay_refs: ["replay:rc2-payment"], governance_refs: [], provider_refs: [], policy_refs: ["payment-policy:2.1"], authority_refs: ["authority:human-agent"], reviewed_outcome_ref: null, confidence_before: 0.4, confidence_after: 0.7, created_at: "2026-07-16T08:05:00.000Z" }),
    createTrustMemoryEvent({ id: "memory:runtime-challenged", tenant_id: tenantId, actor_id: entityId, actor_type: "ai_agent", workflow_id: workflowId, event_kind: "runtime_change", trust_state_before: "established", trust_state_after: "review_required", reason: "Transaction value crossed the policy threshold and changed the runtime authorization context.", evidence_refs: ["evidence:transaction-threshold"], replay_refs: ["replay:rc2-payment"], governance_refs: ["governance:approval-required"], provider_refs: ["hopae:test-evidence"], policy_refs: ["payment-policy:2.1"], authority_refs: ["authority:human-agent"], reviewed_outcome_ref: null, confidence_before: 0.7, confidence_after: 0.62, created_at: "2026-07-16T12:00:00.000Z" }),
  ];
  const profile = deriveLivingTrustProfile({
    key: { tenantId, entityId, entityType: "ai_agent", workflowId, purpose: "regulated_payment_review", requestedAction: "approve_payment", policyVersion: "payment-policy:2.1", assessedAt },
    entity: normalizeEntityIdentity({ id: entityId, type: "ai_agent", tenant_id: tenantId, owner: "RC2 Demo Enterprise", authority: "human:finance-owner", verification_status: "verified", trust_posture: "review", governance_status: "review_required", evidence_refs: ["evidence:agent-registry", "evidence:owner-attestation"], replay_refs: ["replay:rc2-payment"], lifecycle: { state: "active", created_at: "2026-07-16T08:00:00.000Z", updated_at: assessedAt, expires_at: "2026-07-17T08:00:00.000Z" } }),
    authority,
    credential: { status: "current", expiresAt: "2026-07-17T08:00:00.000Z", evidenceRefs: ["credential:agent-workload-identity"], reason: "The workload credential is current within the demo assessment window." },
    providerEvidence: [{ schemaVersion: 1, providerId: "hopae_connect", providerName: "Hopae Connect", capability: "identity_verification", runtimeState: "Test Mode", sourceMode: "test", evidenceStatus: "verified", confidenceBand: "medium", confidence: 0.7, reasonCodes: ["approved_test_fixture"], providerReference: "hopae:test-evidence", modelRulesetVersion: "test-rules:1", receivedTimestamp: "2026-07-16T11:59:30.000Z", latencyMs: 42, freshness: { status: "fresh", ageMs: 30000 }, limitations: ["Approved Test Mode fixture; no live provider call is claimed."], retentionStatus: "normalized_only", correlationId: "correlation:rc2-demo", tenantId, workflowId }],
    runtimeSnapshots: [createLiveTrustSnapshot({ id: "runtime:threshold-change", workflowId, capturedAt: assessedAt, providerEvidence: ["hopae:test-evidence"], deviceIntegrity: "trusted", streamIntegrity: "continuous", identityContinuity: "continuous", policyResponse: "APPROVAL REQUIRED", challengeEvents: ["transaction_threshold_crossed"], trustEvolution: "Runtime context changed from preparation to approval threshold review.", replayReference: "replay:rc2-payment" })],
    evidenceRelationships: [{ id: "graph:authority-supports-action", sourceReference: "authority:human-agent", targetReference: "decision:approval-required" }],
    replayReferences: ["replay:rc2-payment"],
    trustMemoryEvents: memory,
    governanceActions: [{ id: "governance:approval-required", status: "in_review", reason: "A finance owner must approve the threshold-crossing transaction.", reviewerId: "human:finance-owner", evidenceRefs: ["evidence:transaction-threshold"] }],
    minimumEvidence: 5,
    reassessmentAt: "2026-07-16T18:00:00.000Z",
  });
  const authorization = evaluateContinuousAuthorization({
    previous: { requestedAction: "prepare_payment", tool: "payments_api", resource: "invoice:approved-vendors", workflowStage: "prepare", delegationChainVersion: "delegation:1", authorityExpiresAt: "2026-07-16T18:00:00.000Z", runtimeRisk: "low", providerEvidenceExpiresAt: "2026-07-16T18:00:00.000Z", policyVersion: "payment-policy:2.1", transactionValue: 80000, approvalThreshold: 100000 },
    current: { requestedAction: "approve_payment", tool: "payments_api", resource: "invoice:approved-vendors", workflowStage: "approval", delegationChainVersion: "delegation:1", authorityExpiresAt: "2026-07-16T18:00:00.000Z", runtimeRisk: "medium", providerEvidenceExpiresAt: "2026-07-16T18:00:00.000Z", policyVersion: "payment-policy:2.1", transactionValue: 125000, approvalThreshold: 100000 },
    profile,
    authority,
    evaluatedAt: assessedAt,
  });
  const control = createGovernedControlAction({ id: "control:pause-agent", action: "pause_agent", actor: "human:finance-owner", reason: "Pause while the threshold-crossing action awaits accountable approval.", scope: ["workflow:regulated-payment", "tool:payments_api"], affectedEntity: entityId, affectedWorkflow: workflowId, policy: "payment-policy:2.1", evidence: ["evidence:transaction-threshold", "governance:approval-required"], replayReference: "replay:rc2-payment", recoveryRequirements: ["finance_owner_approval", "current_provider_evidence", "fresh_runtime_authorization"], externalExecutionReceipt: null, timestamp: assessedAt });
  return { profile, authorization, control, grants, memory, sourceMode: "Test Mode" as const };
}
