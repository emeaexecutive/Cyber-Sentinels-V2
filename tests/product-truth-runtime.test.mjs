import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildEvidenceAllowlist, validateEvidenceCitations } from "../lib/ai/evidence-grounding.ts";
import { projectOperationalEntityIntelligence } from "../lib/operational-entities/intelligence.ts";

const enterpriseId = "10000000-0000-4000-8000-000000000001";
const entityId = "entity:alpha";

function transaction({ id, at, decision, runtime, destination, evidenceDigest, evidenceReference, previous = null, externalState = "NOT_REQUESTED", independence = "single_source", evidenceFresh = true, evidenceComplete = true }) {
  return {
    transaction_id: id,
    enterprise_id: enterpriseId,
    operational_entity_id: entityId,
    requested_at: at,
    decision,
    trust_state: decision === "ALLOW" ? "verified" : decision === "REVIEW" ? "degraded" : "suspended",
    authority_reference: "authority:alpha:v3",
    authority_lineage_references: [{ type: "authority_grant", id: "authority:evidence:v3" }],
    policy_version: "3",
    action_type: "repository:write",
    action_resource: "repository:alpha",
    action_environment: "staging",
    evidence_references: [{ reference: evidenceReference, providerId: "provider:a", providerEventId: `event:${id}`, sourceDigest: evidenceDigest, outcome: "PASSED", observedAt: at, expiresAt: "2026-08-09T00:00:00.000Z" }],
    evidence_digest: evidenceDigest,
    evidence_complete: evidenceComplete,
    evidence_fresh: evidenceFresh,
    evidence_independence: independence,
    reason_codes: decision === "ALLOW" ? ["AUTHORITY_SCOPE_VALID", "EVIDENCE_CURRENT", "EVIDENCE_SUFFICIENT"] : ["RUNTIME_ATTESTATION_MISSING", "HUMAN_REVIEW_REQUIRED"],
    changed_conditions: previous ? ["EVIDENCE_CHANGED"] : ["INITIAL_TRUST_DECISION"],
    previous_transaction_id: previous,
    material_change: true,
    external_state: externalState,
    decision_time_snapshot: {
      accountableHuman: "owner:alpha",
      externalIdentityReferences: [{ referenceId: "identity:alpha" }],
      activeIncidentReferences: decision === "REVIEW" ? ["incident:runtime"] : [],
      contradictions: [],
      confidenceInConclusion: decision === "ALLOW" ? "MODERATE" : "LOW",
      consequence: "high",
      decisionDigest: evidenceDigest,
      enforcementState: { runtimeObservation: runtime, destinationObservation: destination, businessOutcome: externalState === "SUCCEEDED" ? "confirmed" : null },
    },
  };
}

function detail(transactions) {
  return {
    entity: {
      entityId,
      enterpriseId,
      entityType: "ai_agent",
      displayReference: "Agent Alpha",
      canonicalTrustObjectId: "trust-object:alpha",
      lifecycleState: "active",
      accountableOwnerId: "owner:alpha",
      organizationReference: "organization:acme",
      providerReferences: ["provider:a"],
      externalIdentityReferences: [{ referenceId: "identity:alpha", provider: "provider:a", providerEntityId: "provider-alpha", builderPlatform: "builder", providerNativeLifecycle: "active", providerOwner: "owner:alpha", providerBusinessPurpose: "release", certificationState: "observed", permissionsSummary: ["repository:write"], observedAt: "2026-08-08T09:00:00.000Z", sourceTimestamp: "2026-08-08T09:00:00.000Z", evidenceDigest: "1".repeat(64), correctedByReferenceId: null, supersedesReferenceId: null }],
      identityProfileReference: "identity-profile:alpha",
      currentAuthorityReferences: ["authority:alpha:v3"],
      environmentReferences: ["staging"],
      workflowReferences: ["repository:write"],
      currentTrustState: transactions.at(-1)?.trust_state ?? "unknown",
      currentEvidenceState: transactions.length ? "current" : "unknown",
      currentConsequenceClassification: "high",
      suspendedAt: null,
      revokedAt: null,
      supersedesEntityVersionId: null,
      canonicalDigest: "2".repeat(64),
      createdAt: "2026-08-08T09:00:00.000Z",
      updatedAt: "2026-08-08T12:00:00.000Z",
    },
    externalIdentities: [],
    providerRelationships: [],
    providerTransitions: [],
    providerChangeEvents: [],
    transactions,
    enforcementEvents: [],
    replay: transactions.map((item, index) => ({ id: `replay:${index}`, canonical_transaction_id: item.transaction_id })),
    trustMemory: transactions.map((item, index) => ({ memory_id: `memory:${index}`, source_id: item.transaction_id })),
  };
}

