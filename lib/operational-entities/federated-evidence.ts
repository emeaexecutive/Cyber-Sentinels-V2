import {
  evaluateOperationalEntityContinuity,
  type ExternalIdentityReference,
  type OperationalConsequenceClassification,
  type OperationalEntity,
} from "./operational-entity.ts";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

export type ExternalIdentityChangeType =
  | "EXTERNAL_IDENTITY_APPEARED"
  | "EXTERNAL_IDENTITY_DISAPPEARED"
  | "EXTERNAL_OWNER_CHANGED"
  | "EXTERNAL_BUSINESS_PURPOSE_CHANGED"
  | "EXTERNAL_PERMISSIONS_INCREASED"
  | "EXTERNAL_PERMISSIONS_DECREASED"
  | "EXTERNAL_IDENTITY_DEACTIVATED"
  | "CONFLICTING_REGISTRY_STATE"
  | "DUPLICATE_PROVIDER_IDENTITIES"
  | "PROVIDER_CORRECTION";

export type ExternalIdentityChange = {
  type: ExternalIdentityChangeType;
  provider: string;
  providerEntityId: string;
  previousReferenceId: string | null;
  currentReferenceId: string | null;
  observedAt: string;
  requiresCanonicalReevaluation: true;
};

export type ResponsibilityLineage = {
  businessOwner: string;
  controlOwner: string;
  policyApprover: string;
  controlOperator: string;
  technologyProvider: string;
  identityAuthorizationProvider: string;
  operationalEntity: string;
  runtimeProvider: string;
  destinationSystem: string;
  evidenceProvider: string;
  independentConfirmationSource: string | null;
  reviewer: string | null;
};

export type EvidenceSourceClassification =
  | "operator_asserted"
  | "provider_asserted"
  | "technology_provider_asserted"
  | "identity_provider_asserted"
  | "runtime_observed"
  | "destination_observed"
  | "independently_corroborated"
  | "human_reviewed"
  | "disputed"
  | "unconfirmed";

export type EvidenceIndependence =
  | "single_source"
  | "same_party_multi_system"
  | "provider_and_operator_same_party"
  | "multi_source"
  | "independently_confirmed"
  | "conflicting"
  | "insufficient";

export type ManagedControlEvidence = {
  evidenceId: string;
  providerId: string;
  sourcePartyId: string;
  sourceClassification: EvidenceSourceClassification;
  claim: "success" | "failure" | "unknown";
  providerNativeEventId: string;
  normalizedEvidence: Record<string, unknown>;
  evidenceDigest: string;
  schemaVersion: string;
  observedAt: string;
  supersedesEvidenceId: string | null;
  correctionOfEvidenceId: string | null;
};

export type EnforcementFinding =
  | "ACKNOWLEDGED_NOT_CONFIRMED"
  | "PROVIDER_SUCCESS_UNCONFIRMED"
  | "OPERATOR_SUCCESS_UNCONFIRMED"
  | "RUNTIME_CONTRADICTION"
  | "RUNTIME_CONTRADICTS_PROVIDER"
  | "DESTINATION_CONTRADICTION"
  | "DESTINATION_CONTRADICTS_PROVIDER"
  | "ACCESS_PERSISTS_AFTER_REVOCATION"
  | "AGENT_ACTIVE_AFTER_SUSPENSION"
  | "ACTION_OCCURRED_AFTER_BLOCK"
  | "EVIDENCE_INSUFFICIENT"
  | "PROVIDER_MIGRATION_GAP"
  | "REQUIRED_EVIDENCE_MISSING";

export type EnforcementChain = {
  policyDecision: "ALLOW" | "REVIEW" | "DENY";
  controlOwnerApproval: string | null;
  operatorRequest: string | null;
  technologyProviderRequest: string | null;
  providerAcknowledgement: string | null;
  providerEnforcementClaim: "success" | "failure" | "unknown" | null;
  runtimeObservation: "enforced" | "not_enforced" | "unknown" | null;
  destinationObservation: "enforced" | "not_enforced" | "unknown" | null;
  businessOutcome: string | null;
  revocationClaimedAt?: string | null;
  accessObservedAt?: string | null;
  entityLifecycleState?: string;
};

export type EnforcementConfirmation = {
  state: "confirmed" | "contradicted" | "unknown";
  findings: EnforcementFinding[];
};

