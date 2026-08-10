import assert from "node:assert/strict";
import test from "node:test";
import { handleAuthCallback } from "../lib/auth/callback-handler.ts";
import {
  DEFAULT_AUTH_REDIRECT,
  resolveSafeInternalRedirect,
} from "../lib/auth/safe-redirect.ts";

const origin = "https://preview.cybersentinels.example";

function callbackRequest({ code = "valid-test-code", next } = {}) {
  const url = new URL("/auth/callback", origin);
  if (code !== null) url.searchParams.set("code", code);
  if (next !== undefined) url.searchParams.set("next", next);
  return new Request(url);
}

function callbackDependencies({ exchangeError = null, throwOnCreate = false } = {}) {
  const issues = [];
  return {
    issues,
    dependencies: {
      async createClient(headers) {
        if (throwOnCreate) throw new Error("test client unavailable");
        headers.set("Set-Cookie", "sb-test-auth=rotated; Path=/; HttpOnly; Secure; SameSite=Lax");
        return {
          auth: {
            async exchangeCodeForSession() {
              return { error: exchangeError };
            },
          },
        };
      },
      captureOperationalIssue(...args) {
        issues.push(args);
      },
    },
  };
}

function assertSameOriginLocation(response) {
  const location = response.headers.get("location");
  assert.ok(location, "callback response must include a Location header");
  const finalUrl = new URL(location);
  assert.equal(finalUrl.origin, origin);
  return finalUrl;
}

test("same-origin redirect preserves valid application-relative paths", () => {
  for (const path of [
    "/operational-entities",
    "/trust/transactions/123",
    "/dashboard?tab=trust",
    "/developers/api-keys",
    "/path#section",
  ]) {
    const resolved = resolveSafeInternalRedirect(path, origin);
    assert.equal(resolved, path);
    assert.equal(new URL(resolved, origin).origin, origin);
  }
});

test("backslash open redirect payloads fall back to a same-origin path", () => {
  for (const attack of [
    "/\\evil.com",
    "/\\\\evil.com",
    "\\evil.com",
    "\\\\evil.com",
    "/\\evil.com/path",
    "/\\/evil.com",
    "/path\\..\\evil.com",
  ]) {
    assert.equal(resolveSafeInternalRedirect(attack, origin), DEFAULT_AUTH_REDIRECT);
  }
});

test("network-path rejection covers slash and mixed-separator authorities", () => {
  for (const attack of ["//evil.com", "///evil.com", "//evil.com/path", "/\\evil.com"]) {
    assert.equal(resolveSafeInternalRedirect(attack, origin), DEFAULT_AUTH_REDIRECT);
  }
});

test("scheme rejection blocks absolute and executable URL forms", () => {
  for (const attack of [
    "https://evil.com",
    "http://evil.com",
    "javascript:alert(1)",
    "data:text/html,test",
  ]) {
    assert.equal(resolveSafeInternalRedirect(attack, origin), DEFAULT_AUTH_REDIRECT);
  }
});

test("encoded redirect attacks are rejected at one stable normalization boundary", () => {
  for (const attack of [
    "/%5Cevil.com",
    "/%5cevil.com",
    "/%2Fevil.com",
    "/%2fevil.com",
    "/%5C%5Cevil.com",
    "/%2F%2Fevil.com",
    "/%255Cevil.com",
    "/%252Fevil.com",
    "/%25252Fevil.com",
    "/%0devil.com",
    "/%0Aevil.com",
    "/%250devil.com",
    "/%",
    "/%GG",
  ]) {
    assert.equal(resolveSafeInternalRedirect(attack, origin), DEFAULT_AUTH_REDIRECT);
  }
});

test("same-origin redirect rejects whitespace and control-character variants", () => {
  for (const attack of [
    " /operational-entities",
    "/operational-entities ",
    "\t/operational-entities",
    "/operational-entities\r\nLocation: https://evil.com",
    "/operational-entities\u0000",
    "/operational-entities\u007f",
  ]) {
    assert.equal(resolveSafeInternalRedirect(attack, origin), DEFAULT_AUTH_REDIRECT);
  }
});

test("GET callback blocks /\\evil.com after a successful PKCE exchange", async () => {
  const { dependencies } = callbackDependencies();
  const response = await handleAuthCallback(
    callbackRequest({ next: "/\\evil.com" }),
    dependencies,
  );
  const finalUrl = assertSameOriginLocation(response);
  assert.equal(finalUrl.pathname, DEFAULT_AUTH_REDIRECT);
  assert.match(response.headers.get("set-cookie") ?? "", /sb-test-auth=rotated/);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
});

test("GET callback preserves a valid same-origin next path", async () => {
  const { dependencies } = callbackDependencies();
  const response = await handleAuthCallback(
    callbackRequest({ next: "/trust/transactions/123?view=evidence#decision" }),
    dependencies,
  );
  const finalUrl = assertSameOriginLocation(response);
  assert.equal(finalUrl.pathname, "/trust/transactions/123");
  assert.equal(finalUrl.search, "?view=evidence");
  assert.equal(finalUrl.hash, "#decision");
});

test("callback error-path redirect safety rejects malicious next when code is missing", async () => {
  const { dependencies } = callbackDependencies();
  const response = await handleAuthCallback(
    callbackRequest({ code: null, next: "/\\evil.com" }),
    dependencies,
  );
  const finalUrl = assertSameOriginLocation(response);
  assert.equal(finalUrl.pathname, "/login");
  assert.equal(finalUrl.searchParams.get("next"), DEFAULT_AUTH_REDIRECT);
  assert.equal(finalUrl.searchParams.get("error"), "missing_verification_code");
});

test("callback error-path redirect safety rejects malicious next when PKCE exchange fails", async () => {
  const { dependencies, issues } = callbackDependencies({ exchangeError: new Error("invalid code") });
  const response = await handleAuthCallback(
    callbackRequest({ next: "/%255Cevil.com" }),
    dependencies,
  );
  const finalUrl = assertSameOriginLocation(response);
  assert.equal(finalUrl.pathname, "/login");
  assert.equal(finalUrl.searchParams.get("next"), DEFAULT_AUTH_REDIRECT);
  assert.equal(finalUrl.searchParams.get("error"), "verification_failed");
  assert.equal(issues.length, 1);
});

test("callback error-path redirect safety survives an unavailable auth client", async () => {
  const { dependencies, issues } = callbackDependencies({ throwOnCreate: true });
  const response = await handleAuthCallback(
    callbackRequest({ next: "//evil.com" }),
    dependencies,
  );
  const finalUrl = assertSameOriginLocation(response);
  assert.equal(finalUrl.pathname, "/login");
  assert.equal(finalUrl.searchParams.get("next"), DEFAULT_AUTH_REDIRECT);
  assert.equal(issues.length, 1);
});
