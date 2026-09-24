import assert from "node:assert/strict";
import test from "node:test";
import { hashCanonical } from "../src/lib/trust-core/hash.ts";
import { createJudgeMeReferenceAdapter, toJudgeMeContextEvidence, JUDGEME_VERIFICATION_LABELS } from "../lib/providers/judgeme.ts";

const binding = { tenantId: "tenant:a", installationId: "installation:a", shopDomain: "fixture.myshopify.com", subject: { type: "AI_AGENT", id: "actor:a" }, productExternalId: "123", reviewReference: "review:local-a", providerReviewId: "456" };
const occurredAt = "2026-09-24T10:00:00.000Z";
const receivedAt = "2026-09-24T10:01:00.000Z";
function input() {
  return { providerKey: "judgeme", eventId: "delivery:a", subject: { ...binding.subject }, evidenceType: "JUDGEME_REVIEW_OBSERVATION", finding: "OBSERVED", occurredAt,
    evidence: { tenantId: binding.tenantId, installationId: binding.installationId, shopDomain: binding.shopDomain, reviewReference: binding.reviewReference, eventType: "review/created", review: { id: "456", product_external_id: "123", rating: 5, verified: "verified-purchase", curated: "spam", hidden: false } } };
}

test("all Judge.me verification labels remain unqualified assertions, never identity or execution authority", async () => {
  const adapter = createJudgeMeReferenceAdapter(binding);
  for (const label of JUDGEME_VERIFICATION_LABELS) {
    const request = input(); request.evidence.review.verified = label;
    const result = await adapter.mapEvidence(request, receivedAt);
    assert.equal(result.result, "INCONCLUSIVE");
    assert.equal(result.serverVerified, false);
    assert.equal(result.cryptographicallyVerified, false);
    assert.equal(result.normalizedFacts.qualification, "BLOCKED_EXTERNAL");
    for (const facet of ["identityVerification", "transactionVerification", "authorityVerification"]) assert.equal(result.normalizedFacts[facet], "NOT_ESTABLISHED");
    assert.equal(result.normalizedFacts.executionAuthorized, false);
    assert.equal(result.normalizedFacts.review.verified, label);
    const context = toJudgeMeContextEvidence(result, receivedAt);
    assert.equal(context.evidenceType, "JUDGEME_REVIEW_OBSERVATION");
    assert.equal(context.outcome, "OBSERVED");
    assert.equal(context.metadata.review.curated, "spam"); // Provider publication state is not a fraud decision.
  }
});

test("tenant, installation, shop, subject, product and review bindings cannot cross", async () => {
  const adapter = createJudgeMeReferenceAdapter(binding);
  for (const field of ["tenantId", "installationId", "shopDomain", "reviewReference"]) {
    const request = input(); request.evidence[field] = "different";
    await assert.rejects(adapter.mapEvidence(request, receivedAt), /BINDING_MISMATCH/);
  }
  for (const field of ["id", "product_external_id"]) {
    const request = input(); request.evidence.review[field] = "789";
    await assert.rejects(adapter.mapEvidence(request, receivedAt), /BINDING_MISMATCH/);
  }
  const request = input(); request.subject.type = "HUMAN";
  await assert.rejects(adapter.mapEvidence(request, receivedAt), /SUBJECT_MISMATCH/);
});

test("raw review content, contact information, credentials and invented authority fields are rejected", async () => {
  const adapter = createJudgeMeReferenceAdapter(binding);
  for (const key of ["body", "title", "email", "name", "ip_address", "pictures", "api_token", "executionAuthorized"]) {
    const request = input(); request.evidence.review[key] = "must-not-persist";
    await assert.rejects(adapter.mapEvidence(request, receivedAt), /REVIEW_FIELDS_INVALID/);
  }
  const request = input(); request.evidence.token = "must-not-persist";
  await assert.rejects(adapter.mapEvidence(request, receivedAt), /FIELDS_INVALID/);
});

test("review IDs and structured fields are bounded and malformed observations fail closed", async () => {
  const adapter = createJudgeMeReferenceAdapter(binding);
  for (const [field, value] of [["rating", 0], ["rating", 5.1], ["rating", "5"], ["verified", "ALLOW"], ["curated", "fraudulent"], ["hidden", "false"]]) {
    const request = input(); request.evidence.review[field] = value;
    await assert.rejects(adapter.mapEvidence(request, receivedAt), /INVALID/);
  }
  assert.throws(() => createJudgeMeReferenceAdapter({ ...binding, shopDomain: "https://fixture.myshopify.com?api_token=secret" }), /SHOP_INVALID/);
  assert.throws(() => createJudgeMeReferenceAdapter({ ...binding, productExternalId: 123 }), /PRODUCT_INVALID/);
  const request = input(); request.evidence.eventType = "review/deleted";
  await assert.rejects(adapter.mapEvidence(request, receivedAt), /EVENT_UNSUPPORTED/);
});