export type ProviderChangeEventType =
  | "PROVIDER_SELECTED"
  | "PROVIDER_ONBOARDED"
  | "PROVIDER_REPLACED"
  | "PROVIDER_SUSPENDED"
  | "PROVIDER_TERMINATED"
  | "SERVICE_SCOPE_CHANGED"
  | "EVIDENCE_EXPORT_STARTED"
  | "EVIDENCE_EXPORT_COMPLETED"
  | "HISTORICAL_EVIDENCE_VALIDATED"
  | "MIGRATION_GAP_DETECTED"
  | "NEW_PROVIDER_ASSUMED_CONTROL";

export type ProviderChangeEvent = {
  eventId: string;
  enterpriseId: string;
  type: ProviderChangeEventType;
  providerId: string;
  previousProviderId: string | null;
  operatorId: string;
  affectedOperationalEntityIds: string[];
  affectedControlIds: string[];
  evidenceReferences: string[];
  occurredAt: string;
};

export type ReplayAttribution =
  | "CUSTOMER_DECISION"
  | "OPERATOR_ACTION"
  | "PROVIDER_CLAIM"
  | "RUNTIME_OBSERVATION"
  | "DESTINATION_OBSERVATION"
  | "CYBER_SENTINELS_INTERPRETATION"
  | "HUMAN_REVIEWER_CONCLUSION";

export type ProviderNeutralReplayEvent = {
  eventId: string;
  attribution: ReplayAttribution;
  eventType: string;
  customer: string;
  actorReference: string;
  operatorReference: string;
  providerReference: string;
  operationalEntityId: string;
  source: string;
  evidenceType: string;
  evidenceIndependence: EvidenceIndependence;
  confidence: number;
  evidenceReferences: string[];
  occurredAt: string;
};

export type MaterialProviderTrustMemoryEvent =
  | "CONTROL_ACTIVATED"
  | "PROVIDER_ASSIGNED"
  | "OPERATOR_ASSIGNED"
  | "CONTROL_INDEPENDENTLY_CONFIRMED"
  | "OPERATOR_PROVIDER_CONFLICT"
  | "ENFORCEMENT_UNCONFIRMED"
  | "DESTINATION_CONTRADICTION"
  | "PROVIDER_REPLACED"
  | "EVIDENCE_PORTABILITY_COMPLETED"
  | "MIGRATION_EVIDENCE_GAP"
  | "HISTORIC_EVIDENCE_RECOVERED"
  | "PROVIDER_CORRECTION"
  | "FALSE_POSITIVE_CONFLICT_RESOLVED";

export type ProviderTransitionTrustMemoryEvent =
  | "PROVIDER_REPLACEMENT_STARTED"
  | "PROVIDER_REPLACED"
  | "EXTERNAL_IDENTITY_CHANGED"
  | "PROVIDER_EVIDENCE_CONFLICT"
  | "EVIDENCE_EXPORT_COMPLETED"
  | "MIGRATION_GAP_DETECTED"
  | "MIGRATION_GAP_RESOLVED"
  | "HISTORICAL_EVIDENCE_VALIDATED"
  | "CONTINUITY_PRESERVED"
  | "CONTINUITY_REVIEW_REQUIRED";

export type DecisionTimeSnapshot = Readonly<{
  snapshotVersion: "1.0";
  frozenAt: string;
  operationalEntityVersion: string;
  externalIdentityReferences: readonly ExternalIdentityReference[];
  accountableHuman: string;
  authorityLineageReferences: readonly string[];
  responsibilityLineage: Readonly<ResponsibilityLineage>;
  providerHealth: Readonly<Record<string, string>>;
  providerEvidence: readonly ManagedControlEvidence[];
  evidenceIndependence: EvidenceIndependence;
  policyVersion: string;
  configurationRulesetDigest: string;
  enforcementState: Readonly<EnforcementChain>;
  contradictions: readonly string[];
  activeIncidentReferences?: readonly string[];
  consequence?: OperationalConsequenceClassification;
  confidenceInConclusion?: "HIGH" | "MODERATE" | "LOW" | "INSUFFICIENT";
  decisionDigest?: string;
  reviewerState: string;
}>;

const terminalInactiveStates = new Set(["inactive", "suspended", "deactivated", "deleted"]);

function identityKey(identity: ExternalIdentityReference) {
  return `${identity.provider}\u0000${identity.providerEntityId}`;
}

