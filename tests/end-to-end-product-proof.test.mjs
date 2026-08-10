import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Turnstile verification is bound to the actual request hostname", async () => {
  const route = await read("app/api/auth/turnstile/route.ts");
  assert.match(route, /requestHostname = new URL\(req\.url\)\.hostname/);
  assert.match(route, /process\.env\.VERCEL_ENV === "preview"/);
  assert.match(route, /\["localhost", "example\.com"\]\.includes\(configuredPreviewHostname\)/);
  assert.match(route, /verifyTurnstileToken\([\s\S]*expectedHostname/);
  assert.match(route, /x-correlation-id/);
  assert.doesNotMatch(route, /turnstileToken[^\n]*console/);
});

test("normal login and auth recovery enter the canonical Operational Entity product", async () => {
  const [login, callback, browser, server] = await Promise.all([
    read("app/login/page.tsx"), read("app/auth/callback/route.ts"),
    read("lib/supabase/client.ts"), read("lib/supabase/server.ts"),
  ]);
  assert.match(login, /return "\/operational-entities"/);
  assert.match(callback, /return "\/operational-entities"/);
  assert.match(browser, /next=\/operational-entities/);
  assert.match(server, /next=\/operational-entities/);
});

test("first-run initialization creates authority but never fabricates identity evidence or an ALLOW", async () => {
  const onboarding = await read("lib/onboarding/controlled-agent-alpha.ts");
  assert.match(onboarding, /registerCanonicalNativeAgent/);
  assert.match(onboarding, /requiredEvidenceTypes: \["NATIVE_ENTITY_IDENTITY_PROOF"\]/);
  assert.match(onboarding, /permittedScope: \["read_repository"\]/);
  assert.doesNotMatch(onboarding, /native_entity_identity_evidence/);
  assert.doesNotMatch(onboarding, /decision:\s*"ALLOW"/);
});

test("portable canonical receipts are tenant-authenticated, minimized and downloadable", async () => {
  const route = await read("app/api/trust/transactions/[transactionId]/receipt/route.ts");
  assert.match(route, /loadCanonicalTrustTransactionHistory/);
  assert.match(route, /AUTHENTICATION_REQUIRED/);
  assert.match(route, /content-disposition/);
  assert.match(route, /decisionDigest/);
  for (const secret of ["accessToken", "refreshToken", "privateKey", "password"]) {
    assert.ok(!route.includes(`${secret}:`), `${secret} must not be exported`);
  }
});

test("browser proof covers fresh login, continuity, ALLOW, DENY, Replay, receipt, logout and returning user on desktop and mobile", async () => {
  const [spec, config] = await Promise.all([
    read("tests/e2e/product-proof.spec.ts"), read("playwright.config.ts"),
  ]);
  for (const proof of ["PRODUCT_PROOF_E2E_REFUSES_PRODUCTION", "x-vercel-set-bypass-cookie", "Check your email to verify your account before continuing.", "updateUserById", "signIn", "Create controlled Agent Alpha", "VERIFY AGENT ALPHA", '\"decision\": \"ALLOW\"', "native-allow.png", "CHANGE RUNTIME + TEST DENY", '\"decision\": \"DENY\"', "native-deny.png", "Replay written", "Download receipt JSON", "canonical-receipt.png", "/api/auth/logout", "Trust Memory materiality", "returning-user-proof.png"]) {
    assert.ok(spec.includes(proof), `missing E2E proof: ${proof}`);
  }
  assert.match(config, /desktop-chromium/);
  assert.match(config, /mobile-chromium/);
});
