import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { executeCanonicalTrustAssessment } from "../lib/core/trust-lifecycle-orchestrator.ts";
import {
  containsRestrictedProviderData,
  evaluateProviderEvidenceQuality,
  getHopaeWebhookTimestamp,
  normalizeHopaeProviderEvidence,
  verifyHopaeWebhookSignature,
  webhookTimestampWithinTolerance,
} from "../lib/providers/hopae-rc1.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const now = Date.parse("2026-07-16T10:00:00.000Z");

function signed(rawBody, secret = "approved-test-secret", timestamp = Math.floor(now / 1000)) {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `${timestamp}.${signature}`;
}

function evidence(overrides = {}) {
  return normalizeHopaeProviderEvidence({
    statusPayload: { status: "completed", verification_model: "hopae-sandbox-rules-v1" },
    userInfo: { hopae_loa: 4, provenance: { issuer: "approved-test-fixture" }, full_name: "Must not persist" },
    providerReference: "hopae-test-verification-001",
    correlationId: "rc1-correlation-001",
    tenantId: "11111111-1111-4111-8111-111111111111",
    workflowId: "22222222-2222-4222-8222-222222222222",
    sourceMode: "test",
    runtimeState: "Test Mode",
    receivedAt: new Date(now).toISOString(),
    latencyMs: 42,
    ...overrides,
  });
}

function quality(providerEvidence = evidence(), overrides = {}) {
  return evaluateProviderEvidenceQuality({
    evidence: providerEvidence,
    expectedTenantId: providerEvidence.tenantId,
    expectedWorkflowId: providerEvidence.workflowId,
    expectedCorrelationId: providerEvidence.correlationId,
    nowMs: now,
    ...overrides,
  });
}

function assessment(providerEvidence = evidence(), evidenceQuality = quality(providerEvidence), overrides = {}) {
  return executeCanonicalTrustAssessment({
    tenantId: providerEvidence.tenantId,
    workflowId: providerEvidence.workflowId,
    entityId: "33333333-3333-4333-8333-333333333333",
    entityType: "human",
    requestedAction: "assess_trust",
    requestedPurpose: "regulated_workflow",
    correlationId: providerEvidence.correlationId,
    nonce: "nonce-001",
    owner: "RC1 Test Enterprise",
    accountableActor: "Accountable Test Reviewer",
    allowedActions: ["assess_trust"],
    allowedPurposes: ["regulated_workflow"],
    delegationValid: true,
    policyVersion: "rc1-test-policy-v1",
    evidence: providerEvidence,
    evidenceQuality,
    createdAt: new Date().toISOString(),
    ...overrides,
  });
}

test("valid callback signature passes while forged and stale callbacks fail", () => {
  const raw = JSON.stringify({ event_id: "evt-001", verification_id: "hopae-test-verification-001" });
  const signature = signed(raw);
  assert.equal(verifyHopaeWebhookSignature(raw, signature, "approved-test-secret"), true);
  assert.equal(verifyHopaeWebhookSignature(`${raw}x`, signature, "approved-test-secret"), false);
  assert.equal(webhookTimestampWithinTolerance(getHopaeWebhookTimestamp(signature), now), true);
  assert.equal(webhookTimestampWithinTolerance(getHopaeWebhookTimestamp(signed(raw, "approved-test-secret", Math.floor(now / 1000) - 601)), now), false);
});

test("Hopae output maps to the provider-neutral contract without raw identity data", () => {
  const normalized = evidence();
  for (const field of ["providerId", "providerName", "capability", "runtimeState", "sourceMode", "evidenceStatus", "confidenceBand", "reasonCodes", "providerReference", "modelRulesetVersion", "receivedTimestamp", "latencyMs", "freshness", "limitations", "retentionStatus", "correlationId", "tenantId", "workflowId"]) {
    assert.ok(field in normalized, field);
  }
  assert.equal(normalized.sourceMode, "test");
  assert.equal(normalized.runtimeState, "Test Mode");
  assert.equal(containsRestrictedProviderData(normalized), false);
  assert.doesNotMatch(JSON.stringify(normalized), /Must not persist|full_name/i);
});

test("evidence quality accepts a complete fixture and rejects duplicate, tenant mismatch and restricted data", () => {
  const normalized = evidence();
  assert.equal(quality(normalized).status, "accepted");
  assert.equal(quality(normalized, { duplicateEvent: true }).canInfluenceDecision, false);
  assert.equal(quality(normalized, { expectedTenantId: "44444444-4444-4444-8444-444444444444" }).recommendedOutcome, "block");
  assert.equal(quality(normalized, { conflictingEvidence: true }).recommendedOutcome, "review");
  assert.equal(quality(normalized, { restrictedDataDetected: true }).recommendedOutcome, "block");
});

test("missing or unavailable provider evidence degrades to insufficient evidence or step-up", () => {
  const pending = evidence({ statusPayload: { status: "pending" } });
  assert.equal(quality(pending).recommendedOutcome, "insufficient_evidence");
  const unavailable = evidence({ statusPayload: { status: "unavailable" }, runtimeState: "Unavailable" });
  assert.ok(["step_up", "insufficient_evidence"].includes(quality(unavailable).recommendedOutcome));
});

