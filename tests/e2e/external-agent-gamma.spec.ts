import { spawn } from "node:child_process";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const vercelAutomationBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
const vercelProtectionCookie = process.env.VERCEL_PROTECTION_COOKIE ?? "";
const configured = Boolean(baseURL && supabaseUrl && serviceRoleKey);
const productionSupabaseReference = "kecgtsfibkypjuaxqbjx";
const password = "GammaProof!2026-OnlyForTest";

if (configured) {
  const applicationHostname = new URL(baseURL).hostname.toLowerCase();
  const supabaseHostname = new URL(supabaseUrl).hostname.toLowerCase();
  if (applicationHostname === "cybersentinels.com" || applicationHostname.endsWith(".cybersentinels.com") || supabaseHostname.includes(productionSupabaseReference)) {
    throw new Error("GAMMA_E2E_REFUSES_PRODUCTION");
  }
}

test.describe.configure({ mode: "serial" });
test.skip(!configured, "A non-Production E2E URL and Supabase project are required.");

let admin: SupabaseClient;
let userId = "";
let otherUserId = "";
let email = "";
let otherEmail = "";

async function signIn(page: Page, accountEmail = email) {
  await page.goto("/login");
  const rejectOptional = page.getByRole("button", { name: "Reject Optional", exact: true });
  if (await rejectOptional.isVisible().catch(() => false)) await rejectOptional.click();
  await page.getByLabel("Email", { exact: true }).fill(accountEmail);
  await page.getByPlaceholder("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await page.waitForURL("**/operational-entities");
}

async function establishProtectedPreviewSession(page: Page) {
  if (vercelProtectionCookie) {
    const target = new URL(baseURL);
    await page.context().addCookies([{ name: "_vercel_jwt", value: vercelProtectionCookie, domain: target.hostname, path: "/", httpOnly: true, secure: true, sameSite: "Lax" }]);
    return;
  }
  if (!vercelAutomationBypassSecret) return;
  const target = new URL("/login", baseURL);
  target.searchParams.set("x-vercel-set-bypass-cookie", "true");
  const response = await page.request.get(target.toString(), { headers: { "x-vercel-protection-bypass": vercelAutomationBypassSecret } });
  expect(response.ok()).toBeTruthy();
}

async function runGamma(apiKey: string) {
  const cwd = join(process.cwd(), "examples", "agent-gamma");
  return await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ["gamma.mjs"], {
      cwd,
      env: {
        ...process.env,
        CYBER_SENTINELS_API_KEY: apiKey,
        CYBER_SENTINELS_BASE_URL: baseURL,
        GAMMA_RUN_ATTACKS: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; if (stdout.length > 250_000) child.kill(); });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; if (stderr.length > 100_000) child.kill(); });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function runPowerShellGamma(apiKey: string) {
  const executable = process.platform === "win32" ? "powershell.exe" : "pwsh";
  const script = join(process.cwd(), "examples", "powershell", "agent-gamma.ps1");
  const args = ["-NoLogo", "-NoProfile", "-NonInteractive", ...(process.platform === "win32" ? ["-ExecutionPolicy", "Bypass"] : []), "-File", script];
  return await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: process.cwd(),
      env: { ...process.env, CYBER_SENTINELS_API_KEY: apiKey, CYBER_SENTINELS_BASE_URL: baseURL },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; if (stdout.length > 250_000) child.kill(); });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; if (stderr.length > 100_000) child.kill(); });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function marker(output: string, name: string) {
  const line = output.split(/\r?\n/).find((candidate) => candidate.startsWith(`${name}: `));
  if (!line) throw new Error(`Gamma did not emit ${name}.`);
  return JSON.parse(line.slice(name.length + 2)) as Record<string, unknown>;
}

async function publicRequest(path: string, apiKey: string, init: RequestInit = {}) {
  return fetch(new URL(path, baseURL), {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(vercelAutomationBypassSecret ? { "x-vercel-protection-bypass": vercelAutomationBypassSecret } : {}),
      ...(init.headers ?? {}),
    },
  });
}

