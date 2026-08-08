import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { classifyEvidenceIndependence, evaluateEnforcementConfirmation, placeholderProviderAdapter } from "../lib/operational-entities/federated-evidence.ts";
import { buildAgentAlphaProviderTransitionProof } from "../lib/operational-entities/provider-transition-proof.ts";
import { correlateExternalIdentity, assertProviderNeutralCanonicalId, decisionSnapshotDigest } from "../lib/operational-entities/provider-transition.ts";
import { createOperationalEntity } from "../lib/operational-entities/operational-entity.ts";

const proof = buildAgentAlphaProviderTransitionProof();

test("Agent Alpha remains one provider-neutral Operational Entity across replacement", () => {
  assert.equal(proof.initialEntity.entityId, "entity:agent-alpha");
  assert.equal(proof.currentEntity.entityId, proof.initialEntity.entityId);
  assert.equal(proof.initialEntity.canonicalTrustObjectId, proof.currentEntity.canonicalTrustObjectId);
  assert.equal(proof.currentEntity.currentTrustState, "verified");
  assert.equal(proof.noLockIn.valid, true);
  assertProviderNeutralCanonicalId(proof.currentEntity);
});

test("canonical provider relationships preserve role, organization, native reference and responsibilities", () => {
  for (const provider of [proof.providerA, proof.providerB]) {
    for (const field of ["providerId", "providerType", "organizationReference", "externalProviderReference", "serviceRelationship", "operationalEntityId", "role", "effectiveFrom", "status", "source", "nativeReference", "schemaVersion", "evidenceResponsibilities", "controlResponsibilities", "limitations"]) assert.ok(field in provider, `${field} missing`);
    assert.equal(provider.role, "technology_provider");
  }
  assert.notEqual(proof.providerA.organizationReference, proof.providerB.organizationReference);
});

test("external identities and both provider-native IDs remain attributable", () => {
  assert.equal(proof.currentEntity.externalIdentityReferences.length, 2);
  assert.deepEqual(proof.currentEntity.externalIdentityReferences.map((item) => item.providerEntityId), ["native-alpha-a-1042", "native-alpha-b-8871"]);
  assert.equal(proof.correlation.outcome, "MATCHED");
  assert.equal(proof.correlation.automaticallyMerged, false);
});

test("deterministic identity correlation reviews uncertainty and rejects wrong links", () => {
  const uncertain = { ...proof.providerBIdentity, provider: "provider-c", providerEntityId: "unseen-alpha", referenceId: "external:provider-c:alpha" };
  const probable = correlateExternalIdentity({ externalIdentity: uncertain, knownEntities: [proof.currentEntity], assertedOperationalEntityId: proof.currentEntity.entityId, highImpact: true });
  assert.ok(["PROBABLE_MATCH_REVIEW_REQUIRED", "CONFLICTING_IDENTITY"].includes(probable.outcome));
  assert.equal(probable.humanReviewRequired, true);
  assert.equal(probable.automaticallyMerged, false);
  const other = createOperationalEntity({ ...proof.currentEntity, entityId: "entity:other", canonicalTrustObjectId: "trust-object:other", identityProfileReference: "profile:other", externalIdentityReferences: [proof.providerBIdentity] });
  const wrong = correlateExternalIdentity({ externalIdentity: proof.providerBIdentity, knownEntities: [proof.currentEntity, other], assertedOperationalEntityId: proof.currentEntity.entityId, highImpact: true });
  assert.equal(wrong.outcome, "CONFLICTING_IDENTITY");
  assert.equal(wrong.humanReviewRequired, true);
  const nameOnly = correlateExternalIdentity({ externalIdentity: uncertain, knownEntities: [{ ...proof.currentEntity, displayReference: "Unseen Alpha" }], highImpact: true });
  assert.equal(nameOnly.outcome, "NEW_EXTERNAL_IDENTITY");
});

test("provider correction is explicit and never merges by display metadata", () => {
  const corrected = { ...proof.providerBIdentity, referenceId: "external:provider-b:alpha:v2", supersedesReferenceId: proof.providerBIdentity.referenceId };
  const entityWithCorrection = { ...proof.currentEntity, externalIdentityReferences: [...proof.currentEntity.externalIdentityReferences, corrected] };
  const result = correlateExternalIdentity({ externalIdentity: corrected, knownEntities: [entityWithCorrection] });
  assert.equal(result.outcome, "SUPERSEDED_EXTERNAL_IDENTITY");
  assert.equal(result.operationalEntityId, proof.currentEntity.entityId);
});

