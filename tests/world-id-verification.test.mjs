import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createWorldIdRpSignature, resetWorldIdReplayStore, verifyWorldIdProof } from "../lib/providers/world-id-verifier.ts";

function idkitResult(nullifier = "0x0a") {
  return {
    protocol_version: "4.0",
    nonce: "0x" + "1".repeat(64),
    action: "cyber-sentinels-verify",
    environment: "staging",
    responses: [{
      identifier: "proof_of_human",
      signal_hash: "0x0",
      proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
      nullifier,
      issuer_schema_id: 1,
      expires_at_min: 1_800_000_000,
    }],
    user_presence_completed: true,
  };
}

function providerSuccess(nullifier = "0x0a") {
  return new Response(JSON.stringify({
    success: true,
    results: [{ identifier: "proof_of_human", success: true, nullifier }],
    action: "cyber-sentinels-verify",
    nullifier,
    created_at: "2026-09-07T12:00:00.000Z",
    environment: "staging",
  }), { status: 200, headers: { "content-type": "application/json" } });
}

function verifyInput(result = idkitResult()) {
  return { idkitResponse: result, tenantId: "10000000-0000-4000-8000-000000000001", subjectId: "10000000-0000-4000-8000-000000000002" };
}

test("World ID requires an explicit durable replay acceptance and claim reference", async () => {
  process.env.NODE_ENV = "production";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://replay-test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-test-only-service-key";
  for (const payload of [null, {}, [], { accepted: true }, { accepted: true, claim_id: "" }, { accepted: "true", claim_id: "claim" }]) {
    globalThis.fetch = async (url) => String(url) === "https://developer.world.org/api/v4/verify/rp_staging_test"
      ? providerSuccess()
      : new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
    const result = await verifyWorldIdProof(verifyInput());
    assert.equal(result.ok, false);
    assert.equal(result.reasonCode, "WORLD_ID_REPLAY_STORE_ERROR");
    assert.equal(result.normalizedEvidence, undefined);
  }
  globalThis.fetch = async (url) => String(url) === "https://developer.world.org/api/v4/verify/rp_staging_test"
    ? providerSuccess()
    : new Response(JSON.stringify({ accepted: true, claim_id: "10000000-0000-4000-8000-000000000003" }), { status: 200, headers: { "content-type": "application/json" } });
  assert.equal((await verifyWorldIdProof(verifyInput())).ok, true);
});

test.beforeEach(() => {
  delete process.env.NODE_ENV;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.WORLD_ID_REPLAY_STORE_PATH;
  process.env.NEXT_PUBLIC_WORLD_APP_ID = "app_staging_test";
  process.env.WORLD_RP_ID = "rp_staging_test";
  process.env.WORLD_RP_SIGNING_KEY = "ab".repeat(32);
  process.env.WORLD_ACTION = "cyber-sentinels-verify";
  process.env.WORLD_ID_ENVIRONMENT = "staging";
  resetWorldIdReplayStore();
});

test("World ID forwards the complete v4 IDKit result and accepts explicit provider success", async () => {
  const resultPayload = idkitResult();
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls += 1;
    assert.equal(url, "https://developer.world.org/api/v4/verify/rp_staging_test");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), resultPayload);
    return providerSuccess();
  };
  const result = await verifyWorldIdProof(verifyInput(resultPayload));
  assert.equal(calls, 1);
  assert.equal(result.ok, true);
  assert.equal(result.providerVerified, true);
  assert.equal(result.serverVerified, true);
  assert.equal(result.reasonCode, "WORLD_ID_PROVIDER_VERIFIED");
  assert.equal(result.normalizedEvidence?.protocolVersion, "4.0");
  assert.equal(result.normalizedEvidence?.verificationStatus, "verified");
  assert.equal(result.normalizedEvidence?.applicationId, "app_staging_test");
  assert.equal(result.normalizedEvidence?.relyingPartyId, "rp_staging_test");
  assert.match(result.normalizedEvidence?.subjectDigest ?? "", /^[a-f0-9]{64}$/);
  assert.equal(result.normalizedEvidence?.providerReference, result.providerReference);
});

