import test from "node:test";
import assert from "node:assert/strict";
import {
  DecisionIntelligenceEngine,
  ReplayEngine,
  ReplayRenderer,
  SignalPipeline,
  TrustDNAEngine,
  normalizeTrustProviderResult,
  sanitizeEvidenceMetadata,
  trustIntelligenceOpenAPIOperations,
  validateEvidenceNode,
} from "../src/core/trust/index.ts";

const tenantId = "11111111-1111-4111-8111-111111111111";
const identityId = "human:epic20";

function evidence(overrides = {}) {
  return validateEvidenceNode({
    id: "22222222-2222-4222-8222-222222222222",
    tenantId,
    identityId,
    kind: "PASSPORT",
    label: "Passport verified",
    confidence: 0.95,
    status: "VALID",
    source: "provider:hopae",
    verifier: "hopae_connect",
    observedAt: "2026-07-23T09:15:00.000Z",
    validUntil: "2027-07-23T09:15:00.000Z",
    payloadHash: "a".repeat(64),
    metadata: { country: "ES", rawPayload: "must-not-leak" },
    createdAt: "2026-07-23T09:15:01.000Z",
    ...overrides,
  });
}

test("EvidenceNode validates integrity and removes sensitive metadata", () => {
  const node = evidence();
  assert.equal(node.confidence, 0.95);
  assert.deepEqual(node.metadata, { country: "ES" });
  assert.deepEqual(
    sanitizeEvidenceMetadata({ safe: true, apiToken: "secret", documentNumber: "x" }),
    { safe: true },
  );
  assert.throws(() => evidence({ payloadHash: "invalid" }), /SHA-256/);
});

test("TrustDNAEngine returns explainable dimensions rather than an opaque score", () => {
  const profile = new TrustDNAEngine().build({
    profileId: "33333333-3333-4333-8333-333333333333",
    tenantId,
    identityId,
    evidence: [
      evidence(),
      evidence({
        id: "44444444-4444-4444-8444-444444444444",
        kind: "EMAIL",
        label: "Email confirmed",
        payloadHash: "b".repeat(64),
      }),
    ],
    generatedAt: "2026-07-23T10:00:00.000Z",
  });
  assert.equal(profile.dimensions.length, 10);
  assert.equal(profile.vector.DOCUMENT, 100);
  assert.ok(profile.dimensions.find((item) => item.name === "DEVICE")?.reasons.includes("EVIDENCE_MISSING"));
  assert.match(profile.explanation.join(" "), /DOCUMENT is 100/);
});

test("ReplayEngine is deterministic and ReplayRenderer explains trust changes", () => {
  const events = [
    {
      id: "event-b",
      tenantId,
      identityId,
      type: "TRUST_UPDATED",
      title: "Trust reduced",
      description: "VPN detected",
      occurredAt: "2026-07-23T09:20:00.000Z",
      source: "CONTINUOUS_TRUST",
      confidence: 0.8,
      evidenceIds: [],
      priorTrust: 90,
      resultingTrust: 65,
      actorId: null,
      metadata: {},
    },
    {
      id: "event-a",
      tenantId,
      identityId,
      type: "EVIDENCE_RECORDED",
      title: "Passport verified",
      description: "Provider evidence retained",
      occurredAt: "2026-07-23T09:15:00.000Z",
      source: "hopae_connect",
      confidence: 0.95,
      evidenceIds: ["22222222-2222-4222-8222-222222222222"],
      priorTrust: null,
      resultingTrust: null,
      actorId: null,
      metadata: {},
    },
  ];
  const timeline = new ReplayEngine().build(tenantId, identityId, events);
  assert.deepEqual(timeline.events.map((item) => item.id), ["event-a", "event-b"]);
  assert.equal(new ReplayRenderer().render(timeline)[1].trustChange, "90 → 65");
});

test("SignalPipeline applies explicit source weights and clamps trust", () => {
  const update = new SignalPipeline().apply(80, {
    id: "55555555-5555-4555-8555-555555555555",
    tenantId,
    identityId,
    source: "LOCATION",
    type: "VPN_DETECTED",
    value: -40,
    confidence: 0.8,
    observedAt: "2026-07-23T09:20:00.000Z",
    provider: "network_intelligence",
    evidenceIds: [],
  });
  assert.equal(update.id, "55555555-5555-4555-8555-555555555555");
  assert.equal(update.resultingTrust, 62.4);
  assert.equal(update.delta, -17.6);
});

test("Decision Intelligence names used and missing evidence and attributes overrides", () => {
  const node = evidence();
  const profile = new TrustDNAEngine().build({
    profileId: "33333333-3333-4333-8333-333333333333",
    tenantId,
    identityId,
    evidence: [node],
    generatedAt: "2026-07-23T10:00:00.000Z",
  });
  const engine = new DecisionIntelligenceEngine();
  const automated = engine.explain(profile, [node]);
  assert.ok(automated.evidenceUsed.includes(node.id));
  assert.ok(automated.evidenceMissing.includes("DEVICE"));
  const overridden = engine.explain(profile, [node], {
    actorId: "reviewer:1",
    decision: "APPROVE",
    reason: "Original document reviewed",
    occurredAt: "2026-07-23T10:05:00.000Z",
  });
  assert.equal(overridden.decision, "TRUST");
  assert.match(overridden.explanation.at(-1), /reviewer:1/);
});

test("provider normalization clamps confidence and SDK contracts expose required APIs", () => {
  const normalized = normalizeTrustProviderResult({
    provider: "example",
    tenantId,
    identityId,
    status: "VALID",
    confidence: 2,
    evidenceKind: "EMAIL",
    reference: "provider-result-1",
    observedAt: "2026-07-23T10:00:00Z",
    expiresAt: null,
    limitations: [],
    attributes: { verified: true },
  });
  assert.equal(normalized.confidence, 1);
  assert.deepEqual(
    trustIntelligenceOpenAPIOperations.map((operation) => operation.path),
    [
      "/api/evidence/{id}",
      "/api/evidence/graph/{identity}",
      "/api/evidence/history/{identity}",
      "/api/trust-dna/{identity}",
      "/api/replay/{identity}",
      "/api/trust-intelligence/decision/{identity}",
    ],
  );
});
