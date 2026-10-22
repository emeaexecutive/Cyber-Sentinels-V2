import assert from "node:assert/strict";
import test from "node:test";
import {
  combineAuthorityWithContext,
  contextFactDigest,
  evaluateContextRequirement,
} from "../lib/swarm/enterprise-context.ts";

const NOW = "2026-10-21T12:00:00.000Z";
const requirement = { key: "customer.eligibility", equals: "eligible" };

function fact(overrides = {}) {
  const base = {
    tenantId: "tenant-a",
    key: "customer.eligibility",
    value: "eligible",
    version: "v1",
    source: { kind: "SYSTEM_OF_RECORD", id: "crm" },
    observedAt: "2026-10-21T11:00:00.000Z",
    expiresAt: "2026-10-21T13:00:00.000Z",
    ...overrides,
  };
  return { ...base, digest: overrides.digest ?? contextFactDigest(base) };
}

const evaluate = (facts, tenantId = "tenant-a") => evaluateContextRequirement({ tenantId, requirement, facts, now: NOW });

test("a fresh, intact, trusted fact satisfies the requirement but never grants authority", () => {
  const result = evaluate([fact()]);
  assert.equal(result.outcome, "SATISFIED");
  assert.equal(result.grantsAuthority, false);
  assert.equal(combineAuthorityWithContext("DENY", result).decision, "DENY");
  assert.equal(combineAuthorityWithContext("REVIEW", result).decision, "REVIEW");
  assert.equal(combineAuthorityWithContext("ALLOW", result).decision, "ALLOW");
});

test("LLM assertions, inferred relationships and unverified documents are not authoritative", () => {
  for (const kind of ["LLM_ASSERTION", "INFERRED", "UNVERIFIED_DOCUMENT"]) {
    const result = evaluate([fact({ source: { kind, id: "x" } })]);
    assert.equal(result.outcome, "INSUFFICIENT_EVIDENCE", kind);
    assert.ok(result.reasonCodes.includes("CONTEXT_SOURCE_NOT_AUTHORITATIVE"));
    assert.equal(combineAuthorityWithContext("ALLOW", result).decision, "DENY");
  }
});

test("missing, expired, future-dated and tampered facts fail closed", () => {
  assert.equal(evaluate([]).outcome, "INSUFFICIENT_EVIDENCE");
  assert.ok(evaluate([fact({ expiresAt: "2026-10-21T11:59:59.000Z" })]).reasonCodes.includes("CONTEXT_STALE_OR_NOT_YET_VALID"));
  assert.equal(evaluate([fact({ observedAt: "2026-10-21T12:00:01.000Z" })]).outcome, "INSUFFICIENT_EVIDENCE");
  const tampered = { ...fact(), value: "ineligible-but-digest-of-eligible" };
  const result = evaluate([tampered]);
  assert.equal(result.outcome, "INSUFFICIENT_EVIDENCE");
  assert.ok(result.reasonCodes.includes("CONTEXT_INTEGRITY_FAILED"));
  assert.equal(evaluateContextRequirement({ tenantId: "tenant-a", requirement, facts: [fact()], now: "not-a-date" }).outcome, "INSUFFICIENT_EVIDENCE");
});

test("cross-tenant facts are ignored and cannot satisfy a requirement", () => {
  const result = evaluate([fact({ tenantId: "tenant-b" })]);
  assert.equal(result.outcome, "INSUFFICIENT_EVIDENCE");
  assert.ok(result.reasonCodes.includes("CONTEXT_TENANT_MISMATCH"));
});

test("contradictory trusted facts require review; a confirmed mismatch denies", () => {
  const contradictory = evaluate([fact(), fact({ value: "ineligible", source: { kind: "HUMAN_ATTESTATION", id: "analyst" } })]);
  assert.equal(contradictory.outcome, "REVIEW_REQUIRED");
  assert.equal(combineAuthorityWithContext("ALLOW", contradictory).decision, "REVIEW");
  const mismatch = evaluate([fact({ value: "ineligible" })]);
  assert.equal(mismatch.outcome, "CONFIRMED_DENY");
  assert.equal(combineAuthorityWithContext("ALLOW", mismatch).decision, "DENY");
});

test("insufficient evidence defaults to DENY and may only be relaxed to REVIEW, never ALLOW", () => {
  const insufficient = evaluate([]);
  assert.equal(combineAuthorityWithContext("ALLOW", insufficient).decision, "DENY");
  assert.equal(combineAuthorityWithContext("ALLOW", insufficient, "REVIEW").decision, "REVIEW");
});

test("context can never upgrade an authority decision", () => {
  const outcomes = [evaluate([fact()]), evaluate([]), evaluate([fact({ value: "x" })]), evaluate([fact(), fact({ value: "y" })])];
  const rank = { ALLOW: 0, REVIEW: 1, DENY: 2 };
  for (const authority of ["ALLOW", "REVIEW", "DENY"]) {
    for (const context of outcomes) {
      assert.ok(rank[combineAuthorityWithContext(authority, context, "REVIEW").decision] >= rank[authority]);
    }
  }
});
