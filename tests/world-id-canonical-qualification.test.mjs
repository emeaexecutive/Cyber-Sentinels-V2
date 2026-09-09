import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { orchestrateWorldIdQualification, WorldIdQualificationError } from "../lib/providers/world-id-qualification.ts";

const tenantId = "10000000-0000-4000-8000-000000000001";
const actorId = "10000000-0000-4000-8000-000000000002";
const subjectId = "10000000-0000-4000-8000-000000000003";
const requestId = "10000000-0000-4000-8000-000000000004";
const evidenceId = "10000000-0000-4000-8000-000000000005";

function input() {
  return { tenantId, actorId, subjectId, subjectType: "human", requestedAction: "approve_access", requestedPurpose: "staging_qualification", resource: "qualification:world-id", environment: "staging", payloadDigest: "a".repeat(64), idkitResponse: { protocol_version: "4.0" } };
}

function identity(overrides = {}) {
  return {
    requestId,
    details: {
      evidence: [{ id: evidenceId, provider_id: "world_id", signal_status: "PASS", outcome: "VERIFIED", server_verified: true, signature_verified: true, source_digest: "b".repeat(64), provider_reference: "world-id:rp:subject-digest", reason_codes: ["WORLD_ID_PROVIDER_VERIFIED"], ...overrides }],
      confidence: { status: "PROVISIONAL", score: 90 },
    },
  };
}

function receipt(decision) {
  return { transactionId: `transaction-${decision.toLowerCase()}`, decision, decisionReference: `decision-${decision.toLowerCase()}`, authorityReference: "authority:staging:1", authorityVersion: "1", policy: { id: "policy:world-qualification", version: "1", hash: "c".repeat(64) }, reasonCodes: decision === "DENY" ? ["AUTHORITY_SCOPE_INVALID"] : ["AUTHORITY_SCOPE_VALID"], replayReference: `replay-${decision.toLowerCase()}`, trustMemoryReference: `memory-${decision.toLowerCase()}` };
}

for (const decision of ["ALLOW", "REVIEW", "DENY"]) {
  test(`verified World identity enters the canonical pipeline and preserves ${decision}`, async () => {
    const calls = [];
    const result = await orchestrateWorldIdQualification(input(), {
      async verifyIdentity(request) { calls.push(["identity", request.tenantId, request.subjectId]); return identity(); },
      async executeCanonical(request) { calls.push(["canonical", request.tenantId, request.subjectId]); return receipt(decision); },
    });
    assert.equal(result.decision, decision);
    assert.equal(result.worldProvider.status, "VERIFIED");
    assert.equal(result.replayClaim.status, "ACCEPTED");
    assert.equal(result.identityAssurance.score, 90);
    assert.equal(result.authority.status, decision === "DENY" ? "REJECTED" : "VERIFIED");
    assert.equal(result.policy.status, "EVALUATED");
    assert.equal(result.evidenceReference, evidenceId);
    assert.match(result.receiptReference, /\/receipt$/);
    assert.equal(result.replayReference, `replay-${decision.toLowerCase()}`);
    assert.equal(result.trustMemoryReference, `memory-${decision.toLowerCase()}`);
    assert.deepEqual(calls, [["identity", tenantId, subjectId], ["canonical", tenantId, subjectId]]);
  });
}

test("verified identity does not imply authority or synthesize ALLOW", async () => {
  const authorityError = Object.assign(new Error("No authority"), { code: "AUTHORITY_NOT_FOUND", status: 409 });
  await assert.rejects(orchestrateWorldIdQualification(input(), {
    async verifyIdentity() { return identity(); },
    async executeCanonical() { throw authorityError; },
  }), (error) => {
    assert.ok(error instanceof WorldIdQualificationError);
    assert.equal(error.result.worldProvider.status, "VERIFIED");
    assert.equal(error.result.replayClaim.status, "ACCEPTED");
    assert.equal(error.result.identityAssurance.status, "PROVISIONAL");
    assert.equal(error.result.authority.status, "FAILED");
    assert.equal(error.result.decision, null);
    return true;
  });
});

