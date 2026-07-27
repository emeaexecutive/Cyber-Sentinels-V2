import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modulePath = "../src/lib/config/consent-config.ts";

function resetConsentEnv() {
  delete process.env.CONSENT_DEFAULT_ENTERPRISE_ID;
  delete process.env.CONSENT_COOKIE_SECRET;
}

test("missing enterprise ID yields stable missing code", async () => {
  resetConsentEnv();
  process.env.CONSENT_COOKIE_SECRET = "a".repeat(64);
  const mod = await import(modulePath);
  assert.throws(
    () => mod.getConsentDefaultEnterpriseId(),
    (error) => error?.code === "CONSENT_DEFAULT_ENTERPRISE_ID_MISSING",
  );
});

test("malformed enterprise ID yields stable invalid code", async () => {
  resetConsentEnv();
  process.env.CONSENT_DEFAULT_ENTERPRISE_ID = "not-a-uuid";
  process.env.CONSENT_COOKIE_SECRET = "a".repeat(64);
  const mod = await import(modulePath);
  assert.throws(
    () => mod.getConsentDefaultEnterpriseId(),
    (error) => error?.code === "CONSENT_DEFAULT_ENTERPRISE_ID_INVALID",
  );
});

test("missing cookie secret yields stable missing code", async () => {
  resetConsentEnv();
  process.env.CONSENT_DEFAULT_ENTERPRISE_ID = "11111111-1111-4111-8111-111111111111";
  const mod = await import(modulePath);
  assert.throws(
    () => mod.getConsentCookieSecret(true),
    (error) => error?.code === "CONSENT_COOKIE_SECRET_MISSING",
  );
});

test("weak cookie secret yields stable weak code", async () => {
  resetConsentEnv();
  process.env.CONSENT_DEFAULT_ENTERPRISE_ID = "11111111-1111-4111-8111-111111111111";
  process.env.CONSENT_COOKIE_SECRET = "short-secret";
  const mod = await import(modulePath);
  assert.throws(
    () => mod.getConsentCookieSecret(true),
    (error) => error?.code === "CONSENT_COOKIE_SECRET_WEAK",
  );
});

test("valid consent configuration reports ready true", async () => {
  resetConsentEnv();
  process.env.CONSENT_DEFAULT_ENTERPRISE_ID = "11111111-1111-4111-8111-111111111111";
  process.env.CONSENT_COOKIE_SECRET = "a".repeat(64);
  const mod = await import(modulePath);
  const status = mod.getConsentConfigurationStatus();
  assert.deepEqual(status, {
    enterpriseConfigured: true,
    enterpriseValid: true,
    cookieSecretConfigured: true,
    cookieSecretStrong: true,
    ready: true,
  });
});

test("health endpoint exposes booleans only and no secret values", async () => {
  resetConsentEnv();
  process.env.CONSENT_DEFAULT_ENTERPRISE_ID = "11111111-1111-4111-8111-111111111111";
  process.env.CONSENT_COOKIE_SECRET = "b".repeat(64);
  const config = await import(modulePath);
  const status = config.getConsentConfigurationStatus();
  assert.equal(typeof status.enterpriseConfigured, "boolean");
  assert.equal(typeof status.enterpriseValid, "boolean");
  assert.equal(typeof status.cookieSecretConfigured, "boolean");
  assert.equal(typeof status.cookieSecretStrong, "boolean");
  assert.equal(typeof status.ready, "boolean");

  const route = await readFile(new URL("../app/api/health/consent-config/route.ts", import.meta.url), "utf8");
  assert.match(route, /\{ consent \}/);
  assert.doesNotMatch(route, /CONSENT_COOKIE_SECRET\s*:/);
  assert.doesNotMatch(route, /CONSENT_DEFAULT_ENTERPRISE_ID\s*:/);
});

test("health endpoint rejects unauthorized request", async () => {
  const route = await readFile(new URL("../app/api/health/consent-config/route.ts", import.meta.url), "utf8");
  assert.match(route, /authorization/);
  assert.match(route, /CONSENT_CONFIG_AUTHORIZATION_DENIED/);
  assert.match(route, /status: 401/);
});

test("consent cookie route logs correlation-safe telemetry fields and no secret names", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../app/api/consent/cookies/route.ts", import.meta.url), "utf8"));
  assert.match(source, /correlationId/);
  assert.match(source, /errorCode/);
  assert.match(source, /status/);
  assert.match(source, /supabaseCode/);
  assert.doesNotMatch(source, /CONSENT_COOKIE_SECRET|SUPABASE_SERVICE_ROLE_KEY|jwt|cookie\s*:/i);
});
