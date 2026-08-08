import { hashCanonical } from "../../src/lib/trust-core/hash.ts";
import type { CanonicalProviderRelationship } from "../providers/types.ts";
import type { DecisionTimeSnapshot, EvidenceIndependence, ProviderNeutralReplayEvent } from "./federated-evidence.ts";
import type { ExternalIdentityReference, OperationalEntity } from "./operational-entity.ts";

export type IdentityCorrelationOutcome =
  | "MATCHED"
  | "PROBABLE_MATCH_REVIEW_REQUIRED"
  | "CONFLICTING_IDENTITY"
  | "NEW_EXTERNAL_IDENTITY"
  | "SUPERSEDED_EXTERNAL_IDENTITY"
  | "UNKNOWN";

export type IdentityCorrelationResult = {
  outcome: IdentityCorrelationOutcome;
  operationalEntityId: string | null;
  candidateOperationalEntityIds: string[];
  reasonCodes: string[];
  humanReviewRequired: boolean;
  automaticallyMerged: false;
};

export type ProviderTransitionState =
  | "planned"
  | "in_progress"
  | "evidence_exporting"
  | "evidence_validating"
  | "new_provider_onboarding"
  | "continuity_review"
  | "completed"
  | "completed_with_gaps"
  | "failed"
  | "cancelled";

export type PortableEvidenceClass =
  | "identity"
  | "authority"
  | "policy"
  | "execution"
  | "runtime"
  | "destination"
  | "incident"
  | "outcome";

export type PortableProviderEvidence = {
  evidenceId: string;
  evidenceClass: PortableEvidenceClass;
  originalProvider: string;
  originalOperator: string;
  nativeEventReference: string;
  normalizedEvidence: Record<string, unknown>;
  schemaVersion: string;
  sourceTimestamp: string;
  ingestedTimestamp: string;
  evidenceDigest: string;
  decisionReferences: string[];
  operationalEntityReference: string;
  replayReference: string;
  trustMemoryReference: string;
  correctionHistory: string[];
};

export type ProviderTransitionEvent = {
  eventId: string;
  state: ProviderTransitionState;
  eventType: string;
  occurredAt: string;
  actorReference: string;
  evidenceReferences: string[];
};

export type ProviderTransitionRecord = Readonly<{
  transitionId: string;
  enterpriseId: string;
  operationalEntityId: string;
  previousProvider: CanonicalProviderRelationship;
  newProvider: CanonicalProviderRelationship;
  state: ProviderTransitionState;
  frozenHistoricalEvidence: readonly PortableProviderEvidence[];
  historicalEvidenceDigest: string;
  oldDecisionSnapshots: readonly Readonly<{ decisionReference: string; snapshot: DecisionTimeSnapshot; snapshotDigest: string }>[];
  appendedEvidence: readonly PortableProviderEvidence[];
  migrationGaps: readonly string[];
  resolvedMigrationGaps: readonly string[];
  continuityResult: ProviderContinuityOutcome | null;
  events: readonly ProviderTransitionEvent[];
}>;

export type ProviderContinuityOutcome =
  | "CONTINUITY_SUPPORTED"
  | "APPROVED_PROVIDER_CHANGE"
  | "PARTIAL_CONTINUITY"
  | "IDENTITY_CONFLICT"
  | "AUTHORITY_CONFLICT"
  | "EVIDENCE_GAP"
  | "MIGRATION_GAP"
  | "REVIEW_REQUIRED";

export type ProviderContinuityInput = {
  sameEntity: boolean;
  sameAccountableOwner: boolean;
  sameBusinessPurpose: boolean;
  sameAuthority: boolean;
  sameRuntime: boolean;
  sameEnvironment: boolean;
  sameToolScope: boolean;
  sameDataBoundary: boolean;
  sameExternalIdentity: boolean;
  changedEvidenceSource: boolean;
  providerChangeApproved: boolean;
  evidenceGap: boolean;
  migrationGap: boolean;
};

