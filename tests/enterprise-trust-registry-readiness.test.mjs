import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildEnterpriseTrustReadinessResponse,
  evaluateEnterpriseTrustRegistry,
} from "../lib/readiness/enterprise-trust-registry.ts";
import { trustDomainRegistry } from "../src/lib/trust-architecture/domain-registry.ts";

const completeRows = () => trustDomainRegistry.map((domain) => ({
  domain_key: domain.domainKey,
  version: domain.version,
  active: domain.active,
}));

test("all required active domains are ready", () => {
  const result = evaluateEnterpriseTrustRegistry(completeRows(), null);
  assert.equal(result.state, "READY");
  assert.deepEqual(result.missingDomains, []);
});

test("one missing required domain is not ready", () => {
  const result = evaluateEnterpriseTrustRegistry(completeRows().slice(0, 9), null);
  assert.equal(result.state, "NOT_READY");
  assert.deepEqual(result.missingDomains, [trustDomainRegistry[9].domainKey]);
});

test("an inactive required version is not ready", () => {
  const rows = completeRows();
  rows[0] = { ...rows[0], active: false };
  const result = evaluateEnterpriseTrustRegistry(rows, null);
  assert.equal(result.state, "NOT_READY");
  assert.deepEqual(result.inactiveDomains, [trustDomainRegistry[0].domainKey]);
});

test("a wrong required version is not ready", () => {
  const rows = completeRows();
  rows[0] = { ...rows[0], version: "2.0.0" };
  const result = evaluateEnterpriseTrustRegistry(rows, null);
  assert.equal(result.state, "NOT_READY");
  assert.deepEqual(result.versionMismatchDomains, [trustDomainRegistry[0].domainKey]);
});

test("an additional legitimate domain does not affect readiness", () => {
  const rows = [...completeRows(), { domain_key: "FUTURE_DOMAIN", version: "1.0.0", active: true }];
  assert.equal(evaluateEnterpriseTrustRegistry(rows, null).state, "READY");
});

test("duplicate or ambiguous active canonical state fails safely", () => {
  const rows = [...completeRows(), { domain_key: "IDENTITY", version: "2.0.0", active: true }];
  const result = evaluateEnterpriseTrustRegistry(rows, null);
  assert.equal(result.state, "NOT_READY");
  assert.equal(result.reasonCode, "ENTERPRISE_TRUST_DOMAIN_REGISTRY_AMBIGUOUS");
  assert.deepEqual(result.duplicateDomains, ["IDENTITY"]);
});

test("external controls stay separate from complete native readiness", () => {
  const registry = evaluateEnterpriseTrustRegistry(completeRows(), null);
  const response = buildEnterpriseTrustReadinessResponse(registry, "qualified-sha", "2026-08-17T00:00:00.000Z");
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "READY");
  assert.equal(response.body.checks.enterpriseTrustArchitecture, "READY");
  assert.equal(response.body.externalControls.state, "BLOCKED");
  assert.equal(response.body.externalControls.reasonCode, "AUTHORITATIVE_CONTROL_PLANE_EVIDENCE_REQUIRED");
});

test("missing table errors are reported as an unapplied migration", () => {
  for (const code of ["42P01", "PGRST205"]) {
    const result = evaluateEnterpriseTrustRegistry(null, { code });
    assert.equal(result.state, "NOT_READY");
    assert.equal(result.reasonCode, "EPIC_18_MIGRATION_NOT_DEPLOYED");
  }
});

test("repository registry bootstrap is idempotent and preserves extra legitimate domains", () => {
  const migration = readFileSync(new URL("../supabase/migrations/202607210001_enterprise_trust_architecture.sql", import.meta.url), "utf8");
  assert.match(migration, /create table if not exists public\.trust_domain_versions/);
  assert.match(migration, /on conflict\(domain_key,version\) do nothing/);
  assert.doesNotMatch(migration, /delete from public\.trust_domain_versions/i);
});

test("the first pending Production migration reconciles the legacy runtime log shape additively", () => {
  const migration = readFileSync(new URL("../supabase/migrations/202606100001_runtime_validation_logs.sql", import.meta.url), "utf8");
  assert.match(migration, /add column if not exists deployment_state/);
  assert.match(migration, /overall_status/);
  assert.match(migration, /health_score/);
  assert.doesNotMatch(migration, /drop column|drop table/i);
});
