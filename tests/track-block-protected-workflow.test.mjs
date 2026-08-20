import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  aiAssistanceEvidenceTypes,
  aiAssistanceProviderMetadata,
  assertProviderObservation,
  assertWorkflowMutable,
  evaluateAiAssistance,
  interventionForDecision,
  parseWorkflowEvidence,
} from "../src/lib/protected-workflows/model.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("caller-authoritative decisions and trust scores are rejected", () => {
  const base = { category: "session", source: "browser", sourceParty: "cyber_sentinels", observedAt: new Date().toISOString(), classification: "continuity", severity: "informational" };
  assert.throws(() => parseWorkflowEvidence({ ...base, decision: "ALLOW" }), /server-authoritative/);
  assert.throws(() => parseWorkflowEvidence({ ...base, metadata: { trustScore: 99 } }), /server-authoritative/);
  assert.throws(() => parseWorkflowEvidence({ ...base, verificationResult: "verified" }), /server-authoritative/);
});

test("weak AI evidence can require review but cannot block or imply fraud", () => {
  const result = evaluateAiAssistance({ policy: "allowed_if_declared", declared: false, observed: true, confidence: 0.42, corroborated: false, highConsequence: true });
  assert.equal(result.authorization, "REVIEW");
  assert.equal(interventionForDecision({ decision: result.authorization, preferred: "BLOCK", policyPermitsBlock: true }), "CHALLENGE");
  assert.equal(JSON.stringify(result).toLowerCase().includes("fraud"), false);
});

test("allowed AI assistance records evidence without adverse classification", () => {
  const result = evaluateAiAssistance({ policy: "allowed", declared: false, observed: true, confidence: 0.95, corroborated: true, highConsequence: true });
  assert.equal(result.authorization, null);
  assert.deepEqual(result.reasonCodes, ["AI_ASSISTANCE_ALLOWED"]);
  assert.equal(JSON.stringify(result).toLowerCase().includes("malicious"), false);
});

test("AI-assistance evidence is explicitly typed and provider metadata stays outcome-neutral", () => {
  assert.deepEqual(aiAssistanceEvidenceTypes, ["ai_assistance_observed", "ai_assistance_declared", "ai_assistance_policy_conflict", "possible_realtime_answer_assistance"]);
  assert.deepEqual(aiAssistanceProviderMetadata, ["Parakeet", "ChatGPT", "Claude", "Gemini", "unknown", "other"]);
  const base = { category: "ai_assistance", evidenceType: "possible_realtime_answer_assistance", source: "application_signal", sourceParty: "configured_provider", observedAt: new Date().toISOString(), classification: "possible_assistance", severity: "medium", confidence: 0.42 };
  const parakeet = parseWorkflowEvidence({ ...base, metadata: { provider: "Parakeet", corroborated: false } });
  const other = parseWorkflowEvidence({ ...base, metadata: { provider: "other", corroborated: false } });
  assert.equal(parakeet.evidenceType, "possible_realtime_answer_assistance");
  assert.deepEqual(
    evaluateAiAssistance({ policy: "allowed_if_declared", declared: false, observed: true, confidence: parakeet.confidence, corroborated: false, highConsequence: true }),
    evaluateAiAssistance({ policy: "allowed_if_declared", declared: false, observed: true, confidence: other.confidence, corroborated: false, highConsequence: true }),
  );
  assert.throws(() => parseWorkflowEvidence({ ...base, evidenceType: "provider_says_block" }), /evidence type is invalid/);
  assert.throws(() => parseWorkflowEvidence({ ...base, category: "session" }), /only valid for AI-assistance/);
  assert.match(read("src/lib/protected-workflows/model.ts"), /interface ProtectedWorkflowSignalProvider/);
});

test("human-review-required policy never auto-blocks", () => {
  assert.equal(interventionForDecision({ decision: "REVIEW", humanReviewRequired: true, preferred: "BLOCK", policyPermitsBlock: true }), "PAUSE");
  assert.equal(interventionForDecision({ decision: "DENY", humanReviewRequired: true, preferred: "BLOCK", policyPermitsBlock: true }), "PAUSE");
});

