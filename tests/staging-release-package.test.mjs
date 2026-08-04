import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

async function collectPackageFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectPackageFiles(fullPath)));
      continue;
    }
    if (entry.name === "SHA256SUMS") continue;
    files.push(path.relative(repoRoot, fullPath).replaceAll(path.sep, "/"));
  }
  return files.sort();
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "supabase", "release", "enterprise-trust-fabric-staging");
const migrationRoot = path.join(repoRoot, "supabase", "migrations");
const productionHead = "202606090003";
const targetHead = "202608010002";

const releasePlan = JSON.parse(await readFile(path.join(packageRoot, "release-plan.json"), "utf8"));
const phaseManifest = JSON.parse(await readFile(path.join(packageRoot, "phase-manifest.json"), "utf8"));
const dependencyGraph = JSON.parse(await readFile(path.join(packageRoot, "dependency-graph.json"), "utf8"));
const inventory = JSON.parse(await readFile(path.join(packageRoot, "expected-inventory.json"), "utf8"));
const order = (await readFile(path.join(packageRoot, "migration-order.txt"), "utf8")).trim().split(/\r?\n/);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

test("release heads, counts and safety boundaries are explicit", () => {
  assert.equal(releasePlan.productionHead, productionHead);
  assert.equal(releasePlan.firstPendingMigration, "202606100001");
  assert.equal(releasePlan.targetHead, targetHead);
  assert.equal(releasePlan.appliedMigrationCount, 45);
  assert.equal(releasePlan.pendingMigrationCount, 29);
  assert.equal(releasePlan.reviewOnly, true);
  assert.equal(releasePlan.migrationExecutionPermitted, false);
  assert.equal(releasePlan.productionMutationPermitted, false);
  assert.equal(releasePlan.syntheticDataOnly, true);
});

test("migration order contains every and only pending migration chronologically", async () => {
  const local = (await readdir(migrationRoot))
    .filter((name) => /^\d+.*\.sql$/.test(name) && name.split("_")[0] > productionHead)
    .sort()
    .map((name) => `supabase/migrations/${name}`);
  assert.deepEqual(order, local);
  assert.equal(order.length, 29);
  const timestamps = order.map((entry) => path.basename(entry).split("_")[0]);
  assert.deepEqual(timestamps, [...timestamps].sort());
  assert.equal(new Set(timestamps).size, timestamps.length);
  assert.equal(timestamps.at(-1), targetHead);
});

test("all seven release phases are complete and each migration occurs once", () => {
  assert.deepEqual(phaseManifest.phases.map((phase) => phase.id), ["A", "B", "C", "D", "E", "F", "G"]);
  const phased = phaseManifest.phases.flatMap((phase) => phase.migrations.map((migration) => migration.path));
  assert.deepEqual([...phased].sort(), [...order].sort());
  assert.equal(new Set(phased).size, phased.length);
  assert.equal(phaseManifest.phases.find((phase) => phase.id === "G").validationOnly, true);
  for (const phase of phaseManifest.phases) {
    assert.ok(phase.prerequisites.length > 0);
    assert.ok(phase.validationSql.length > 0);
    assert.match(phase.stopCondition, /stop/i);
    assert.match(phase.rollbackBoundary, /staging|phase/i);
    assert.match(phase.forwardRepairPath, /forward/i);
    assert.match(phase.requiredHumanApproval, /owner/i);
  }
});

test("manifest and migration hashes match canonical files", async () => {
  const manifestMigrations = phaseManifest.phases.flatMap((phase) => phase.migrations);
  for (const migration of manifestMigrations) {
    const contents = await readFile(path.join(repoRoot, migration.path));
    assert.equal(sha256(contents), migration.sha256, migration.path);
  }
});

test("SHA256SUMS covers every referenced migration and every package file except itself", async () => {
  const checksumText = await readFile(path.join(packageRoot, "SHA256SUMS"), "utf8");
  const checksums = new Map(
    checksumText.trim().split(/\r?\n/).map((line) => {
      const match = line.match(/^([a-f0-9]{64})  (.+)$/);
      assert.ok(match, `Malformed checksum line: ${line}`);
      return [match[2], match[1]];
    }),
  );
  const packageFiles = await collectPackageFiles(packageRoot);
  const expectedPaths = [...order, ...packageFiles].sort();
  assert.deepEqual([...checksums.keys()].sort(), expectedPaths);
  for (const [relativePath, expected] of checksums) {
    assert.equal(sha256(await readFile(path.join(repoRoot, relativePath))), expected, relativePath);
  }
});