test.beforeAll(async () => {
  admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  email = `gamma-proof-${crypto.randomUUID()}@cybersentinels.com`;
  otherEmail = `gamma-other-tenant-${crypto.randomUUID()}@cybersentinels.com`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  const otherCreated = await admin.auth.admin.createUser({ email: otherEmail, password, email_confirm: true });
  if (otherCreated.error) throw otherCreated.error;
  otherUserId = otherCreated.data.user.id;
});

test.afterAll(async () => {
  if (admin && userId) await admin.auth.admin.deleteUser(userId);
  if (admin && otherUserId) await admin.auth.admin.deleteUser(otherUserId);
});

test("Agent Gamma completes the public SDK journey as a separate process and attacks fail closed", async ({ page, browser }, testInfo) => {
  test.setTimeout(600_000);
  await establishProtectedPreviewSession(page);
  await signIn(page);

  await expect(page.getByRole("heading", { name: "Every consequential entity and action is grounded in one canonical runtime." })).toBeVisible();
  const initializer = page.getByRole("button", { name: "Continue with canonical Alpha and Beta" });
  await expect(initializer).toBeVisible();
  await initializer.click();
  await page.waitForURL("**/operational-entities/**");
  await page.goto("/operational-entities");
  const alphaHref = await page.locator("article", { hasText: "Agent Alpha" }).getByRole("link", { name: "View persisted trust record" }).getAttribute("href");
  const betaHref = await page.locator("article", { hasText: "Agent Beta" }).getByRole("link", { name: "View persisted trust record" }).getAttribute("href");
  const alphaId = decodeURIComponent(alphaHref?.split("/").at(-1) ?? "");
  const betaId = decodeURIComponent(betaHref?.split("/").at(-1) ?? "");
  expect(alphaId).toMatch(/^agent-alpha:[0-9a-f-]{36}$/i);
  expect(betaId).toMatch(/^agent-beta:[0-9a-f-]{36}$/i);

  await page.goto("/developers/api-keys");
  await expect(page.getByRole("heading", { name: "Create API client" })).toBeVisible();
  await page.getByPlaceholder("Agent Gamma staging").fill("Agent Gamma live proof");
  const createdResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/developer/api-keys") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create and reveal once" }).click();
  const createdResponse = await createdResponsePromise;
  expect(createdResponse.status()).toBe(201);
  const tenantId = createdResponse.request().headers()["x-enterprise-id"];
  const createdBody = await createdResponse.json() as { api_key: string; key: { id: string } };
  const apiKey = createdBody.api_key;
  expect(apiKey).toMatch(/^cs_test_/);
  expect(tenantId).toMatch(/^[0-9a-f-]{36}$/i);
  await expect(page.getByText("SECRET SHOWN ONCE", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("SECRET SHOWN ONCE", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Agent Gamma live proof", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("gamma-api-key-created.png"), fullPage: true });

  const gamma = await runGamma(apiKey);
  expect(gamma.code, `${gamma.stdout}\n${gamma.stderr}`.replaceAll(apiKey, "[REDACTED]")).toBe(0);
  for (const name of ["REGISTERED", "CREDENTIAL", "MANIFEST", "IDENTITY", "AUTHORITY", "ALLOW", "DENY", "TRANSACTION", "REPLAY", "RECEIPT", "OUTCOME", "ATTACKS", "PERFORMANCE", "GAMMA_RESULT"]) marker(gamma.stdout, name);
  expect(marker(gamma.stdout, "IDENTITY").identity).toBe("VERIFIED");
  expect(marker(gamma.stdout, "ALLOW").decision).toBe("ALLOW");
  expect(marker(gamma.stdout, "DENY").decision).toBe("DENY");
  expect(marker(gamma.stdout, "OUTCOME")).toMatchObject({ evidence_independence: "AGENT_ASSERTED", independent_destination_evidence: false });
  expect(marker(gamma.stdout, "ATTACKS")).toEqual({ challenge_replay: "REJECTED", wrong_private_key: "REJECTED" });
  expect(marker(gamma.stdout, "GAMMA_RESULT")).toBe("PUBLIC_API_ONLY_END_TO_END_COMPLETE");

  const powershellGamma = await runPowerShellGamma(apiKey);
  expect(powershellGamma.code, `${powershellGamma.stdout}\n${powershellGamma.stderr}`.replaceAll(apiKey, "[REDACTED]")).toBe(0);
  for (const name of ["PREFLIGHT", "REGISTERED", "CREDENTIAL", "MANIFEST", "IDENTITY", "CHALLENGE_REPLAY", "AUTHORITY", "ALLOW", "IDEMPOTENCY", "DENY", "TRANSACTION", "REPLAY", "RECEIPT", "TRUST_STATE", "OUTCOME", "GAMMA_RESULT"]) marker(powershellGamma.stdout, name);
  expect(marker(powershellGamma.stdout, "IDENTITY").identity).toBe("VERIFIED");
  expect(marker(powershellGamma.stdout, "ALLOW").decision).toBe("ALLOW");
  expect(marker(powershellGamma.stdout, "DENY").decision).toBe("DENY");
  expect(marker(powershellGamma.stdout, "IDEMPOTENCY").idempotent_replay).toBe(true);
  expect(marker(powershellGamma.stdout, "CHALLENGE_REPLAY").result).toBe("REJECTED");
  expect(marker(powershellGamma.stdout, "GAMMA_RESULT")).toBe("PUBLIC_HTTPS_API_ONLY_END_TO_END_COMPLETE");

  const registered = marker(gamma.stdout, "REGISTERED");
  const allowed = marker(gamma.stdout, "ALLOW");
  const transactionId = String(allowed.transaction_id);
  const agentId = String(registered.agent_id);

  for (const protectedId of [alphaId, betaId]) {
    const claim = await publicRequest(`/api/v1/agents/${encodeURIComponent(protectedId)}/challenge`, apiKey, { method: "POST", body: "{}" });
    expect([403, 404]).toContain(claim.status);
  }
  const wrongKey = await publicRequest(`/api/v1/trust/transactions/${transactionId}`, "cs_test_invalid-secret");
  expect(wrongKey.status).toBe(401);
  const callerClaimsTenant = await publicRequest("/api/v1/agents", apiKey, { method: "POST", body: JSON.stringify({ display_name: "Attack", entity_type: "AI_AGENT", owner_reference: "owner:attack", runtime: { environment: "staging", framework: "custom" }, model: { provider: "declared", identifier: "declared" }, tenant_id: tenantId }) });
  expect(callerClaimsTenant.status).toBe(400);
  for (const forged of [{ verified: true }, { trust_state: "VERIFIED" }, { decision: "ALLOW" }]) {
    const idempotencyKey = `gamma-forged-${crypto.randomUUID()}`;
    const callerClaimsDecision = await publicRequest("/api/v1/trust/decisions", apiKey, { method: "POST", headers: { "idempotency-key": idempotencyKey }, body: JSON.stringify({ operational_entity_id: agentId, action: { type: "read_repository", target: "repository:a", purpose: "attack", environment: "staging" }, idempotency_key: idempotencyKey, ...forged }) });
    expect(callerClaimsDecision.status).toBe(400);
  }

  const wrongCredentialChallenge = await publicRequest(`/api/v1/agents/${encodeURIComponent(agentId)}/challenge`, apiKey, { method: "POST", body: "{}" });
  expect(wrongCredentialChallenge.status).toBe(201);
  const wrongCredential = await publicRequest(`/api/v1/agents/${encodeURIComponent(agentId)}/proof`, apiKey, { method: "POST", body: JSON.stringify({ challenge_id: "challenge:wrong", credential_id: "credential:wrong", signature: "a".repeat(86), signed_payload: { signing_key_id: "wrong" } }) });
  expect(wrongCredential.status).toBe(409);

  const scopedKeyResponse = await page.request.post("/api/developer/api-keys", { headers: { "x-enterprise-id": tenantId }, data: { label: "Wrong scope proof", environment: "test", scopes: ["agents:write"] } });
  expect(scopedKeyResponse.status()).toBe(201);
  const scopedKeyBody = await scopedKeyResponse.json() as { api_key: string; key: { id: string } };
  const wrongScope = await publicRequest(`/api/v1/trust/transactions/${transactionId}`, scopedKeyBody.api_key);
  expect(wrongScope.status).toBe(403);

  const revokedResponse = await page.request.patch("/api/developer/api-keys", { headers: { "x-enterprise-id": tenantId }, data: { key_id: scopedKeyBody.key.id, action: "revoke" } });
  expect(revokedResponse.ok()).toBeTruthy();
  const revoked = await publicRequest("/api/v1/agents", scopedKeyBody.api_key, { method: "POST", body: "{}" });
  expect(revoked.status).toBe(401);

  const expiresAt = new Date(Date.now() + 2_000).toISOString();
  const expiringResponse = await page.request.post("/api/developer/api-keys", { headers: { "x-enterprise-id": tenantId }, data: { label: "Expiry proof", environment: "test", scopes: ["trust:read"], expires_at: expiresAt } });
  expect(expiringResponse.status()).toBe(201);
  const expiringBody = await expiringResponse.json() as { api_key: string };
  await new Promise((resolve) => setTimeout(resolve, 2_500));
  const expired = await publicRequest(`/api/v1/trust/transactions/${transactionId}`, expiringBody.api_key);
  expect(expired.status).toBe(401);

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await establishProtectedPreviewSession(otherPage);
  await signIn(otherPage, otherEmail);
  const otherInitializer = otherPage.getByRole("button", { name: "Continue with canonical Alpha and Beta" });
  await expect(otherInitializer).toBeVisible();
  await otherInitializer.click();
  await otherPage.waitForURL("**/operational-entities/**");
  await otherPage.goto("/developers/api-keys");
  const otherCreatePromise = otherPage.waitForResponse((response) => response.url().endsWith("/api/developer/api-keys") && response.request().method() === "POST");
  await otherPage.getByPlaceholder("Agent Gamma staging").fill("Cross-tenant denial proof");
  await otherPage.getByRole("button", { name: "Create and reveal once" }).click();
  const otherCreateResponse = await otherCreatePromise;
  expect(otherCreateResponse.status()).toBe(201);
  const otherTenantId = otherCreateResponse.request().headers()["x-enterprise-id"];
  const otherKeyBody = await otherCreateResponse.json() as { api_key: string; key: { id: string } };
  for (const path of [
    `/api/v1/trust/transactions/${transactionId}`,
    `/api/v1/trust/transactions/${transactionId}/replay`,
    `/api/v1/trust/transactions/${transactionId}/receipt`,
  ]) {
    const crossTenantRead = await publicRequest(path, otherKeyBody.api_key);
    expect(crossTenantRead.status).toBe(404);
  }
  const revokeOtherKey = await otherPage.request.patch("/api/developer/api-keys", { headers: { "x-enterprise-id": otherTenantId }, data: { key_id: otherKeyBody.key.id, action: "revoke" } });
  expect(revokeOtherKey.ok()).toBeTruthy();
  await otherContext.close();

  await page.goto(`/trust/transactions/${transactionId}`);
  await expect(page.getByText("Canonical trust transaction", { exact: true })).toBeVisible();
  await expect(page.getByText("ALLOW", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("gamma-canonical-transaction.png"), fullPage: true });

  const revokeProofKey = await page.request.patch("/api/developer/api-keys", { headers: { "x-enterprise-id": tenantId }, data: { key_id: createdBody.key.id, action: "revoke" } });
  expect(revokeProofKey.ok()).toBeTruthy();
});