test("provider transition freezes Provider A and appends Provider B evidence", () => {
  assert.equal(proof.transition.state, "completed");
  assert.equal(proof.transition.previousProvider.providerId, "provider-a");
  assert.equal(proof.transition.newProvider.providerId, "provider-b");
  assert.ok(proof.transition.frozenHistoricalEvidence.every((item) => item.originalProvider === "provider-a"));
  assert.ok(proof.transition.appendedEvidence.every((item) => item.originalProvider === "provider-b"));
  assert.equal(new Set([...proof.transition.frozenHistoricalEvidence, ...proof.transition.appendedEvidence].map((item) => item.evidenceId)).size, proof.transition.frozenHistoricalEvidence.length + proof.transition.appendedEvidence.length);
  assert.deepEqual(proof.transition.migrationGaps, []);
  assert.deepEqual(proof.transition.resolvedMigrationGaps, ["gap:provider-a:late-runtime-export"]);
  assert.equal(proof.continuity.outcome, "APPROVED_PROVIDER_CHANGE");
});

test("portable evidence covers every required evidence family and retains lineage", () => {
  assert.deepEqual(new Set(proof.transition.frozenHistoricalEvidence.map((item) => item.evidenceClass)), new Set(["identity", "authority", "policy", "execution", "runtime", "destination", "incident", "outcome"]));
  for (const item of proof.transition.frozenHistoricalEvidence) {
    assert.equal(item.originalProvider, "provider-a");
    assert.match(item.nativeEventReference, /^native:provider-a:/);
    assert.ok(item.decisionReferences.includes("decision:alpha:provider-a"));
    assert.equal(item.operationalEntityReference, proof.initialEntity.entityId);
    assert.ok(item.replayReference && item.trustMemoryReference && item.evidenceDigest);
  }
});

test("historical decision and evidence digests remain unchanged after replacement", () => {
  assert.equal(proof.oldSnapshotDigestAfter, proof.oldSnapshotDigestBefore);
  assert.equal(proof.historicalEvidenceDigestAfter, proof.historicalEvidenceDigestBefore);
  assert.equal(decisionSnapshotDigest(proof.transition.oldDecisionSnapshots[0].snapshot), proof.oldSnapshotDigestBefore);
  assert.ok(proof.transition.oldDecisionSnapshots[0].snapshot.authorityLineageReferences.includes("authority:alpha:v3"));
  assert.deepEqual(proof.transition.oldDecisionSnapshots[0].snapshot.contradictions, ["contradiction:historical:resolved-late"]);
});

test("same-party systems never qualify as independent confirmation", () => {
  const sameParty = [1, 2, 3].map((index) => ({ evidenceId: `e:${index}`, providerId: `provider-a:system-${index}`, sourcePartyId: "organization:provider-a", sourceClassification: index === 1 ? "provider_asserted" : "runtime_observed", claim: "success", providerNativeEventId: `n:${index}`, normalizedEvidence: {}, evidenceDigest: String(index).repeat(64), schemaVersion: "1", observedAt: "2026-08-01T00:00:00.000Z", supersedesEvidenceId: null, correctionOfEvidenceId: null }));
  assert.equal(classifyEvidenceIndependence({ evidence: sameParty, controlOperator: "organization:provider-a", technologyProvider: "organization:provider-a" }), "same_party_multi_system");
});

test("enforcement truth reports acknowledgement, runtime and destination gaps separately", () => {
  const acknowledged = evaluateEnforcementConfirmation({ policyDecision: "ALLOW", controlOwnerApproval: "approval", operatorRequest: "operator-request", technologyProviderRequest: "provider-request", providerAcknowledgement: "ack", providerEnforcementClaim: null, runtimeObservation: null, destinationObservation: null, businessOutcome: null });
  assert.ok(acknowledged.findings.includes("ACKNOWLEDGED_NOT_CONFIRMED"));
  assert.ok(acknowledged.findings.includes("EVIDENCE_INSUFFICIENT"));
  const contradicted = evaluateEnforcementConfirmation({ policyDecision: "ALLOW", controlOwnerApproval: "approval", operatorRequest: "operator-request", technologyProviderRequest: "provider-request", providerAcknowledgement: "ack", providerEnforcementClaim: "success", runtimeObservation: "not_enforced", destinationObservation: "not_enforced", businessOutcome: null });
  assert.ok(contradicted.findings.includes("RUNTIME_CONTRADICTION"));
  assert.ok(contradicted.findings.includes("DESTINATION_CONTRADICTION"));
});

test("Provider Exit Package is complete, sanitized and canonically digested", () => {
  assert.equal(proof.exitPackage.provider, "provider-a");
  assert.ok(proof.exitPackage.historicalDecisions.length);
  assert.ok(proof.exitPackage.providerNativeReferences.every((reference) => reference.startsWith("native:provider-a:")));
  assert.equal(proof.exitPackage.canonicalPackageDigest.length, 64);
  assert.doesNotMatch(JSON.stringify(proof.exitPackage), /secret|privateKey|rawBiometric|accessToken/i);
});

