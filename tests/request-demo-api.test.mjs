import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRequestDemoHandler } from "../lib/request-demo.ts";

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
  assert.deepEqual(
    Object.keys(log.fields).sort(),
    [
      "correlationId",
      "operation",
      "internalCode",
      ...(log.fields.providerCode ? ["providerCode"] : []),
      "errorName",
    ].sort(),
  );
  assert.doesNotMatch(
    JSON.stringify(log),
    /test@example\.com|Test Person|Example Company|verified-token|203\.0\.113\.10|service-role-key/,
  );
}

test("Request Demo frontend appends the Turnstile callback token to FormData", async () => {
  const page = await readFile(new URL("../app/enterprise-access/page.tsx", import.meta.url), "utf8");
  const field = await readFile(new URL("../components/turnstile-field.tsx", import.meta.url), "utf8");
  const botProtection = await readFile(new URL("../lib/bot-protection.ts", import.meta.url), "utf8");
  assert.match(page, /<EnterpriseAccessForm buttonLabel=\{buttonLabel\} designPartner=\{designPartner\}/);
  assert.match(field, /process\.env\.NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
  assert.match(field, /turnstile\.render\(containerRef\.current/);
  assert.match(field, /callback: \(token\) => onTokenChange\?\.\(token\)/);
  assert.match(field, /formData\.append\("cf-turnstile-response", turnstileToken\)/);
  assert.match(field, /fetch\("\/api\/enterprise-access"/);
  assert.match(field, /disabled=\{!turnstileToken \|\| submitting\}/);
  assert.match(
    botProtection,
    /getTurnstileTokenFromForm\(formData: FormData\) \{\s+return String\(formData\.get\("cf-turnstile-response"\) \?\? ""\)\.trim\(\);/,
  );
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
    verifyTurnstile: async () => ({ ok: false, reason: "invalid_token" }),
  });
  const response = await handler(request(), correlationId);
  await assertFailure(response, 400, "REQUEST_DEMO_TURNSTILE_FAILED");
  assert.equal(logs[0].fields.providerCode, "invalid_token");
  assertSafeLog(logs[0]);
});

for (const reason of ["provider_unavailable", "provider_error"]) {
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
