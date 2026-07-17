import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  ORI_FEATURE_REGISTRY_V1,
  ORI_FEATURE_SCHEMA_VERSION,
  ORI_MODEL_ARTIFACT_V1,
  ORI_SYNTHETIC_DATASET_V1,
  ORI_THRESHOLDS_V1,
  assertOriFeatureRegistryIntegrity,
  calculateOriArtifactHash,
  calculateOriValidationMetrics,
  compareOriWithAuthoritativeDecision,
  extractOriFeatures,
  inferOperationalRisk,
  resolveOriOperatingMode,
  runOriAfterAuthoritativeDecision,
  validateOriFeatures,
  verifyOriModelArtifact,
} from "../lib/operational-risk/index.ts";

const tenantId = "11111111-1111-4111-8111-111111111111";
const trustSessionId = "22222222-2222-4222-8222-222222222222";
const fixedNow = new Date("2026-07-17T12:00:00.000Z");

function normalizedEvidence(overrides = {}) {
  return {
    tenantId,
    trustSessionId,
    correlationId: "ori-test-correlation",
    sourceEvidenceIds: ["evidence:normalized:1"],
    identityConfidence: 0.92,
    proofOfHuman: "verified",
    evidenceLastSeenAt: "2026-07-16T12:00:00.000Z",
    intentRisk: 20,
    governanceHistory: ["approved"],
    replayAvailable: true,
    now: fixedNow,
    ...overrides,
  };
}

function inferenceInput(overrides = {}) {
  const evidence = normalizedEvidence(overrides);
  return {
    tenantId,
    trustSessionId,
    correlationId: evidence.correlationId,
    featureSchemaVersion: ORI_FEATURE_SCHEMA_VERSION,
    features: extractOriFeatures(evidence),
  };
}

function featureValues(values) {
  const input = inferenceInput();
  return {
    ...input,
    features: input.features.map((candidate) => Object.hasOwn(values, candidate.featureId)
      ? { ...candidate, value: values[candidate.featureId] }
      : candidate),
  };
}

test("feature registry is unique, version compatible, sensitive, and fully documented", () => {
  assert.equal(assertOriFeatureRegistryIntegrity(), true);
  assert.equal(new Set(ORI_FEATURE_REGISTRY_V1.map((item) => item.id)).size, ORI_FEATURE_REGISTRY_V1.length);
  assert.ok(ORI_FEATURE_REGISTRY_V1.every((item) => item.schemaVersion === ORI_FEATURE_SCHEMA_VERSION));
  assert.ok(ORI_FEATURE_REGISTRY_V1.every((item) => item.sensitivity && item.normalization && item.retentionImplication && item.limitations.length));
});

test("controlled dataset retains synthetic, approval, version, and expected-class labels", () => {
  assert.equal(ORI_SYNTHETIC_DATASET_V1.length, 8);
  assert.ok(ORI_SYNTHETIC_DATASET_V1.every((item) => item.evidenceStatus === "SYNTHETIC"));
  assert.ok(ORI_SYNTHETIC_DATASET_V1.every((item) => item.reviewerReference === null));
  assert.ok(ORI_SYNTHETIC_DATASET_V1.every((item) => item.approvalState === "APPROVED_FOR_CONTROLLED_TEST"));
  assert.deepEqual([...new Set(ORI_SYNTHETIC_DATASET_V1.map((item) => item.expectedClass))].sort(), ["ABSTAIN", "HIGH", "LOW", "MODERATE"]);
});

test("deterministic extraction preserves evidence IDs, tenant scope, and fixed UTC age", () => {
  const first = extractOriFeatures(normalizedEvidence());
  const second = extractOriFeatures(normalizedEvidence());
  assert.deepEqual(first, second);
  assert.ok(first.every((item) => item.sourceTenantId === tenantId && item.sourceTrustSessionId === trustSessionId));
  assert.ok(first.every((item) => item.sourceEvidenceIds[0] === "evidence:normalized:1"));
  assert.equal(first.find((item) => item.featureId === "identity_evidence_age_days")?.value, 1);
});

test("normalization clips trusted extracted age and constrains ratios", () => {
  const features = extractOriFeatures(normalizedEvidence({ evidenceLastSeenAt: "2020-01-01T00:00:00.000Z" }));
  assert.equal(features.find((item) => item.featureId === "identity_evidence_age_days")?.value, 365);
  assert.equal(features.find((item) => item.featureId === "evidence_freshness_ratio")?.value, 0);
  assert.ok(Number(features.find((item) => item.featureId === "missing_evidence_ratio")?.value) >= 0);
});