test("provider failure preserves history while current actions REVIEW or DENY", () => {
  assert.equal(proof.failure.historicalTrustRecordAvailable, true);
  assert.ok(proof.failure.explainableHistoricalDecisions.includes("decision:alpha:provider-a"));
  assert.ok(proof.failure.deniedActions.includes("decision:alpha:provider-b"));
  assert.ok(proof.failure.reviewActions.includes("decision:alpha:low-risk-next"));
  assert.deepEqual(proof.failure.affectedOperationalEntities, [proof.initialEntity.entityId]);
  assert.ok(proof.failure.evidenceRemaining.every((reference) => reference.includes("provider-a")));
});

test("multi-provider disagreement remains evidence conflict, not misconduct", () => {
  assert.equal(proof.conflict.classification, "CONFLICTING_EVIDENCE");
  assert.equal(proof.conflict.fraudOrMisconductClaimed, false);
  assert.equal(proof.conflict.evidence.length, 4);
  assert.equal(proof.groundedExplanation.determinesProviderHonesty, false);
  assert.equal(proof.groundedExplanation.determinesMaliciousIntent, false);
  for (const evidence of proof.conflict.evidence) {
    assert.ok(proof.groundedExplanation.citations.includes(evidence.evidenceId));
    assert.ok(proof.groundedExplanation.explanation.includes(`[${evidence.evidenceId}]`));
  }
});

test("Replay spans both provider eras with complete attribution", () => {
  assert.ok(proof.replay.some((event) => event.providerReference === "provider-a"));
  assert.ok(proof.replay.some((event) => event.providerReference === "provider-b"));
  assert.ok(proof.replay.some((event) => event.eventType === "MIGRATION_GAP_IDENTIFIED"));
  assert.ok(proof.replay.some((event) => event.eventType === "MIGRATION_GAP_RESOLVED"));
  for (const event of proof.replay) for (const field of ["customer", "actorReference", "operatorReference", "providerReference", "operationalEntityId", "source", "evidenceType", "evidenceIndependence", "confidence", "occurredAt"]) assert.notEqual(event[field], undefined, `${field} missing`);
});

test("Trust Memory records provider transition events exactly once", () => {
  assert.equal(new Set(proof.trustMemory.map((event) => event.eventId)).size, proof.trustMemory.length);
  for (const kind of ["PROVIDER_REPLACEMENT_STARTED", "PROVIDER_REPLACED", "EXTERNAL_IDENTITY_CHANGED", "EVIDENCE_EXPORT_COMPLETED", "MIGRATION_GAP_DETECTED", "MIGRATION_GAP_RESOLVED", "HISTORICAL_EVIDENCE_VALIDATED", "CONTINUITY_PRESERVED"]) assert.ok(proof.trustMemory.some((event) => event.eventType === kind), kind);
});

test("architecture and UI prove portability without a parallel shell or fabricated evidence", async () => {
  const architecture = readFileSync("docs/architecture/PROVIDER_NEUTRAL_EVIDENCE_INDEPENDENCE.md", "utf8");
  const page = readFileSync("app/operational-entities/page.tsx", "utf8");
  const detailPage = readFileSync("app/operational-entities/[entityId]/page.tsx", "utf8");
  const server = readFileSync("lib/operational-entities/server.ts", "utf8");
  assert.match(architecture, /IDENTITY PROVIDERS MAY CHANGE/);
  assert.match(architecture, /CANONICAL OPERATIONAL ENTITY AND HISTORICAL TRUST RECORD MUST SURVIVE/);
  assert.doesNotMatch(page, /buildAgentAlphaProviderTransitionProof|Controlled CPTO qualification/);
  assert.match(detailPage, /loadOperationalEntityDetail/);
  for (const label of ["External Identities", "Control Owner", "Control Operator", "Technology Provider", "Runtime Provider", "Evidence Provider", "Evidence Independence", "Decision", "Enforcement", "Outcome", "Provider History", "Migration Gap", "Replay", "Trust Memory"]) assert.match(detailPage, new RegExp(label, "i"));
  for (const relation of ["provider_relationships", "provider_transitions", "provider_change_events", "canonical_trust_transactions", "canonical_enforcement_events", "trust_replay_sessions", "trust_memory_index"]) assert.match(server, new RegExp(relation));
  const placeholder = await placeholderProviderAdapter("provider:unconfigured").collectEvidence();
  assert.equal(placeholder.status, "not_configured");
  assert.deepEqual(placeholder.evidence, []);
});