test("dependency graph is complete, acyclic and never points to a later object", () => {
  assert.equal(dependencyGraph.productionHead, productionHead);
  assert.equal(dependencyGraph.targetHead, targetHead);
  assert.equal(dependencyGraph.nodes.length, order.length);
  assert.equal(dependencyGraph.assertions.duplicateTimestamp, false);
  assert.equal(dependencyGraph.assertions.circularDependency, false);
  assert.equal(dependencyGraph.assertions.laterObjectReference, true);
  assert.equal(dependencyGraph.assertions.noRemoteOnlyPublicPrerequisite, true);
  for (const node of dependencyGraph.nodes) {
    assert.equal(node.laterReferences.length, 0, node.migration);
    assert.equal(node.unresolvedPublicPrerequisites.length, 0, node.migration);
    assert.ok(node.prerequisiteMigrations.every((timestamp) => timestamp < node.timestamp));
    assert.ok(node.sequencePredecessor < node.timestamp);
    for (const field of ["prerequisiteTables", "prerequisiteColumns", "prerequisiteFunctions", "prerequisitePolicyHelpers", "prerequisiteExtensions", "createdObjects", "downstreamConsumers", "guardedOptionalPublicReferences", "unresolvedPublicPrerequisites"]) {
      assert.ok(Array.isArray(node[field]), `${node.migration}:${field}`);
    }
  }
});

test("expected inventory preserves canonical historical distinctions", () => {
  assert.equal(inventory.requiredDistinctions.providerOperationalHealth, "public.provider_operational_health_snapshots");
  assert.equal(inventory.requiredDistinctions.providerConsensusHealth, "public.provider_health_snapshots");
  assert.equal(inventory.requiredDistinctions.legacyTrustRelationships, "public.trust_relationships");
  assert.equal(inventory.requiredDistinctions.enterpriseTrustRelationships, "public.trust_graph_relationships_v2");
  assert.ok(inventory.tables.includes("public.trust_fabric_decisions"));
  assert.ok(inventory.views.includes("public.scope_continuity_replay"));
  assert.ok(inventory.views.includes("public.incident_reporting_replay"));
});

test("package contains no credential material or executable Production reference", async () => {
  const registry = JSON.parse(await readFile(path.join(repoRoot, "config", "environments", "registry.json"), "utf8"));
  const productionReference = registry.environments.find((entry) => entry.production).projectReference;
  const packageFiles = await collectPackageFiles(packageRoot);
  for (const relativePath of packageFiles) {
    const contents = await readFile(path.join(repoRoot, relativePath), "utf8");
    assert.equal(contents.includes(productionReference), false, relativePath);
    assert.doesNotMatch(contents, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i, relativePath);
    assert.doesNotMatch(contents, /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, relativePath);
    assert.doesNotMatch(contents, /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s`]+/i, relativePath);
    assert.doesNotMatch(contents, /\b(?:sk_live|rk_live|ghp|github_pat|sbp|sb_secret)_[A-Za-z0-9_-]{12,}\b/, relativePath);
  }
});

test("package references canonical migrations without duplicating migration SQL", async () => {
  const packageFiles = (await readdir(packageRoot)).filter((name) => name.endsWith(".sql"));
  for (const name of packageFiles) {
    const contents = await readFile(path.join(packageRoot, name), "utf8");
    assert.doesNotMatch(contents, /\bcreate\s+(?:table|materialized\s+view|view|function|policy|trigger|index)\b/i, name);
    assert.doesNotMatch(contents, /\balter\s+table\b/i, name);
    assert.doesNotMatch(contents, /\b(?:insert|update|delete|truncate)\b\s+(?:into\s+|from\s+)?public\./i, name);
  }
});

test("architecture freeze contracts and validation order remain complete", () => {
  assert.equal(releasePlan.architectureFreeze.incompatibleChangesPermitted, false);
  assert.deepEqual(releasePlan.validationOrder, [
    "preflight.sql",
    "post-apply-validation.sql",
    "rls-validation.sql",
    "integrity-validation.sql",
    "compatibility-validation.sql",
  ]);
  for (const contract of ["Trust Object", "Trust Contract", "evidence taxonomy", "trust states", "provider states", "Replay availability", "Scope Continuity", "Serious-Incident protected decisions", "tenant identity", "reviewer authority"]) {
    assert.ok(releasePlan.architectureFreeze.contracts.includes(contract));
  }
});