test("unknown, duplicate, malformed, and cross-scope features are rejected", () => {
  const valid = inferenceInput();
  const unknown = { ...valid, features: [...valid.features, { ...valid.features[0], featureId: "raw_passport_image" }] };
  assert.match(validateOriFeatures(unknown).errors.join(" "), /unknown_or_inactive_feature/);
  const duplicate = { ...valid, features: [...valid.features, valid.features[0]] };
  assert.match(validateOriFeatures(duplicate).errors.join(" "), /duplicate_features/);
  const malformed = { ...valid, features: valid.features.map((item) => item.featureId === "missing_evidence_ratio" ? { ...item, value: 2 } : item) };
  assert.match(validateOriFeatures(malformed).errors.join(" "), /above_maximum/);
  const wrongScope = { ...valid, features: valid.features.map((item) => ({ ...item, sourceTenantId: "33333333-3333-4333-8333-333333333333" })) };
  assert.match(validateOriFeatures(wrongScope).errors.join(" "), /feature_scope_mismatch/);
});

test("missing evidence references and incompatible schema abstain", () => {
  const missingRefs = inferenceInput();
  missingRefs.features = missingRefs.features.map((item) => ({ ...item, sourceEvidenceIds: [] }));
  const missingResult = inferOperationalRisk(missingRefs, { now: fixedNow });
  assert.equal(missingResult.recommendation, "ABSTAIN");
  assert.equal(missingResult.riskBand, "UNKNOWN");
  const incompatible = { ...inferenceInput(), featureSchemaVersion: "2.0.0" };
  assert.equal(inferOperationalRisk(incompatible, { now: fixedNow }).abstain, true);
});

test("insufficient feature coverage produces abstention rather than misleading low risk", () => {
  const sparse = inferenceInput({ evidenceLastSeenAt: null, intentRisk: null, governanceHistory: undefined });
  const result = inferOperationalRisk(sparse, { now: fixedNow });
  assert.equal(result.abstain, true);
  assert.equal(result.confidenceBand, "INSUFFICIENT_EVIDENCE");
  assert.ok(result.evidenceCoverage < ORI_THRESHOLDS_V1.minimumFeatureCoverage);
});

test("canonical artifact hash is fixed and tampering is rejected", () => {
  assert.equal(ORI_MODEL_ARTIFACT_V1.artifactHash, "1af58c672114a0aeccd91f3c8c750054087cc73f02a92739bf21a9fcc0596b8a");
  assert.equal(calculateOriArtifactHash(ORI_MODEL_ARTIFACT_V1), ORI_MODEL_ARTIFACT_V1.artifactHash);
  assert.equal(verifyOriModelArtifact(ORI_MODEL_ARTIFACT_V1), true);
  const tampered = { ...ORI_MODEL_ARTIFACT_V1, coefficients: { ...ORI_MODEL_ARTIFACT_V1.coefficients, authority_scope_mismatch: 99 } };
  assert.equal(verifyOriModelArtifact(tampered), false);
  const result = inferOperationalRisk(inferenceInput(), { artifact: tampered, now: fixedNow });
  assert.equal(result.abstain, true);
  assert.equal(result.artifactHashVerified, false);
});

test("logistic inference is deterministic, bounded, and coefficient direction is explainable", () => {
  const first = inferOperationalRisk(inferenceInput(), { now: fixedNow, durationMs: 4 });
  const second = inferOperationalRisk(inferenceInput(), { now: fixedNow, durationMs: 4 });
  assert.deepEqual(first, second);
  assert.ok(first.score >= 0 && first.score <= 1);
  assert.ok(first.contributions.some((item) => item.direction === "RISK_INCREASING"));
  assert.ok(first.contributions.some((item) => item.direction === "RISK_REDUCING"));
  assert.deepEqual(first.contributions, [...first.contributions].sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution) || left.featureId.localeCompare(right.featureId)));
});