test("World ID rejects a proof bound to the wrong configured action before provider or replay", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return providerSuccess(); };
  const result = await verifyWorldIdProof(verifyInput({ ...idkitResult(), action: "wrong-action" }));
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, "WORLD_ID_APP_ACTION_MISMATCH");
  assert.equal(calls, 0);
});

test("World ID rejects provider failures and never claims verification", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, results: [] }), { status: 400, headers: { "content-type": "application/json" } });
  const result = await verifyWorldIdProof(verifyInput());
  assert.equal(result.ok, false);
  assert.equal(result.providerVerified, false);
  assert.equal(result.serverVerified, false);
  assert.equal(result.reasonCode, "WORLD_ID_PROVIDER_VERIFICATION_FAILED");
  assert.equal(result.confidence, 0);
});

test("World ID rejects a malformed success response missing its action binding", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, results: [{ identifier: "proof_of_human", success: true, nullifier: "0x0a" }], nullifier: "0x0a", environment: "staging" }), { status: 200, headers: { "content-type": "application/json" } });
  const result = await verifyWorldIdProof(verifyInput());
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, "WORLD_ID_PROVIDER_VERIFICATION_FAILED");
});

test("World ID rejects duplicate nullifiers for the configured action", async () => {
  globalThis.fetch = async () => providerSuccess();
  const first = await verifyWorldIdProof(verifyInput());
  const second = await verifyWorldIdProof(verifyInput());
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.reasonCode, "WORLD_ID_NULLIFIER_REPLAY");
  assert.equal(second.providerVerified, false);
});

test("World ID replay state survives a fresh file-store initialization", async () => {
  process.env.WORLD_ID_REPLAY_STORE_PATH = path.join(tmpdir(), `world-id-replay-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  globalThis.fetch = async () => providerSuccess();
  const first = await verifyWorldIdProof(verifyInput());
  assert.equal(first.ok, true);
  const persisted = await readFile(process.env.WORLD_ID_REPLAY_STORE_PATH, "utf8");
  assert.doesNotMatch(persisted, /"10"/);
  assert.match(persisted, /[a-f0-9]{64}/);
  const second = await verifyWorldIdProof(verifyInput());
  assert.equal(second.ok, false);
  assert.equal(second.reasonCode, "WORLD_ID_NULLIFIER_REPLAY");
});

test("World ID fails closed when the durable replay store is unavailable in production", async () => {
  process.env.NODE_ENV = "production";
  globalThis.fetch = async () => providerSuccess();
  const result = await verifyWorldIdProof(verifyInput());
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, "WORLD_ID_REPLAY_STORE_UNAVAILABLE");
});

test("World ID canonicalizes equivalent hexadecimal and decimal nullifiers before claiming", async () => {
  globalThis.fetch = async (_url, init) => {
    const submitted = JSON.parse(String(init?.body));
    return providerSuccess(submitted.responses[0].nullifier);
  };
  const first = await verifyWorldIdProof(verifyInput(idkitResult("0x0a")));
  const second = await verifyWorldIdProof(verifyInput(idkitResult("10")));
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.reasonCode, "WORLD_ID_NULLIFIER_REPLAY");
});

test("World ID RP signatures use the official v4 signing implementation", () => {
  const signature = createWorldIdRpSignature();
  assert.equal(signature.app_id, "app_staging_test");
  assert.equal(signature.rp_id, "rp_staging_test");
  assert.equal(signature.action, "cyber-sentinels-verify");
  assert.match(signature.sig, /^0x[0-9a-f]{130}$/i);
  assert.match(signature.nonce, /^0x[0-9a-f]{64}$/i);
  assert.equal(typeof signature.created_at, "number");
  assert.equal(typeof signature.expires_at, "number");
});