test("authority and policy remain independent of a successful provider result", () => {
  const allowed = assessment();
  assert.equal(allowed.trust_decision, "allow");
  assert.equal(allowed.authority_result.decision, "ALLOW");
  assert.equal(allowed.enforcement_action, "ALLOW");

  const expired = assessment(evidence(), quality(), { authorityExpiresAt: "2000-01-01T00:00:00.000Z" });
  assert.equal(expired.trust_decision, "block");
  assert.match(expired.limitations.join(" "), /expired/i);

  const revoked = assessment(evidence(), quality(), { authorityRevoked: true });
  assert.equal(revoked.trust_decision, "block");
  assert.match(revoked.limitations.join(" "), /revoked/i);

  const excessive = assessment(evidence(), quality(), { allowedActions: ["read_only"] });
  assert.equal(excessive.trust_decision, "block");
  assert.match(excessive.limitations.join(" "), /scope/i);

  const belowMinimum = assessment(evidence(), quality(), { minimumEvidence: 3 });
  assert.equal(belowMinimum.trust_decision, "insufficient_evidence");
  assert.match(belowMinimum.limitations.join(" "), /minimum/i);
});

test("duplicate provider event cannot produce an allow outcome", () => {
  const normalized = evidence();
  const duplicateQuality = quality(normalized, { duplicateEvent: true });
  const result = assessment(normalized, duplicateQuality, { seenNonces: ["nonce-001"] });
  assert.notEqual(result.trust_decision, "allow");
  assert.equal(result.evidence_quality.canInfluenceDecision, false);
});

test("RC1 Evidence Pack includes decision continuity, source mode and no raw sensitive payload", () => {
  const result = assessment();
  const pack = result.trust_evidence_pack;
  assert.equal(pack.packVersion, "1.0-rc1");
  assert.equal(pack.decision.outcome, "allow");
  assert.equal(pack.policy.applied, "rc1-test-policy-v1");
  assert.equal(pack.enforcement.outcome, "ALLOW");
  assert.ok(pack.replay.reference);
  assert.ok(pack.evidenceGraph.reference);
  assert.ok(pack.trustMemory.references.length);
  assert.deepEqual(pack.sourceModes, ["test"]);
  assert.doesNotMatch(JSON.stringify(pack), /Must not persist|full_name|biometric_template|challenge_token/i);
});

test("RC1 persistence is atomic, tenant scoped and Trust Memory is append-only", async () => {
  const [migration, providerRoute, executeRoute, middleware, providerServer] = await Promise.all([
    read("supabase/migrations/202607160001_release_1_rc1_provider_evidence_gate.sql"),
    read("app/api/providers/route.ts"),
    read("app/api/trust/execute/route.ts"),
    read("middleware.ts"),
    read("lib/providers/hopae-rc1-server.ts"),
  ]);
  assert.match(migration, /persist_rc1_trust_assessment/);
  assert.match(migration, /tenant scoped read trust_replay_sessions/);
  assert.match(migration, /tenant scoped read evidence_chains/);
  assert.match(migration, /tenant scoped read trust_relationships/);
  assert.match(migration, /trust_memory_append_only/);
  assert.match(migration, /raw_event = null|raw_event, processed_at/);
  assert.match(providerRoute, /x-hopae-signature/);
  assert.match(providerRoute, /provider_payload_too_large/);
  assert.match(executeRoute, /establish_trust/);
  assert.match(middleware, /req\.method === "POST"/);
  assert.match(providerServer, /Workflow policy could not be revalidated/);
  assert.match(providerServer, /currentAllowedActions/);
  assert.match(providerServer, /references\.duplicate === true/);
});

test("Sprint 13.1 scope, security, performance, demo, acceptance and release evidence are documented", async () => {
  const paths = [
    "docs/RELEASE_1_RC1_SCOPE.md",
    "docs/RC1_PRIMARY_PROVIDER_DECISION.md",
    "docs/RC1_END_TO_END_TRUST_FLOW.md",
    "docs/RC1_SECURITY_GATE.md",
    "docs/RC1_PERFORMANCE_EVIDENCE.md",
    "docs/RC1_TRUST_EVIDENCE_PACK.md",
    "docs/demos/RC1_OPERATIONAL_TRUST_DEMO.md",
    "docs/SPRINT_13_1_ACCEPTANCE.md",
    "docs/releases/RELEASE_1_0_RC1.md",
    "docs/PLATFORM_GLOSSARY.md",
  ];
  const contents = await Promise.all(paths.map(read));
  assert.match(contents[0], /RC1 required/);
  assert.match(contents[1], /Hopae Connect/);
  assert.match(contents[3], /timestamp|HMAC/i);
  assert.match(contents[4], /sample count: 100/i);
  assert.match(contents[6], /Awaiting Credentials/);
  assert.match(contents[7], /Release 1\.0 remains blocked/);
});
