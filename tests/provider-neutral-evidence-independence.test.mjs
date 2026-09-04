import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  appendMaterialTrustMemoryEvent,
  appendProviderEvidence,
  classifyEvidenceIndependence,
  createDecisionTimeSnapshot,
  createProviderExitPackage,
  createProviderNeutralReplayEvent,
  detectExternalIdentityChanges,
  detectMigrationGap,
  evaluateExternalAgentIdentityAssurance,
  evaluateFederatedIdentityContinuity,
  evaluateEnforcementConfirmation,
  exportProviderExitPackage,
  placeholderProviderAdapter,
} from "../lib/operational-entities/federated-evidence.ts";
import {
  createOperationalActionEnvelope,
  createOperationalEntity,
  evaluateOperationalEntityContinuity,
  evaluateOperationalEntityTrust,
  resolveOperationalEntity,
} from "../lib/operational-entities/operational-entity.ts";

const at = "2026-08-08T10:00:00.000Z";

function identity(overrides = {}) {
  return {
    referenceId: "external:okta:alpha:v1",
    provider: "okta",
    providerEntityId: "alpha",
    builderPlatform: "agent-builder",
    providerNativeLifecycle: "active",
    providerOwner: "owner:alice",
    providerBusinessPurpose: "release automation",
    certificationState: "certified",
    permissionsSummary: ["read"],
    observedAt: at,
    sourceTimestamp: at,
    evidenceDigest: "a".repeat(64),
    correctedByReferenceId: null,
    supersedesReferenceId: null,
    ...overrides,
  };
}

function evidence(overrides = {}) {
  return {
    evidenceId: "evidence:provider:1",
    providerId: "provider:gateway",
    sourcePartyId: "party:gateway",
    sourceClassification: "technology_provider_asserted",
    claim: "success",
    providerNativeEventId: "native:1",
    normalizedEvidence: { outcome: "success" },
    evidenceDigest: "b".repeat(64),
    schemaVersion: "1.0",
    observedAt: at,
    supersedesEvidenceId: null,
    correctionOfEvidenceId: null,
    ...overrides,
  };
}

function entity(enterpriseId = "tenant:a", entityId = "entity:alpha") {
  return createOperationalEntity({
    entityId, enterpriseId, entityType: "ai_agent", displayReference: "Agent Alpha",
    canonicalTrustObjectId: `trust:${entityId}`, lifecycleState: "active", accountableOwnerId: "owner:alice",
    organizationReference: "org:acme", providerReferences: ["provider:gateway"], externalIdentityReferences: [identity()],
    identityProfileReference: `profile:${entityId}`, currentAuthorityReferences: ["authority:alpha"],
    environmentReferences: ["env:prod"], workflowReferences: ["workflow:release"], currentTrustState: "verified",
    currentEvidenceState: "current", currentConsequenceClassification: "high", canonicalDigest: "c".repeat(64),
  });
}

test("one Operational Entity retains multiple external provider identities without treating registry presence as trust", () => {
  const operationalEntity = { ...entity(), externalIdentityReferences: [identity(), identity({ referenceId: "external:microsoft:alpha:v1", provider: "microsoft", providerEntityId: "alpha-ms" })] };
  assert.equal(operationalEntity.externalIdentityReferences.length, 2);
  const envelope = createOperationalActionEnvelope({ entityId: operationalEntity.entityId, actionType: "deploy", objective: "release", tool: "gateway", target: "payments", resource: "repo", environment: "production", dataBoundary: "restricted", consequenceClassification: "high", authorityReference: "authority:alpha", policyReference: "policy:release", evidenceReferences: [], requestContext: { enterpriseId: operationalEntity.enterpriseId, actorId: "owner:alice", accountableOwnerId: "owner:alice" } });
  const result = evaluateOperationalEntityTrust({ entity: operationalEntity, actionEnvelope: envelope, authority: { isCurrent: true, isExpired: false, isRevoked: false }, evidence: { isCurrent: false, isStale: true, hasProviderConflict: false }, policy: {}, incidentState: null });
  assert.notEqual(result.decision, "ALLOW");
});