test("low, moderate, and high bands map only to non-authorizing recommendations", () => {
  const low = inferOperationalRisk(featureValues({ identity_verification_present: true, identity_evidence_age_days: 0, evidence_freshness_ratio: 1, missing_evidence_ratio: 0, replay_available: true, trust_memory_prior_review_count: 0, authority_scope_mismatch: false }), { now: fixedNow });
  const moderate = inferOperationalRisk(featureValues({ identity_verification_present: true, identity_evidence_age_days: 90, evidence_freshness_ratio: 0, missing_evidence_ratio: 0.33, replay_available: true, trust_memory_prior_review_count: 5, authority_scope_mismatch: true }), { now: fixedNow });
  const high = inferOperationalRisk(featureValues({ identity_verification_present: false, identity_evidence_age_days: 365, evidence_freshness_ratio: 0, missing_evidence_ratio: 1, replay_available: false, trust_memory_prior_review_count: 20, authority_scope_mismatch: true }), { now: fixedNow });
  assert.deepEqual([low.riskBand, moderate.riskBand, high.riskBand], ["LOW", "MODERATE", "HIGH"]);
  assert.deepEqual([low.recommendation, moderate.recommendation, high.recommendation], ["NO_ADDITIONAL_ACTION", "STEP_UP", "HUMAN_REVIEW"]);
  for (const result of [low, moderate, high]) assert.doesNotMatch(JSON.stringify(result), /"(ALLOW|BLOCK|APPROVE|REJECT)"/);
});

test("explanations contain registry factors and do not leak prohibited raw fields", () => {
  const result = inferOperationalRisk(inferenceInput(), { now: fixedNow });
  const serialized = JSON.stringify(result);
  assert.match(serialized, /identity_verification_present/);
  assert.doesNotMatch(serialized, /passport|biometric|api[_ -]?key|token|raw[_ -]?payload|email/i);
});

test("shadow comparator preserves unlike and unavailable decision categories", () => {
  const low = inferOperationalRisk(inferenceInput(), { now: fixedNow });
  const cautious = inferOperationalRisk(featureValues({ identity_verification_present: false, identity_evidence_age_days: 365, evidence_freshness_ratio: 0, missing_evidence_ratio: 1, replay_available: false, trust_memory_prior_review_count: 20, authority_scope_mismatch: true }), { now: fixedNow });
  assert.equal(compareOriWithAuthoritativeDecision(low, "allow"), "AGREED_LOW_RISK");
  assert.equal(compareOriWithAuthoritativeDecision(cautious, "allow"), "ORI_MORE_CAUTIONARY");
  assert.equal(compareOriWithAuthoritativeDecision(low, "review"), "ORI_LESS_CAUTIONARY");
  assert.equal(compareOriWithAuthoritativeDecision(cautious, "block"), "AGREED_REVIEW");
  assert.equal(compareOriWithAuthoritativeDecision(null, null), "AUTHORITATIVE_DECISION_UNAVAILABLE");
});

test("operating mode defaults off and rejects unsupported enforcement-like values", () => {
  assert.deepEqual(resolveOriOperatingMode({}), { enabled: false, mode: "off", configuredMode: "off", limitation: null });
  assert.equal(resolveOriOperatingMode({ ML_RISK_ENABLED: "true", ML_RISK_MODE: "shadow" }).mode, "shadow");
  const rejected = resolveOriOperatingMode({ ML_RISK_ENABLED: "true", ML_RISK_MODE: "enforce" });
  assert.equal(rejected.mode, "off");
  assert.equal(rejected.enabled, false);
});

function authenticatedClient(scope = { id: trustSessionId, workspace_id: tenantId }) {
  return {
    from(table) {
      assert.equal(table, "trust_cases");
      return {
        select() { return this; },
        eq(column, value) { assert.equal(column, "id"); assert.equal(value, trustSessionId); return this; },
        async maybeSingle() { return { data: scope, error: null }; },
      };
    },
  };
}

test("disabled, shadow, and advisory execution never change the authoritative Trust Decision", async () => {
  let persisted = null;
  const persistenceClient = { from(table) { assert.equal(table, "ori_inference_records"); return { async upsert(value) { persisted = value; return { error: null }; } }; } };
  const common = {
    authenticatedClient: authenticatedClient(),
    persistenceClient,
    trustSessionId,
    correlationId: "shadow-test",
    authoritativeDecision: "allow",
    evidence: { ...normalizedEvidence(), tenantId: undefined, trustSessionId: undefined, correlationId: undefined },
  };
  const disabled = await runOriAfterAuthoritativeDecision({ ...common, env: {} });
  assert.equal(disabled.state, "DISABLED");
  const shadow = await runOriAfterAuthoritativeDecision({ ...common, env: { ML_RISK_ENABLED: "true", ML_RISK_MODE: "shadow" } });
  assert.equal(shadow.mode, "shadow");
  assert.equal(shadow.authoritativeDecision, "allow");
  assert.equal(shadow.authoritativeDecisionUnchanged, true);
  assert.equal(shadow.persistence, "PERSISTED");
  assert.equal(persisted.tenant_id, tenantId);
  assert.equal(persisted.authoritative_decision, "allow");
  const advisory = await runOriAfterAuthoritativeDecision({ ...common, env: { ML_RISK_ENABLED: "true", ML_RISK_MODE: "advisory" } });
  assert.equal(advisory.authoritativeDecisionUnchanged, true);
  assert.notEqual(advisory.inference?.recommendation, "ALLOW");
});

