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
  const result = calculateIdentityConfidence([{ signalType: "DEVICE_CONTEXT", providerId: "device_context", status: "INCONCLUSIVE", outcome: "INCONCLUSIVE", confidence: 100, riskFlags: [], serverVerified: false, signatureVerified: false, reasonCodes: [], limitations: [], observedAt: new Date().toISOString() }]);
  assert.equal(result.score, 0);
  assert.equal(result.status, "INSUFFICIENT_EVIDENCE");
  assert.deepEqual(result.reasonCodes, ["NO_SERVER_VERIFIED_EVIDENCE"]);
});

test("only server-verified successful evidence contributes to provisional confidence", () => {
  const now = new Date().toISOString();
  const result = calculateIdentityConfidence([
    { signalType: "GOVERNMENT_ID", providerId: "hopae_connect", status: "PASS", outcome: "VERIFIED", confidence: 88, riskFlags: [], serverVerified: true, signatureVerified: true, reasonCodes: [], limitations: [], observedAt: now },
    { signalType: "PROOF_OF_PERSONHOOD", providerId: "world_id", status: "INCONCLUSIVE", outcome: "INCONCLUSIVE", confidence: 99, riskFlags: [], serverVerified: false, signatureVerified: false, reasonCodes: [], limitations: [], observedAt: now },
  ]);
  assert.equal(result.score, 88);
  assert.equal(result.status, "PROVISIONAL");
  assert.equal(result.verifiedSignalCount, 1);
});

test("contradictions reduce identity-confidence-v1 without turning provider errors positive", () => {
  const now = new Date().toISOString();
  const result = calculateIdentityConfidence([
    { signalType: "GOVERNMENT_ID", providerId: "hopae_connect", status: "PASS", outcome: "VERIFIED", confidence: 90, riskFlags: [], serverVerified: true, signatureVerified: true, reasonCodes: [], limitations: [], observedAt: now },
    { signalType: "EMAIL_OWNERSHIP", providerId: "email", status: "FAIL", outcome: "FAILED", confidence: 100, riskFlags: ["contradiction"], serverVerified: false, signatureVerified: false, reasonCodes: ["CONTRADICTION_DETECTED"], limitations: [], observedAt: now },
    { signalType: "PHONE_OWNERSHIP", providerId: "phone", status: "ERROR", outcome: "FAILED", confidence: 100, riskFlags: [], serverVerified: false, signatureVerified: false, reasonCodes: ["PROVIDER_ERROR"], limitations: [], observedAt: now },
  ]);
  assert.equal(result.score, 75);
  assert.equal(result.contradictionCount, 1);
  assert.match(result.reasonCodes.join(","), /CONTRADICTION_DETECTED/);
});
