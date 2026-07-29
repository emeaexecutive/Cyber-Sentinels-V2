import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRequestDemoHandler } from "../lib/request-demo.ts";
import {
  createTurnstileOptions,
  waitForTurnstileApi,
} from "../components/turnstile-field.tsx";

const correlationId = "0d9a8b6d-4ed0-4be1-9fa1-4046f3579711";
const genericMessage = "We could not submit your request. Please try again or contact support.";

function validConfig(overrides = {}) {
  return {
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service-role-key",
    turnstileSecretConfigured: true,
    turnstileSiteKeyConfigured: true,
    ...overrides,
  };
}

function request(fields = {}) {
  const body = new URLSearchParams({
    name: "Test Person",
    work_email: "test@example.com",
    company: "Example Company",
    "cf-turnstile-response": "verified-token",
    ...fields,
  });
  return new Request("https://www.cybersentinels.com/api/enterprise-access", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
}

function harness(overrides = {}) {
  const logs = [];
  const inserts = [];
  const dependencies = {
    isRateLimited: () => false,
    getClientIp: () => "203.0.113.10",
    getTurnstileToken: (formData) => String(formData.get("cf-turnstile-response") ?? ""),
    verifyTurnstile: async () => ({ ok: true, reason: "verified" }),
    getConfig: () => validConfig(),
    createPersistence: () => ({
      async insertRequest(payload) {
        inserts.push({ table: "enterprise_access_requests", payload });
        return { error: null };
      },
      async insertInterestSignal(payload) {
        inserts.push({ table: "interest_signals", payload });
        return { error: null };
      },
    }),
    logError: (event, fields) => logs.push({ event, fields }),
    ...overrides,
  };
  return {
    handler: createRequestDemoHandler(dependencies),
    logs,
    inserts,
  };
}

async function assertFailure(response, status, code) {
  const body = await response.json();
  assert.equal(response.status, status);
  assert.equal(body.ok, false);
  assert.equal(body.code, code);
  assert.equal(typeof body.code, "string");
  assert.ok(body.code.length > 0);
  assert.notEqual(body.code, null);
  assert.equal(body.message, genericMessage);
  assert.equal(body.correlationId, correlationId);
  assert.equal(response.headers.get("x-correlation-id"), correlationId);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return body;
}

function assertSafeLog(log) {
  assert.equal(log.event, "request-demo submission failed");
  assert.equal(log.fields.correlationId, correlationId);
  assert.ok(log.fields.operation);
  assert.ok(log.fields.internalCode);
  assert.ok(log.fields.errorName);
  const allowed = new Set([
    "correlationId",
    "operation",
    "internalCode",
    "providerCode",
    "providerErrorCodes",
    "providerHostname",
    "providerChallengeTimestamp",
    "errorName",
  ]);
  assert.ok(Object.keys(log.fields).every((key) => allowed.has(key)));
  assert.doesNotMatch(
    JSON.stringify(log),
    /test@example\.com|Test Person|Example Company|verified-token|203\.0\.113\.10|service-role-key/,
  );
}

test("Request Demo frontend sets the Turnstile callback token on FormData", async () => {
  const page = await readFile(new URL("../app/enterprise-access/page.tsx", import.meta.url), "utf8");
  const field = await readFile(new URL("../components/turnstile-field.tsx", import.meta.url), "utf8");
  const botProtection = await readFile(new URL("../lib/bot-protection.ts", import.meta.url), "utf8");
  assert.match(page, /<EnterpriseAccessForm buttonLabel=\{buttonLabel\} designPartner=\{designPartner\}/);
  assert.match(field, /process\.env\.NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
  assert.match(field, /turnstile\.render\(\s*containerRef\.current/);
  assert.match(field, /onToken: \(token\) => onTokenChangeRef\.current\?\.\(token\)/);
  assert.match(field, /formData\.set\("cf-turnstile-response", turnstileToken\)/);
  assert.doesNotMatch(field, /console\.(?:debug|log)\(/);
  assert.match(field, /fetch\("\/api\/enterprise-access"/);
  assert.match(field, /disabled=\{!turnstileToken \|\| submitting\}/);
  assert.match(field, /"response-field": false/);
  assert.match(field, /retry: "auto"/);
  assert.match(field, /"retry-interval": 2_000/);
  assert.match(field, /"refresh-expired": "auto"/);
  assert.match(field, /"refresh-timeout": "auto"/);
  assert.match(field, /apiRef\.current\?\.remove\?\.\(widgetId\)/);
  assert.match(field, /apiRef\.current\.reset\(widgetIdRef\.current\)/);
  assert.match(
    botProtection,
    /getTurnstileTokenFromForm\(formData: FormData\) \{\s+return String\(formData\.get\("cf-turnstile-response"\) \?\? ""\)\.trim\(\);/,
  );
});

test("Turnstile waits for delayed API availability and resolves exactly once", () => {
  const scheduled = [];
  let api;
  let readyCount = 0;
  let timeoutCount = 0;
  const stop = waitForTurnstileApi({
    readApi: () => api,
    onReady: () => { readyCount += 1; },
    onTimeout: () => { timeoutCount += 1; },
    schedule: (callback) => {
      scheduled.push(callback);
      return scheduled.length;
    },
    cancel: () => {},
    retryMs: 100,
    timeoutMs: 10_000,
  });

  assert.equal(scheduled.length, 1);
  api = {};
  scheduled.shift()();
  assert.equal(readyCount, 1);
  assert.equal(timeoutCount, 0);
  assert.equal(scheduled.length, 0);
  stop();
});

test("Turnstile wait cleanup cancels pending retries", () => {
  let pending;
  let cancelled = false;
  let readyCount = 0;
  const stop = waitForTurnstileApi({
    readApi: () => undefined,
    onReady: () => { readyCount += 1; },
    onTimeout: () => assert.fail("cleanup must prevent timeout"),
    schedule: (callback) => {
      pending = callback;
      return 7;
    },
    cancel: (timer) => {
      assert.equal(timer, 7);
      cancelled = true;
    },
  });

  stop();
  pending();
  assert.equal(cancelled, true);
  assert.equal(readyCount, 0);
});

test("Turnstile callbacks own token state and surface safe failure states", () => {
  const tokens = [];
  const errors = [];
  const options = createTurnstileOptions({
    siteKey: "public-site-key",
    onToken: (token) => tokens.push(token),
    onError: (message) => errors.push(message),
  });

  options.callback("challenge-token");
  assert.equal(tokens.at(-1), "challenge-token");
  assert.equal(errors.at(-1), "");

  assert.equal(options["error-callback"]("110200"), true);
  assert.equal(tokens.at(-1), "");
  assert.match(errors.at(-1), /not authorised/i);

  options["expired-callback"]();
  assert.equal(tokens.at(-1), "");
  assert.match(errors.at(-1), /expired/i);

  options["timeout-callback"]();
  assert.equal(tokens.at(-1), "");
  assert.match(errors.at(-1), /timed out/i);
});

for (const [name, override] of [
  ["site key", { turnstileSiteKeyConfigured: false }],
  ["secret", { turnstileSecretConfigured: false }],
  ["Supabase URL", { supabaseUrl: undefined }],
  ["service-role key", { serviceRoleKey: undefined }],
]) {
  test(`missing ${name} returns 503 REQUEST_DEMO_CONFIG_MISSING`, async () => {
    const { handler, logs } = harness({ getConfig: () => validConfig(override) });
    const response = await handler(request(), correlationId);
    const body = await assertFailure(response, 503, "REQUEST_DEMO_CONFIG_MISSING");
    assert.equal(body.error, "Request Demo is temporarily unavailable.");
    assertSafeLog(logs[0]);
  });
}

test("missing challenge token returns REQUEST_DEMO_TURNSTILE_TOKEN_MISSING", async () => {
  const { handler, logs } = harness();
  const response = await handler(request({ "cf-turnstile-response": "" }), correlationId);
  await assertFailure(response, 400, "REQUEST_DEMO_TURNSTILE_TOKEN_MISSING");
  assertSafeLog(logs[0]);
});

test("invalid challenge returns REQUEST_DEMO_TURNSTILE_FAILED", async () => {
  const { handler, logs } = harness({
    verifyTurnstile: async () => ({
      ok: false,
      reason: "invalid_token",
      errorCodes: ["invalid-input-response"],
      hostname: "www.cybersentinels.com",
      challengeTimestamp: "2026-07-29T10:00:00.000Z",
    }),
  });
  const response = await handler(request(), correlationId);
  await assertFailure(response, 400, "REQUEST_DEMO_TURNSTILE_FAILED");
  assert.equal(logs[0].fields.providerCode, "invalid_token");
  assert.deepEqual(logs[0].fields.providerErrorCodes, ["invalid-input-response"]);
  assert.equal(logs[0].fields.providerHostname, "www.cybersentinels.com");
  assert.equal(logs[0].fields.providerChallengeTimestamp, "2026-07-29T10:00:00.000Z");
  assertSafeLog(logs[0]);
});

for (const reason of ["provider_unavailable", "provider_error", "turnstile_not_configured"]) {
  test(`Turnstile ${reason} returns REQUEST_DEMO_TURNSTILE_UNAVAILABLE`, async () => {
    const { handler, logs } = harness({
      verifyTurnstile: async () => ({ ok: false, reason }),
    });
    const response = await handler(request(), correlationId);
    await assertFailure(response, 503, "REQUEST_DEMO_TURNSTILE_UNAVAILABLE");
    assert.equal(logs[0].fields.providerCode, reason);
    assertSafeLog(logs[0]);
  });
}

test("invalid required fields return REQUEST_DEMO_VALIDATION_FAILED", async () => {
  const { handler, logs } = harness();
  const response = await handler(request({ company: "" }), correlationId);
  await assertFailure(response, 400, "REQUEST_DEMO_VALIDATION_FAILED");
  assertSafeLog(logs[0]);
});

test("database insert failure returns REQUEST_DEMO_DATABASE_FAILED without exposing provider code", async () => {
  const { handler, logs } = harness({
    createPersistence: () => ({
      async insertRequest() {
        return { error: { code: "23505", name: "PostgrestError" } };
      },
      async insertInterestSignal() {
        assert.fail("interest signal must not run after request insert failure");
      },
    }),
  });
  const response = await handler(request(), correlationId);
  const body = await assertFailure(response, 500, "REQUEST_DEMO_DATABASE_FAILED");
  assert.equal(body.providerCode, undefined);
  assert.equal(body.code, "REQUEST_DEMO_DATABASE_FAILED");
  assert.equal(logs[0].fields.providerCode, "23505");
  assertSafeLog(logs[0]);
});

test("unknown thrown exception returns REQUEST_DEMO_UNKNOWN without logging its message", async () => {
  const { handler, logs } = harness({
    getConfig: () => {
      throw new Error("test@example.com verified-token service-role-key");
    },
  });
  const response = await handler(request(), correlationId);
  await assertFailure(response, 500, "REQUEST_DEMO_UNKNOWN");
  assertSafeLog(logs[0]);
});

test("rate limit returns REQUEST_DEMO_RATE_LIMITED", async () => {
  const { handler, logs } = harness({ isRateLimited: () => true });
  const response = await handler(request(), correlationId);
  await assertFailure(response, 429, "REQUEST_DEMO_RATE_LIMITED");
  assertSafeLog(logs[0]);
});

test("successful submission inserts both records and redirects", async () => {
  const { handler, logs, inserts } = harness();
  const response = await handler(request(), correlationId);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://www.cybersentinels.com/enterprise-access?success=true");
  assert.deepEqual(inserts.map(({ table }) => table), ["enterprise_access_requests", "interest_signals"]);
  assert.equal(logs.length, 0);
});

test("Request Demo source contains no code:null response", async () => {
  const route = await readFile(new URL("../app/api/enterprise-access/route.ts", import.meta.url), "utf8");
  const core = await readFile(new URL("../lib/request-demo.ts", import.meta.url), "utf8");
  assert.doesNotMatch(`${route}\n${core}`, /code:\s*null/);
});

test("server-side Turnstile verification posts only the required safe fields to Siteverify", async () => {
  const botProtection = await readFile(new URL("../lib/bot-protection.ts", import.meta.url), "utf8");
  assert.match(botProtection, /process\.env\.TURNSTILE_SECRET_KEY/);
  assert.match(botProtection, /formData\.set\("secret", secret\)/);
  assert.match(botProtection, /formData\.set\("response", token\)/);
  assert.match(botProtection, /formData\.set\("remoteip", ip\)/);
  assert.match(botProtection, /https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
  assert.match(botProtection, /process\.env\.NODE_ENV !== "production"/);
  assert.doesNotMatch(botProtection, /console\.(?:debug|log)\(/);
});
