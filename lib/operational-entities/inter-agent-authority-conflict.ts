import { deterministicUuid, hashCanonical } from "../../src/lib/trust-core/hash.ts";
import type { OperationalConsequenceClassification, OperationalEntity } from "./operational-entity.ts";
import type { DataBoundary, DelegatedAuthorityScope } from "./delegated-authority.ts";
import type { EvidenceIndependence, ProviderNeutralReplayEvent } from "./federated-evidence.ts";

export const INTER_AGENT_AUTHORITY_CONFLICT_VERSION = "inter-agent-authority-conflict-v1" as const;

export type AgentRelationshipType = "dependency" | "cooperation" | "competition" | "conflict" | "unknown";
export type InterAgentConflictState = "NO_CONFLICT" | "POTENTIAL_CONFLICT" | "INTER_AGENT_CONFLICT" | "UNKNOWN";
export type InterAgentPolicyResponse = "CONTINUE" | "CONSTRAIN_AUTHORITY" | "REQUIRE_HUMAN_ARBITRATION" | "ISOLATE_AGENT" | "SUSPEND_ACTION";
export type InterAgentConflictDecision = "ALLOW" | "REVIEW" | "DENY";

export type InterAgentConflictCondition =
  | "INCOMPATIBLE_OBJECTIVES"
  | "COMPETING_RESOURCE_MUTATION"
  | "AGENT_DISABLES_PEER"
  | "AGENT_MODIFIES_PEER_WORK"
  | "AGENT_IMPERSONATION_ATTEMPT"
  | "CREDENTIAL_INTERFERENCE"
  | "TOOL_INTERFERENCE"
  | "CONTRADICTORY_APPROVAL_REQUESTS"
  | "REPEATED_AGENT_DENIAL_CYCLE"
  | "AUTHORITY_SCOPE_COLLISION"
  | "OBJECTIVE_AUTHORITY_MISMATCH"
  | "CONFLICTING_DESTINATION_ACTIONS"
  | "SHARED_RESOURCE_RACE";

export type DelegatedObjective = {
  objectiveReference: string;
  purpose: string;
  effect: "read" | "preserve" | "create" | "modify" | "replace" | "delete" | "disable" | "approve" | "deny_approval" | "unknown";
  resource: string;
};