test("external owner changes and provider deactivation trigger continuity re-evaluation", () => {
  const ownerChanges = detectExternalIdentityChanges([identity()], [identity({ referenceId: "external:okta:alpha:v2", providerOwner: "owner:bob", supersedesReferenceId: "external:okta:alpha:v1" })]);
  assert.ok(ownerChanges.some((change) => change.type === "EXTERNAL_OWNER_CHANGED" && change.requiresCanonicalReevaluation));
  assert.ok(ownerChanges.some((change) => change.type === "PROVIDER_CORRECTION"));
  const deactivation = detectExternalIdentityChanges([identity()], [identity({ referenceId: "external:okta:alpha:v2", providerNativeLifecycle: "deactivated" })]);
  assert.ok(deactivation.some((change) => change.type === "EXTERNAL_IDENTITY_DEACTIVATED"));
  const federatedContinuity = evaluateFederatedIdentityContinuity({ entity: entity(), previousEntity: entity(), currentExternalIdentities: [identity({ referenceId: "external:okta:alpha:v2", providerNativeLifecycle: "deactivated" })], observedAt: at });
  assert.equal(federatedContinuity.canonicalReevaluationRequired, true);
  assert.ok(federatedContinuity.trustDrift.includes("EXTERNAL_IDENTITY_DEACTIVATED"));
  assert.equal(evaluateOperationalEntityContinuity({ entity: entity(), previousEntity: entity(), providerEvidenceChanged: true, authorityChanged: false, ownerChanged: true, runtimeChanged: false, evidenceStale: false }).state, "approved_change");
});

test("evidence independence uses legal source parties, not provider system count", () => {
  assert.equal(classifyEvidenceIndependence({ evidence: [evidence(), evidence({ evidenceId: "evidence:provider:2", providerNativeEventId: "native:2" })], controlOperator: "party:operator", technologyProvider: "party:gateway" }), "single_source");
  assert.equal(classifyEvidenceIndependence({ evidence: [evidence()], controlOperator: "party:gateway", technologyProvider: "party:gateway" }), "same_party_multi_system");
  assert.equal(classifyEvidenceIndependence({ evidence: [evidence(), evidence({ evidenceId: "evidence:destination", providerId: "destination:payments", sourcePartyId: "party:customer", sourceClassification: "destination_observed" })], controlOperator: "party:operator", technologyProvider: "party:gateway" }), "independently_confirmed");
  assert.equal(classifyEvidenceIndependence({ evidence: [evidence(), evidence({ evidenceId: "evidence:destination", sourcePartyId: "party:customer", sourceClassification: "destination_observed", claim: "failure" })], controlOperator: "party:operator", technologyProvider: "party:gateway" }), "conflicting");
});

test("enforcement keeps provider claim, runtime and destination observations separate", () => {
  const unconfirmed = evaluateEnforcementConfirmation({ policyDecision: "ALLOW", controlOwnerApproval: "approval:1", operatorRequest: "operator:1", technologyProviderRequest: "request:1", providerAcknowledgement: "ack:1", providerEnforcementClaim: "success", runtimeObservation: "unknown", destinationObservation: null, businessOutcome: null });
  assert.equal(unconfirmed.state, "unknown");
  assert.ok(unconfirmed.findings.includes("PROVIDER_SUCCESS_UNCONFIRMED"));
  const contradiction = evaluateEnforcementConfirmation({ policyDecision: "ALLOW", controlOwnerApproval: null, operatorRequest: "operator:1", technologyProviderRequest: "request:1", providerAcknowledgement: "ack:1", providerEnforcementClaim: "success", runtimeObservation: "enforced", destinationObservation: "not_enforced", businessOutcome: null });
  assert.equal(contradiction.state, "contradicted");
  assert.ok(contradiction.findings.includes("DESTINATION_CONTRADICTS_PROVIDER"));
  const persisted = evaluateEnforcementConfirmation({ policyDecision: "DENY", controlOwnerApproval: null, operatorRequest: null, technologyProviderRequest: "revoke:1", providerAcknowledgement: "ack:revoke", providerEnforcementClaim: "success", runtimeObservation: "not_enforced", destinationObservation: "not_enforced", businessOutcome: null, revocationClaimedAt: "2026-08-08T09:00:00.000Z", accessObservedAt: at });
  assert.ok(persisted.findings.includes("ACCESS_PERSISTS_AFTER_REVOCATION"));
  assert.ok(persisted.findings.includes("ACTION_OCCURRED_AFTER_BLOCK"));
});

