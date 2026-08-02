import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateScopeContinuity } from "../src/lib/scope-continuity/evaluator.ts";
import { consistentContextScenario } from "../src/lib/scope-continuity/scenarios.ts";
import { validateScopeAuthorizationLease } from "../src/lib/scope-continuity/validation.ts";
import { hashCanonical } from "../src/lib/trust-core/hash.ts";

const sql = readFileSync(
  new URL("../supabase/migrations/202607310001_environment_attestation_scope_continuity.sql", import.meta.url),
  "utf8",
);
const service = readFileSync(
  new URL("../src/lib/scope-continuity/service.ts", import.meta.url),
  "utf8",
);
const releaseManifest = JSON.parse(readFileSync(
  new URL("../supabase/release/epic-26-27/manifest.json", import.meta.url),
  "utf8",
));

const leaseFields = [
  "id", "enterpriseId", "subjectType", "subjectId", "authorizedObjective",
  "permittedTools", "permittedActions", "permittedTargets", "permittedEnvironments",
  "maximumDurationSeconds", "maximumActionCount", "dataClassificationBoundary",
  "approverType", "approverId", "issuedAt", "expiresAt", "revokedAt",
  "revocationReason", "requiredAttestationTypes", "contradictionResponsePolicy",
  "authorityReference", "evidenceReferences", "supersedesLeaseId",
];

function canonicalLease(value) {
  return Object.fromEntries(leaseFields.map((field) => [field, value[field]]));
}

function leaseHash(value) {
  return hashCanonical(canonicalLease(validateScopeAuthorizationLease(value)));
}

function matchingParen(source, opening) {
  let depth = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  for (let index = opening; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (current === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (current === "*" && next === "/") { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (current === quote && next === quote) { index += 1; continue; }
      if (current === quote) quote = null;
      continue;
    }
    if (current === "-" && next === "-") { lineComment = true; index += 1; continue; }
    if (current === "/" && next === "*") { blockComment = true; index += 1; continue; }
    if (current === "'" || current === '"') { quote = current; continue; }
    if (current === "(") depth += 1;
    if (current === ")") {
      depth -= 1;
      if (depth === 0) return index;
      assert.ok(depth >= 0, `unexpected closing parenthesis at offset ${index}`);
    }
  }
  assert.fail(`unclosed parenthesis at offset ${opening}`);
}

function assertBalanced(source, name) {
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  const stack = [];
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (lineComment) { if (current === "\n") lineComment = false; continue; }
    if (blockComment) { if (current === "*" && next === "/") { blockComment = false; index += 1; } continue; }
    if (quote) {
      if (current === quote && next === quote) { index += 1; continue; }
      if (current === quote) quote = null;
      continue;
    }
    if (current === "-" && next === "-") { lineComment = true; index += 1; continue; }
    if (current === "/" && next === "*") { blockComment = true; index += 1; continue; }
    if (current === "'" || current === '"') { quote = current; continue; }
    if (current === "(") stack.push(index);
    if (current === ")") assert.notEqual(stack.pop(), undefined, `${name}: extra closing parenthesis at ${index}`);
  }
  assert.equal(stack.length, 0, `${name}: unclosed parentheses at ${stack.join(",")}`);
  assert.equal(quote, null, `${name}: unterminated quote`);
  assert.equal(blockComment, false, `${name}: unterminated block comment`);
}

function calls(source, name) {
  const results = [];
  const expression = new RegExp(`\\b${name}\\s*\\(`, "gi");
  for (const match of source.matchAll(expression)) {
    const opening = (match.index ?? 0) + match[0].lastIndexOf("(");
    results.push(source.slice(match.index, matchingParen(source, opening) + 1));
  }
  return results;
}