test("scope and persistence failures remain non-blocking and sanitized", async () => {
  const common = {
    authenticatedClient: authenticatedClient(null),
    trustSessionId,
    correlationId: "scope-test",
    authoritativeDecision: "block",
    evidence: { ...normalizedEvidence(), tenantId: undefined, trustSessionId: undefined, correlationId: undefined },
    env: { ML_RISK_ENABLED: "true", ML_RISK_MODE: "shadow" },
  };
  const noScope = await runOriAfterAuthoritativeDecision(common);
  assert.equal(noScope.error, "SCOPE_UNAVAILABLE");
  assert.equal(noScope.authoritativeDecision, "block");
  const persistenceFailure = await runOriAfterAuthoritativeDecision({
    ...common,
    authenticatedClient: authenticatedClient(),
    persistenceClient: { from() { return { async upsert() { return { error: { message: "denied" } }; } }; } },
  });
  assert.equal(persistenceFailure.error, "PERSISTENCE_FAILED");
  assert.equal(persistenceFailure.authoritativeDecisionUnchanged, true);
});

test("timeout abstains without changing the authoritative decision", async () => {
  const neverResolvingClient = { from() { return { select() { return this; }, eq() { return this; }, maybeSingle() { return new Promise(() => {}); } }; } };
  const result = await runOriAfterAuthoritativeDecision({
    authenticatedClient: neverResolvingClient,
    trustSessionId,
    correlationId: "timeout-test",
    authoritativeDecision: "review",
    evidence: { ...normalizedEvidence(), tenantId: undefined, trustSessionId: undefined, correlationId: undefined },
    env: { ML_RISK_ENABLED: "true", ML_RISK_MODE: "shadow" },
    timeoutMs: 5,
  });
  assert.equal(result.state, "ABSTAINED");
  assert.equal(result.comparison, "ORI_ABSTAINED");
  assert.equal(result.authoritativeDecision, "review");
  assert.equal(result.authoritativeDecisionUnchanged, true);
});

test("validation metrics retain synthetic labels and gate unsupported accuracy", () => {
  const metrics = calculateOriValidationMetrics([{
    inferenceId: "one", tenantId, trustSessionId, correlationId: "one", modelId: "model", modelVersion: "1", featureSchemaVersion: "1", datasetVersion: "synthetic", thresholdVersion: "1", score: 0.2, riskBand: "LOW", recommendation: "NO_ADDITIONAL_ACTION", abstain: false, confidenceBand: "HIGH", missingFeatureIds: [], evidenceCoverage: 1, authoritativeDecision: "allow", comparisonCategory: "AGREED_LOW_RISK", synthetic: true, reviewerOutcome: "CORRECT", expectedClass: "NO_CAUTION",
  }]);
  assert.equal(metrics.syntheticCount, 1);
  assert.equal(metrics.eligibleReviewedCount, 0);
  assert.equal(metrics.validationStatus, "ML Validation Incomplete");
  assert.equal(metrics.precision, null);
});

test("runtime integration occurs after the authoritative workflow and API remains admin protected", async () => {
  const pipeline = await readFile(new URL("../lib/runtime/trust-execution-pipeline.ts", import.meta.url), "utf8");
  const statusRoute = await readFile(new URL("../app/api/ml/status/route.ts", import.meta.url), "utf8");
  assert.ok(pipeline.indexOf("executeTrustWorkflow") < pipeline.indexOf("runOriAfterAuthoritativeDecision({"));
  assert.match(pipeline, /authoritativeDecision: algorithm\.decision/);
  assert.match(statusRoute, /requireAdminApiAccess/);
  assert.match(statusRoute, /operationalRiskIntelligence/);
  assert.doesNotMatch(statusRoute, /model[_ -]?upload/i);
});
