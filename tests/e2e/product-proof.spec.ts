import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
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
let verificationUrl = "";
const password = "ProductProof!2026-OnlyForTest";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const button = page.getByRole("button", { name: "Sign in", exact: true });
  await expect(button).toBeEnabled();
  await button.click();
  await page.waitForURL("**/operational-entities");
}

test.beforeAll(async () => {
  admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  email = `product-proof-${crypto.randomUUID()}@example.test`;
  const created = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      redirectTo: `${baseURL.replace(/\/$/u, "")}/auth/callback?next=/operational-entities`,
    },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("E2E user creation failed.");
  userId = created.data.user.id;
  verificationUrl = created.data.properties.action_link;
});

test.afterAll(async () => {
  if (admin && userId) await admin.auth.admin.deleteUser(userId);
});

test("new and returning users complete a provider-free trust transaction from login to receipt", async ({ page, context }, testInfo) => {
  await page.goto("/login");
  await expect(page.getByText("No active session found.", { exact: true })).toBeVisible();
  await page.goto(verificationUrl);
  await page.waitForURL("**/operational-entities");
  await expect(page.getByRole("heading", { name: "Every consequential entity and action is grounded in one canonical runtime." })).toBeVisible();

  const initializer = page.getByRole("button", { name: "Create controlled Agent Alpha" });
  if (await initializer.isVisible()) {
    await initializer.click();
    await page.waitForURL("**/operational-entities/**");
  }

  await expect(page.getByRole("heading", { name: "Agent Alpha", exact: true })).toBeVisible();
  const verify = page.getByRole("button", { name: "VERIFY AGENT ALPHA", exact: true });
  const rotateAndVerify = page.getByRole("button", { name: "ROTATE AND VERIFY CURRENT ENTITY", exact: true });
  if (await verify.isVisible()) await verify.click();
  else await rotateAndVerify.click();

  const historyLink = page.getByText("Open transaction, Replay and receipt", { exact: true });
  await expect(historyLink).toBeVisible({ timeout: 90_000 });
  const proof = page.locator("pre");
  await expect(proof).toContainText("NATIVE_IDENTITY_PROOF");
  await expect(proof).toContainText('"decision": "ALLOW"');
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
  await expect(page.getByText("DENY", { exact: true })).toBeVisible();
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
