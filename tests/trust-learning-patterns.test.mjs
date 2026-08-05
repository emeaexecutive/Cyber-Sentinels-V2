import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { EnterpriseTrustPatternEngine } from "../src/lib/trust-learning/pattern-engine.ts";
import { enterpriseTrustPatternTypes } from "../src/lib/trust-learning/types.ts";
import { createTrustLearningFeedback } from "../src/lib/trust-learning/feedback.ts";
import { deriveEnterpriseTrustGenome } from "../src/lib/trust-learning/genome.ts";
import { evaluateTrustIntelligenceModel } from "../src/lib/trust-learning/evaluation.ts";
import { buildHistoricalTrustForecast } from "../src/lib/trust-learning/forecast.ts";

const engine = new EnterpriseTrustPatternEngine();
const event = (overrides = {}) => ({ eventId: crypto.randomUUID(), enterpriseId: "tenant:a", eventType: "workflow.review", occurredAt: "2026-08-01T00:00:00.000Z", subjectType: "AI_AGENT", subjectReference: "agent:1", workflowReference: "workflow:1", authorityReference: "authority:1", policyReference: "policy:1", providerReference: "provider:1", incidentReference: null, decisionReference: crypto.randomUUID(), evidenceReferences: [`evidence:${crypto.randomUUID()}`], materiality: "moderate", ...overrides });
const detect = (eventType, overrides = {}) => engine.detect({ enterpriseId: "tenant:a", events: [event({ eventType, occurredAt: "2026-08-01T00:00:00.000Z", ...overrides }), event({ eventType, occurredAt: "2026-08-02T00:00:00.000Z", ...overrides })] });

test("all bounded pattern types are registered and key recurrence families are detected", () => {
  assert.equal(enterpriseTrustPatternTypes.length, 28);
  for (const [eventType, expected] of [["authority.expired", "repeated_authority_expiry"], ["provider.contradiction", "recurring_provider_contradiction"], ["workflow.review", "repeated_human_review"], ["workflow.environment_mismatch", "repeated_environment_mismatch"], ["provider.corrected", "recurring_provider_correction"]]) assert.equal(detect(eventType)[0]?.patternType, expected);
});

test("insufficient samples and non-material noise do not create a pattern", () => {
  assert.deepEqual(engine.detect({ enterpriseId: "tenant:a", events: [event()] }), []);
  assert.deepEqual(engine.detect({ enterpriseId: "tenant:a", events: [event({ materiality: "none" }), event({ materiality: "none" })] }), []);
});

test("cross-tenant events cannot contribute to tenant recurrence", () => {
  const events = [event(), event({ enterpriseId: "tenant:b" })];
  assert.deepEqual(engine.detect({ enterpriseId: "tenant:a", events }), []);
  assert.deepEqual(engine.detect({ enterpriseId: "tenant:b", events }), []);
});

test("pattern digest is deterministic, source-linked and correction-aware", () => {
  const events = [event({ eventId: "event:1" }), event({ eventId: "event:2", correctedEventReference: "event:1" })];
  const first = engine.detect({ enterpriseId: "tenant:a", events })[0];
  const second = engine.detect({ enterpriseId: "tenant:a", events: [...events].reverse() })[0];
  assert.equal(first.canonicalDigest, second.canonicalDigest); assert.equal(first.patternId, second.patternId); assert.equal(first.status, "corrected"); assert.equal(first.evidenceReferences.length, 2); assert.deepEqual(first.supportingEventReferences, ["event:1", "event:2"]);
});

test("review feedback is deterministic and never retrains automatically", () => {
  for (const label of ["accepted", "corrected", "rejected"]) { const input = { enterpriseId: "tenant:a", reviewerReference: "reviewer:1", reviewerRole: "reviewer", outputReference: `output:${label}`, sourceVersion: "v1", label, reason: "Evidence-backed reviewer assessment.", correction: label === "corrected" ? "Corrected text." : null, createdAt: "2026-08-03T00:00:00.000Z" }; const feedback = createTrustLearningFeedback(input); assert.equal(feedback.automaticRetrainingTriggered, false); assert.equal(feedback.feedbackId, createTrustLearningFeedback({ ...input, reason: "Different reason still conflicts at persistence identity." }).feedbackId); }
});

