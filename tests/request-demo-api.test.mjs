import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRequestDemoHandler } from "../lib/request-demo.ts";
import {
  createTurnstileOptions,
  waitForTurnstileApi,
} from "../components/turnstile-field.tsx";
import { verifyTurnstileToken } from "../lib/bot-protection.ts";
import { getSafeSameOriginUrl, getTrustedClientIp } from "../lib/security.ts";

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
  assert.match(field, /onToken: publishToken/);
  assert.match(field, /onTokenChangeRef\.current\?\.\(nextToken\)/);
  assert.match(field, /formData\.set\("cf-turnstile-response", turnstileToken\)/);
  assert.match(field, /type="hidden" name="cf-turnstile-response" value=\{token\}/);
  assert.doesNotMatch(field, /console\.(?:debug|log)\(/);
  assert.match(field, /fetch\("\/api\/enterprise-access"/);
  assert.match(field, /disabled=\{!turnstileToken \|\| submitting\}/);
  assert.match(field, /if \(submissionInFlightRef\.current\) return/);
  assert.match(field, /"response-field": false/);
  assert.match(field, /retry: "auto"/);
  assert.match(field, /"retry-interval": 2_000/);
  assert.match(field, /"refresh-expired": "auto"/);
  assert.match(field, /"refresh-timeout": "auto"/);
  assert.match(field, /apiRef\.current\?\.remove\?\.\(widgetId\)/);
  assert.match(field, /apiRef\.current\.reset\(widgetIdRef\.current\)/);
  assert.match(field, /if \(!siteKey \|\| !containerRef\.current \|\| widgetIdRef\.current\) return/);
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

test("Turnstile API polling stops after the configured timeout", () => {
  const scheduled = [];
  let timeoutCount = 0;
  waitForTurnstileApi({
    readApi: () => undefined,
    onReady: () => assert.fail("unavailable API must not become ready"),
    onTimeout: () => { timeoutCount += 1; },
    schedule: (callback) => {
      scheduled.push(callback);
      return scheduled.length;
    },
    cancel: () => {},
    retryMs: 100,
    timeoutMs: 10_000,
  });

  let callbacks = 0;
  while (scheduled.length > 0) {
    scheduled.shift()();
    callbacks += 1;
    assert.ok(callbacks <= 100);
  }
  assert.equal(callbacks, 100);
  assert.equal(timeoutCount, 1);
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
  const { handler, logs, inserts } = harness({
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
  assert.equal(inserts.length, 0);
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
  let siteverifyCalls = 0;
  const { handler, logs } = harness({
    verifyTurnstile: async () => {
      siteverifyCalls += 1;
      return { ok: true, reason: "verified" };
    },
  });
  const response = await handler(request({ company: "" }), correlationId);
  await assertFailure(response, 400, "REQUEST_DEMO_VALIDATION_FAILED");
  assertSafeLog(logs[0]);
  assert.equal(siteverifyCalls, 0);
});

test("unsupported request encoding returns controlled validation failure", async () => {
  const { handler, logs, inserts } = harness();
  const unsupportedRequest = new Request(
    "https://www.cybersentinels.com/api/enterprise-access",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{}",
    },
  );

  const response = await handler(unsupportedRequest, correlationId);
  await assertFailure(response, 400, "REQUEST_DEMO_VALIDATION_FAILED");
  assert.equal(inserts.length, 0);
  assertSafeLog(logs[0]);
});

test("invalid email and oversized fields fail validation before Siteverify", async () => {
  let siteverifyCalls = 0;
  const { handler, logs } = harness({
    verifyTurnstile: async () => {
      siteverifyCalls += 1;
      return { ok: true, reason: "verified" };
    },
  });

  const invalidEmail = await handler(request({ work_email: "not-an-email" }), correlationId);
  await assertFailure(invalidEmail, 400, "REQUEST_DEMO_VALIDATION_FAILED");
  const oversized = await handler(request({ message: "x".repeat(4_001) }), correlationId);
  await assertFailure(oversized, 400, "REQUEST_DEMO_VALIDATION_FAILED");
  assert.equal(siteverifyCalls, 0);
  assertSafeLog(logs[0]);
  assertSafeLog(logs[1]);
});

test("declared oversized Request Demo bodies return 413 before parsing", async () => {
  const { handler, logs, inserts } = harness();
  const oversized = request();
  const requestWithLength = new Request(oversized, {
    headers: {
      ...Object.fromEntries(oversized.headers),
      "content-length": "32001",
    },
  });
  const response = await handler(requestWithLength, correlationId);
  await assertFailure(response, 413, "REQUEST_DEMO_PAYLOAD_TOO_LARGE");
  assert.equal(inserts.length, 0);
  assertSafeLog(logs[0]);
});

test("Turnstile tokens over the documented maximum are rejected before Siteverify", async () => {
  let siteverifyCalls = 0;
  const { handler, logs } = harness({
    verifyTurnstile: async () => {
      siteverifyCalls += 1;
      return { ok: true, reason: "verified" };
    },
  });
  const response = await handler(
    request({ "cf-turnstile-response": "x".repeat(2_049) }),
    correlationId,
  );
  await assertFailure(response, 400, "REQUEST_DEMO_TURNSTILE_TOKEN_MISSING");
  assert.equal(siteverifyCalls, 0);
  assertSafeLog(logs[0]);
});

test("rate-limit identity prefers Cloudflare's validated header and rejects malformed IPs", () => {
  const cloudflare = new Request("https://www.cybersentinels.com", {
    headers: {
      "cf-connecting-ip": "203.0.113.20",
      "x-forwarded-for": "198.51.100.50, 198.51.100.60",
    },
  });
  assert.equal(getTrustedClientIp(cloudflare), "203.0.113.20");
  const direct = new Request("https://preview.example", {
    headers: { "x-forwarded-for": "198.51.100.50, 198.51.100.60" },
  });
  assert.equal(getTrustedClientIp(direct), "198.51.100.50");
  const malformed = new Request("https://preview.example", {
    headers: { "cf-connecting-ip": "spoofed", "x-forwarded-for": "also-spoofed" },
  });
  assert.equal(getTrustedClientIp(malformed), "unknown");
});

test("HTML workflow redirects cannot leave the current origin", () => {
  const request = new Request("https://www.cybersentinels.com/api/example");
  assert.equal(
    getSafeSameOriginUrl(request, "/dashboard?updated=1", "/dashboard").toString(),
    "https://www.cybersentinels.com/dashboard?updated=1",
  );
  assert.equal(
    getSafeSameOriginUrl(request, "https://attacker.example/phish", "/dashboard").toString(),
    "https://www.cybersentinels.com/dashboard",
  );
  assert.equal(
    getSafeSameOriginUrl(request, "javascript:alert(1)", "/dashboard").toString(),
    "https://www.cybersentinels.com/dashboard",
  );
});

test("Siteverify success fails closed when the response hostname does not match", async () => {
  const previousSecret = process.env.TURNSTILE_SECRET_KEY;
  const previousFetch = globalThis.fetch;
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  globalThis.fetch = async () => Response.json({
    success: true,
    hostname: "unexpected.example",
    challenge_ts: "2026-07-29T10:00:00.000Z",
  });

  try {
    const result = await verifyTurnstileToken(
      "challenge-token",
      "203.0.113.10",
      "www.cybersentinels.com",
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "hostname_mismatch");
    assert.equal(result.hostname, "unexpected.example");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = previousSecret;
  }
});

test("Siteverify success without a valid hostname fails closed", async () => {
  const previousSecret = process.env.TURNSTILE_SECRET_KEY;
  const previousFetch = globalThis.fetch;
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  globalThis.fetch = async () => Response.json({ success: true });

  try {
    const result = await verifyTurnstileToken(
      "challenge-token",
      "203.0.113.10",
      "www.cybersentinels.com",
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "provider_error");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = previousSecret;
  }
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
  assert.match(botProtection, /AbortSignal\.timeout\(10_000\)/);
  assert.match(botProtection, /process\.env\.NODE_ENV !== "production"/);
  assert.doesNotMatch(botProtection, /console\.(?:debug|log)\(/);
});
