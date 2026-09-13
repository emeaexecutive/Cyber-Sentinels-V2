import assert from "node:assert/strict";
import test from "node:test";
import { evaluateExternalEffectBoundary } from "../src/lib/trust-fabric/external-effect-boundary.ts";
import {
  evaluateInterviewObservationPolicy,
  parsePolicyEvidence,
} from "../src/lib/protected-workflows/policy-continuity.ts";

const workspace = "40000000-0000-4000-8000-000000000001";
const workflow = "40000000-0000-4000-8000-000000000002";
const policyReference = "interview-policy:1";

function policy(overrides = {}) {
  return parsePolicyEvidence({
    policyId: "interview-policy",
    policyVersion: "1",
    policyEffectiveAt: "2026-09-01T00:00:00.000Z",
    policySource: "employer_policy_portal",
    policyDigest: "a".repeat(64),
    policyScope: ["interview"],
    permittedAiAssistance: ["disclosed_assistance"],
    prohibitedAiAssistance: [],
    requiredDisclosure: false,
    requiredConsent: true,
    requiredIdentityControls: ["candidate_acknowledgement"],
    candidateAcknowledgement: "ACKNOWLEDGED",
    acknowledgementTimestamp: "2026-09-02T00:00:00.000Z",
    acknowledgementMethod: "candidate_portal",
    ...overrides,
  }, { workspace, workflow, policyReference });
}

const authority = {
  tenantId: workspace,
  agentId: "agent:alpha",
  declaredTask: "publish approved interview artifact",
  permittedEnvironments: ["production"],
  permittedTargets: ["system:content-store"],
  permittedActions: ["publish_artifact"],
  permittedExternalEffects: ["ARTIFACT_PUBLICATION"],
  permittedCredentialReferences: ["credential:content-store"],
  permittedExternalChannels: ["channel:content-store-api"],
};

function request(overrides = {}) {
  return {
    tenantId: workspace,
    agentId: "agent:alpha",
    target: "system:content-store",
    action: "publish_artifact",
    environment: "production",
    externalEffect: "ARTIFACT_PUBLICATION",
    credentialReference: "credential:content-store",
    externalChannel: "channel:content-store-api",
    ...overrides,
  };
}

test("valid agent, target, action and external effect are ALLOW", () => {
  const result = evaluateExternalEffectBoundary(authority, request());
  assert.equal(result.decision, "ALLOW");
  assert.deepEqual(result.reasonCodes, ["TARGET_AUTHORITY_VERIFIED"]);
});

test("out-of-scope target is DENY even when the agent is valid", () => {
  const result = evaluateExternalEffectBoundary(authority, request({ target: "system:other" }));
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("TARGET_OUT_OF_SCOPE"));
});

test("credential and external channel authority are separate from network permission", () => {
  const result = evaluateExternalEffectBoundary(authority, request({ credentialReference: "credential:other", externalChannel: "channel:other" }));
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("CREDENTIAL_ACCESS_UNAUTHORIZED"));
  assert.ok(result.reasonCodes.includes("EXTERNAL_CHANNEL_UNAUTHORIZED"));
});

test("tenant mismatch rejects caller-supplied boundary context", () => {
  const result = evaluateExternalEffectBoundary(authority, request({ tenantId: "40000000-0000-4000-8000-000000000099" }));
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("TENANT_BOUNDARY_MISMATCH"));
});

test("agent authority does not imply every external effect", () => {
  const result = evaluateExternalEffectBoundary(authority, request({ externalEffect: "ACCOUNT_CREATION" }));
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("EXTERNAL_EFFECT_UNAUTHORIZED"));
});

test("prohibited interview AI assistance is a policy DENY, not a fraud inference", () => {
  const result = evaluateInterviewObservationPolicy(policy({ externalAiObservationPolicy: "PROHIBITED" }), {
    externalAiObserved: true,
    externalAiDisclosed: false,
  });
  assert.equal(result.authorization, "DENY");
  assert.ok(result.reasonCodes.includes("EXTERNAL_AI_OBSERVATION_PROHIBITED"));
  assert.equal(result.reasonCodes.some((code) => /FRAUD|MALICIOUS|IMPERSONATOR/.test(code)), false);
});

test("interview policy dimensions are included in the immutable acknowledgement digest", () => {
  const allowed = policy({ recordingPolicy: "ALLOWED" });
  const approvalRequired = policy({ recordingPolicy: "APPROVAL_REQUIRED" });
  assert.notEqual(allowed.acknowledgementDigest, approvalRequired.acknowledgementDigest);
});

test("restricted transcript retention and required recording approval produce REVIEW", () => {
  const result = evaluateInterviewObservationPolicy(policy({ transcriptRetentionPolicy: "RESTRICTED", recordingPolicy: "APPROVAL_REQUIRED" }), {
    transcriptRetainedExternally: true,
    recordingObserved: true,
    recordingApproved: false,
  });
  assert.equal(result.authorization, "REVIEW");
  assert.ok(result.reasonCodes.includes("TRANSCRIPT_RETENTION_REVIEW_REQUIRED"));
  assert.ok(result.reasonCodes.includes("RECORDING_APPROVAL_REQUIRED"));
});

test("prohibited transcript retention is DENY", () => {
  const result = evaluateInterviewObservationPolicy(policy({ transcriptRetentionPolicy: "PROHIBITED" }), { transcriptRetainedExternally: true });
  assert.equal(result.authorization, "DENY");
});

test("policy-compliant interview tooling is ALLOW", () => {
  const result = evaluateInterviewObservationPolicy(policy({ recordingPolicy: "APPROVAL_REQUIRED", externalAiObservationPolicy: "DISCLOSED_ONLY" }), {
    recordingObserved: true,
    recordingApproved: true,
    externalAiObserved: true,
    externalAiDisclosed: true,
    candidateAcknowledged: true,
  });
  assert.equal(result.authorization, "ALLOW");
});

test("existing canonical artifacts remain the shared chain", async () => {
  const { readFile } = await import("node:fs/promises");
  const server = await readFile(new URL("../lib/protected-workflows/server.ts", import.meta.url), "utf8");
  assert.match(server, /executeCanonicalTrustTransaction/);
  assert.match(server, /interviewPolicyEvaluation/);
  assert.match(server, /delegatedAuthorization/);
  assert.doesNotMatch(server, /create table|new.*ledger|second.*decision/i);
});
