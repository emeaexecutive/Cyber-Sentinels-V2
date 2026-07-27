import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modulePath = "../src/lib/config/consent-config.ts";

function resetConsentEnv() {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.CONSENT_DEFAULT_ENTERPRISE_ID;
  delete process.env.CONSENT_COOKIE_SECRET;
}

function setValidPersistenceEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.CONSENT_DEFAULT_ENTERPRISE_ID = "11111111-1111-4111-8111-111111111111";
}

test("missing enterprise ID yields stable missing code", async () => {
  resetConsentEnv();
  setValidPersistenceEnv();
  delete process.env.CONSENT_DEFAULT_ENTERPRISE_ID;
  process.env.CONSENT_COOKIE_SECRET = "a".repeat(64);
  const mod = await import(modulePath);
  assert.throws(
    () => mod.getConsentDefaultEnterpriseId(),
    (error) => error?.code === "CONSENT_DEFAULT_ENTERPRISE_ID_MISSING",
  );
});

test("malformed enterprise ID yields stable invalid code", async () => {
  resetConsentEnv();
  setValidPersistenceEnv();
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
  setValidPersistenceEnv();
  const mod = await import(modulePath);
  assert.throws(
    () => mod.getConsentCookieSecret(true),
    (error) => error?.code === "CONSENT_COOKIE_SECRET_MISSING",
  );
});

test("weak cookie secret yields stable weak code", async () => {
  resetConsentEnv();
  setValidPersistenceEnv();
  process.env.CONSENT_COOKIE_SECRET = "short-secret";
  const mod = await import(modulePath);
  assert.throws(
    () => mod.getConsentCookieSecret(true),
    (error) => error?.code === "CONSENT_COOKIE_SECRET_WEAK",
  );
});

test("missing NEXT_PUBLIC_SUPABASE_URL is reflected in status and internal code mapping", async () => {
  resetConsentEnv();
  setValidPersistenceEnv();
  process.env.CONSENT_COOKIE_SECRET = "a".repeat(64);
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;

  const mod = await import(modulePath);
  const status = mod.getConsentConfigurationStatus();
  assert.equal(status.supabaseUrlConfigured, false);
  assert.equal(status.persistenceReady, false);
  assert.equal(
    mod.inferConsentConfigInternalCode(new Error("Missing required environment variables for Supabase service role client: NEXT_PUBLIC_SUPABASE_URL")),
    "CONSENT_CONFIG_SUPABASE_URL_MISSING",
  );
});

test("missing NEXT_PUBLIC_SUPABASE_ANON_KEY is reflected in status", async () => {
  resetConsentEnv();
  setValidPersistenceEnv();
  process.env.CONSENT_COOKIE_SECRET = "a".repeat(64);
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const mod = await import(modulePath);
  const status = mod.getConsentConfigurationStatus();
  assert.equal(status.supabaseAnonKeyConfigured, false);
  assert.equal(status.persistenceReady, false);
});

test("missing SUPABASE_SERVICE_ROLE_KEY is reflected in status and internal code mapping", async () => {
  resetConsentEnv();
  setValidPersistenceEnv();
  process.env.CONSENT_COOKIE_SECRET = "a".repeat(64);
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const mod = await import(modulePath);
  const status = mod.getConsentConfigurationStatus();
  assert.equal(status.serviceRoleKeyConfigured, false);
  assert.equal(status.persistenceReady, false);
  assert.equal(
    mod.inferConsentConfigInternalCode(new Error("Missing required environment variables for Supabase service role client: SUPABASE_SERVICE_ROLE_KEY")),
    "CONSENT_CONFIG_SERVICE_ROLE_KEY_MISSING",
  );
});

test("valid persistence config does not require cookie secret", async () => {
  resetConsentEnv();
  setValidPersistenceEnv();

  const mod = await import(modulePath);
  const status = mod.getConsentConfigurationStatus();
  assert.equal(status.persistenceReady, true);
  assert.equal(status.signedCookieReady, false);
  assert.equal(status.ready, false);
});

test("valid consent configuration reports persistence and signed-cookie readiness", async () => {
  resetConsentEnv();
  setValidPersistenceEnv();
  process.env.CONSENT_COOKIE_SECRET = "a".repeat(64);
  const mod = await import(modulePath);
  const status = mod.getConsentConfigurationStatus();
  assert.deepEqual(status, {
    supabaseUrlConfigured: true,
    supabaseAnonKeyConfigured: true,
    serviceRoleKeyConfigured: true,
    enterpriseConfigured: true,
    enterpriseValid: true,
    cookieSecretConfigured: true,
    cookieSecretStrong: true,
    persistenceReady: true,
    signedCookieReady: true,
    ready: true,
  });
});

test("health endpoint exposes booleans only and no secret values", async () => {
  resetConsentEnv();
  setValidPersistenceEnv();
  process.env.CONSENT_COOKIE_SECRET = "b".repeat(64);
  const config = await import(modulePath);
  const status = config.getConsentConfigurationStatus();
  assert.equal(typeof status.supabaseUrlConfigured, "boolean");
  assert.equal(typeof status.supabaseAnonKeyConfigured, "boolean");
  assert.equal(typeof status.serviceRoleKeyConfigured, "boolean");
  assert.equal(typeof status.enterpriseConfigured, "boolean");
  assert.equal(typeof status.enterpriseValid, "boolean");
  assert.equal(typeof status.cookieSecretConfigured, "boolean");
  assert.equal(typeof status.cookieSecretStrong, "boolean");
  assert.equal(typeof status.persistenceReady, "boolean");
  assert.equal(typeof status.signedCookieReady, "boolean");
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
  assert.match(route, /consent\.persistenceReady \? 200 : 503/);
});

test("enterprise-id and service-role configuration failures map to stable internal codes", async () => {
  resetConsentEnv();
  setValidPersistenceEnv();
  const mod = await import(modulePath);

  delete process.env.CONSENT_DEFAULT_ENTERPRISE_ID;
  assert.throws(
    () => mod.getConsentDefaultEnterpriseId(),
    (error) => error?.internalCode === "CONSENT_CONFIG_ENTERPRISE_ID_MISSING",
  );

  process.env.CONSENT_DEFAULT_ENTERPRISE_ID = "not-a-uuid";
  assert.throws(
    () => mod.getConsentDefaultEnterpriseId(),
    (error) => error?.internalCode === "CONSENT_CONFIG_ENTERPRISE_ID_INVALID",
  );
});

test("consent cookie route keeps public 503 sanitized and logs internal diagnostic code", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../app/api/consent/cookies/route.ts", import.meta.url), "utf8"));
  assert.match(source, /correlationId/);
  assert.match(source, /internalCode/);
  assert.match(source, /errorCode/);
  assert.match(source, /status/);
  assert.match(source, /supabaseCode/);
  assert.match(source, /CONSENT_RECEIPT_PERSISTENCE_UNAVAILABLE/);
  assert.match(source, /result\.replayed \? 200 : 201/);
  assert.match(source, /}, 503, correlationId\)/);
  assert.doesNotMatch(source, /CONSENT_COOKIE_SECRET|SUPABASE_SERVICE_ROLE_KEY|jwt|cookie\s*:/i);
});
