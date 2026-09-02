import assert from "node:assert/strict";
import test from "node:test";
import {
  getExpectedTurnstileHostname,
  getTurnstileConfigurationState,
  isOfficialTurnstileTestSecretKey,
  isOfficialTurnstileTestSiteKey,
  verifyTurnstileToken,
} from "../lib/bot-protection.ts";
import { shouldUsePreviewTurnstileFallback } from "../components/turnstile-field.tsx";

const passSiteKey = "1x00000000000000000000AA";
const passSecretKey = "1x0000000000000000000000000000000AA";
const replaySecretKey = "3x0000000000000000000000000000000AA";
const managedKeys = {
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "managed-live-site-key",
  TURNSTILE_SECRET_KEY: "managed-live-secret-key",
};

async function withEnvironment(overrides, action) {
  const names = [
    "NODE_ENV",
    "VERCEL_ENV",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "TURNSTILE_SITE_KEY",
    "TURNSTILE_SECRET_KEY",
    "TURNSTILE_MODE",
    "TURNSTILE_EXPECTED_HOSTNAME",
  ];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const previousFetch = globalThis.fetch;

  for (const name of names) delete process.env[name];
  Object.assign(process.env, overrides);
  try {
    return await action();
  } finally {
    globalThis.fetch = previousFetch;
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}

test("recognises Cloudflare official testing credentials without embedding a runtime credential", () => {
  assert.equal(isOfficialTurnstileTestSiteKey(passSiteKey), true);
  assert.equal(isOfficialTurnstileTestSecretKey(passSecretKey), true);
  assert.equal(isOfficialTurnstileTestSiteKey(managedKeys.NEXT_PUBLIC_TURNSTILE_SITE_KEY), false);
  assert.equal(isOfficialTurnstileTestSecretKey(managedKeys.TURNSTILE_SECRET_KEY), false);
});

test("Preview plus explicit official test configuration verifies through Siteverify", async () => {
  await withEnvironment({
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: passSiteKey,
    TURNSTILE_SECRET_KEY: passSecretKey,
    TURNSTILE_MODE: "preview-test",
    TURNSTILE_EXPECTED_HOSTNAME: "localhost",
  }, async () => {
    globalThis.fetch = async () => Response.json({
      success: true,
      hostname: "localhost",
      challenge_ts: "2026-08-11T10:00:00.000Z",
    });
    assert.deepEqual(getTurnstileConfigurationState(), {
      ok: true,
      mode: "preview-test",
      usesOfficialTestCredentials: true,
    });
    assert.equal(getExpectedTurnstileHostname("pr.example.vercel.app"), "localhost");
    const result = await verifyTurnstileToken("XXXX.DUMMY.TOKEN.XXXX", "203.0.113.8", "localhost");
    assert.equal(result.ok, true);
    assert.equal(result.reason, "verified");
  });
});

test("Preview official test mode accepts the public dummy token without contacting the provider", async () => {
  await withEnvironment({
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: passSiteKey,
    TURNSTILE_SECRET_KEY: passSecretKey,
    TURNSTILE_MODE: "preview-test",
    TURNSTILE_EXPECTED_HOSTNAME: "localhost",
  }, async () => {
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return Response.json({ success: true, hostname: "localhost" });
    };

    const result = await verifyTurnstileToken("XXXX.DUMMY.TOKEN.XXXX", "203.0.113.8", "localhost");
    assert.equal(result.ok, true);
    assert.equal(result.reason, "verified");
    assert.equal(called, false);
  });
});

test("the client preview fallback is enabled only for Preview official test keys", () => {
  assert.equal(shouldUsePreviewTurnstileFallback(passSiteKey, "preview"), true);
  assert.equal(shouldUsePreviewTurnstileFallback(passSiteKey, "production"), false);
  assert.equal(shouldUsePreviewTurnstileFallback("live-site-key", "preview"), false);
});