export type AgentAuthorityEnvelope = {
  enterpriseId: string;
  operationalEntityId: string;
  authorityReference: string;
  authorityScope: DelegatedAuthorityScope;
  objective: DelegatedObjective;
  requestedAction: {
    type: string;
    tool: string;
    target: string;
    resource: string;
    environment: string;
    dataBoundary: DataBoundary;
    consequenceClassification: OperationalConsequenceClassification;
  };
  validFrom: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type AgentRelationshipEvidence = {
  relationshipEvidenceId: string;
  enterpriseId: string;
  sourceAgent: string;
  targetAgent: string;
  sharedWorkflow: string;
  sourceDelegatedObjective: string;
  targetDelegatedObjective: string;
  sourceAuthorityReference: string;
  targetAuthorityReference: string;
  authorityIntersection: string[];
  sharedResources: string[];
  sharedCredentialsOrTools: string[];
  interactionType: string;
  relationshipType: AgentRelationshipType;
  observedConditions: InterAgentConflictCondition[];
  evidenceSource: string;
  evidenceProvider: string;
  sourcePartyId: string;
  observedAt: string;
  evidenceDigest: string;
  independentlyObserved: boolean;
};

export type InterAgentConflictPolicy = {
  policyReference: string;
  highImpactThreshold: "high" | "critical";
  denyConditions: InterAgentConflictCondition[];
  requireHumanArbitrationForHighImpact: boolean;
};

export type AuthorityIntersection = Readonly<{
  actions: readonly string[];
  tools: readonly string[];
  targets: readonly string[];
  environments: readonly string[];
  resources: readonly string[];
  exists: boolean;
}>;

export type InterAgentConflictDecisionSnapshot = Readonly<{
  algorithmVersion: typeof INTER_AGENT_AUTHORITY_CONFLICT_VERSION;
  evaluatedAt: string;
  sourceAgent: string;
  targetAgent: string;
  sourceAuthorityReference: string;
  targetAuthorityReference: string;
  sharedWorkflow: string | null;
  relationshipType: AgentRelationshipType;
  relationshipEvidenceReferences: readonly string[];
  authorityIntersection: AuthorityIntersection;
  conflictState: InterAgentConflictState;
  policyResponse: InterAgentPolicyResponse;
  decision: InterAgentConflictDecision;
  reasonCodes: readonly string[];
  evidenceReferences: readonly string[];
  evidenceIndependence: EvidenceIndependence;
  arbitrationReference: string | null;
  digest: string;
}>;

export type InterAgentConflictEvaluation = {
  conflictState: InterAgentConflictState;
  decision: InterAgentConflictDecision;
  policyResponse: InterAgentPolicyResponse;
  reasonCodes: string[];
  evidenceReferences: string[];
  authorityIntersection: AuthorityIntersection;
  evidenceIndependence: EvidenceIndependence;
  snapshot: InterAgentConflictDecisionSnapshot;
};

export type HumanArbitrationOutcome = Readonly<{
  arbitrationId: string;
  enterpriseId: string;
  conflictSnapshotDigest: string;
  sourceAgent: string;
  targetAgent: string;
  reviewer: string;
  reviewDecision: "CONTINUE" | "CONSTRAIN_AUTHORITY" | "ISOLATE_AGENT" | "SUSPEND_ACTION";
  reasonCodes: readonly string[];
  evidenceReferences: readonly string[];
  decidedAt: string;
  digest: string;
}>;

const mutationEffects = new Set(["create", "modify", "replace", "delete", "disable"]);
const mutationActions = /^(CREATE|WRITE|UPDATE|DELETE|DISABLE|MODIFY|MODIFY_PEER_WORK|IMPERSONATE_AGENT)$/i;
const digestPattern = /^[a-f0-9]{64}$/;
const consequenceRank: Record<OperationalConsequenceClassification, number> = {
  non_consequential: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
  unknown: -1,
};

function unique(values: readonly string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function intersection(left: readonly string[], right: readonly string[]) {
  const rightSet = new Set(right);
  return unique(left.filter((value) => rightSet.has(value)));
}

function time(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function validTime(value: string) {
  return Number.isFinite(time(value));
}

function actionWithinAuthority(envelope: AgentAuthorityEnvelope) {
  const action = envelope.requestedAction;
  const scope = envelope.authorityScope;
  return scope.permittedActions.includes(action.type)
    && scope.permittedTools.includes(action.tool)
    && scope.permittedTargets.includes(action.target)
    && scope.environments.includes(action.environment);
}

function materiallyIncompatible(left: DelegatedObjective, right: DelegatedObjective) {
  if (left.resource !== right.resource) return false;
  if (left.effect === right.effect) return false;
  if (!mutationEffects.has(left.effect) && !mutationEffects.has(right.effect)) return false;
  return new Set([left.effect, right.effect]).has("preserve")
    || new Set([left.effect, right.effect]).has("replace")
    || new Set([left.effect, right.effect]).has("delete")
    || new Set([left.effect, right.effect]).has("disable");
}

function resolveEvidenceIndependence(evidence: readonly AgentRelationshipEvidence[]): EvidenceIndependence {
  if (!evidence.length) return "insufficient";
  if (evidence.some((item) => item.independentlyObserved)) return "independently_confirmed";
  const parties = new Set(evidence.map((item) => item.sourcePartyId));
  return parties.size > 1 ? "multi_source" : "single_source";
}

export function evaluateInterAgentAuthorityConflict(input: {
  sourceEntity: OperationalEntity;
  targetEntity: OperationalEntity;
  sourceAuthority: AgentAuthorityEnvelope;
  targetAuthority: AgentAuthorityEnvelope;
  relationshipEvidence: AgentRelationshipEvidence[];
  policy: InterAgentConflictPolicy;
  evaluatedAt?: string;
  arbitrationReference?: string | null;
}): InterAgentConflictEvaluation {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const source = input.sourceAuthority;
  const target = input.targetAuthority;
  const reasons: string[] = [];

  const tenantIds = new Set([
    input.sourceEntity.enterpriseId,
    input.targetEntity.enterpriseId,
    source.enterpriseId,
    target.enterpriseId,
    ...input.relationshipEvidence.map((item) => item.enterpriseId),
  ]);
  const tenantMismatch = tenantIds.size !== 1;
  if (tenantMismatch) reasons.push("CROSS_TENANT_RELATIONSHIP_REJECTED");
  if (input.sourceEntity.entityId !== source.operationalEntityId || input.targetEntity.entityId !== target.operationalEntityId) reasons.push("RELATIONSHIP_ENTITY_BINDING_INVALID");

  const validRelationshipEvidence = input.relationshipEvidence.filter((item) =>
    item.enterpriseId === source.enterpriseId
    && item.sourceAgent === source.operationalEntityId
    && item.targetAgent === target.operationalEntityId
    && item.sourceAuthorityReference === source.authorityReference
    && item.targetAuthorityReference === target.authorityReference
    && Boolean(item.evidenceSource && item.evidenceProvider && item.sourcePartyId)
    && validTime(item.observedAt)
    && digestPattern.test(item.evidenceDigest),
  );
  const relationshipEvidenceValid = validRelationshipEvidence.length === input.relationshipEvidence.length;
  if (!relationshipEvidenceValid) reasons.push("RELATIONSHIP_EVIDENCE_INVALID");

  const sourceWithinAuthority = actionWithinAuthority(source);
  const targetWithinAuthority = actionWithinAuthority(target);
  if (!sourceWithinAuthority || !targetWithinAuthority) reasons.push("ACTION_OUT_OF_DELEGATED_SCOPE");
  if (source.revokedAt || target.revokedAt) reasons.push("AUTHORITY_REVOKED");
  if (![evaluatedAt, source.validFrom, target.validFrom, source.expiresAt, target.expiresAt].every(validTime)) reasons.push("AUTHORITY_EVIDENCE_INVALID");
  if (validTime(evaluatedAt) && validTime(source.validFrom) && validTime(target.validFrom) && validTime(source.expiresAt) && validTime(target.expiresAt)
    && (time(source.validFrom) > time(evaluatedAt) || time(target.validFrom) > time(evaluatedAt) || time(source.expiresAt) <= time(evaluatedAt) || time(target.expiresAt) <= time(evaluatedAt))) reasons.push("AUTHORITY_EXPIRED");

  const resources = unique([
    ...intersection([source.requestedAction.resource], [target.requestedAction.resource]),
    ...validRelationshipEvidence.flatMap((item) => item.sharedResources),
  ]);
  const authorityIntersection: AuthorityIntersection = Object.freeze({
    actions: intersection(source.authorityScope.permittedActions, target.authorityScope.permittedActions),
    tools: intersection(source.authorityScope.permittedTools, target.authorityScope.permittedTools),
    targets: intersection(source.authorityScope.permittedTargets, target.authorityScope.permittedTargets),
    environments: intersection(source.authorityScope.environments, target.authorityScope.environments),
    resources,
    exists: resources.length > 0,
  });

  const conditions = new Set<InterAgentConflictCondition>(validRelationshipEvidence.flatMap((item) => item.observedConditions));
  const sameResource = source.requestedAction.resource === target.requestedAction.resource;
  const sourceMutates = mutationEffects.has(source.objective.effect) || mutationActions.test(source.requestedAction.type);
  const targetMutates = mutationEffects.has(target.objective.effect) || mutationActions.test(target.requestedAction.type);
  if (materiallyIncompatible(source.objective, target.objective)) conditions.add("INCOMPATIBLE_OBJECTIVES");
  if (sameResource && sourceMutates && targetMutates) conditions.add("COMPETING_RESOURCE_MUTATION");
  if (authorityIntersection.exists && sourceMutates && targetMutates) conditions.add("AUTHORITY_SCOPE_COLLISION");
  if (source.objective.resource !== source.requestedAction.resource || target.objective.resource !== target.requestedAction.resource) conditions.add("OBJECTIVE_AUTHORITY_MISMATCH");
  if (source.objective.effect === "disable" && source.requestedAction.target === target.operationalEntityId) conditions.add("AGENT_DISABLES_PEER");
  if (target.objective.effect === "disable" && target.requestedAction.target === source.operationalEntityId) conditions.add("AGENT_DISABLES_PEER");
  if (source.requestedAction.type === "MODIFY_PEER_WORK" || target.requestedAction.type === "MODIFY_PEER_WORK") conditions.add("AGENT_MODIFIES_PEER_WORK");
  if (source.requestedAction.type === "IMPERSONATE_AGENT" || target.requestedAction.type === "IMPERSONATE_AGENT") conditions.add("AGENT_IMPERSONATION_ATTEMPT");
  if (source.objective.effect === "approve" && target.objective.effect === "deny_approval" && sameResource) conditions.add("CONTRADICTORY_APPROVAL_REQUESTS");
  if (target.objective.effect === "approve" && source.objective.effect === "deny_approval" && sameResource) conditions.add("CONTRADICTORY_APPROVAL_REQUESTS");

  const ordinaryAuthorityFailure = reasons.some((reason) => ["ACTION_OUT_OF_DELEGATED_SCOPE", "AUTHORITY_REVOKED", "AUTHORITY_EXPIRED", "AUTHORITY_EVIDENCE_INVALID"].includes(reason));
  const confirmedConditions = unique([...conditions]) as InterAgentConflictCondition[];
  const conflictState: InterAgentConflictState = tenantMismatch || !relationshipEvidenceValid
    ? "UNKNOWN"
    : ordinaryAuthorityFailure
      ? "NO_CONFLICT"
      : confirmedConditions.length
        ? "INTER_AGENT_CONFLICT"
        : authorityIntersection.exists && (sourceMutates || targetMutates)
          ? "POTENTIAL_CONFLICT"
          : "NO_CONFLICT";

  reasons.push(...confirmedConditions);
  if (conflictState === "INTER_AGENT_CONFLICT") reasons.push("INTER_AGENT_CONFLICT");
  if (conflictState === "POTENTIAL_CONFLICT") reasons.push("POTENTIAL_INTER_AGENT_CONFLICT");
  if (conflictState === "NO_CONFLICT" && !ordinaryAuthorityFailure) reasons.push("NO_INTER_AGENT_CONFLICT");

  const highestConsequence = Math.max(consequenceRank[source.requestedAction.consequenceClassification], consequenceRank[target.requestedAction.consequenceClassification]);
  const highImpact = highestConsequence >= consequenceRank[input.policy.highImpactThreshold];
  const policyDeny = confirmedConditions.some((condition) => input.policy.denyConditions.includes(condition));
  if (conflictState === "INTER_AGENT_CONFLICT" && highImpact) reasons.push("HIGH_CONSEQUENCE_CONFLICT_REQUIRES_REVIEW");
  const decision: InterAgentConflictDecision = tenantMismatch || ordinaryAuthorityFailure || policyDeny
    ? "DENY"
    : conflictState === "UNKNOWN" || conflictState === "POTENTIAL_CONFLICT" || conflictState === "INTER_AGENT_CONFLICT"
      ? "REVIEW"
      : "ALLOW";
  const policyResponse: InterAgentPolicyResponse = policyDeny
    ? "SUSPEND_ACTION"
    : conflictState === "INTER_AGENT_CONFLICT" && highImpact && input.policy.requireHumanArbitrationForHighImpact
      ? "REQUIRE_HUMAN_ARBITRATION"
      : conflictState === "INTER_AGENT_CONFLICT"
        ? "CONSTRAIN_AUTHORITY"
        : conflictState === "POTENTIAL_CONFLICT" || conflictState === "UNKNOWN"
          ? "SUSPEND_ACTION"
          : "CONTINUE";

  const evidenceReferences = unique(validRelationshipEvidence.map((item) => item.relationshipEvidenceId));
  const evidenceIndependence = resolveEvidenceIndependence(validRelationshipEvidence);
  const reasonCodes = unique(reasons);
  const snapshotWithoutDigest = {
    algorithmVersion: INTER_AGENT_AUTHORITY_CONFLICT_VERSION,
    evaluatedAt,
    sourceAgent: source.operationalEntityId,
    targetAgent: target.operationalEntityId,
    sourceAuthorityReference: source.authorityReference,
    targetAuthorityReference: target.authorityReference,
    sharedWorkflow: validRelationshipEvidence[0]?.sharedWorkflow ?? null,
    relationshipType: validRelationshipEvidence[0]?.relationshipType ?? "unknown",
    relationshipEvidenceReferences: evidenceReferences,
    authorityIntersection,
    conflictState,
    policyResponse,
    decision,
    reasonCodes,
    evidenceReferences,
    evidenceIndependence,
    arbitrationReference: input.arbitrationReference ?? null,
  };
  const snapshot = Object.freeze({ ...snapshotWithoutDigest, digest: hashCanonical(snapshotWithoutDigest) }) as InterAgentConflictDecisionSnapshot;
  return { conflictState, decision, policyResponse, reasonCodes, evidenceReferences, authorityIntersection, evidenceIndependence, snapshot };
}

export function appendHumanArbitrationOutcome(history: readonly HumanArbitrationOutcome[], input: Omit<HumanArbitrationOutcome, "digest">): HumanArbitrationOutcome[] {
  if (history.some((item) => item.arbitrationId === input.arbitrationId)) return [...history];
  const outcome = Object.freeze({ ...input, digest: hashCanonical(input) }) as HumanArbitrationOutcome;
  return [...history, outcome];
}

export function buildInterAgentConflictReplay(input: {
  evaluation: InterAgentConflictEvaluation;
  enterpriseId: string;
  occurredAt: string;
}): ProviderNeutralReplayEvent[] {
  const snapshot = input.evaluation.snapshot;
  const sequence = [
    "AGENT_A_AUTHORITY_ACTIVE",
    "AGENT_B_AUTHORITY_ACTIVE",
    "AGENT_RELATIONSHIP_OBSERVED",
    "AUTHORITY_INTERSECTION_EVALUATED",
    ...(input.evaluation.conflictState === "INTER_AGENT_CONFLICT" ? ["INTER_AGENT_CONFLICT_DETECTED"] : []),
    ...(input.evaluation.decision === "REVIEW" ? ["POLICY_REVIEW_REQUIRED"] : []),
    input.evaluation.decision === "ALLOW" ? "ACTION_ALLOWED" : "ACTION_DENIED",
  ];
  const base = time(input.occurredAt);
  return sequence.map((eventType, index) => {
    const occurredAt = new Date(base + index).toISOString();
    return {
      eventId: deterministicUuid({ digest: snapshot.digest, eventType, index }),
      attribution: "CYBER_SENTINELS_INTERPRETATION",
      eventType,
      customer: input.enterpriseId,
      actorReference: snapshot.sourceAgent,
      operatorReference: "operator:customer",
      providerReference: "provider:relationship-evidence",
      operationalEntityId: snapshot.sourceAgent,
      source: INTER_AGENT_AUTHORITY_CONFLICT_VERSION,
      evidenceType: "inter_agent_authority_conflict",
      evidenceIndependence: snapshot.evidenceIndependence,
      confidence: snapshot.evidenceIndependence === "independently_confirmed" ? 1 : snapshot.evidenceIndependence === "multi_source" ? 0.85 : 0.5,
      evidenceReferences: [...snapshot.evidenceReferences],
      occurredAt,
    };
  });
}
