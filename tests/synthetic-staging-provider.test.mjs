import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveSyntheticStagingBoundary,
  SyntheticStagingBoundaryError,
} from "../lib/public-api/v1/synthetic-staging-provider.ts";

const staging = {
  SYNTHETIC_FIXTURES: "true",
  CYBER_SENTINELS_ENVIRONMENT: "staging",
  CYBER_SENTINELS_PUBLIC_ORIGIN: "https://cyber-sentinels-v2-git-staging.example.vercel.app",
  SUPABASE_URL: "https://agpyhygpfmppjkxwcpac.supabase.co",
  SYNTHETIC_STAGING_PROJECT_REF: "agpyhygpfmppjkxwcpac",
  CYBER_SENTINELS_PRODUCTION_SUPABASE_PROJECT_REF: "kecgtsfibkypjuaxqbjx",
  VERCEL_ENV: "preview",
};

function reason(environment) {
  try {
    resolveSyntheticStagingBoundary(environment);
    return null;
  } catch (error) {
    assert.ok(error instanceof SyntheticStagingBoundaryError);
    return error.code;
  }
}

test("synthetic provider stays disabled unless explicitly enabled", () => {
  assert.equal(resolveSyntheticStagingBoundary({ ...staging, SYNTHETIC_FIXTURES: "false" }), null);
});

test("synthetic provider accepts only its explicit isolated Staging boundary", () => {
  const boundary = resolveSyntheticStagingBoundary(staging);
  assert.equal(boundary?.environment, "staging");
  assert.equal(boundary?.projectRef, "agpyhygpfmppjkxwcpac");
  assert.equal(boundary?.classification, "SYNTHETIC_STAGING_VERIFICATION");
});

test("synthetic provider rejects every Production boundary", () => {
  assert.equal(reason({ ...staging, CYBER_SENTINELS_ENVIRONMENT: "production" }), "SYNTHETIC_STAGING_ENVIRONMENT_REQUIRED");
  assert.equal(reason({ ...staging, VERCEL_ENV: "production" }), "SYNTHETIC_STAGING_FORBIDDEN_IN_PRODUCTION");
  assert.equal(reason({ ...staging, CYBER_SENTINELS_PUBLIC_ORIGIN: "https://www.cybersentinels.com" }), "SYNTHETIC_STAGING_PRODUCTION_ORIGIN_REJECTED");
  assert.equal(reason({
    ...staging,
    SUPABASE_URL: "https://kecgtsfibkypjuaxqbjx.supabase.co",
    SYNTHETIC_STAGING_PROJECT_REF: "kecgtsfibkypjuaxqbjx",
  }), "SYNTHETIC_STAGING_PRODUCTION_PROJECT_REJECTED");
});

test("synthetic provider rejects an unpinned or mismatched project", () => {
  assert.equal(reason({ ...staging, SYNTHETIC_STAGING_PROJECT_REF: "" }), "SYNTHETIC_STAGING_PROJECT_REF_MISMATCH");
  assert.equal(reason({ ...staging, SYNTHETIC_STAGING_PROJECT_REF: "anotherprojectref" }), "SYNTHETIC_STAGING_PROJECT_REF_MISMATCH");
});

test("trusted provider cannot be selected through the public evidence route", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../lib/public-api/v1/client-evidence.ts", import.meta.url), "utf8"));
  assert.match(source, /SERVER_VERIFIED_/);
  assert.match(source, /EVIDENCE_TYPE_RESERVED/);
  const runtime = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../lib/public-api/v1/runtime.ts", import.meta.url), "utf8"));
  assert.match(runtime, /establishTrustedStagingEvidence\(\{/);
  assert.doesNotMatch(runtime, /assertOnlyFields\([^\n]*synthetic/i);
});

test("context-only positive continuous signals remain persisted but non-decision-eligible", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../lib/trust-transaction/server.ts", import.meta.url), "utf8"));
  assert.match(source, /source_type === "CONTINUOUS_TRUST_SIGNAL" && result === "INCONCLUSIVE"/);
  assert.match(source, /\? "unconfirmed"/);
  assert.match(source, /item\.providerId.*item\.sourcePartyId.*item\.type/);
  assert.match(source, /if \(!latest\.has\(key\)\) latest\.set\(key, item\)/);
});

test("revoked authority is left to the canonical engine and never causes new staging evidence", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../lib/public-api/v1/trusted-staging-evidence.ts", import.meta.url), "utf8"));
  assert.match(source, /authority\.data\.revocation_state !== "active"\) return null/);
  assert.match(source, /verifier outage or mint new positive evidence/);
});

test("staging evidence payloads are deterministic across an idempotent retry", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../lib/public-api/v1/trusted-staging-evidence.ts", import.meta.url), "utf8"));
  assert.match(source, /const verifiedAt = observedAt/);
  assert.doesNotMatch(source, /const verifiedAt = new Date\(\)\.toISOString\(\)/);
});