export function detectExternalIdentityChanges(
  previous: readonly ExternalIdentityReference[],
  current: readonly ExternalIdentityReference[],
  observedAt = new Date().toISOString(),
): ExternalIdentityChange[] {
  const before = new Map(previous.map((identity) => [identityKey(identity), identity]));
  const after = new Map(current.map((identity) => [identityKey(identity), identity]));
  const changes: ExternalIdentityChange[] = [];
  const add = (type: ExternalIdentityChangeType, oldIdentity: ExternalIdentityReference | null, newIdentity: ExternalIdentityReference | null) => {
    const identity = newIdentity ?? oldIdentity;
    if (!identity) return;
    changes.push({
      type,
      provider: identity.provider,
      providerEntityId: identity.providerEntityId,
      previousReferenceId: oldIdentity?.referenceId ?? null,
      currentReferenceId: newIdentity?.referenceId ?? null,
      observedAt,
      requiresCanonicalReevaluation: true,
    });
  };

  for (const [key, identity] of before) {
    const next = after.get(key);
    if (!next) { add("EXTERNAL_IDENTITY_DISAPPEARED", identity, null); continue; }
    if (identity.providerOwner !== next.providerOwner) add("EXTERNAL_OWNER_CHANGED", identity, next);
    if (identity.providerBusinessPurpose !== next.providerBusinessPurpose) add("EXTERNAL_BUSINESS_PURPOSE_CHANGED", identity, next);
    const priorPermissions = new Set(identity.permissionsSummary);
    const nextPermissions = new Set(next.permissionsSummary);
    if ([...nextPermissions].some((permission) => !priorPermissions.has(permission))) add("EXTERNAL_PERMISSIONS_INCREASED", identity, next);
    if ([...priorPermissions].some((permission) => !nextPermissions.has(permission))) add("EXTERNAL_PERMISSIONS_DECREASED", identity, next);
    if (!terminalInactiveStates.has(identity.providerNativeLifecycle) && terminalInactiveStates.has(next.providerNativeLifecycle)) add("EXTERNAL_IDENTITY_DEACTIVATED", identity, next);
    if (identity.providerNativeLifecycle !== next.providerNativeLifecycle && next.correctedByReferenceId) add("CONFLICTING_REGISTRY_STATE", identity, next);
    if (next.supersedesReferenceId || next.correctedByReferenceId) add("PROVIDER_CORRECTION", identity, next);
  }
  for (const [key, identity] of after) if (!before.has(key)) add("EXTERNAL_IDENTITY_APPEARED", null, identity);

  const byProviderIdentity = new Map<string, ExternalIdentityReference[]>();
  for (const identity of current) byProviderIdentity.set(identityKey(identity), [...(byProviderIdentity.get(identityKey(identity)) ?? []), identity]);
  for (const identities of byProviderIdentity.values()) {
    if (identities.length > 1) add("DUPLICATE_PROVIDER_IDENTITIES", null, identities[0]);
  }
  return changes;
}

export function applyExternalIdentityEvidence(entity: OperationalEntity, identities: ExternalIdentityReference[]): OperationalEntity {
  return { ...entity, externalIdentityReferences: identities.map((identity) => ({ ...identity, permissionsSummary: [...identity.permissionsSummary] })) };
}

export function evaluateFederatedIdentityContinuity(input: {
  entity: OperationalEntity;
  previousEntity: OperationalEntity;
  currentExternalIdentities: ExternalIdentityReference[];
  observedAt?: string;
}) {
  const changes = detectExternalIdentityChanges(input.previousEntity.externalIdentityReferences, input.currentExternalIdentities, input.observedAt);
  const changeTypes = new Set(changes.map((change) => change.type));
  const entity = applyExternalIdentityEvidence(input.entity, input.currentExternalIdentities);
  const continuity = evaluateOperationalEntityContinuity({
    entity,
    previousEntity: input.previousEntity,
    providerEvidenceChanged: changes.length > 0,
    authorityChanged: false,
    ownerChanged: changeTypes.has("EXTERNAL_OWNER_CHANGED"),
    runtimeChanged: changeTypes.has("EXTERNAL_IDENTITY_DEACTIVATED") || changeTypes.has("CONFLICTING_REGISTRY_STATE"),
    evidenceStale: changeTypes.has("EXTERNAL_IDENTITY_DISAPPEARED"),
  });
  return {
    entity,
    changes,
    continuity,
    trustDrift: changes.map((change) => change.type),
    canonicalReevaluationRequired: changes.length > 0,
  };
}

