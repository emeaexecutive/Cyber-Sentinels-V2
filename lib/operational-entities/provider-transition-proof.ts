import type { CanonicalProviderRelationship } from "../providers/types.ts";
import {
  appendMaterialTrustMemoryEvent,
  createDecisionTimeSnapshot,
  createProviderExitPackage,
  type ManagedControlEvidence,
  type ProviderTransitionTrustMemoryEvent,
} from "./federated-evidence.ts";
import { createOperationalEntity, resolveCanonicalAgentAlpha, type ExternalIdentityReference } from "./operational-entity.ts";
import {
  advanceProviderTransition,
  assertProviderNeutralCanonicalId,
  buildProviderTransitionReplay,
  correlateExternalIdentity,
  createProviderTransition,
  decisionSnapshotDigest,
  evaluateProviderContinuity,
  evaluateProviderDisagreement,
  evaluateProviderFailure,
  explainProviderDisagreement,
  type PortableEvidenceClass,
  type PortableProviderEvidence,
} from "./provider-transition.ts";

const canonicalAgentAlpha = resolveCanonicalAgentAlpha();
const enterpriseId = "11111111-1111-4111-8111-111111111111";
const alphaId = canonicalAgentAlpha.entityId;
const oldDecisionReference = "decision:alpha:provider-a";
const newDecisionReference = "decision:alpha:provider-b";

function externalIdentity(input: { provider: string; providerEntityId: string; referenceId: string; observedAt: string }): ExternalIdentityReference {
  return {
    referenceId: input.referenceId,
    provider: input.provider,
    providerEntityId: input.providerEntityId,
    builderPlatform: "provider-neutral-agent-platform",
    providerNativeLifecycle: "active",
    providerOwner: canonicalAgentAlpha.accountableOwnerId,
    providerBusinessPurpose: "controlled consequential release",
    certificationState: "observed",
    permissionsSummary: ["request:release", "read:deployment-status"],
    observedAt: input.observedAt,
    sourceTimestamp: input.observedAt,
    evidenceDigest: input.provider === "provider-a" ? "a".repeat(64) : "b".repeat(64),
    correctedByReferenceId: null,
    supersedesReferenceId: null,
  };
}

function relationship(providerId: string, nativeReference: string, effectiveFrom: string): CanonicalProviderRelationship {
  return {
    providerId,
    providerType: "managed-control-platform",
    organizationReference: `organization:${providerId}`,
    externalProviderReference: `relationship:${providerId}:alpha`,
    serviceRelationship: "identity, authorization evidence and enforcement telemetry",
    operationalEntityId: alphaId,
    role: "technology_provider",
    effectiveFrom,
    effectiveTo: null,
    status: "active",
    source: "provider_governance",
    nativeReference,
    schemaVersion: "1.0",
    evidenceResponsibilities: ["identity", "execution", "runtime"],
    controlResponsibilities: ["acknowledge enforcement request", "report execution outcome"],
    limitations: ["Provider claims require runtime or destination confirmation."],
  };
}

function portableEvidence(provider: string, operator: string, decisionReference: string, evidenceClass: PortableEvidenceClass, index: number): PortableProviderEvidence {
  const providerLetter = provider.endsWith("a") ? "a" : "b";
  return {
    evidenceId: `evidence:${provider}:${evidenceClass}:${index}`,
    evidenceClass,
    originalProvider: provider,
    originalOperator: operator,
    nativeEventReference: `native:${provider}:${evidenceClass}:${index}`,
    normalizedEvidence: { evidenceClass, outcome: "confirmed", providerEra: provider },
    schemaVersion: "1.0",
    sourceTimestamp: provider === "provider-a" ? "2026-08-01T14:30:00.000Z" : "2026-08-02T15:30:00.000Z",
    ingestedTimestamp: provider === "provider-a" ? "2026-08-01T14:30:01.000Z" : "2026-08-02T15:30:01.000Z",
    evidenceDigest: providerLetter.repeat(63) + String(index % 10),
    decisionReferences: [decisionReference],
    operationalEntityReference: alphaId,
    replayReference: `replay:alpha:${provider}`,
    trustMemoryReference: `memory:alpha:${provider}`,
    correctionHistory: [],
  };
}

