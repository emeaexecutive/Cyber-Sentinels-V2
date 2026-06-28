import assert from "node:assert/strict";
import test from "node:test";
import { evaluateTrustAssurance } from "../lib/trust-assurance/levels.ts";
import {
  defineHighAssuranceProvider,
  validateHighAssuranceEvidence,
} from "../lib/providers/high-assurance.ts";

const base = {
  basicEvidence: true,
  sessionContinuity: true,
  consentRecorded: true,
  providerBackedIdentity: true,
  governanceApproved: true,
  replayIntegrity: true,
  authorizationContinuity: true,
  secureDeviceAttestation: true,
  evidenceQuality: 90,
  evidenceReferences: ["receipt-1", "replay-1"],
};

test("L5 requires evidence, consent, governance, replay, authorization and attestation", () => {
  const result = evaluateTrustAssurance(base);
  assert.equal(result.level, "L5");
  assert.equal(result.contextualNotCertain, true);
});

test("provider evidence without consent cannot reach L3", () => {
  const result = evaluateTrustAssurance({ ...base, consentRecorded: false });
  assert.equal(result.level, "L2");
  assert.ok(result.unmetRequirements.includes("Consent is recorded"));
});

test("biometrics are not required for high-assurance operational trust", () => {
  const result = evaluateTrustAssurance(base);
  assert.equal(result.level, "L5");
  assert.equal(
    result.satisfiedRequirements.some((requirement) => /biometric|iris/i.test(requirement)),
    false
  );
});

test("high-assurance provider contracts accept references only", () => {
  const contract = defineHighAssuranceProvider("future-device-provider", [
    "secure_device_attestation",
  ]);
  const validation = validateHighAssuranceEvidence(contract, {
    providerId: "future-device-provider",
    capability: "secure_device_attestation",
    verificationState: "verified",
    evidenceReference: "attestation-event-1",
    observedAt: "2026-06-28T10:00:00.000Z",
    consentReference: "consent-1",
    summary: "Device attestation reference recorded.",
  });

  assert.equal(contract.acceptsRawBiometricOutput, false);
  assert.equal(validation.replaySafe, true);
});
