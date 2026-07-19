import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateProviderCapabilityTruth, providerCapabilityStates } from "../lib/providers/capability-truth.ts";
import { classifyOperationalEvidence, externalControlTruth, operationalEvidenceStates } from "../lib/operations/external-control-truth.ts";

test("provider truth uses the complete explicit state vocabulary", () => {
  assert.deepEqual(providerCapabilityStates, ["REGISTERED", "CONFIGURED", "AVAILABLE", "TRANSACTIONAL", "SIGNED", "SERVER_VERIFIED", "DEGRADED", "DISABLED", "BLOCKED"]);
});

test("Hopae signed and server-verified states require the complete evidence chain", () => {
  const incomplete = evaluateProviderCapabilityTruth({ registered: true, configured: true, enabled: true, healthState: "HEALTHY", transactionReference: "verification-1", transactionSucceeded: true, signatureVerified: true, idempotencyVerified: false, normalizedEvidencePersisted: true, serverVerifiedEvidence: true });
  assert.equal(incomplete.states.includes("TRANSACTIONAL"), true);
  assert.equal(incomplete.states.includes("SIGNED"), false);
  assert.equal(incomplete.states.includes("SERVER_VERIFIED"), false);
  assert.equal(incomplete.states.includes("BLOCKED"), true);

  const complete = evaluateProviderCapabilityTruth({ registered: true, configured: true, enabled: true, healthState: "HEALTHY", transactionReference: "verification-1", transactionSucceeded: true, signatureVerified: true, idempotencyVerified: true, normalizedEvidencePersisted: true, serverVerifiedEvidence: true });
  assert.equal(complete.states.includes("SIGNED"), true);
  assert.equal(complete.states.includes("SERVER_VERIFIED"), true);
  assert.equal(complete.states.includes("BLOCKED"), false);
});

test("disabled and placeholder providers cannot acquire positive runtime states", () => {
  const truth = evaluateProviderCapabilityTruth({ registered: true, configured: false, enabled: false, healthState: "UNKNOWN", transactionReference: null, transactionSucceeded: false, signatureVerified: false, idempotencyVerified: false, normalizedEvidencePersisted: false, serverVerifiedEvidence: false, blockers: ["No transactional adapter."] });
  assert.deepEqual(truth.states, ["REGISTERED", "DISABLED", "BLOCKED"]);
  for (const state of ["AVAILABLE", "TRANSACTIONAL", "SIGNED", "SERVER_VERIFIED"]) assert.equal(truth.states.includes(state), false);
});

test("placeholder health responses remain non-verifying with zero confidence", async () => {
  const healthRoute = await readFile(new URL("../app/api/identity/providers/health/route.ts", import.meta.url), "utf8");
  assert.match(healthRoute, /PROVIDER_ADAPTER_NOT_IMPLEMENTED/);
  assert.match(healthRoute, /CLIENT_REPORTED_DEVICE_CONTEXT/);
  assert.match(healthRoute, /confidence:\s*0/);
  assert.match(healthRoute, /serverVerified:\s*false/);
  assert.doesNotMatch(healthRoute, /state:\s*"VERIFIED"/);
});

test("external platform controls remain blocked without direct evidence", () => {
  assert.deepEqual(operationalEvidenceStates, ["VERIFIED_FROM_RUNTIME", "VERIFIED_FROM_REPOSITORY", "BLOCKED_BY_EXTERNAL_CONFIGURATION", "NOT_CONFIGURED"]);
  const controls = externalControlTruth();
  assert.equal(controls.length, 7);
  assert.equal(controls.every((control) => control.state === "BLOCKED_BY_EXTERNAL_CONFIGURATION" && control.evidence.length === 0), true);
  assert.equal(classifyOperationalEvidence({ runtimeEvidence: ["authoritative runtime receipt"], requiresExternalEvidence: true }).state, "VERIFIED_FROM_RUNTIME");
  assert.equal(classifyOperationalEvidence({ repositoryEvidence: ["tracked configuration"], requiresExternalEvidence: false }).state, "VERIFIED_FROM_REPOSITORY");
  assert.equal(classifyOperationalEvidence({ configured: false }).state, "NOT_CONFIGURED");
});

test("World ID cannot produce verified state without server verification", async () => {
  const adapter = await readFile(new URL("../lib/identity-signals/adapters.ts", import.meta.url), "utf8");
  const callback = await readFile(new URL("../app/api/providers/world-id/callback/route.ts", import.meta.url), "utf8");
  const proofRoute = await readFile(new URL("../app/api/verify/world/route.ts", import.meta.url), "utf8");
  for (const source of [adapter, callback, proofRoute]) {
    assert.match(source, /WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED/);
    assert.doesNotMatch(source, /serverVerified:\s*true/);
  }
  assert.match(callback, /status:\s*"INCONCLUSIVE"/);
  assert.match(callback, /serverVerified:\s*false/);
  assert.match(proofRoute, /identityConfidence:\s*0/);
  assert.match(proofRoute, /sessionIntegrity:\s*0/);
  assert.match(proofRoute, /Proof received — server verification pending/);
});

test("Hopae exposes deterministic hardening reason codes and duplicate transaction guard", async () => {
  const server = await readFile(new URL("../lib/providers/hopae-rc1-server.ts", import.meta.url), "utf8");
  for (const reason of ["HOPAE_SIGNED_ASSERTION_VALID", "HOPAE_SIGNATURE_INVALID", "HOPAE_SIGNATURE_EXPIRED", "HOPAE_DUPLICATE_EVENT", "HOPAE_DUPLICATE_TRANSACTION", "HOPAE_PROVIDER_ERROR"]) assert.match(server, new RegExp(reason));
  assert.match(server, /provider_session_id/);
  assert.match(server, /status", "completed"/);
});
