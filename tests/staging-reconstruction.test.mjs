import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "supabase", "release", "enterprise-trust-fabric-staging");
const evidenceRoot = path.join(packageRoot, "evidence");
const order = (await readFile(path.join(packageRoot, "migration-order.txt"), "utf8")).trim().split(/\r?\n/);
const releasePlan = JSON.parse(await readFile(path.join(packageRoot, "release-plan.json"), "utf8"));
const phaseManifest = JSON.parse(await readFile(path.join(packageRoot, "phase-manifest.json"), "utf8"));
const registry = JSON.parse(await readFile(path.join(repoRoot, "config", "environments", "registry.json"), "utf8"));

async function readEvidenceJson(name) {
  return JSON.parse(await readFile(path.join(evidenceRoot, name), "utf8"));
}

test("migration order matches the canonical release package", () => {
  assert.deepEqual(order, order.slice().sort());
  assert.equal(order.length, 29);
  assert.equal(order[0], "supabase/migrations/202606100001_runtime_validation_logs.sql");
  assert.equal(order.at(-1), "supabase/migrations/202608010002_enterprise_trust_fabric.sql");
  assert.equal(releasePlan.productionHead, "202606090003");
  assert.equal(releasePlan.targetHead, "202608010002");
});

test("Production head and target head are explicit and phase order is enforced", () => {
  assert.equal(releasePlan.productionHead, "202606090003");
  assert.equal(releasePlan.targetHead, "202608010002");
  assert.deepEqual(phaseManifest.phases.map((phase) => phase.id), ["A", "B", "C", "D", "E", "F", "G"]);
  for (const phase of phaseManifest.phases) {
    assert.match(phase.stopCondition, /stop/i);
    assert.ok(phase.validationSql.length > 0);
  }
});

test("both reconstruction paths are represented and guarded by staging-only identity", async () => {
  const emptySummary = await readEvidenceJson("empty-reconstruction-summary.json");
  const productionSummary = await readEvidenceJson("production-head-reconstruction-summary.json");
  assert.equal(emptySummary.path, "empty");
  assert.equal(productionSummary.path, "production-head");
  assert.equal(emptySummary.environmentType, "staging");
  assert.equal(productionSummary.environmentType, "staging");
  assert.equal(registry.environments.find((entry) => entry.name === "staging").syntheticDataOnly, true);
  assert.equal(emptySummary.syntheticMode, true);
  assert.equal(productionSummary.syntheticMode, true);
});

test("environment guard is mandatory for reconstruction targets", () => {
  const staging = registry.environments.find((entry) => entry.name === "staging");
  assert.ok(staging);
  assert.equal(staging.production, false);
  assert.equal(staging.automatedStagingValidationPermitted, true);
  assert.ok(staging.permittedOperations.includes("synthetic_fixture_validation"));
});

test("evidence package contains no secret-like content", async () => {
  const evidenceFiles = [
    "empty-reconstruction-summary.json",
    "production-head-reconstruction-summary.json",
    "phase-results.json",
    "object-inventory-comparison.json",
    "migration-duration-summary.json",
    "warnings-summary.json",
    "validation-results.json",
  ];
  const forbiddenPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
    /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s`]+/i,
    /\b(?:sk_live|rk_live|ghp|github_pat|sbp|sb_secret)_[A-Za-z0-9_-]{12,}\b/,
    /service-role/i,
  ];
  for (const file of evidenceFiles) {
    const contents = await readFile(path.join(evidenceRoot, file), "utf8");
    const productionReference = registry.environments.find((entry) => entry.production).projectReference;
    assert.equal(contents.includes(productionReference), false, file);
    for (const pattern of forbiddenPatterns) {
      assert.equal(pattern.test(contents), false, `${file} matched ${pattern}`);
    }
  }
});

test("final schema comparison requires zero unexplained differences", async () => {
  const comparison = await readEvidenceJson("object-inventory-comparison.json");
  assert.ok(Array.isArray(comparison.categories));
  assert.ok(comparison.categories.length > 0);
  assert.ok(comparison.categories.every((entry) => entry.match === true));
  assert.equal(comparison.summary.unexplainedDifferences, 0);
});