const progression: Record<ProviderTransitionState, ProviderTransitionState[]> = {
  planned: ["in_progress", "cancelled"],
  in_progress: ["evidence_exporting", "failed", "cancelled"],
  evidence_exporting: ["evidence_validating", "failed", "cancelled"],
  evidence_validating: ["new_provider_onboarding", "failed", "cancelled"],
  new_provider_onboarding: ["continuity_review", "failed", "cancelled"],
  continuity_review: ["completed", "completed_with_gaps", "failed", "cancelled"],
  completed: [], completed_with_gaps: [], failed: [], cancelled: [],
};

function frozen<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) frozen(child);
  }
  return value;
}

export function canonicalExternalIdentity(identity: ExternalIdentityReference) {
  return {
    provider: identity.provider,
    externalEntityId: identity.providerEntityId,
    sourcePlatform: identity.builderPlatform,
    registeredOwner: identity.providerOwner,
    businessPurpose: identity.providerBusinessPurpose,
    lifecycleState: identity.providerNativeLifecycle,
    permissionsSummary: [...identity.permissionsSummary],
    certificationState: identity.certificationState,
    observedAt: identity.observedAt,
    sourceTimestamp: identity.sourceTimestamp,
    evidenceDigest: identity.evidenceDigest,
    supersededBy: identity.correctedByReferenceId,
    correctionState: identity.supersedesReferenceId || identity.correctedByReferenceId ? "corrected" : "original",
  };
}

export function correlateExternalIdentity(input: {
  externalIdentity: ExternalIdentityReference;
  knownEntities: readonly OperationalEntity[];
  assertedOperationalEntityId?: string | null;
  highImpact?: boolean;
}): IdentityCorrelationResult {
  if (!input.externalIdentity.provider || !input.externalIdentity.providerEntityId) {
    return { outcome: "UNKNOWN", operationalEntityId: null, candidateOperationalEntityIds: [], reasonCodes: ["CORRELATION_KEY_MISSING"], humanReviewRequired: true, automaticallyMerged: false };
  }
  const nativeMatches = input.knownEntities.filter((entity) => entity.externalIdentityReferences.some((identity) =>
    identity.provider === input.externalIdentity.provider && identity.providerEntityId === input.externalIdentity.providerEntityId));
  const asserted = input.assertedOperationalEntityId ? input.knownEntities.find((entity) => entity.entityId === input.assertedOperationalEntityId) : null;
  if (nativeMatches.length > 1) return { outcome: "CONFLICTING_IDENTITY", operationalEntityId: null, candidateOperationalEntityIds: nativeMatches.map((entity) => entity.entityId), reasonCodes: ["NATIVE_IDENTITY_LINKED_TO_MULTIPLE_ENTITIES"], humanReviewRequired: true, automaticallyMerged: false };
  if (nativeMatches.length === 1) {
    const match = nativeMatches[0];
    if (asserted && asserted.entityId !== match.entityId) return { outcome: "CONFLICTING_IDENTITY", operationalEntityId: null, candidateOperationalEntityIds: [match.entityId, asserted.entityId], reasonCodes: ["ASSERTED_ENTITY_CONFLICTS_WITH_NATIVE_LINK"], humanReviewRequired: true, automaticallyMerged: false };
    const superseded = Boolean(input.externalIdentity.supersedesReferenceId || input.externalIdentity.correctedByReferenceId);
    return { outcome: superseded ? "SUPERSEDED_EXTERNAL_IDENTITY" : "MATCHED", operationalEntityId: match.entityId, candidateOperationalEntityIds: [match.entityId], reasonCodes: [superseded ? "CORRECTION_LINEAGE_PRESENT" : "EXACT_PROVIDER_NATIVE_ID_MATCH"], humanReviewRequired: false, automaticallyMerged: false };
  }
  if (asserted) {
    const ownerAligned = !input.externalIdentity.providerOwner || input.externalIdentity.providerOwner === asserted.accountableOwnerId;
    const purposeAligned = !input.externalIdentity.providerBusinessPurpose || asserted.workflowReferences.some((reference) => reference.includes(input.externalIdentity.providerBusinessPurpose!.split(" ")[0]));
    return { outcome: ownerAligned && purposeAligned ? "PROBABLE_MATCH_REVIEW_REQUIRED" : "CONFLICTING_IDENTITY", operationalEntityId: null, candidateOperationalEntityIds: [asserted.entityId], reasonCodes: [ownerAligned ? "OWNER_ALIGNED" : "OWNER_CONFLICT", purposeAligned ? "PURPOSE_ALIGNED" : "PURPOSE_UNCONFIRMED"], humanReviewRequired: true, automaticallyMerged: false };
  }
  return { outcome: "NEW_EXTERNAL_IDENTITY", operationalEntityId: null, candidateOperationalEntityIds: [], reasonCodes: [input.highImpact ? "HIGH_IMPACT_NEW_IDENTITY_REQUIRES_REVIEW" : "NO_CANONICAL_LINK_FOUND"], humanReviewRequired: Boolean(input.highImpact), automaticallyMerged: false };
}

