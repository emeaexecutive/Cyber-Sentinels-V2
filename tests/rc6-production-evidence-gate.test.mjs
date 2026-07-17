import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { computeGroundTruthValidation, computeScopedGroundTruthValidation } from "../lib/validation/ground-truth.ts";
import { parseReleaseValidationCase, parseReleaseValidationCases } from "../lib/validation/release-case.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function record(index, reviewStatus) {
  const positive = index % 2 === 0;
  return {
    groundTruthId: `test:${index}`,
    datasetId: "test-only",
    reviewStatus,
    reviewSource: "synthetic_fixture",
    reviewConfidence: 0.9,
    labelVersion: "test-label-v1",
    datasetVersion: "test-dataset-v1",
    providerAgreement: 1,
    humanAgreement: 1,
    confidence: 0.9,
    expectedOutcome: positive ? "positive" : "negative",
    systemOutcome: positive ? "positive" : "negative",
    reviewedOutcome: positive ? "positive" : "negative",
  };
}

test("RC6 metrics use approved cases only and remain gated below 30", () => {
  const notApproved = computeGroundTruthValidation(Array.from({ length: 30 }, (_, index) => record(index, "reviewed")));
  assert.equal(notApproved.reviewedSamples, 0);
  assert.equal(notApproved.precision.value, null);
  assert.match(notApproved.message, /Calibration Incomplete/);

  const approved = computeGroundTruthValidation(Array.from({ length: 30 }, (_, index) => record(index, "approved")));
  assert.equal(approved.reviewedSamples, 30);
  assert.equal(approved.precision.value, 1);
  assert.equal(approved.recall.value, 1);
  assert.equal(approved.specificity.value, 1);
  assert.equal(approved.providerDisagreement.value, 0);
  assert.equal(computeScopedGroundTruthValidation(approved.reviewedSamples ? Array.from({ length: 30 }, (_, index) => ({ ...record(index, "approved"), workflow: "regulated", signalType: "authority", providerId: "hopae", rulesetVersion: "v1", reviewDate: "2026-07-16" })) : []).length, 1);
});

test("strict fixture contract rejects malformed cases and keeps all 30 fixtures pending", async () => {
  const fixtures = parseReleaseValidationCases(JSON.parse(await read("data/validation/release-1-candidate/cases.json")));
  assert.equal(fixtures.length, 30);
  assert.ok(fixtures.every((item) => item.reviewStatus === "pending" && item.groundTruthLabel === null && item.reviewerId === null));
  assert.throws(() => parseReleaseValidationCase({ caseId: "malformed" }), /datasetId|expectedDecision/);
  assert.throws(() => parseReleaseValidationCase({ ...fixtures[0], reviewStatus: "approved" }), /Approved cases require/);
});