test("expired, future and malformed timestamps cannot enter canonical context", async () => {
  const adapter = createJudgeMeReferenceAdapter(binding);
  await assert.rejects(adapter.mapEvidence(input(), "2026-09-25T10:00:00.000Z"), /NOT_CURRENT/);
  await assert.rejects(adapter.mapEvidence(input(), "2026-09-24T09:59:59.000Z"), /NOT_CURRENT/);
  const malformed = input(); malformed.occurredAt = "2026-02-30T10:00:00.000Z";
  await assert.rejects(adapter.mapEvidence(malformed, receivedAt), /TIMESTAMP_INVALID/);
  const evidence = await adapter.mapEvidence(input(), receivedAt);
  assert.throws(() => toJudgeMeContextEvidence(evidence, "2026-09-25T10:00:00.000Z"), /NOT_CURRENT/);
});

test("digest binds sanitized observation and cannot be supplied or mutated as proof", async () => {
  const adapter = createJudgeMeReferenceAdapter(binding);
  const request = input(); request.digest = "a".repeat(64);
  await assert.rejects(adapter.mapEvidence(request, receivedAt), /DIGEST_MISMATCH/);
  delete request.digest;
  request.digest = hashCanonical(adapter.normalize(request));
  const evidence = await adapter.mapEvidence(request, receivedAt);
  assert.equal(evidence.payloadHash, request.digest);
  evidence.normalizedFacts.review.rating = 1;
  assert.throws(() => toJudgeMeContextEvidence(evidence, receivedAt), /DIGEST_MISMATCH/);
});

test("creation failure is an observation with no invented provider review or denial", async () => {
  const adapter = createJudgeMeReferenceAdapter({ ...binding, providerReviewId: null });
  const request = input(); request.evidence.eventType = "review/created_fail"; request.evidence.review = { id: null, product_external_id: "123" };
  const result = await adapter.mapEvidence(request, receivedAt);
  assert.equal(result.result, "INCONCLUSIVE");
  assert.equal(result.normalizedFacts.review.id, null);
  assert.equal(toJudgeMeContextEvidence(result, receivedAt).outcome, "OBSERVED");
  request.evidence.eventType = "review/created";
  await assert.rejects(adapter.mapEvidence(request, receivedAt), /REVIEW_ID_STATE_INVALID/);
});

test("updated observations retain their event binding and distinct evidence digest", async () => {
  const adapter = createJudgeMeReferenceAdapter(binding);
  const original = await adapter.mapEvidence(input(), receivedAt);
  const request = input(); request.evidence.eventType = "review/updated"; request.evidence.review.rating = 4;
  const updated = await adapter.mapEvidence(request, receivedAt);
  assert.equal(updated.normalizedFacts.eventType, "review/updated");
  assert.notEqual(updated.payloadHash, original.payloadHash);
  assert.notEqual(updated.evidenceId, original.evidenceId);
  assert.equal(updated.result, "INCONCLUSIVE");
});

test("all actor types use the same boundary and bindings are copied at construction", async () => {
  for (const type of ["HUMAN", "SERVICE", "AI_AGENT"]) {
    const copy = structuredClone(binding); copy.subject.type = type;
    const adapter = createJudgeMeReferenceAdapter(copy); copy.tenantId = "tenant:mutated";
    const request = input(); request.subject.type = type;
    const result = await adapter.mapEvidence(request, receivedAt);
    assert.equal(result.subject.type, type);
    assert.equal((await adapter.verify(request)).verified, false);
  }
});

test("a forged verification flag or added metadata is rejected at canonical conversion", async () => {
  const adapter = createJudgeMeReferenceAdapter(binding);
  const result = await adapter.mapEvidence(input(), receivedAt);
  assert.throws(() => toJudgeMeContextEvidence({ ...result, serverVerified: true }, receivedAt), /UNQUALIFIED_EVIDENCE_REQUIRED/);
  const changed = structuredClone(result); changed.normalizedFacts.body = "must-not-persist";
  changed.payloadHash = hashCanonical(changed.normalizedFacts);
  assert.throws(() => toJudgeMeContextEvidence(changed, receivedAt), /DIGEST_MISMATCH/);
});