export function classifyEvidenceIndependence(input: {
  evidence: readonly ManagedControlEvidence[];
  controlOperator: string;
  technologyProvider: string;
}): EvidenceIndependence {
  const usable = input.evidence.filter((item) => item.claim !== "unknown" && item.sourceClassification !== "unconfirmed");
  if (!usable.length) return "insufficient";
  const claims = new Set(usable.map((item) => item.claim));
  if (claims.size > 1 || usable.some((item) => item.sourceClassification === "disputed")) return "conflicting";
  const parties = new Set(usable.map((item) => item.sourcePartyId));
  const providerOperatorSame = input.controlOperator === input.technologyProvider;
  if (providerOperatorSame) return "same_party_multi_system";
  if (parties.size === 1) return "single_source";
  const confirmation = usable.some((item) => ["destination_observed", "runtime_observed", "independently_corroborated", "human_reviewed"].includes(item.sourceClassification)
    && item.sourcePartyId !== input.technologyProvider
    && item.sourcePartyId !== input.controlOperator);
  return confirmation ? "independently_confirmed" : "multi_source";
}

export function evaluateEnforcementConfirmation(chain: EnforcementChain): EnforcementConfirmation {
  const findings: EnforcementFinding[] = [];
  const providerSuccess = chain.providerEnforcementClaim === "success";
  if (chain.providerAcknowledgement && !chain.providerEnforcementClaim) findings.push("ACKNOWLEDGED_NOT_CONFIRMED");
  if (providerSuccess && (!chain.destinationObservation || chain.destinationObservation === "unknown")) findings.push("PROVIDER_SUCCESS_UNCONFIRMED");
  if (chain.operatorRequest && (!chain.destinationObservation || chain.destinationObservation === "unknown")) findings.push("OPERATOR_SUCCESS_UNCONFIRMED");
  if (providerSuccess && chain.runtimeObservation === "not_enforced") findings.push("RUNTIME_CONTRADICTION", "RUNTIME_CONTRADICTS_PROVIDER");
  if (providerSuccess && chain.destinationObservation === "not_enforced") findings.push("DESTINATION_CONTRADICTION", "DESTINATION_CONTRADICTS_PROVIDER");
  if (chain.revocationClaimedAt && chain.accessObservedAt && Date.parse(chain.accessObservedAt) > Date.parse(chain.revocationClaimedAt) && chain.runtimeObservation === "not_enforced") findings.push("ACCESS_PERSISTS_AFTER_REVOCATION");
  if (chain.entityLifecycleState === "suspended" && chain.runtimeObservation === "not_enforced") findings.push("AGENT_ACTIVE_AFTER_SUSPENSION");
  if (chain.policyDecision === "DENY" && (chain.runtimeObservation === "not_enforced" || chain.destinationObservation === "not_enforced")) findings.push("ACTION_OCCURRED_AFTER_BLOCK");
  if (!chain.providerAcknowledgement || !chain.runtimeObservation || chain.runtimeObservation === "unknown" || !chain.destinationObservation || chain.destinationObservation === "unknown") findings.push("EVIDENCE_INSUFFICIENT", "REQUIRED_EVIDENCE_MISSING");
  const contradicted = findings.some((finding) => ["RUNTIME_CONTRADICTS_PROVIDER", "DESTINATION_CONTRADICTS_PROVIDER", "ACCESS_PERSISTS_AFTER_REVOCATION", "AGENT_ACTIVE_AFTER_SUSPENSION", "ACTION_OCCURRED_AFTER_BLOCK"].includes(finding));
  return { state: contradicted ? "contradicted" : providerSuccess && chain.runtimeObservation === "enforced" && chain.destinationObservation === "enforced" ? "confirmed" : "unknown", findings: [...new Set(findings)] };
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function createDecisionTimeSnapshot(input: Omit<DecisionTimeSnapshot, "snapshotVersion">): DecisionTimeSnapshot {
  return deepFreeze(structuredClone({ ...input, snapshotVersion: "1.0" as const })) as DecisionTimeSnapshot;
}

export function appendProviderEvidence(history: readonly ManagedControlEvidence[], evidence: ManagedControlEvidence): ManagedControlEvidence[] {
  if (history.some((item) => item.evidenceId === evidence.evidenceId)) return [...history];
  return [...history.map((item) => structuredClone(item)), structuredClone(evidence)];
}

export function detectMigrationGap(input: { oldProviderEvidence: readonly ManagedControlEvidence[]; exportedEvidenceIds: readonly string[] }) {
  const exported = new Set(input.exportedEvidenceIds);
  return input.oldProviderEvidence.filter((item) => !exported.has(item.evidenceId)).map((item) => item.evidenceId);
}

const materialProviderTrustMemoryEvents = new Set<MaterialProviderTrustMemoryEvent>([
  "CONTROL_ACTIVATED", "PROVIDER_ASSIGNED", "OPERATOR_ASSIGNED", "CONTROL_INDEPENDENTLY_CONFIRMED",
  "OPERATOR_PROVIDER_CONFLICT", "ENFORCEMENT_UNCONFIRMED", "DESTINATION_CONTRADICTION", "PROVIDER_REPLACED",
  "EVIDENCE_PORTABILITY_COMPLETED", "MIGRATION_EVIDENCE_GAP", "HISTORIC_EVIDENCE_RECOVERED", "PROVIDER_CORRECTION",
  "FALSE_POSITIVE_CONFLICT_RESOLVED",
]);

const providerTransitionTrustMemoryEvents = new Set<ProviderTransitionTrustMemoryEvent>([
  "PROVIDER_REPLACEMENT_STARTED", "PROVIDER_REPLACED", "EXTERNAL_IDENTITY_CHANGED", "PROVIDER_EVIDENCE_CONFLICT",
  "EVIDENCE_EXPORT_COMPLETED", "MIGRATION_GAP_DETECTED", "MIGRATION_GAP_RESOLVED", "HISTORICAL_EVIDENCE_VALIDATED",
  "CONTINUITY_PRESERVED", "CONTINUITY_REVIEW_REQUIRED",
]);

export function appendMaterialTrustMemoryEvent<T extends { eventId: string; eventType: MaterialProviderTrustMemoryEvent | ProviderTransitionTrustMemoryEvent }>(history: readonly T[], event: T): T[] {
  if (!materialProviderTrustMemoryEvents.has(event.eventType as MaterialProviderTrustMemoryEvent) && !providerTransitionTrustMemoryEvents.has(event.eventType as ProviderTransitionTrustMemoryEvent)) return [...history];
  if (history.some((item) => item.eventId === event.eventId)) return [...history];
  return [...history, event];
}

export function createProviderChangeEvent(event: ProviderChangeEvent): ProviderChangeEvent {
  if (!event.enterpriseId || !event.providerId || !event.operatorId) throw new TypeError("Provider change events require tenant, provider and operator attribution.");
  return deepFreeze(structuredClone(event)) as ProviderChangeEvent;
}

export function createProviderNeutralReplayEvent(event: ProviderNeutralReplayEvent): ProviderNeutralReplayEvent {
  if (!event.actorReference || !event.occurredAt) throw new TypeError("Replay events require an attributed actor and timestamp.");
  return deepFreeze(structuredClone(event)) as ProviderNeutralReplayEvent;
}

export function placeholderProviderAdapter(providerId: string) {
  return {
    providerId,
    status: "not_configured" as const,
    async collectEvidence() {
      return { status: "not_configured" as const, evidence: [] as ManagedControlEvidence[], reason: "Provider adapter credentials and endpoint are not configured." };
    },
  };
}

const forbiddenExportKeys = /credential|secret|token|password|biometric|rawPersonalData/i;

function sanitizeForExport(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeForExport);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !forbiddenExportKeys.test(key))
    .map(([key, child]) => [key, sanitizeForExport(child)]));
  return value;
}