test("Preview missing configuration is an explicit fail-closed configuration error", async () => {
  await withEnvironment({ NODE_ENV: "production", VERCEL_ENV: "preview" }, async () => {
    assert.equal(getTurnstileConfigurationState().reason, "missing_configuration");
    const result = await verifyTurnstileToken("token", null, "preview.example");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "turnstile_not_configured");
  });
});

test("Production rejects official test credentials before Siteverify", async () => {
  await withEnvironment({
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: passSiteKey,
    TURNSTILE_SECRET_KEY: passSecretKey,
    TURNSTILE_MODE: "preview-test",
    TURNSTILE_EXPECTED_HOSTNAME: "localhost",
  }, async () => {
    let called = false;
    globalThis.fetch = async () => { called = true; return Response.json({ success: true }); };
    const result = await verifyTurnstileToken("token", null, "www.cybersentinels.com");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "turnstile_configuration_invalid");
    assert.equal(called, false);
  });
});

test("Production missing real configuration fails closed", async () => {
  await withEnvironment({ NODE_ENV: "production", VERCEL_ENV: "production" }, async () => {
    const result = await verifyTurnstileToken("token", null, "www.cybersentinels.com");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "turnstile_not_configured");
  });
});

test("invalid token and replayed-token provider results deny", async () => {
  for (const errorCode of ["invalid-input-response", "timeout-or-duplicate"]) {
    await withEnvironment({ ...managedKeys, NODE_ENV: "production", VERCEL_ENV: "preview" }, async () => {
      globalThis.fetch = async () => Response.json({ success: false, "error-codes": [errorCode] });
      const result = await verifyTurnstileToken("token", null, "preview.example");
      assert.equal(result.ok, false);
      assert.equal(result.reason, "invalid_token");
    });
  }
  assert.equal(isOfficialTurnstileTestSecretKey(replaySecretKey), true);
});

test("hostname mismatch denies and provider unavailability fails closed", async () => {
  await withEnvironment({ ...managedKeys, NODE_ENV: "production", VERCEL_ENV: "preview" }, async () => {
    globalThis.fetch = async () => Response.json({ success: true, hostname: "other.example" });
    const mismatch = await verifyTurnstileToken("token", null, "preview.example");
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.reason, "hostname_mismatch");

    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    const unavailable = await verifyTurnstileToken("token", null, "preview.example");
    assert.equal(unavailable.ok, false);
    assert.equal(unavailable.reason, "provider_unavailable");
  });
});

test("Preview test mode defaults to localhost hostname when expected hostname is unset", async () => {
  await withEnvironment({
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: passSiteKey,
    TURNSTILE_SECRET_KEY: passSecretKey,
    TURNSTILE_MODE: "preview-test",
  }, async () => {
    assert.equal(getTurnstileConfigurationState().ok, true);
    assert.equal(getExpectedTurnstileHostname("preview.example"), "localhost");
    globalThis.fetch = async () => Response.json({
      success: true,
      hostname: "localhost",
      challenge_ts: "2026-08-11T10:00:00.000Z",
    });
    const result = await verifyTurnstileToken("XXXX.DUMMY.TOKEN.XXXX", "203.0.113.8", "preview.example");
    assert.equal(result.ok, true);
    assert.equal(result.reason, "verified");
  });
});

test("Preview test mode requires a complete pair and a bounded dummy hostname", async () => {
  await withEnvironment({
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: passSiteKey,
    TURNSTILE_SECRET_KEY: "managed-live-secret-key",
    TURNSTILE_MODE: "preview-test",
    TURNSTILE_EXPECTED_HOSTNAME: "preview.example",
  }, async () => {
    assert.equal(getTurnstileConfigurationState().reason, "test_credentials_incomplete");
  });

  await withEnvironment({
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: passSiteKey,
    TURNSTILE_SECRET_KEY: passSecretKey,
    TURNSTILE_MODE: "preview-test",
    TURNSTILE_EXPECTED_HOSTNAME: "preview.example",
  }, async () => {
    assert.equal(getTurnstileConfigurationState().reason, "test_hostname_invalid");
  });
});