test("decision-time snapshots are deep immutable", () => {
  const snapshot = createDecisionTimeSnapshot({ frozenAt: at, operationalEntityVersion: "version:1", externalIdentityReferences: [identity()], accountableHuman: "owner:alice", authorityLineageReferences: ["authority:1"], responsibilityLineage: { businessOwner: "owner:alice", controlOwner: "owner:alice", policyApprover: "approver:alice", controlOperator: "operator:mssp", technologyProvider: "provider:gateway", identityAuthorizationProvider: "provider:iam", operationalEntity: "entity:alpha", runtimeProvider: "provider:runtime", destinationSystem: "system:payments", evidenceProvider: "provider:evidence", independentConfirmationSource: "system:payments", reviewer: null }, providerHealth: { "provider:gateway": "available" }, providerEvidence: [evidence()], evidenceIndependence: "independently_confirmed", policyVersion: "policy:1", configurationRulesetDigest: "d".repeat(64), enforcementState: { policyDecision: "ALLOW", controlOwnerApproval: null, operatorRequest: null, technologyProviderRequest: null, providerAcknowledgement: null, providerEnforcementClaim: null, runtimeObservation: null, destinationObservation: null, businessOutcome: null }, contradictions: [], reviewerState: "not_required" });
  assert.throws(() => { snapshot.providerHealth["provider:gateway"] = "changed"; }, TypeError);
  assert.throws(() => { snapshot.externalIdentityReferences[0].providerOwner = "owner:bob"; }, TypeError);
});

test("provider replacement appends evidence, preserves history and detects migration gaps", () => {
  const oldEvidence = evidence({ evidenceId: "evidence:old", providerId: "provider:old" });
  const nextEvidence = evidence({ evidenceId: "evidence:new", providerId: "provider:new", supersedesEvidenceId: "evidence:old" });
  const history = appendProviderEvidence([oldEvidence], nextEvidence);
  assert.deepEqual(history.map((item) => item.evidenceId), ["evidence:old", "evidence:new"]);
  assert.equal(history[0].providerId, "provider:old");
  assert.deepEqual(detectMigrationGap({ oldProviderEvidence: [oldEvidence], exportedEvidenceIds: [] }), ["evidence:old"]);
});

test("Provider Exit Package retains historical references and strips forbidden data", () => {
  const packageRecord = createProviderExitPackage({ schemaVersion: "1.0", enterpriseId: "tenant:a", provider: "provider:old", operator: "operator:mssp", servicesOperated: ["gateway"], controlsOwnedOrOperated: ["control:1"], affectedOperationalEntities: ["entity:alpha"], policiesAndVersions: ["policy:1"], authorityLineageReferences: ["authority:1"], responsibilityLineageReferences: ["responsibility:1"], enforcementHistory: [{ event: "claim", token: "must-not-export" }], incidents: [], unresolvedContradictions: [], pendingRemediation: [], evidenceInventory: [evidence({ evidenceId: "evidence:old" })], providerNativeReferences: ["native:1"], evidenceDigests: ["b".repeat(64)], replayReferences: ["replay:1"], exportTimestamp: at });
  assert.equal(packageRecord.evidenceInventory[0].evidenceId, "evidence:old");
  assert.equal(JSON.stringify(packageRecord).includes("must-not-export"), false);
  const exported = exportProviderExitPackage(packageRecord);
  assert.equal(exported.mediaType, "application/json");
  assert.match(exported.filename, /provider-exit/);
  assert.equal(exported.body.includes("evidence:old"), true);
});

test("tenant resolution denies a cross-tenant Operational Entity", () => {
  assert.throws(() => resolveOperationalEntity({ requestedEntityId: "entity:foreign", tenantId: "tenant:a", knownEntities: [entity("tenant:a"), entity("tenant:b", "entity:foreign")], legacyHumanId: null, agentId: null, serviceIdentity: null, deviceIdentity: null, trustObjectReference: null }), (error) => error.code === "ENTITY_ACCESS_DENIED");
});

test("Replay attribution and Trust Memory materiality remain explicit and exactly once", () => {
  const replay = createProviderNeutralReplayEvent({ eventId: "replay:1", attribution: "PROVIDER_CLAIM", eventType: "PROVIDER_ENFORCEMENT_CLAIM", customer: "tenant:a", actorReference: "provider:gateway", operatorReference: "operator:mssp", providerReference: "provider:gateway", operationalEntityId: "entity:alpha", source: "provider callback", evidenceType: "execution", evidenceIndependence: "single_source", confidence: 0.8, evidenceReferences: ["evidence:1"], occurredAt: at });
  assert.equal(replay.attribution, "PROVIDER_CLAIM");
  const event = { eventId: "memory:1", eventType: "PROVIDER_REPLACED", occurredAt: at };
  const history = appendMaterialTrustMemoryEvent([], event);
  assert.equal(appendMaterialTrustMemoryEvent(history, event).length, 1);
  assert.equal(appendMaterialTrustMemoryEvent(history, { eventId: "memory:2", eventType: "NON_MATERIAL", occurredAt: at }).length, 1);
});