export function decisionSnapshotDigest(snapshot: DecisionTimeSnapshot) {
  return hashCanonical(snapshot);
}

export function createProviderTransition(input: {
  transitionId: string;
  enterpriseId: string;
  operationalEntity: OperationalEntity;
  previousProvider: CanonicalProviderRelationship;
  newProvider: CanonicalProviderRelationship;
  historicalEvidence: PortableProviderEvidence[];
  oldDecisions: Array<{ decisionReference: string; snapshot: DecisionTimeSnapshot }>;
  initiatedAt: string;
  actorReference: string;
}): ProviderTransitionRecord {
  if (input.previousProvider.providerId === input.newProvider.providerId) throw new TypeError("A provider transition requires two distinct provider relationships.");
  const historicalEvidence = structuredClone(input.historicalEvidence);
  const oldDecisionSnapshots = input.oldDecisions.map((decision) => ({ ...structuredClone(decision), snapshotDigest: decisionSnapshotDigest(decision.snapshot) }));
  return frozen({
    transitionId: input.transitionId,
    enterpriseId: input.enterpriseId,
    operationalEntityId: input.operationalEntity.entityId,
    previousProvider: structuredClone(input.previousProvider),
    newProvider: structuredClone(input.newProvider),
    state: "planned" as const,
    frozenHistoricalEvidence: historicalEvidence,
    historicalEvidenceDigest: hashCanonical(JSON.parse(JSON.stringify(historicalEvidence))),
    oldDecisionSnapshots,
    appendedEvidence: [] as PortableProviderEvidence[],
    migrationGaps: [] as string[],
    resolvedMigrationGaps: [] as string[],
    continuityResult: null,
    events: [{ eventId: `${input.transitionId}:planned`, state: "planned" as const, eventType: "PROVIDER_REPLACEMENT_STARTED", occurredAt: input.initiatedAt, actorReference: input.actorReference, evidenceReferences: historicalEvidence.map((item) => item.evidenceId) }],
  }) as ProviderTransitionRecord;
}

