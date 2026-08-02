import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [operationalMigration, consensusMigration, providerRoute, hopaeServer, providerTypes, consensusTypes, consensusRepository, continuousTrustRepository, trustArchitectureRepository, reconciliationDoc, releaseManifest] = await Promise.all([
  read("../supabase/migrations/202607170002_provider_abstraction_hopae.sql"),
  read("../supabase/migrations/202607200003_provider_consensus_engine.sql"),
  read("../app/api/providers/route.ts"),
  read("../lib/providers/hopae-rc1-server.ts"),
  read("../lib/providers/types.ts"),
  read("../src/lib/consensus/types.ts"),
  read("../src/lib/consensus/repository.ts"),
  read("../src/lib/continuous-trust/repository.ts"),
  read("../src/lib/trust-architecture/repository.ts"),
  read("../docs/PROVIDER_HEALTH_SNAPSHOT_SCHEMA_RECONCILIATION.md"),
  read("../supabase/release/epic-26-27/manifest.json"),
]);

function tableBlock(sql, table) {
  const match = sql.match(new RegExp(`create table(?: if not exists)? public\\.${table} \\(([\\s\\S]*?)\\n\\);`, "i"));
  assert.ok(match, `${table} definition is required`);
  return match[1];
}

function names(sql, expression) {
  return [...sql.matchAll(expression)].map((match) => match[1]);
}

test("Epic 16 and Epic 17 create distinct provider-health tables that coexist", () => {
  assert.match(operationalMigration, /create table if not exists public\.provider_operational_health_snapshots/i);
  assert.doesNotMatch(operationalMigration, /create table(?: if not exists)? public\.provider_health_snapshots/i);
  assert.match(consensusMigration, /create table public\.provider_health_snapshots/i);

  const relations = names(`${operationalMigration}\n${consensusMigration}`, /create table(?: if not exists)? public\.(\w+)/gi);
  assert.equal(relations.filter((name) => name === "provider_operational_health_snapshots").length, 1);
  assert.equal(relations.filter((name) => name === "provider_health_snapshots").length, 1);
});

test("operational snapshots retain the global Epic 16 schema without fabricated ownership", () => {
  const block = tableBlock(operationalMigration, "provider_operational_health_snapshots");
  for (const column of ["snapshot_id", "provider_id", "environment", "health_status", "health_dimension", "reason", "latency_ms", "rolling_success_rate", "callback_verification_failures", "timeout_count", "retry_count", "rate_limit_count", "provider_request_id", "checked_at", "retention_expires_at"]) {
    assert.match(block, new RegExp(`\\b${column}\\b`));
  }
  assert.match(block, /references public\.provider_registry\(provider_id\)/i);
  assert.doesNotMatch(block, /enterprise_id|provider_key|observed_at/i);
});

test("Consensus snapshots retain required tenant ownership and telemetry", () => {
  const block = tableBlock(consensusMigration, "provider_health_snapshots");
  for (const column of ["id", "enterprise_id", "provider_key", "state", "observed_at", "latency_ms", "error_rate", "timeout_rate", "signature_failures", "schema_failures", "circuit_open", "reason_codes", "created_at"]) {
    assert.match(block, new RegExp(`\\b${column}\\b`));
  }
  assert.match(block, /enterprise_id uuid not null references public\.trust_workspaces\(id\) on delete cascade/i);
  assert.doesNotMatch(block, /snapshot_id|health_dimension|rolling_success_rate/i);
});

test("provider-health indexes, inferred constraints, and policies have unique namespaces", () => {
  const targetSql = `${operationalMigration}\n${consensusMigration}`;
  const indexes = names(targetSql, /create(?: unique)? index(?: if not exists)? (\w+) on public\.provider_(?:operational_)?health_snapshots/gi);
  assert.deepEqual(indexes.sort(), ["provider_health_latest_idx", "provider_operational_health_snapshots_provider_idx"].sort());
  assert.equal(new Set(indexes).size, indexes.length);

  const tableNames = ["provider_operational_health_snapshots", "provider_health_snapshots"];
  const inferredPrimaryKeys = tableNames.map((name) => `${name}_pkey`);
  assert.equal(new Set(inferredPrimaryKeys).size, inferredPrimaryKeys.length);

  const policies = names(targetSql, /create policy "([^"]+)" on public\.provider_(?:operational_)?health_snapshots/gi);
  assert.deepEqual(policies, ["tenant reads provider health"]);
  assert.equal(new Set(policies).size, policies.length);
});

test("Hopae operational paths and Consensus-family tenant paths cannot cross tables", () => {
  for (const source of [providerRoute, hopaeServer]) {
    assert.match(source, /from\("provider_operational_health_snapshots"\)/);
    assert.doesNotMatch(source, /from\("provider_health_snapshots"\)/);
  }
  assert.equal((providerRoute.match(/from\("provider_operational_health_snapshots"\)/g) ?? []).length, 2);
  assert.equal((hopaeServer.match(/from\("provider_operational_health_snapshots"\)/g) ?? []).length, 1);

  for (const source of [consensusRepository, continuousTrustRepository, trustArchitectureRepository]) {
    assert.match(source, /from\("provider_health_snapshots"\)/);
    assert.doesNotMatch(source, /provider_operational_health_snapshots/);
  }
});

test("TypeScript names explicitly separate operational and Consensus snapshots", () => {
  assert.match(providerTypes, /export type ProviderOperationalHealthSnapshot =/);
  assert.doesNotMatch(providerTypes, /export type ProviderHealthSnapshot =/);
  assert.match(consensusTypes, /export type ProviderConsensusHealthSnapshot =/);
  assert.doesNotMatch(consensusTypes, /export type ProviderHealth =/);
});

test("migration namespace and historical correction protections remain fail closed", async () => {
  const migrationNames = (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
  const timestamps = migrationNames.map((name) => name.match(/^(\d+)/)?.[1]);
  assert.equal(new Set(timestamps).size, timestamps.length);
  assert.equal(migrationNames.includes("202608020001_provider_health_snapshot_reconciliation.sql"), false);

  const manifest = JSON.parse(releaseManifest);
  const correction = manifest.historicalCorrections.find((entry) => entry.path.endsWith("202607170002_provider_abstraction_hopae.sql"));
  assert.ok(correction);
  assert.equal(correction.originalCommit, "cc9c9135fae85c542a7f59e2fc89298575cfe922");
  assert.equal(correction.originalSha256, "3043937d1f0b5d2c9eba51f3de0fc336a2eb765486c80a2e75240318a5d37deb");
  assert.match(correction.applicationProof, /never durably applied/i);
  assert.match(correction.scope, /name separation only/i);

  assert.match(reconciliationDoc, /linked Production migration ledger ends at `202606090003`/i);
  assert.match(reconciliationDoc, /no persistent branches/i);
  assert.match(reconciliationDoc, /original remains recoverable through Git history/i);
  assert.doesNotMatch(`${operationalMigration}\n${consensusMigration}`, /drop\s+table|truncate\s+|delete\s+from\s+public\.provider_(?:operational_)?health_snapshots/i);
});
