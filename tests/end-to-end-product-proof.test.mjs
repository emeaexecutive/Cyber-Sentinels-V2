import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Turnstile verification is bound to the actual request hostname", async () => {
  const [route, verifier] = await Promise.all([
    read("app/api/auth/turnstile/route.ts"),
    read("lib/bot-protection.ts"),
  ]);
  assert.match(route, /requestHostname = new URL\(req\.url\)\.hostname/);
  assert.match(route, /getExpectedTurnstileHostname\(requestHostname\)/);
  assert.match(verifier, /process\.env\.VERCEL_ENV === "production"/);
  assert.match(verifier, /process\.env\.VERCEL_ENV !== "preview"/);
  assert.match(verifier, /officialTestHostnames = new Set\(\["localhost", "example\.com"\]\)/);
  assert.match(route, /verifyTurnstileToken\([\s\S]*expectedHostname/);
  assert.match(route, /x-correlation-id/);
  assert.doesNotMatch(route, /turnstileToken[^\n]*console/);
});

test("normal login and auth recovery enter the canonical Operational Entity product", async () => {
  const [login, callback, redirect, browser, server, layout] = await Promise.all([
    read("app/login/page.tsx"), read("app/auth/callback/route.ts"),
    read("lib/auth/safe-redirect.ts"),
    read("lib/supabase/client.ts"), read("lib/supabase/server.ts"), read("app/layout.tsx"),
  ]);
  assert.match(login, /resolveSafeInternalRedirect/);
  assert.match(callback, /handleAuthCallback/);
  assert.match(redirect, /DEFAULT_AUTH_REDIRECT = "\/operational-entities"/);
  assert.match(browser, /next=\/operational-entities/);
  assert.match(server, /next=\/operational-entities/);
  assert.match(login, /supabase\.auth\.getUser\(\)/);
  assert.match(layout, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(layout, /supabase\.auth\.getSession\(\)/);
});

test("email signup requires verification and permits only explicit local and Vercel callbacks", async () => {
  const [config, login] = await Promise.all([
    read("supabase/config.toml"), read("app/login/page.tsx"),
  ]);
  assert.match(config, /site_url = "https:\/\/www\.cybersentinels\.com"/);
  assert.match(config, /https:\/\/\*-keith-speres-projects\.vercel\.app\/auth\/callback/);
  assert.match(config, /\[auth\.email\][\s\S]*enable_confirmations = true/);
  assert.match(login, /if \(data\.session\?\.user\)[\s\S]*router\.replace\(nextPath\)/);
});

test("first-run initialization creates authority but never fabricates identity evidence or an ALLOW", async () => {
  const onboarding = await read("lib/onboarding/controlled-agent-alpha.ts");
  assert.match(onboarding, /registerCanonicalNativeAgent/);
  assert.match(onboarding, /const db = createServiceRoleClient\(\)[\s\S]*ownedWorkspace\(db, input\.user\)/);
  assert.match(onboarding, /requiredEvidenceTypes: \["NATIVE_ENTITY_IDENTITY_PROOF"\]/);
  assert.match(onboarding, /permittedScope: \["read_repository"\]/);
  assert.match(onboarding, /displayReference: "Agent Beta"/);
  assert.match(onboarding, /permittedTargets: \["repository:a", "repository:b"\]/);
  assert.match(onboarding, /canDelegate: true/);
  assert.match(onboarding, /maximumDelegationDepth: 1/);
  assert.doesNotMatch(onboarding, /native_entity_identity_evidence/);
  assert.doesNotMatch(onboarding, /decision:\s*"ALLOW"/);
});

test("portable canonical receipts are tenant-authenticated, minimized and downloadable", async () => {
  const route = await read("app/api/trust/transactions/[transactionId]/receipt/route.ts");
  assert.match(route, /loadCanonicalTrustTransactionHistory/);
  assert.match(route, /AUTHENTICATION_REQUIRED/);
  assert.match(route, /content-disposition/);
  assert.match(route, /decisionDigest/);
  assert.match(route, /delegationReference/);
  assert.match(route, /parentAuthorityReference/);
  for (const secret of ["accessToken", "refreshToken", "privateKey", "password"]) {
    assert.ok(!route.includes(`${secret}:`), `${secret} must not be exported`);
  }
});

test("browser proof covers the persisted Alpha to Beta journey on desktop and mobile", async () => {
  const [spec, config] = await Promise.all([
    read("tests/e2e/product-proof.spec.ts"), read("playwright.config.ts"),
  ]);
  for (const proof of ["PRODUCT_PROOF_E2E_REFUSES_PRODUCTION", "x-vercel-set-bypass-cookie", "Check your email to verify your account before continuing.", "updateUserById", "signIn", "Continue with canonical Alpha and Beta", "verify-alpha", "verify-beta", "create-delegation", "beta-read", "beta-write", "ACTION_OUT_OF_DELEGATED_SCOPE", "revoke-alpha", "beta-read-revoked", "PARENT_AUTHORITY_REVOKED", "alpha-beta-identity.png", "alpha-beta-delegation.png", "beta-read-allow.png", "beta-write-deny.png", "authority-revoked.png", "canonical-receipt.png", "/api/auth/logout", "Trust Memory materiality", "returning-user-proof.png"]) {
    assert.ok(spec.includes(proof), `missing E2E proof: ${proof}`);
  }
  assert.match(config, /desktop-chromium/);
  assert.match(config, /mobile-chromium/);
});

test("authentication Replay and Continuous Trust evidence writes satisfy their canonical persistence contracts", async () => {
  const [writer, authReplay, migration, consensusRepair, optionalLegacyPointer] = await Promise.all([
    read("lib/replay/replay-writer.ts"),
    read("lib/auth/auth-replay-events.ts"),
    read("supabase/migrations/202608100003_alpha_beta_persistence_repairs.sql"),
    read("supabase/migrations/202608100004_continuous_trust_legacy_consensus_fk_repair.sql"),
    read("supabase/migrations/202608100005_optional_legacy_consensus_pointer.sql"),
  ]);
  assert.match(writer, /owner_user_id: item\.ownerUserId \?\? null/);
  assert.match(authReplay, /ownerUserId: input\.user\.id/);
  assert.match(migration, /project_continuous_trust_signal_v1/);
  assert.match(migration, /observed_at,freshness_policy_seconds/);
  assert.match(migration, /signal\.observed_at,3600/);
  assert.match(consensusRepair, /select decision_id into legacy_consensus_decision/);
  assert.match(consensusRepair, /current_decision_id,domain_key,current_state_decision_id/);
  assert.match(consensusRepair, /legacy_consensus_decision,p_decision->>'domainKey',decision/);
  assert.match(optionalLegacyPointer, /alter column current_decision_id drop not null/);
  assert.match(optionalLegacyPointer, /current_state_decision_id/);
});