export function advanceProviderTransition(input: {
  transition: ProviderTransitionRecord;
  state: ProviderTransitionState;
  occurredAt: string;
  actorReference: string;
  appendedEvidence?: PortableProviderEvidence[];
  migrationGaps?: string[];
  resolvedMigrationGaps?: string[];
  continuityResult?: ProviderContinuityOutcome;
}): ProviderTransitionRecord {
  if (!progression[input.transition.state].includes(input.state)) throw new Error(`INVALID_PROVIDER_TRANSITION:${input.transition.state}->${input.state}`);
  const knownEvidence = new Set([...input.transition.frozenHistoricalEvidence, ...input.transition.appendedEvidence].map((item) => item.evidenceId));
  const additions = (input.appendedEvidence ?? []).filter((item) => !knownEvidence.has(item.evidenceId));
  const resolvedGaps = new Set([...input.transition.resolvedMigrationGaps, ...(input.resolvedMigrationGaps ?? [])]);
  const next = {
    ...structuredClone(input.transition),
    state: input.state,
    appendedEvidence: [...input.transition.appendedEvidence, ...structuredClone(additions)],
    migrationGaps: [...new Set([...input.transition.migrationGaps, ...(input.migrationGaps ?? [])])].filter((gap) => !resolvedGaps.has(gap)),
    resolvedMigrationGaps: [...resolvedGaps],
    continuityResult: input.continuityResult ?? input.transition.continuityResult,
    events: [...input.transition.events, { eventId: `${input.transition.transitionId}:${input.state}`, state: input.state, eventType: input.state === "completed" || input.state === "completed_with_gaps" ? "PROVIDER_REPLACED" : `PROVIDER_TRANSITION_${input.state.toUpperCase()}`, occurredAt: input.occurredAt, actorReference: input.actorReference, evidenceReferences: additions.map((item) => item.evidenceId) }],
  };
  if (hashCanonical(JSON.parse(JSON.stringify(next.frozenHistoricalEvidence))) !== input.transition.historicalEvidenceDigest) throw new Error("HISTORICAL_PROVIDER_EVIDENCE_MUTATED");
  for (const decision of next.oldDecisionSnapshots) if (decisionSnapshotDigest(decision.snapshot) !== decision.snapshotDigest) throw new Error("HISTORICAL_DECISION_SNAPSHOT_MUTATED");
  return frozen(next) as ProviderTransitionRecord;
}

export function evaluateProviderContinuity(input: ProviderContinuityInput): { outcome: ProviderContinuityOutcome; reasons: string[] } {
  if (!input.sameEntity || !input.sameExternalIdentity) return { outcome: "IDENTITY_CONFLICT", reasons: ["canonical or external identity conflict"] };
  if (!input.sameAuthority) return { outcome: "AUTHORITY_CONFLICT", reasons: ["authority changed during provider transition"] };
  if (input.migrationGap) return { outcome: "MIGRATION_GAP", reasons: ["historical provider evidence migration gap"] };
  if (input.evidenceGap) return { outcome: "EVIDENCE_GAP", reasons: ["required current evidence unavailable"] };
  const changed = [input.sameAccountableOwner, input.sameBusinessPurpose, input.sameRuntime, input.sameEnvironment, input.sameToolScope, input.sameDataBoundary].filter((same) => !same).length;
  if (changed && !input.providerChangeApproved) return { outcome: "REVIEW_REQUIRED", reasons: ["unapproved material continuity changes"] };
  if (changed) return { outcome: "PARTIAL_CONTINUITY", reasons: ["approved transition contains material continuity changes"] };
  if (input.changedEvidenceSource && input.providerChangeApproved) return { outcome: "APPROVED_PROVIDER_CHANGE", reasons: ["provider changed while canonical identity, authority and scope remained stable"] };
  return { outcome: "CONTINUITY_SUPPORTED", reasons: ["canonical entity and operating context remain continuous"] };
}

export function assertProviderNeutralCanonicalId(entity: OperationalEntity) {
  const nativeIds = entity.externalIdentityReferences.flatMap((identity) => [identity.providerEntityId, `${identity.provider}:${identity.providerEntityId}`]);
  if (nativeIds.includes(entity.entityId) || nativeIds.includes(entity.canonicalTrustObjectId)) throw new Error("PROVIDER_NATIVE_ID_USED_AS_CANONICAL_ID");
  return { valid: true as const, canonicalEntityId: entity.entityId, checkedNativeIds: nativeIds };
}