const rpcMatch = sql.match(/create or replace function public\.persist_scope_continuity_decision_v1\([\s\S]*?\nend \$\$;/i);
assert.ok(rpcMatch, "persist_scope_continuity_decision_v1 must be present");
const rpc = rpcMatch[0];

test("Epic 26 RPC and every digest expression are statically parse-balanced", () => {
  assertBalanced(rpc, "persist_scope_continuity_decision_v1");
  assert.match(rpc, /\) returns jsonb\s+language plpgsql/i);
  assert.match(rpc, /begin[\s\S]*return jsonb_build_object\([\s\S]*end \$\$;/i);
  const digests = calls(rpc, "encode").filter((value) => /\bdigest\s*\(/i.test(value));
  assert.equal(digests.length, 3, "declaration, lease, and attestation digests are required");
  for (const digest of digests) {
    assertBalanced(digest, "digest expression");
    assert.match(digest, /^encode\s*\(\s*digest\s*\(\s*convert_to\s*\(/i);
    assert.match(digest, /'UTF8'\s*\)\s*,\s*'sha256'\s*\)\s*,\s*'hex'\s*\)$/i);
  }
});

test("lease SQL hashes the complete immutable authorization and excludes only volatile transport fields", () => {
  const expression = rpc.match(/lease_hash text :=([\s\S]*?);/)?.[1] ?? "";
  assert.match(expression, /p_input->'authorization'/);
  for (const field of ["consumedActionCount", "createdAt", "immutableHash"]) {
    assert.match(expression, new RegExp(`-\\s*'${field}'`));
  }
  for (const required of ["id", "enterpriseId", "subjectType", "subjectId", "permittedTargets", "permittedEnvironments", "issuedAt", "expiresAt", "authorityReference", "evidenceReferences"]) {
    assert.ok(!expression.includes(`- '${required}'`), `${required} must remain hash-bound`);
  }
  assert.match(rpc, /if not exists\(select 1 from public\.scope_authorization_leases[\s\S]*immutable_hash=lease_hash\)[\s\S]*Conflicting scope-authorization identifier/);
});

test("TypeScript and SQL agree on the canonical immutable lease field boundary", () => {
  const declared = service.match(/const authorizationFields = \[([^;]+)\];/)?.[1] ?? "";
  const fields = [...declared.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(fields, leaseFields);
  assert.match(service, /assertKnownFields\(body\.authorization, \[\.\.\.authorizationFields, "consumedActionCount"\]/);
});

test("canonical lease hashes are deterministic, tenant-bound, and 64-character lowercase SHA-256", () => {
  const lease = structuredClone(consistentContextScenario().input.authorization);
  const first = leaseHash(lease);
  assert.equal(first, leaseHash(structuredClone(lease)));
  assert.match(first, /^[a-f0-9]{64}$/);
  for (const mutate of [
    (value) => { value.enterpriseId = "77777777-7777-4777-8777-777777777777"; },
    (value) => { value.subjectId = "agent:other"; },
    (value) => { value.permittedTargets = ["different.internal"]; },
    (value) => { value.expiresAt = "2026-07-31T12:30:00.000Z"; },
  ]) {
    const changed = structuredClone(lease);
    mutate(changed);
    assert.notEqual(leaseHash(changed), first);
  }
});

test("null, empty, and reordered semantic inputs retain unambiguous canonical hashing", () => {
  const lease = structuredClone(consistentContextScenario().input.authorization);
  const withNull = { ...lease, revocationReason: null };
  const withEmpty = { ...lease, revocationReason: "" };
  assert.notEqual(leaseHash(withNull), leaseHash(withEmpty));

  const reordered = {
    ...lease,
    permittedTools: [...lease.permittedTools].reverse(),
    permittedActions: [...lease.permittedActions].reverse(),
    permittedTargets: [...lease.permittedTargets].reverse(),
    evidenceReferences: [...lease.evidenceReferences].reverse(),
  };
  assert.equal(leaseHash(reordered), leaseHash(lease));
  assert.equal(hashCanonical({ b: 2, a: 1 }), hashCanonical({ a: 1, b: 2 }));
});

test("policy changes alter the decision hash while lease identity remains policy-independent", () => {
  const input = structuredClone(consistentContextScenario().input);
  const baseline = evaluateScopeContinuity(input);
  input.policy.policyVersion = "1.0.1";
  const changed = evaluateScopeContinuity(input);
  assert.notEqual(changed.decisionHash, baseline.decisionHash);
  assert.equal(leaseHash(input.authorization), leaseHash(consistentContextScenario().input.authorization));
});

test("same idempotency identity rejects a changed decision retry", () => {
  assert.match(rpc, /where enterprise_id=enterprise and execution_context_id=context_id and correlation_id=p_correlation_id/);
  assert.match(rpc, /existing\.id<>decision_id or existing\.decision_hash<>p_decision->>'decisionHash'/);
  assert.match(rpc, /raise exception 'Scope Continuity idempotency conflict'/);
});

test("unapplied historical correction is narrowly hash-bound in the release manifest", () => {
  const correction = releaseManifest.historicalCorrections.find((entry) =>
    entry.path.endsWith("202607310001_environment_attestation_scope_continuity.sql"));
  assert.ok(correction);
  assert.equal(correction.originalCommit, "b4717179cb6a1d78d6f130bacd70361fe16f0097");
  assert.equal(correction.originalSha256, "11bafa552700f7351bf63845d81bf2d518f064b1a65ae74fc8a99be72094ea6f");
  assert.equal(correction.correctedSha256, "0f54e55ee0427c396675121f701dcf26bedc56fc20ac5a3a1fb411fd36fe2292");
  assert.match(correction.applicationProof, /remote-blank/i);
  assert.match(correction.scope, /parenthesis correction only/i);
  assert.equal(correction.dataMigrationRequired, false);
  assert.equal(correction.productionLedgerRepairRequired, false);
});