export type ProviderExitPackage = {
  schemaVersion: "1.0";
  enterpriseId: string;
  provider: string;
  providerIdentity?: Record<string, unknown>;
  operator: string;
  serviceRelationship?: string;
  servicesOperated: string[];
  controlsOwnedOrOperated: string[];
  affectedOperationalEntities: string[];
  policiesAndVersions: string[];
  authorityLineageReferences: string[];
  responsibilityLineageReferences: string[];
  enforcementHistory: unknown[];
  historicalDecisions?: unknown[];
  incidents: unknown[];
  unresolvedContradictions: unknown[];
  pendingRemediation: unknown[];
  evidenceInventory: ManagedControlEvidence[];
  providerNativeReferences: string[];
  evidenceDigests: string[];
  replayReferences: string[];
  trustMemoryReferences?: string[];
  migrationGaps?: string[];
  exportTimestamp: string;
  canonicalPackageDigest: string;
};

export function createProviderExitPackage(input: Omit<ProviderExitPackage, "canonicalPackageDigest"> & { canonicalPackageDigest?: string }): ProviderExitPackage {
  const sanitized = sanitizeForExport(structuredClone(input)) as Omit<ProviderExitPackage, "canonicalPackageDigest">;
  return deepFreeze({ ...sanitized, canonicalPackageDigest: hashCanonical(sanitized) }) as ProviderExitPackage;
}

export function exportProviderExitPackage(input: ProviderExitPackage) {
  const packageRecord = createProviderExitPackage(input);
  const safeProvider = packageRecord.provider.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "provider";
  return {
    filename: `cyber-sentinels-provider-exit-${safeProvider}-${packageRecord.exportTimestamp.slice(0, 10)}.json`,
    mediaType: "application/json" as const,
    body: JSON.stringify(packageRecord, null, 2),
  };
}