const allow = transaction({ id: "10000000-0000-4000-8000-000000000011", at: "2026-08-08T10:00:00.000Z", decision: "ALLOW", runtime: "enforced", destination: "enforced", evidenceDigest: "a".repeat(64), evidenceReference: "evidence:alpha:v1", externalState: "SUCCEEDED", independence: "multi_source" });
const review = transaction({ id: "10000000-0000-4000-8000-000000000012", at: "2026-08-08T11:00:00.000Z", decision: "REVIEW", runtime: "not_enforced", destination: "unknown", evidenceDigest: "b".repeat(64), evidenceReference: "evidence:alpha:runtime-gap", previous: allow.transaction_id, evidenceFresh: false });
const restored = transaction({ id: "10000000-0000-4000-8000-000000000013", at: "2026-08-08T12:00:00.000Z", decision: "ALLOW", runtime: "enforced", destination: "enforced", evidenceDigest: "c".repeat(64), evidenceReference: "evidence:alpha:attestation:v2", previous: review.transaction_id, externalState: "SUCCEEDED", independence: "multi_source" });

test("persisted decision snapshots drive drift, health, confidence, stability and recommendation", () => {
  const projection = projectOperationalEntityIntelligence(detail([allow, review]), "2026-08-08T12:00:00.000Z");
  assert.equal(projection.source, "PERSISTED_TENANT_RECORDS");
  assert.equal(projection.drift.state, "MATERIAL_DRIFT");
  assert.ok(projection.drift.findings.some((finding) => finding.condition === "runtime"));
  assert.ok(["DEGRADED", "REVIEW_REQUIRED"].includes(projection.health.overallState));
  assert.notEqual(projection.confidence.level, "HIGH");
  assert.equal(projection.recommendation.recommendation, "REQUEST_RUNTIME_ATTESTATION");
  assert.equal(projection.prediction.autonomousEnforcementAllowed, false);
  assert.equal(projection.prediction.horizon, "24 hours");
  assert.deepEqual(projection.stability.windows.map((window) => window.hours), [24, 168, 720]);
});

test("recovery is reconstructed only after new evidence and an ALLOW re-evaluation", () => {
  const pending = projectOperationalEntityIntelligence(detail([allow, review]), "2026-08-08T12:00:00.000Z");
  assert.equal(pending.recovery?.state, "REMEDIATION_REQUIRED");
  const recovered = projectOperationalEntityIntelligence(detail([allow, review, restored]), "2026-08-08T13:00:00.000Z");
  assert.equal(recovered.recovery?.state, "RESTORED");
  assert.deepEqual(recovered.recovery?.history.map((entry) => entry.state), ["DEGRADED", "REMEDIATION_REQUIRED", "EVIDENCE_RECEIVED", "RE_EVALUATION", "RESTORED"]);
  assert.ok(recovered.recovery?.evidenceReferences.includes("evidence:alpha:attestation:v2"));
});

test("missing decision history remains unknown instead of becoming healthy", () => {
  const projection = projectOperationalEntityIntelligence(detail([]), "2026-08-08T13:00:00.000Z");
  assert.equal(projection.source, "INSUFFICIENT_EVIDENCE");
  assert.equal(projection.drift.state, "INSUFFICIENT_EVIDENCE");
  assert.equal(projection.confidence.level, "INSUFFICIENT");
  assert.equal(projection.stability.state, "INSUFFICIENT_HISTORY");
  assert.notEqual(projection.health.overallState, "HEALTHY");
  assert.equal(projection.prediction.prediction, "INSUFFICIENT_EVIDENCE");
});

test("AI evidence allowlists reject unsupported citations deterministically", () => {
  const context = { subject_type: "agent", subject_label: "Agent Alpha", recent_evidence: ["attestation present"], unresolved_signal_count: 1 };
  const allowlist = buildEvidenceAllowlist(context);
  assert.ok(allowlist.includes("context:recent_evidence:0"));
  assert.equal(validateEvidenceCitations(["context:recent_evidence:0"], allowlist).valid, true);
  const unsupported = validateEvidenceCitations(["context:invented"], allowlist);
  assert.equal(unsupported.valid, false);
  assert.deepEqual(unsupported.unsupported, ["context:invented"]);
});

test("the authenticated proof page consumes persisted services and never imports the scenario fixture", async () => {
  const source = await readFile(new URL("../app/demo/trust-runtime/page.tsx", import.meta.url), "utf8");
  assert.match(source, /loadOperationalEntityDetail/);
  assert.match(source, /projectOperationalEntityIntelligence/);
  assert.doesNotMatch(source, /buildContinuousOperationalTrustScenario/);
});

test("operational Trust Memory surfaces never mix demo events into customer-facing results", async () => {
  const [adminSource, apiSource] = await Promise.all([
    readFile(new URL("../app/admin/trust-memory/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/trust-memory/route.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(adminSource, /demoTrustMemoryEvents/);
  assert.doesNotMatch(apiSource, /demoTrustMemoryEvents/);
  assert.match(apiSource, /buildTrustMemorySnapshot\(reviewedEvents\)/);
});