test("external-agent identity assurance separates identity evidence from authority state", () => {
  const outcome = evaluateExternalAgentIdentityAssurance({
    externalIdentityReferences: [identity({ provider: "okta", providerEntityId: "agent-alpha" })],
    providerEvidence: [evidence({ providerId: "provider:gateway", sourceClassification: "identity_provider_asserted", normalizedEvidence: { outcome: "success", principalReference: "agent-alpha" } })],
    authorityReference: "authority:alpha",
    authorityState: "expired",
    expectedPrincipalReference: "agent-alpha",
  });
  assert.equal(outcome.identityState, "verified");
  assert.equal(outcome.authorityState, "expired");
  assert.equal(outcome.state, "review_required");
  assert.ok(outcome.reasons.some((reason) => reason.toLowerCase().includes("authority")));
});

test("identity mismatch and provider revocation require review or deny without authorizing the action", () => {
  const mismatch = evaluateExternalAgentIdentityAssurance({
    externalIdentityReferences: [identity({ provider: "okta", providerEntityId: "agent-alpha" })],
    providerEvidence: [evidence({ providerId: "provider:gateway", sourceClassification: "identity_provider_asserted", normalizedEvidence: { outcome: "success", principalReference: "agent-beta" } })],
    authorityReference: "authority:alpha",
    authorityState: "current",
    expectedPrincipalReference: "agent-alpha",
  });
  assert.equal(mismatch.state, "mismatch");
  assert.ok(mismatch.reasons.some((reason) => reason.includes("principal")));

  const revoked = evaluateExternalAgentIdentityAssurance({
    externalIdentityReferences: [identity({ provider: "crowdstrike", providerEntityId: "agent-alpha", providerNativeLifecycle: "deactivated" })],
    providerEvidence: [],
    authorityReference: "authority:alpha",
    authorityState: "current",
  });
  assert.equal(revoked.state, "revoked");
  assert.ok(revoked.reasons.some((reason) => reason.includes("lifecycle")));
});

test("provider presence cannot verify identity without a successful attributable identity assertion", () => {
  const untrusted = evaluateExternalAgentIdentityAssurance({
    externalIdentityReferences: [identity({ providerEntityId: "agent-alpha" })],
    providerEvidence: [evidence({ claim: "unknown", normalizedEvidence: { principalReference: "agent-alpha" } })],
    authorityReference: "authority:alpha",
    authorityState: "current",
    expectedPrincipalReference: "agent-alpha",
  });
  assert.equal(untrusted.identityState, "unavailable");
  assert.equal(untrusted.state, "review_required");

  const noAuthority = evaluateExternalAgentIdentityAssurance({
    externalIdentityReferences: [identity({ providerEntityId: "agent-alpha" })],
    providerEvidence: [evidence({ sourceClassification: "identity_provider_asserted", normalizedEvidence: { principalReference: "agent-alpha" } })],
    expectedPrincipalReference: "agent-alpha",
  });
  assert.equal(noAuthority.identityState, "verified");
  assert.equal(noAuthority.authorityState, "unavailable");
  assert.equal(noAuthority.state, "review_required");
});

test("placeholder provider adapters report not_configured and never fabricate evidence", async () => {
  const result = await placeholderProviderAdapter("provider:future").collectEvidence();
  assert.equal(result.status, "not_configured");
  assert.deepEqual(result.evidence, []);
});

test("persistence and UI extend the existing canonical architecture", () => {
  const migration = readFileSync("supabase/migrations/202608080001_provider_neutral_evidence_independence.sql", "utf8");
  const transactionPage = readFileSync("app/trust/transactions/[transactionId]/page.tsx", "utf8");
  const entityApi = readFileSync("app/api/operational-entities/route.ts", "utf8");
  for (const table of ["operational_entity_external_identities", "provider_change_events", "canonical_enforcement_events"]) assert.match(migration, new RegExp(`alter table public\\.%I enable row level security[\\s\\S]*${table}|${table}[\\s\\S]*enable row level security`, "i"));
  assert.match(migration, /decision_time_snapshot[\s\S]*Canonical decision-time snapshot is immutable/i);
  assert.match(migration, /prevent_trust_architecture_history_mutation/);
  for (const section of ["Control responsibility", "Evidence independence", "Enforcement", "Provider history", "Current Provider", "Previous Provider", "Evidence Gaps"]) assert.match(transactionPage, new RegExp(section, "i"));
  assert.doesNotMatch(entityApi, /operationalEntityFixtures/);
});
