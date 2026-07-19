import assert from "node:assert/strict";
import test from "node:test";
import { calculateIdentityConfidence, parseRequestedSignals, requestDigest } from "../lib/identity-signals/core.ts";

test("requested identity signals are validated and deduplicated", () => {
  assert.deepEqual(parseRequestedSignals(["EMAIL_OWNERSHIP", "email_ownership", "DEVICE_CONTEXT"]), ["EMAIL_OWNERSHIP", "DEVICE_CONTEXT"]);
  assert.throws(() => parseRequestedSignals(["MAGIC_IDENTITY"]), /unsupported/);
  assert.throws(() => parseRequestedSignals([]), /between 1 and 16/);
});

test("idempotency request digests are deterministic across object key order", () => {
  assert.equal(requestDigest({ b: 2, a: { d: 4, c: 3 } }), requestDigest({ a: { c: 3, d: 4 }, b: 2 }));
});

test("inconclusive and client-reported evidence contributes zero confidence", () => {
  const result = calculateIdentityConfidence([{ signalType: "DEVICE_CONTEXT", providerId: "device_context", outcome: "INCONCLUSIVE", confidence: 100, serverVerified: false, reasonCodes: [], limitations: [], observedAt: new Date().toISOString() }]);
  assert.equal(result.score, 0);
  assert.equal(result.status, "INSUFFICIENT_EVIDENCE");
  assert.deepEqual(result.reasonCodes, ["NO_SERVER_VERIFIED_EVIDENCE"]);
});

test("only server-verified successful evidence contributes to provisional confidence", () => {
  const now = new Date().toISOString();
  const result = calculateIdentityConfidence([
    { signalType: "GOVERNMENT_ID", providerId: "hopae_connect", outcome: "VERIFIED", confidence: 88, serverVerified: true, reasonCodes: [], limitations: [], observedAt: now },
    { signalType: "PROOF_OF_PERSONHOOD", providerId: "world_id", outcome: "INCONCLUSIVE", confidence: 99, serverVerified: false, reasonCodes: [], limitations: [], observedAt: now },
  ]);
  assert.equal(result.score, 88);
  assert.equal(result.status, "PROVISIONAL");
  assert.equal(result.verifiedSignalCount, 1);
});