test("completed workflow is protected", () => {
  assert.throws(() => assertWorkflowMutable("completed"), /cannot be changed/);
  assert.throws(() => assertWorkflowMutable("terminated"), /cannot be changed/);
});

test("unconfigured provider cannot manufacture telemetry", () => {
  assert.throws(() => assertProviderObservation({ providerKey: "future-edr", sourceParty: "future", capabilityState: "NOT_CONFIGURED", observedAt: new Date().toISOString(), category: "device" }), /cannot emit/);
  assert.doesNotThrow(() => assertProviderObservation({ providerKey: "future-edr", sourceParty: "future", capabilityState: "NOT_CONFIGURED" }));
});

test("all workflow APIs use authenticated tenant context and server ownership", () => {
  const routes = [
    "app/api/trust/protected-workflows/route.ts",
    "app/api/trust/protected-workflows/[id]/route.ts",
    "app/api/trust/protected-workflows/[id]/evidence/route.ts",
    "app/api/trust/protected-workflows/[id]/evaluate/route.ts",
    "app/api/trust/protected-workflows/[id]/interventions/route.ts",
  ].map(read).join("\n");
  assert.match(routes, /mutationContext|continuousTrustContext/);
  assert.match(routes, /auth\.enterpriseId/);
  assert.match(read("lib/protected-workflows/server.ts"), /\.eq\("workspace_id", workspaceId\)|\.eq\("workspace_id", input\.workspaceId\)/);
  assert.doesNotMatch(routes, /body\.(workspace|tenant|owner)/);
});

test("Replay, Trust Memory and receipts reuse canonical stores", () => {
  const server = read("lib/protected-workflows/server.ts");
  const canonicalServer = read("lib/trust-transaction/server.ts");
  for (const event of ["WORKFLOW_STARTED", "CONSENT_CONFIRMED", "EVIDENCE_OBSERVED", "CANONICAL_DECISION", "CHALLENGE_REQUIRED", "STEP_UP_STARTED", "PAUSED", "BLOCKED", "RESUMED", "WORKFLOW_COMPLETED"]) assert.match(server, new RegExp(event));
  assert.match(server, /from\("trust_replay_sessions"\)/);
  assert.match(server, /from\("trust_memory_index"\)\.upsert/);
  assert.match(server, /onConflict: "enterprise_id,memory_type,source_id"/);
  assert.match(server, /receipt_reference: `\/api\/trust\/transactions\/\$\{transaction\.data\.transaction_id\}\/receipt`/);
  assert.match(server, /evidence_references/);
  assert.match(server, /observed_at: evidence\.observedAt/);
  assert.match(server, /freshness_policy_seconds: 86_400/);
  assert.match(server, /ensureEvidenceGraphNode/);
  assert.doesNotMatch(server, /from\("evidence_graph_nodes"\)\.upsert/);
  assert.match(canonicalServer, /from\("evidence_objects"\)/);
  assert.match(canonicalServer, /else if \(!uuidPattern\.test\(subjectId\)\) \{\s*return baselineEvidence;/);
  assert.doesNotMatch(server, /track_block_(decisions|signals|replay|trust_memory)/i);
});

test("bounded authenticated UI states technical observation limits", () => {
  const page = read("app/dashboard/track-block/page.tsx");
  const surface = read("src/components/protected-workflows/TrackBlockSurface.tsx");
  assert.match(page, /Track \+ Block™/);
  assert.match(page, /Continuous trust controls for high-risk digital interactions/);
  assert.match(page, /Endpoint processes, remote-access software and other applications require separately configured capabilities/);
  for (const label of ["Protected Workflow", "Subject", "Identity continuity", "Consent", "Policy", "AI-assistance evidence", "Session continuity", "Media evidence", "Outstanding challenge", "Canonical decision", "Current intervention", "View Evidence", "View Authority Lineage", "Open Replay", "View Receipt"]) assert.match(surface, new RegExp(label));
});
