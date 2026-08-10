import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const vercelProtectionBypass = process.env.VERCEL_PROTECTION_BYPASS ?? "";
const vercelProtectionCookie = process.env.VERCEL_PROTECTION_COOKIE ?? "";
const configured = Boolean(baseURL && supabaseUrl && serviceRoleKey);
const productionSupabaseReference = "kecgtsfibkypjuaxqbjx";

function assertNonProductionTargets() {
  const applicationHostname = new URL(baseURL).hostname.toLowerCase();
  const supabaseHostname = new URL(supabaseUrl).hostname.toLowerCase();
  if (
    applicationHostname === "cybersentinels.com" ||
    applicationHostname.endsWith(".cybersentinels.com") ||
    supabaseHostname.includes(productionSupabaseReference)
  ) {
    throw new Error("PRODUCT_PROOF_E2E_REFUSES_PRODUCTION");
  }
}

if (configured) assertNonProductionTargets();

test.describe.configure({ mode: "serial" });
test.skip(!configured, "A non-Production E2E URL and Supabase project are required.");

let admin: SupabaseClient;
let userId = "";
let email = "";
const password = "ProductProof!2026-OnlyForTest";

async function waitForTurnstile(page: Page) {
  const widget = page.locator(".cf-turnstile");
  if (!(await widget.isVisible().catch(() => false))) return;
  await expect.poll(
    async () => page.locator('input[name="cf-turnstile-response"]').inputValue().catch(() => ""),
    { timeout: 30_000, message: "Preview Turnstile did not issue a browser token." },
  ).not.toBe("");
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByPlaceholder("Password", { exact: true }).fill(password);
  await waitForTurnstile(page);
  const button = page.getByRole("button", { name: "Sign in", exact: true }).last();
  await expect(button).toBeEnabled();
  await button.click();
  await page.waitForURL("**/operational-entities");
}

async function settleConsent(page: Page) {
  const rejectOptional = page.getByRole("button", { name: "Reject Optional", exact: true });
  if (await rejectOptional.isVisible().catch(() => false)) await rejectOptional.click();
}

async function establishProtectedPreviewSession(page: Page) {
  if (vercelProtectionCookie) {
    const target = new URL(baseURL);
    await page.context().addCookies([{
      name: "_vercel_jwt",
      value: vercelProtectionCookie,
      domain: target.hostname,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    }]);
    return;
  }
  if (!vercelProtectionBypass) return;
  const target = new URL("/login", baseURL);
  target.searchParams.set("x-vercel-set-bypass-cookie", "true");
  const response = await page.request.get(target.toString(), {
    headers: { "x-vercel-protection-bypass": vercelProtectionBypass },
  });
  expect(response.ok()).toBeTruthy();
}

test.beforeAll(async () => {
  admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  email = `product-proof-${crypto.randomUUID()}@example.test`;
});

test.afterAll(async () => {
  if (admin && userId) await admin.auth.admin.deleteUser(userId);
});

test("new and returning users complete a provider-free trust transaction from login to receipt", async ({ page, context }, testInfo) => {
  await establishProtectedPreviewSession(page);
  await page.goto("/login");
  await settleConsent(page);
  await expect(page.getByText("No active session found.", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("login.png"), fullPage: true });
  await page.getByRole("button", { name: "Create account", exact: true }).first().click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByPlaceholder("Password", { exact: true }).fill(password);
  await page.getByPlaceholder("Confirm password", { exact: true }).fill(password);
  await waitForTurnstile(page);
  await page.getByRole("button", { name: "Create account", exact: true }).last().click();
  await expect(page.getByRole("status").filter({ hasText: "Check your email to verify" }))
    .toHaveText("Check your email to verify your account before continuing.", { timeout: 30_000 });

  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1_000 });
  if (users.error) throw users.error;
  const createdUser = users.data.users.find((user) => user.email === email);
  if (!createdUser) throw new Error("Preview signup user was not persisted.");
  userId = createdUser.id;
  const confirmed = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (confirmed.error) throw confirmed.error;
  await page.goto("/api/auth/logout");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Every consequential entity and action is grounded in one canonical runtime." })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("product-landing.png"), fullPage: true });

  const initializer = page.getByRole("button", { name: "Create controlled Agent Alpha" });
  if (await initializer.isVisible()) {
    await initializer.click();
    await page.waitForURL("**/operational-entities/**");
  }

  await expect(page.getByRole("heading", { name: "Agent Alpha", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("operational-entity.png"), fullPage: true });
  const verify = page.getByRole("button", { name: "VERIFY AGENT ALPHA", exact: true });
  const rotateAndVerify = page.getByRole("button", { name: "ROTATE AND VERIFY CURRENT ENTITY", exact: true });
  if (await verify.isVisible()) await verify.click();
  else await rotateAndVerify.click();

  const historyLink = page.getByText("Open transaction, Replay and receipt", { exact: true });
  await expect(historyLink).toBeVisible({ timeout: 90_000 });
  const proof = page.locator("pre");
  await expect(proof).toContainText("NATIVE_IDENTITY_PROOF");
  await expect(proof).toContainText('"decision": "ALLOW"');
  await expect(proof).toContainText('"authority":');
  await page.screenshot({ path: testInfo.outputPath("native-allow.png"), fullPage: true });

  const secondTab = await context.newPage();
  await secondTab.goto(page.url());
  await expect(secondTab.getByRole("heading", { name: "Agent Alpha", exact: true })).toBeVisible();
  await secondTab.close();

  await page.getByRole("button", { name: "CHANGE RUNTIME + TEST DENY", exact: true }).click();
  await expect(proof).toContainText("CHANGE_RUNTIME_AND_OUT_OF_SCOPE_ACTION", { timeout: 90_000 });
  await expect(proof).toContainText('"decision": "DENY"');
  await page.screenshot({ path: testInfo.outputPath("native-deny.png"), fullPage: true });
  const transactionUrl = await historyLink.getAttribute("href");
  expect(transactionUrl).toMatch(/^\/trust\/transactions\/[0-9a-f-]+$/i);
  await historyLink.click();

  await expect(page.getByText("Canonical trust transaction", { exact: true })).toBeVisible();
  await expect(page.getByText("DENY", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Authority resolved", { exact: true })).toBeVisible();
  await expect(page.getByText("Replay written", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download receipt JSON", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("canonical-receipt.png"), fullPage: true });
  await page.reload();
  await expect(page.getByText("Canonical trust transaction", { exact: true })).toBeVisible();

  const transactionId = transactionUrl?.split("/").at(-1);
  const receiptResponse = await page.request.get(`/api/trust/transactions/${transactionId}/receipt`);
  expect(receiptResponse.ok()).toBeTruthy();
  const receipt = await receiptResponse.json();
  expect(receipt.decision).toBe("DENY");
  expect(receipt.decisionDigest).toMatch(/^[a-f0-9]{64}$/);
  expect(receipt.privateKey).toBeUndefined();

  await page.goto("/api/auth/logout");
  await page.waitForURL("**/login");
  await page.goto(transactionUrl!);
  await page.waitForURL("**/login?next=**");
  await signIn(page);
  await page.goto(transactionUrl!);
  await expect(page.getByText("Canonical trust transaction", { exact: true })).toBeVisible();
  await expect(page.getByText("Replay written", { exact: true })).toBeVisible();
  await expect(page.getByText("Trust Memory materiality", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("returning-user-proof.png"), fullPage: true });
});