test("RC6 migration enforces review, ledger, telemetry and evidence boundaries", async () => {
  const migration = await read("supabase/migrations/202607160003_release_1_rc6_production_evidence_gate.sql");
  for (const table of ["release_validation_cases", "release_validation_reviews", "webhook_event_ledger", "provider_execution_records", "operational_measurements", "release_evidence_checks"]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  for (const status of ["pending", "reviewed", "disputed", "excluded", "approved"]) assert.match(migration, new RegExp(`'${status}'`));
  assert.match(migration, /cardinality\(evidence_references\) > 0/);
  assert.match(migration, /revoke all on public\.operational_measurements from anon, authenticated/);
  assert.match(migration, /Dual review requires a prior review by a different reviewer/);
  assert.match(migration, /insert into public\.release_validation_reviews/);
  assert.doesNotMatch(migration, /update public\.release_validation_reviews/);
  assert.match(migration, /prune_expired_rc6_evidence/);
  assert.match(migration, /export_rc6_performance_summary/);
});

test("Stripe reserves durable event IDs before business processing", async () => {
  const route = await read("app/api/stripe/webhook/route.ts");
  assert.match(route, /reserveStripeEvent\(event, rawBody\)/);
  assert.ok(route.indexOf("reserveStripeEvent(event, rawBody)") < route.indexOf("switch (event.type)"));
  assert.match(route, /reserveWebhookEvent/);
  assert.match(route, /retainRejectedWebhookEvent/);
});

test("existing protected readiness and review surfaces own release evidence", async () => {
  const [readiness, reviews, evidenceModel] = await Promise.all([
    read("app/admin/deployment-readiness/page.tsx"),
    read("app/admin/reviews/page.tsx"),
    read("lib/release-evidence/rc6.ts"),
  ]);
  for (const label of ["VALIDATION", "PROVIDER", "SECURITY", "PERFORMANCE"]) assert.match(evidenceModel, new RegExp(`category: "${label}"`));
  assert.match(evidenceModel, /eligibleDatasetCount >= 30/);
  assert.match(evidenceModel, /providerLive && providerReviewed/);
  assert.match(evidenceModel, /requiredSecurityChecks\.length/);
  assert.match(evidenceModel, /telemetry_survives_restart/);
  assert.match(evidenceModel, /Awaiting sufficient samples/);
  for (const state of ["Cleared", "Partially Cleared", "Deployment Required", "Human Review Required", "Pilot Traffic Required", "Blocked"]) assert.match(evidenceModel, new RegExp(state));
  assert.match(readiness, /Controlled Pilot Evidence Gate/);
  assert.match(reviews, /Ground-truth review/);
  assert.match(reviews, /value="disputed"/);
  assert.match(reviews, /value="excluded"/);
});

test("deployment, RLS and load harnesses are explicit opt-in and paid-provider safe", async () => {
  const [security, rls, load, provider] = await Promise.all([
    read("scripts/deployed-security-harness.mjs"), read("tests/rls/rc6-denial.test.mjs"),
    read("scripts/rc6-load-harness.mjs"), read("lib/providers/deployment-readiness.ts"),
  ]);
  assert.match(security, /RUN_DEPLOYED_SECURITY_TESTS/);
  assert.match(rls, /RUN_RLS_TESTS/);
  assert.match(load, /RUN_LOAD_TESTS/);
  assert.match(load, /ALLOW_PAID_PROVIDER_LOAD_TEST/);
  assert.match(provider, /missingVariables/);
  assert.doesNotMatch(provider, /clientSecret|webhookSecret/);
});

test("buyer evidence experience has RC7 evidence statuses and one primary pilot action", async () => {
  const page = await read("app/enterprise/pilot/page.tsx");
  for (const state of ["Blocked", "Requires customer configuration", "Requires pilot evidence"]) assert.match(page, new RegExp(state));
  assert.equal((page.match(/primary=\{\{/g) ?? []).length, 1);
  assert.equal((page.match(/brand-primary-action/g) ?? []).length, 0);
});

test("RC6 documentation is complete and preserves blocked truth", async () => {
  const required = [
    "docs/EPIC_15_RELEASE_BLOCKERS.md", "docs/RC6_VALIDATION_DATASET.md", "docs/RC6_REVIEWED_OUTCOMES.md",
    "docs/RC6_REAL_PROVIDER_EVIDENCE.md", "docs/RC6_DEPLOYED_SECURITY_PROOF.md", "docs/RC6_RLS_DENIAL_TESTS.md",
    "docs/RC6_WEBHOOK_REPLAY_LEDGER.md", "docs/RC6_DURABLE_PERFORMANCE_TELEMETRY.md", "docs/RC6_LOAD_TEST_RESULTS.md",
    "docs/RC6_ENTERPRISE_BUYER_DOCUMENTATION.md", "docs/demos/RC6_RELEASE_EVIDENCE_DEMO.md",
    "docs/SPRINT_15_1_ACCEPTANCE.md", "docs/releases/RELEASE_1_0_RC6.md",
  ];
  const documents = await Promise.all(required.map(read));
  assert.equal(documents.length, 13);
  assert.match(documents[0], /0\/30 approved cases/);
  assert.match(documents[3], /Awaiting Credentials/);
  assert.match(documents[4], /no target environment/i);
  assert.match(documents[7], /Current retained sample count: \*\*0\*\*/);
  for (let step = 1; step <= 13; step += 1) assert.match(documents[10], new RegExp(`\\| ${step} \\|`));
});