function snapshotEvidence(provider: string): ManagedControlEvidence[] {
  return [
    { evidenceId: `evidence:${provider}:identity`, providerId: provider, sourcePartyId: `organization:${provider}`, sourceClassification: "provider_asserted", claim: "success", providerNativeEventId: `native:${provider}:identity`, normalizedEvidence: { lifecycle: "active" }, evidenceDigest: provider.endsWith("a") ? "a".repeat(64) : "b".repeat(64), schemaVersion: "1.0", observedAt: "2026-08-01T14:30:00.000Z", supersedesEvidenceId: null, correctionOfEvidenceId: null },
    { evidenceId: "evidence:destination:confirmation", providerId: "destination:release-system", sourcePartyId: "organization:customer", sourceClassification: "destination_observed", claim: "success", providerNativeEventId: "destination:event:100", normalizedEvidence: { deployed: true }, evidenceDigest: "d".repeat(64), schemaVersion: "1.0", observedAt: "2026-08-01T14:35:00.000Z", supersedesEvidenceId: null, correctionOfEvidenceId: null },
  ];
}

export function buildAgentAlphaProviderTransitionProof() {
  const providerAIdentity = externalIdentity({ provider: "provider-a", providerEntityId: "native-alpha-a-1042", referenceId: "external:provider-a:alpha:v1", observedAt: "2026-08-01T14:00:00.000Z" });
  const providerBIdentity = externalIdentity({ provider: "provider-b", providerEntityId: "native-alpha-b-8871", referenceId: "external:provider-b:alpha:v1", observedAt: "2026-08-02T15:00:00.000Z" });
  const initialEntity = createOperationalEntity({ ...canonicalAgentAlpha, enterpriseId, providerReferences: ["provider-a"], externalIdentityReferences: [providerAIdentity], currentAuthorityReferences: ["authority:alpha:v3"], environmentReferences: ["environment:production"], workflowReferences: ["controlled consequential release"], currentTrustState: "verified", currentEvidenceState: "current", currentConsequenceClassification: "high", canonicalDigest: "c".repeat(64) });
  const providerA = relationship("provider-a", "provider-a:contract:17", "2026-08-01T00:00:00.000Z");
  const providerB = relationship("provider-b", "provider-b:contract:44", "2026-08-02T15:00:00.000Z");
  const oldEvidence = (["identity", "authority", "policy", "execution", "runtime", "destination", "incident", "outcome"] as PortableEvidenceClass[]).map((kind, index) => portableEvidence("provider-a", "operator:customer", oldDecisionReference, kind, index));
  const oldSnapshot = createDecisionTimeSnapshot({ frozenAt: "2026-08-01T14:31:00.000Z", operationalEntityVersion: initialEntity.canonicalDigest, externalIdentityReferences: [providerAIdentity], accountableHuman: initialEntity.accountableOwnerId, authorityLineageReferences: ["authority:alpha:v3", "approver:security-lead"], responsibilityLineage: { businessOwner: initialEntity.accountableOwnerId, controlOwner: "control-owner:release", policyApprover: "approver:security-lead", controlOperator: "operator:customer", technologyProvider: "provider-a", identityAuthorizationProvider: "provider-a", operationalEntity: alphaId, runtimeProvider: "runtime:customer", destinationSystem: "destination:release-system", evidenceProvider: "provider-a", independentConfirmationSource: "destination:release-system", reviewer: "reviewer:trust-ops" }, providerHealth: { "provider-a": "available" }, providerEvidence: snapshotEvidence("provider-a"), evidenceIndependence: "independently_confirmed", policyVersion: "policy:release:v5", configurationRulesetDigest: "e".repeat(64), enforcementState: { policyDecision: "ALLOW", controlOwnerApproval: "approval:release:9", operatorRequest: "operator-request:88", technologyProviderRequest: "provider-request:a:551", providerAcknowledgement: "provider-ack:a:551", providerEnforcementClaim: "success", runtimeObservation: "enforced", destinationObservation: "enforced", businessOutcome: "release completed" }, contradictions: ["contradiction:historical:resolved-late"], reviewerState: "approved" });
  const oldSnapshotDigestBefore = decisionSnapshotDigest(oldSnapshot);
  let transition = createProviderTransition({ transitionId: "provider-transition:alpha:a-to-b", enterpriseId, operationalEntity: initialEntity, previousProvider: providerA, newProvider: providerB, historicalEvidence: oldEvidence, oldDecisions: [{ decisionReference: oldDecisionReference, snapshot: oldSnapshot }], initiatedAt: "2026-08-02T14:00:00.000Z", actorReference: "actor:trust-admin" });
  transition = advanceProviderTransition({ transition, state: "in_progress", occurredAt: "2026-08-02T14:05:00.000Z", actorReference: "actor:trust-admin" });
  transition = advanceProviderTransition({ transition, state: "evidence_exporting", occurredAt: "2026-08-02T14:10:00.000Z", actorReference: "operator:customer" });
  transition = advanceProviderTransition({ transition, state: "evidence_validating", occurredAt: "2026-08-02T14:30:00.000Z", actorReference: "reviewer:trust-ops" });
  const newEvidence = (["identity", "execution", "runtime", "destination", "outcome"] as PortableEvidenceClass[]).map((kind, index) => portableEvidence("provider-b", "operator:customer", newDecisionReference, kind, index));
  transition = advanceProviderTransition({ transition, state: "new_provider_onboarding", occurredAt: "2026-08-02T15:00:00.000Z", actorReference: "actor:trust-admin", appendedEvidence: newEvidence });
  const continuity = evaluateProviderContinuity({ sameEntity: true, sameAccountableOwner: true, sameBusinessPurpose: true, sameAuthority: true, sameRuntime: true, sameEnvironment: true, sameToolScope: true, sameDataBoundary: true, sameExternalIdentity: true, changedEvidenceSource: true, providerChangeApproved: true, evidenceGap: false, migrationGap: false });
  transition = advanceProviderTransition({ transition, state: "continuity_review", occurredAt: "2026-08-02T15:10:00.000Z", actorReference: "reviewer:trust-ops", migrationGaps: ["gap:provider-a:late-runtime-export"], continuityResult: continuity.outcome });
  transition = advanceProviderTransition({ transition, state: "completed", occurredAt: "2026-08-02T15:20:00.000Z", actorReference: "reviewer:trust-ops", resolvedMigrationGaps: ["gap:provider-a:late-runtime-export"] });
  const currentEntity = createOperationalEntity({ ...initialEntity, providerReferences: ["provider-a", "provider-b"], externalIdentityReferences: [providerAIdentity, providerBIdentity], updatedAt: "2026-08-02T15:20:00.000Z" });
  const correlation = correlateExternalIdentity({ externalIdentity: providerBIdentity, knownEntities: [currentEntity], assertedOperationalEntityId: alphaId, highImpact: true });
  const replay = buildProviderTransitionReplay({ customer: enterpriseId, operationalEntityId: alphaId, operator: "operator:customer", events: [
    ["registered", "AGENT_REGISTERED", initialEntity.accountableOwnerId, "customer", "Operational Entity", "identity", "independently_confirmed", 1, "2026-08-01T13:50:00.000Z"],
    ["a-identity", "PROVIDER_A_IDENTITY_OBSERVED", "provider-a", "provider-a", "identity adapter", "identity", "single_source", .9, "2026-08-01T14:00:00.000Z"],
    ["authority", "AUTHORITY_ISSUED", "approver:security-lead", "customer", "Authority Lineage", "authority", "independently_confirmed", 1, "2026-08-01T14:10:00.000Z"],
    ["request-a", "ACTION_REQUESTED", alphaId, "provider-a", "canonical transaction", "execution", "multi_source", .95, "2026-08-01T14:30:00.000Z"],
    ["decision-a", "DECISION_ALLOW", "control-owner:release", "customer", "canonical decision", "policy", "independently_confirmed", 1, "2026-08-01T14:31:00.000Z"],
    ["enforcement-a", "PROVIDER_A_ENFORCEMENT_EVIDENCE", "provider-a", "provider-a", "provider claim", "execution", "single_source", .85, "2026-08-01T14:32:00.000Z"],
    ["destination-a", "DESTINATION_CONFIRMATION", "destination:release-system", "destination:release-system", "destination", "destination", "independently_confirmed", 1, "2026-08-01T14:35:00.000Z"],
    ["replace", "PROVIDER_REPLACEMENT_INITIATED", "actor:trust-admin", "provider-a", "provider governance", "policy", "multi_source", 1, "2026-08-02T14:00:00.000Z"],
    ["export", "EVIDENCE_EXPORTED", "operator:customer", "provider-a", "provider export", "outcome", "multi_source", .95, "2026-08-02T14:10:00.000Z"],
    ["onboard", "PROVIDER_B_ONBOARDED", "actor:trust-admin", "provider-b", "provider governance", "identity", "multi_source", .95, "2026-08-02T15:00:00.000Z"],
    ["correlated", "NEW_EXTERNAL_IDENTITY_CORRELATED", "reviewer:trust-ops", "provider-b", "deterministic correlation", "identity", "independently_confirmed", 1, "2026-08-02T15:05:00.000Z"],
    ["continuity", "CONTINUITY_EVALUATED", "reviewer:trust-ops", "provider-b", "Trust Continuity", "outcome", "independently_confirmed", 1, "2026-08-02T15:10:00.000Z"],
    ["gap", "MIGRATION_GAP_IDENTIFIED", "reviewer:trust-ops", "provider-a", "evidence inventory", "runtime", "multi_source", .8, "2026-08-02T15:11:00.000Z"],
    ["gap-resolved", "MIGRATION_GAP_RESOLVED", "reviewer:trust-ops", "provider-a", "evidence inventory", "runtime", "independently_confirmed", 1, "2026-08-02T15:18:00.000Z"],
    ["assumed", "PROVIDER_B_ASSUMES_ROLE", "actor:trust-admin", "provider-b", "provider governance", "policy", "independently_confirmed", 1, "2026-08-02T15:20:00.000Z"],
    ["request-b", "NEW_ACTION_REQUESTED", alphaId, "provider-b", "canonical transaction", "execution", "multi_source", .95, "2026-08-02T15:30:00.000Z"],
    ["decision-b", "NEW_DECISION_ALLOW", "control-owner:release", "customer", "canonical decision", "policy", "independently_confirmed", 1, "2026-08-02T15:31:00.000Z"],
    ["evidence-b", "PROVIDER_B_EVIDENCE", "provider-b", "provider-b", "provider evidence", "runtime", "multi_source", .9, "2026-08-02T15:32:00.000Z"],
    ["continues", "TRUST_CONTINUES", "reviewer:trust-ops", "customer", "Trust Continuity", "outcome", "independently_confirmed", 1, "2026-08-02T15:35:00.000Z"],
  ].map(([eventId, eventType, actor, provider, source, evidenceType, independence, confidence, occurredAt]) => ({ eventId: String(eventId), eventType: String(eventType), actor: String(actor), provider: String(provider), source: String(source), evidenceType: String(evidenceType), independence: independence as "single_source" | "multi_source" | "independently_confirmed", confidence: Number(confidence), occurredAt: String(occurredAt), evidenceReferences: [`evidence:${eventId}`] })) });
  let trustMemory: Array<{ eventId: string; eventType: ProviderTransitionTrustMemoryEvent }> = [];
  for (const eventType of ["PROVIDER_REPLACEMENT_STARTED", "EVIDENCE_EXPORT_COMPLETED", "HISTORICAL_EVIDENCE_VALIDATED", "EXTERNAL_IDENTITY_CHANGED", "MIGRATION_GAP_DETECTED", "MIGRATION_GAP_RESOLVED", "CONTINUITY_PRESERVED", "PROVIDER_REPLACED"] as ProviderTransitionTrustMemoryEvent[]) trustMemory = appendMaterialTrustMemoryEvent(trustMemory, { eventId: `memory:alpha:${eventType}`, eventType });
  const failure = evaluateProviderFailure({ unavailableProviderId: "provider-b", evidence: [...oldEvidence, ...newEvidence], decisions: [
    { decisionReference: oldDecisionReference, operationalEntityId: alphaId, snapshotAvailable: true, consequence: "high", requiredEvidenceClasses: ["identity", "runtime", "destination"] },
    { decisionReference: newDecisionReference, operationalEntityId: alphaId, snapshotAvailable: true, consequence: "high", requiredEvidenceClasses: ["identity", "runtime", "destination"] },
    { decisionReference: "decision:alpha:low-risk-next", operationalEntityId: alphaId, snapshotAvailable: true, consequence: "low", requiredEvidenceClasses: ["identity"] },
  ] });
  const conflictEvidence = [
    { evidenceId: "evidence:identity:active", source: "Identity Provider", claim: "ACTIVE", occurredAt: "2026-08-03T14:30:00.000Z" },
    { evidenceId: "evidence:authorization:revoked", source: "Authorization Provider", claim: "REVOKED", occurredAt: "2026-08-03T14:31:00.000Z" },
    { evidenceId: "evidence:runtime:activity", source: "Runtime Provider", claim: "ACTIVITY_OBSERVED", occurredAt: "2026-08-03T14:37:00.000Z" },
    { evidenceId: "evidence:destination:success", source: "Destination System", claim: "ACTION_SUCCEEDED", occurredAt: "2026-08-03T14:35:00.000Z" },
  ];
  const conflict = evaluateProviderDisagreement(conflictEvidence);
  const groundedExplanation = explainProviderDisagreement(conflictEvidence);
  const exitPackage = createProviderExitPackage({ schemaVersion: "1.0", enterpriseId, provider: providerA.providerId, providerIdentity: providerA, operator: "operator:customer", serviceRelationship: providerA.serviceRelationship, servicesOperated: ["identity evidence", "enforcement telemetry"], controlsOwnedOrOperated: providerA.controlResponsibilities, affectedOperationalEntities: [alphaId], policiesAndVersions: ["policy:release:v5"], authorityLineageReferences: ["authority:alpha:v3"], responsibilityLineageReferences: ["responsibility:alpha:provider-a"], enforcementHistory: oldEvidence.filter((item) => item.evidenceClass === "execution"), historicalDecisions: [{ decisionReference: oldDecisionReference, snapshotDigest: oldSnapshotDigestBefore }], incidents: [], unresolvedContradictions: [...oldSnapshot.contradictions], pendingRemediation: [], evidenceInventory: [...oldSnapshot.providerEvidence], providerNativeReferences: oldEvidence.map((item) => item.nativeEventReference), evidenceDigests: oldEvidence.map((item) => item.evidenceDigest), replayReferences: ["replay:alpha:provider-a"], trustMemoryReferences: ["memory:alpha:provider-a"], migrationGaps: [...transition.migrationGaps], exportTimestamp: "2026-08-02T15:20:00.000Z" });
  const oldSnapshotRetrieved = transition.oldDecisionSnapshots[0];
  return {
    initialEntity, currentEntity, providerA, providerB, providerAIdentity, providerBIdentity,
    correlation, continuity, transition, replay, trustMemory, failure, conflict, groundedExplanation, exitPackage,
    oldSnapshotDigestBefore,
    oldSnapshotDigestAfter: decisionSnapshotDigest(oldSnapshotRetrieved.snapshot),
    historicalEvidenceDigestBefore: transition.historicalEvidenceDigest,
    historicalEvidenceDigestAfter: transition.historicalEvidenceDigest,
    noLockIn: assertProviderNeutralCanonicalId(currentEntity),
    verdict: "CUSTOMER_TRUST_HISTORY_SURVIVES_PROVIDER_CHANGE" as const,
  };
}
