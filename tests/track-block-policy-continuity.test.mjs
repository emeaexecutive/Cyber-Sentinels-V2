import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { evaluateAiAssistance, interventionForDecision } from "../src/lib/protected-workflows/model.ts";
import {
  evaluatePolicyAssistance,
  evaluateWorkforceContinuity,
  parsePolicyEvidence,
  parseWorkforceContinuityEvidence,
  policyAcknowledgementDigest,
} from "../src/lib/protected-workflows/policy-continuity.ts";
import { candidateAliceInvestorDemo } from "../src/lib/protected-workflows/candidate-alice-demo.ts";

const workspace = "30000000-0000-4000-8000-000000000001";
const workflow = "30000000-0000-4000-8000-000000000002";
const operationalEntityId = "human:alice";
const policyReference = "candidate-ai:7";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function policyInput(overrides = {}) {
  return {
    policyId: "candidate-ai",
    policyVersion: "7",
    policyEffectiveAt: "2026-08-01T00:00:00.000Z",
    policySource: "employer_policy_portal",
    policyDigest: "a".repeat(64),
    policyScope: ["candidate_interview"],
    permittedAiAssistance: [],
    prohibitedAiAssistance: ["realtime_answer_assistance"],
    requiredDisclosure: true,
    requiredConsent: true,
    requiredIdentityControls: ["interview_identity_continuity"],
    candidateAcknowledgement: "ACKNOWLEDGED",
    acknowledgementTimestamp: "2026-08-02T10:00:00.000Z",
    acknowledgementMethod: "candidate_portal_checkbox",
    sessionId: "session:alice",
    interviewId: "interview:alice",
    evidenceReferences: ["evidence:policy"],
    ...overrides,
  };
}

function policy(overrides = {}) {
  return parsePolicyEvidence(policyInput(overrides), { workspace, workflow, policyReference });
}

function continuity(overrides = {}) {
  return parseWorkforceContinuityEvidence({ stage: "ISSUED_DEVICE", state: "CONTINUITY_CHANGED", finding: "LOGIN_DEVICE_CHANGED", evidenceReferences: ["evidence:device"] , ...overrides }, { workspace, workflow, operationalEntityId, source: "endpoint_provider", observedAt: "2026-08-21T08:00:00.000Z" });
}

test("vendor identity and AI observation alone cannot force DENY", () => {
  for (const provider of ["Parakeet", "other", "unknown"]) {
    const result = evaluatePolicyAssistance({ policy: null, assistanceObserved: true, assistanceDeclared: false, disclosurePresent: false, corroborated: false, provider });
    assert.equal(result.authorization, "REVIEW");
    assert.notEqual(result.authorization, "DENY");
  }
  const legacy = evaluateAiAssistance({ policy: "prohibited", declared: false, observed: true, confidence: 0.99, corroborated: true, highConsequence: true });
  assert.equal(legacy.authorization, "REVIEW");
});

test("policy version and candidate acknowledgement are immutable digest-bound evidence", () => {
  const historical = policy();
  const digestInput = { ...historical };
  delete digestInput.evidenceType;
  delete digestInput.acknowledgementDigest;
  delete digestInput.decisionTransactionReference;
  assert.equal(historical.acknowledgementDigest, policyAcknowledgementDigest(digestInput));
  assert.throws(() => policy({ acknowledgementDigest: "b".repeat(64) }), /does not bind/);
  const later = parsePolicyEvidence(policyInput({ policyVersion: "8" }), { workspace, workflow, policyReference: "candidate-ai:8" });
  assert.equal(historical.policyVersion, "7");
  assert.equal(later.policyVersion, "8");
  assert.notEqual(historical.acknowledgementDigest, later.acknowledgementDigest);
});

test("cross-tenant policy and workforce continuity evidence are rejected", () => {
  assert.throws(() => parsePolicyEvidence(policyInput({ workspace: "30000000-0000-4000-8000-000000000099" }), { workspace, workflow, policyReference }), /another workspace/);
  assert.throws(() => parseWorkforceContinuityEvidence({ workspace: "30000000-0000-4000-8000-000000000099", stage: "FIRST_ACCESS", state: "CONTINUITY_VERIFIED" }, { workspace, workflow, operationalEntityId, source: "identity_provider", observedAt: "2026-08-21T08:00:00.000Z" }), /another workspace/);
  assert.throws(() => parseWorkforceContinuityEvidence({ operationalEntityId: "human:bob", stage: "FIRST_ACCESS", state: "CONTINUITY_VERIFIED" }, { workspace, workflow, operationalEntityId, source: "identity_provider", observedAt: "2026-08-21T08:00:00.000Z" }), /another Operational Entity/);
});