export function evaluateProviderFailure(input: {
  unavailableProviderId: string;
  evidence: readonly PortableProviderEvidence[];
  decisions: readonly { decisionReference: string; operationalEntityId: string; snapshotAvailable: boolean; consequence: "low" | "moderate" | "high" | "critical"; requiredEvidenceClasses: PortableEvidenceClass[] }[];
}) {
  const unavailableEvidence = input.evidence.filter((item) => item.originalProvider === input.unavailableProviderId);
  const remainingEvidence = input.evidence.filter((item) => item.originalProvider !== input.unavailableProviderId);
  const support = input.decisions.map((decision) => {
    const decisionEvidence = remainingEvidence.filter((item) => item.decisionReferences.includes(decision.decisionReference));
    const remainingClasses = new Set(decisionEvidence.map((item) => item.evidenceClass));
    const missing = decision.requiredEvidenceClasses.filter((kind) => !remainingClasses.has(kind));
    const currentAction = !missing.length ? "SUPPORTED" : ["high", "critical"].includes(decision.consequence) ? "DENY" : "REVIEW";
    return { ...decision, missingEvidenceClasses: missing, currentAction, historicalDecisionExplainable: decision.snapshotAvailable };
  });
  return {
    unavailableEvidence: unavailableEvidence.map((item) => item.evidenceId),
    evidenceRemaining: remainingEvidence.map((item) => item.evidenceId),
    supportedDecisions: support.filter((item) => item.currentAction === "SUPPORTED").map((item) => item.decisionReference),
    reviewActions: support.filter((item) => item.currentAction === "REVIEW").map((item) => item.decisionReference),
    deniedActions: support.filter((item) => item.currentAction === "DENY").map((item) => item.decisionReference),
    explainableHistoricalDecisions: support.filter((item) => item.historicalDecisionExplainable).map((item) => item.decisionReference),
    affectedOperationalEntities: [...new Set(input.decisions.filter((decision) => support.find((item) => item.decisionReference === decision.decisionReference)?.missingEvidenceClasses.length).map((decision) => decision.operationalEntityId))],
    historicalTrustRecordAvailable: support.every((item) => item.historicalDecisionExplainable),
  };
}

export type ProviderConflictEvidence = { evidenceId: string; source: string; claim: string; occurredAt: string };

export function evaluateProviderDisagreement(evidence: readonly ProviderConflictEvidence[]) {
  const claims = new Set(evidence.map((item) => item.claim));
  return {
    classification: claims.size > 1 ? "CONFLICTING_EVIDENCE" as const : "CONSISTENT_EVIDENCE" as const,
    evidence: structuredClone(evidence),
    policyResponse: "CANONICAL_EVALUATION_REQUIRED" as const,
    fraudOrMisconductClaimed: false as const,
  };
}

export function explainProviderDisagreement(evidence: readonly ProviderConflictEvidence[]) {
  const ordered = [...evidence].sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt));
  return {
    explanation: ordered.map((item) => `${item.source} reported ${item.claim} at ${item.occurredAt}. [${item.evidenceId}]`).join(" "),
    citations: ordered.map((item) => item.evidenceId),
    deterministicFallback: true as const,
    determinesProviderHonesty: false as const,
    determinesMaliciousIntent: false as const,
  };
}

export function buildProviderTransitionReplay(input: {
  customer: string;
  operationalEntityId: string;
  operator: string;
  events: Array<{ eventId: string; eventType: string; actor: string; provider: string; source: string; evidenceType: string; independence: EvidenceIndependence; confidence: number; occurredAt: string; evidenceReferences: string[] }>;
}): ProviderNeutralReplayEvent[] {
  return input.events.map((event) => ({
    eventId: event.eventId,
    attribution: event.eventType.includes("DECISION") ? "CUSTOMER_DECISION" : event.eventType.includes("DESTINATION") ? "DESTINATION_OBSERVATION" : event.eventType.includes("RUNTIME") ? "RUNTIME_OBSERVATION" : "PROVIDER_CLAIM",
    eventType: event.eventType,
    customer: input.customer,
    actorReference: event.actor,
    operatorReference: input.operator,
    providerReference: event.provider,
    operationalEntityId: input.operationalEntityId,
    source: event.source,
    evidenceType: event.evidenceType,
    evidenceIndependence: event.independence,
    confidence: event.confidence,
    evidenceReferences: [...event.evidenceReferences],
    occurredAt: event.occurredAt,
  }));
}