test("duplicate World nullifier is rejected before canonical execution", async () => {
  let canonicalCalls = 0;
  await assert.rejects(orchestrateWorldIdQualification(input(), {
    async verifyIdentity() { return identity({ signal_status: "INCONCLUSIVE", outcome: "INCONCLUSIVE", server_verified: false, signature_verified: false, reason_codes: ["WORLD_ID_NULLIFIER_REPLAY"] }); },
    async executeCanonical() { canonicalCalls += 1; return receipt("ALLOW"); },
  }), (error) => {
    assert.equal(error.result.worldProvider.status, "VERIFIED");
    assert.equal(error.result.replayClaim.status, "REJECTED");
    assert.equal(error.result.decision, null);
    return true;
  });
  assert.equal(canonicalCalls, 0);
});

test("wrong tenant/subject binding and persistence failures fail before canonical execution", async () => {
  for (const failure of [Object.assign(new Error("outside tenant"), { code: "SUBJECT_NOT_FOUND", status: 404 }), Object.assign(new Error("evidence write failed"), { code: "IDENTITY_EVIDENCE_PERSISTENCE_FAILED", status: 503 })]) {
    let canonicalCalls = 0;
    await assert.rejects(orchestrateWorldIdQualification(input(), {
      async verifyIdentity() { throw failure; },
      async executeCanonical() { canonicalCalls += 1; return receipt("ALLOW"); },
    }), (error) => error instanceof WorldIdQualificationError && error.result.decision === null);
    assert.equal(canonicalCalls, 0);
  }
});

test("provider and replay persistence failures contribute no authority or decision", async () => {
  for (const reasonCode of ["WORLD_ID_PROVIDER_VERIFICATION_FAILED", "WORLD_ID_REPLAY_STORE_UNAVAILABLE"]) {
    let canonicalCalls = 0;
    await assert.rejects(orchestrateWorldIdQualification(input(), {
      async verifyIdentity() { return identity({ signal_status: "INCONCLUSIVE", outcome: "INCONCLUSIVE", server_verified: false, signature_verified: false, reason_codes: [reasonCode] }); },
      async executeCanonical() { canonicalCalls += 1; return receipt("ALLOW"); },
    }), (error) => {
      assert.equal(error.result.decision, null);
      assert.equal(error.result.authority.status, "NOT_EVALUATED");
      assert.equal(error.result.replayClaim.status, reasonCode.includes("REPLAY_STORE") ? "FAILED" : "NOT_ATTEMPTED");
      return true;
    });
    assert.equal(canonicalCalls, 0);
  }
});

test("World identity evidence is tenant-bound and reaches provider-neutral canonical evidence without raw proof fields", async () => {
  const server = await readFile(new URL("../lib/trust-transaction/server.ts", import.meta.url), "utf8");
  const canonical = await readFile(new URL("../src/lib/trust-transaction/canonical.ts", import.meta.url), "utf8");
  const adapter = await readFile(new URL("../lib/identity-signals/adapters.ts", import.meta.url), "utf8");
  assert.match(server, /from\("identity_signal_evidence"\)/);
  assert.match(server, /\.eq\("enterprise_id", enterpriseId\)/);
  assert.match(server, /\.eq\("subject_id", subjectId\)/);
  assert.match(server, /sourceClassification: verified \? "identity_provider_asserted"/);
  assert.match(canonical, /evidenceContext: item\.normalizedEvidence \?\? null/);
  for (const semantic of ["verificationStatus", "applicationId", "relyingPartyId", "subjectDigest", "enterpriseId"]) assert.match(adapter, new RegExp(semantic));
  assert.doesNotMatch(adapter, /normalizedValue\s*=\s*[^;]*(?:rawProof|rawNullifier|signingKey|serviceRole)/s);
});