test("Enterprise Trust Genome is tenant-bound, source-linked and has no universal score", () => {
  const pattern = detect("authority.expired")[0]; const genome = deriveEnterpriseTrustGenome({ enterpriseId: "tenant:a", patterns: [pattern, { ...pattern, enterpriseId: "tenant:b" }], version: "v1", generatedAt: "2026-08-03T00:00:00.000Z" });
  assert.equal(genome.crossCustomerLearning, false); assert.equal(genome.universalScore, null); assert.ok(genome.sourceReferences.length > 0); assert.ok(genome.dimensions.every((dimension) => dimension.patternReferences.length <= 1));
});

test("offline evaluation measures grounding without inventing a successful empty benchmark", () => {
  assert.equal(evaluateTrustIntelligenceModel([]).status, "not_run");
  const result = evaluateTrustIntelligenceModel([{ caseId: "case:1", enterpriseId: "tenant:a", retrievedEnterpriseIds: ["tenant:a"], expectedEvidenceReferences: ["e:1"], citedEvidenceReferences: ["e:1"], unsupportedClaimCount: 0, contradictionExpected: true, contradictionPreserved: true, missingEvidenceExpected: true, missingEvidenceDisclosed: true, recommendationPolicyConformant: true, sensitiveDataLeakCount: 0, deterministicFallbackAvailable: true }]);
  assert.equal(result.status, "measured"); assert.equal(result.promotionEligible, true); assert.equal(result.metrics.tenantIsolation, 1);
});

test("Trust Prediction is a bounded historical comparison with no causal or misconduct claim", () => {
  const pattern = detect("workflow.review")[0]; const forecast = buildHistoricalTrustForecast({ pattern, comparisonPopulation: "Reviewed tenant cases", sampleSize: 10, matchingCaseCount: 8 });
  assert.match(forecast.statement, /8 of 10 reviewed instances/); assert.equal(forecast.noCausalClaim, true); assert.equal(forecast.futureMisconductPrediction, false); assert.equal(forecast.sampleSize, 10); assert.ok(forecast.limitations.some((item) => /not a causal claim/.test(item)));
});

test("development migration enforces RLS, service-only writes and no raw prompts", () => {
  const sql = readFileSync(new URL("../supabase/migrations/202608050001_enterprise_trust_learning.sql", import.meta.url), "utf8");
  for (const table of ["enterprise_trust_patterns", "enterprise_trust_pattern_versions", "trust_intelligence_ai_outputs", "trust_intelligence_reviewer_feedback", "trust_simulation_runs", "trust_resilience_assessments", "model_evaluation_runs"]) assert.match(sql, new RegExp(`['\"]${table}['\"]`));
  assert.match(sql, /alter table public\.%I enable row level security/); assert.match(sql, /revoke all on public\.%I from public, anon, authenticated/); assert.match(sql, /grant all privileges on public\.%I to service_role/); assert.match(sql, /Raw prompts and raw customer payloads are prohibited/); assert.doesNotMatch(sql, /grant insert.+authenticated/i);
});

test("learning APIs reuse authenticated tenant context, CSRF and strict JSON boundaries", () => {
  const routes = ["patterns/evaluate", "narrative", "recommendations", "simulations", "resilience"];
  for (const route of routes) { const source = readFileSync(new URL(`../app/api/trust/learning/${route}/route.ts`, import.meta.url), "utf8"); assert.match(source, /trustLearningContext/); assert.match(source, /readTrustLearningJson/); assert.doesNotMatch(source, /value\.enterpriseId|body\.enterpriseId/); }
  const http = readFileSync(new URL("../src/lib/trust-learning/http.ts", import.meta.url), "utf8"); assert.match(http, /assertArchitectureMutation/); assert.match(http, /64_000|assertTrustLearningMutation/);
  const repository = readFileSync(new URL("../src/lib/trust-learning/repository.ts", import.meta.url), "utf8"); assert.match(repository, /\.eq\("enterprise_id", enterpriseId\)/); assert.match(repository, /service-role/);
});

test("existing Trust Centre owns the learning view and the synthetic demo labels evidence states", () => {
  const centre = readFileSync(new URL("../src/components/trust-centre/EnterpriseTrustCentre.tsx", import.meta.url), "utf8"); const panel = readFileSync(new URL("../src/components/trust-learning/EnterpriseTrustLearningPanel.tsx", import.meta.url), "utf8"); const demo = readFileSync(new URL("../app/demo/operational-trust/page.tsx", import.meta.url), "utf8");
  assert.match(centre, /Trust Learning/); assert.match(panel, /Observed evidence stays distinct from derived patterns/); assert.match(panel, /AI adapter: not configured/); assert.match(demo, /Synthetic controlled demonstrator/); assert.match(demo, /Deterministic narrative fallback/); assert.match(demo, /Replay/); assert.match(demo, /Trust Memory/);
});