test("device and remote-access changes remain evidence and route to canonical REVIEW plus step-up", () => {
  const result = evaluateWorkforceContinuity([continuity(), continuity({ stage: "CONTINUING_WORKFORCE_IDENTITY", state: "CONTINUITY_UNPROVEN", finding: "REMOTE_ACCESS_PATH_OBSERVED" })]);
  assert.equal(result.authorization, "REVIEW");
  assert.equal(result.intervention, "STEP_UP_VERIFICATION");
  assert.equal(interventionForDecision({ decision: result.authorization, preferred: result.intervention }), "STEP_UP_VERIFICATION");
  assert.equal(result.reasonCodes.some((code) => /FRAUD|MALICIOUS|IMPERSONATOR/.test(code)), false);
  const server = read("lib/protected-workflows/server.ts");
  assert.match(server, /executeCanonicalTrustTransaction/);
  assert.match(server, /authorization: delegatedAuthorization/);
});

test("the existing canonical artifacts are extended without a second receipt or identity registry", () => {
  const sources = [
    read("lib/protected-workflows/server.ts"),
    read("src/lib/protected-workflows/policy-continuity.ts"),
    read("supabase/migrations/20260821085309_track_block_policy_identity_continuity.sql"),
  ].join("\n");
  assert.match(sources, /evidence_objects/);
  assert.match(sources, /evidence_graph/);
  assert.match(sources, /trust_replay_sessions/);
  assert.match(sources, /trust_memory_index/);
  for (const event of ["POLICY_ACKNOWLEDGED", "POLICY_VERSION_CHANGED", "AI_ASSISTANCE_DECLARED", "AI_ASSISTANCE_POLICY_CONFLICT", "IDENTITY_CONTINUITY_CHANGED", "DEVICE_PROVENANCE_CHANGED", "REMOTE_ACCESS_PATH_OBSERVED", "STEP_UP_VERIFICATION_REQUIRED", "WORKFORCE_IDENTITY_REVERIFIED"]) assert.match(sources, new RegExp(event));
  assert.doesNotMatch(sources, /create table(?: if not exists)? public\.(?:policy_evidence_receipts|workforce_identity_registry|track_block_receipts)/i);
  assert.equal((read("supabase/migrations/20260821085309_track_block_policy_identity_continuity.sql").match(/create table/gi) ?? []).length, 0);
});

test("the provider-neutral Evidence API accepts policy and continuity types through tenant-bound workflows", () => {
  const runtime = read("lib/public-api/v1/runtime.ts");
  const openapi = read("lib/public-api/v1/openapi.ts");
  assert.match(runtime, /POLICY_ACKNOWLEDGEMENT/);
  assert.match(runtime, /DEVICE_PROVENANCE/);
  assert.match(runtime, /parsePolicyEvidence/);
  assert.match(runtime, /parseWorkforceContinuityEvidence/);
  assert.match(runtime, /\.eq\("workspace_id", principal\.tenantId\)/);
  assert.match(runtime, /WORKFLOW_EVIDENCE_TENANT_MISMATCH/);
  assert.match(openapi, /policy_acknowledgement/);
  assert.match(openapi, /device_provenance/);
  assert.doesNotMatch(runtime, /candidate_(?:api|evidence|receipt)_stack/i);
});

test("Candidate Alice demo derives policy and continuity decisions", () => {
  const demo = candidateAliceInvestorDemo();
  assert.equal(demo.canonicalTransactions[0].decision, "REVIEW");
  assert.equal(demo.canonicalTransactions.at(-1).decision, "REVIEW");
  assert.equal(demo.identityContinuity.currentState, "CONTINUITY_UNPROVEN");
  assert.equal(demo.workflow.latest_intervention, "STEP_UP_VERIFICATION");
  assert.match(read("src/lib/protected-workflows/candidate-alice-demo.ts"), /candidateEvaluation\.authorization \?\? "ALLOW"/);
  assert.match(read("src/lib/protected-workflows/candidate-alice-demo.ts"), /workforceEvaluation\.authorization \?\? "ALLOW"/);
  const page = read("app/demo/track-block-candidate-alice/page.tsx");
  assert.match(page, /deploymentEnvironment === "production"/);
  assert.match(page, /process\.env\.NODE_ENV === "production"/);
  assert.match(page, /TrackBlockSurface/);
});
