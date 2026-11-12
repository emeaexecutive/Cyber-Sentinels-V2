import assert from "node:assert/strict";
import test from "node:test";
import { validateDelegatedAuthoritySubset } from "../lib/operational-entities/delegated-authority.ts";

// Deterministic PRNG (mulberry32) so failures are reproducible from the seed.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POOL = {
  permittedActions: ["read", "write", "refund", "export", "delete"],
  permittedTools: ["crm.lookup", "billing.refund", "mail.send", "db.query"],
  permittedTargets: ["acct:a", "acct:b", "acct:c", "repo:a"],
  environments: ["staging", "production", "sandbox"],
};
const BOUNDARIES = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"];
const T0 = Date.parse("2026-10-01T00:00:00.000Z");
const iso = (ms) => new Date(ms).toISOString();

function pick(r, values, min = 1) {
  const chosen = values.filter(() => r() < 0.6);
  return chosen.length >= min ? chosen : values.slice(0, min);
}

function rootScope(r) {
  return {
    ...Object.fromEntries(Object.entries(POOL).map(([k, v]) => [k, pick(r, v, 2)])),
    dataBoundary: BOUNDARIES[1 + Math.floor(r() * 3)],
    financialLimit: 1000 + Math.floor(r() * 9000),
    executionLimit: 10 + Math.floor(r() * 90),
  };
}

function narrow(r, parent) {
  const scope = Object.fromEntries(Object.keys(POOL).map((k) => [k, parent[k].filter(() => r() < 0.7)]));
  return {
    ...scope,
    dataBoundary: BOUNDARIES[Math.floor(r() * (BOUNDARIES.indexOf(parent.dataBoundary) + 1))],
    financialLimit: Math.floor(r() * (parent.financialLimit + 1)),
    executionLimit: Math.floor(r() * (parent.executionLimit + 1)),
  };
}

const validate = (parent, child, window, parentWindow, depth = 1, maxDepth = 4) =>
  validateDelegatedAuthoritySubset({
    parentScope: parent,
    delegatedScope: child,
    parentNotBefore: iso(parentWindow.from),
    parentExpiresAt: iso(parentWindow.to),
    delegatedNotBefore: iso(window.from),
    delegatedExpiresAt: iso(window.to),
    parentMaximumDelegationDepth: maxDepth,
    requestedDepth: depth,
  });

const isSubset = (child, parent) => child.every((v) => parent.includes(v));

test("property: every accepted chain is transitively bounded by the root principal", () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const r = rng(seed);
    const root = rootScope(r);
    const rootWindow = { from: T0, to: T0 + 10_000_000 };
    let parent = root;
    let parentWindow = rootWindow;
    for (let depth = 1; depth <= 4; depth += 1) {
      const child = narrow(r, parent);
      const from = parentWindow.from + Math.floor(r() * 1000);
      const window = { from, to: from + Math.floor(r() * (parentWindow.to - from)) };
      const verdict = validate(parent, child, window, parentWindow, depth);
      assert.equal(verdict.valid, true, `seed ${seed} depth ${depth}: ${JSON.stringify(verdict.violations)}`);
      for (const key of Object.keys(POOL)) assert.ok(isSubset(child[key], root[key]), `seed ${seed} ${key} escaped root`);
      assert.ok(BOUNDARIES.indexOf(child.dataBoundary) <= BOUNDARIES.indexOf(root.dataBoundary));
      assert.ok(child.financialLimit <= root.financialLimit && child.executionLimit <= root.executionLimit);
      assert.ok(window.from >= rootWindow.from && window.to <= rootWindow.to);
      parent = child;
      parentWindow = window;
    }
  }
});

test("property: any single-field escalation is rejected as an amplification attempt", () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const r = rng(seed * 7919);
    const parent = rootScope(r);
    const window = { from: T0, to: T0 + 1_000_000 };
    const child = narrow(r, parent);
    const base = validate(parent, child, window, window);
    assert.equal(base.valid, true);

    for (const key of Object.keys(POOL)) {
      const outside = POOL[key].find((v) => !parent[key].includes(v));
      if (!outside) continue;
      const verdict = validate(parent, { ...child, [key]: [...child[key], outside] }, window, window);
      assert.equal(verdict.valid, false, `seed ${seed} ${key}`);
      assert.deepEqual(verdict.reasonCodes, ["AUTHORITY_AMPLIFICATION_ATTEMPT"]);
    }
    const escalations = [
      { dataBoundary: BOUNDARIES[Math.min(3, BOUNDARIES.indexOf(parent.dataBoundary) + 1)], skip: parent.dataBoundary === "RESTRICTED" },
      { financialLimit: parent.financialLimit + 1 },
      { financialLimit: null },
      { executionLimit: parent.executionLimit + 1 },
      { executionLimit: null },
    ];
    for (const { skip, ...patch } of escalations) {
      if (skip) continue;
      assert.equal(validate(parent, { ...child, ...patch }, window, window).valid, false, `seed ${seed} ${JSON.stringify(patch)}`);
    }
    assert.equal(validate(parent, child, { from: window.from, to: window.to + 1 }, window).valid, false, "expiry beyond parent");
    assert.equal(validate(parent, child, { from: window.from - 1, to: window.to }, window).valid, false, "start before parent");
  }
});

test("delegation depth must be a positive safe integer within the parent maximum", () => {
  const r = rng(42);
  const parent = rootScope(r);
  const child = narrow(r, parent);
  const window = { from: T0, to: T0 + 1000 };
  for (const depth of [0, -1, 5, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 2]) {
    assert.equal(validate(parent, child, window, window, depth, 4).valid, false, `depth ${depth}`);
  }
  assert.equal(validate(parent, child, window, window, 4, 4).valid, true);
});
