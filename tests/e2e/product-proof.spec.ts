import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const vercelProtectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
const vercelProtectionCookie = process.env.VERCEL_PROTECTION_COOKIE ?? "";
const signupMailbox = process.env.E2E_SIGNUP_MAILBOX?.trim() ?? "";
const allowAdminBootstrapAfterSignupRateLimit = process.env.E2E_ALLOW_ADMIN_BOOTSTRAP_AFTER_SIGNUP_RATE_LIMIT === "true";
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

async function runProofStage(page: Page, buttonTestId: string, stage: string) {
  const button = page.getByTestId(buttonTestId);
  await expect(button).toBeEnabled({ timeout: 90_000 });
  await button.click();
  const proof = page.getByTestId(`proof-${stage}`);
  const alert = page.locator("#alpha-beta-proof").getByRole("alert");
  await Promise.race([
    proof.waitFor({ state: "visible", timeout: 90_000 }),
    alert.waitFor({ state: "visible", timeout: 90_000 }).then(async () => { throw new Error(`Proof stage ${stage} failed: ${await alert.textContent()}`); }),
  ]);
  return proof;
}

test.beforeAll(async () => {
  admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const suffix = `product-proof-${crypto.randomUUID()}`;
  email = signupMailbox
    ? signupMailbox.replace("@", `+${suffix}@`)
    : `${suffix}@cybersentinels.com`;
});

test.afterAll(async () => {
  if (admin && userId) await admin.auth.admin.deleteUser(userId);
});

test("new and returning users complete the Alpha to Beta trust journey from login to persisted receipts", async ({ page, context }, testInfo) => {
  test.setTimeout(300_000);
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
  const authStatus = page.locator("main").getByRole("status").last();
  await expect(authStatus).not.toHaveText("", { timeout: 30_000 });
  const signupMessage = (await authStatus.textContent())?.trim() ?? "";
  if (signupMessage === "Check your email to verify your account before continuing.") {
    const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1_000 });
    if (users.error) throw users.error;
    const createdUser = users.data.users.find((user) => user.email === email);
    if (!createdUser) throw new Error("Preview signup user was not persisted.");
    userId = createdUser.id;
    const confirmed = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
    if (confirmed.error) throw confirmed.error;
  } else if (allowAdminBootstrapAfterSignupRateLimit && signupMessage.includes("temporarily rate-limited")) {
    const bootstrapped = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (bootstrapped.error) throw bootstrapped.error;
    userId = bootstrapped.data.user.id;
  } else {
    throw new Error(`Preview signup did not reach verification: ${signupMessage || "NO_STATUS"}`);
  }
  await page.goto("/api/auth/logout");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Every consequential entity and action is grounded in one canonical runtime." })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("product-landing.png"), fullPage: true });

  const initializer = page.getByRole("button", { name: "Continue with canonical Alpha and Beta" });
  if (await initializer.isVisible()) {
    await initializer.click();
    await page.waitForURL("**/operational-entities/**");
  }

  await expect(page.getByRole("heading", { level: 1, name: "Agent Alpha", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("operational-entity.png"), fullPage: true });
  const alphaIdentity = await runProofStage(page, "verify-alpha", "alphaIdentity");
  await expect(alphaIdentity).toContainText('"status": "VERIFIED"');
  await expect(alphaIdentity).toContainText('"owner": "Alice"');
  const betaIdentity = await runProofStage(page, "verify-beta", "betaIdentity");
  await expect(betaIdentity).toContainText('"status": "VERIFIED"');
  await expect(betaIdentity).toContainText('"owner": "Bob"');
  await expect(betaIdentity).toContainText('"distinctFromAlpha": true');
  await page.screenshot({ path: testInfo.outputPath("alpha-beta-identity.png"), fullPage: true });

  const delegation = await runProofStage(page, "create-delegation", "delegation");
  await expect(delegation).toContainText('"state": "ACTIVE"');
  await expect(delegation).toContainText('"permittedActions"');
  await expect(delegation).toContainText('"repository:a"');
  await expect(delegation).not.toContainText('"repository:b"');
  await expect(delegation).toContainText('"valid": true');
  await page.screenshot({ path: testInfo.outputPath("alpha-beta-delegation.png"), fullPage: true });

  const secondTab = await context.newPage();
  await secondTab.goto(page.url());
  await expect(secondTab.getByRole("heading", { level: 1, name: "Agent Alpha", exact: true })).toBeVisible();
  await secondTab.close();

  const allowed = await runProofStage(page, "beta-read", "betaRead");
  await expect(allowed).toContainText('"decision": "ALLOW"');
  await expect(allowed).toContainText('"transactionId"');
  await expect(allowed).toContainText('"receiptUrl"');
  await page.screenshot({ path: testInfo.outputPath("beta-read-allow.png"), fullPage: true });

  const outOfScope = await runProofStage(page, "beta-write", "betaWrite");
  await expect(outOfScope).toContainText('"decision": "DENY"');
  await expect(outOfScope).toContainText("ACTION_OUT_OF_DELEGATED_SCOPE");
  await expect(outOfScope).toContainText('"transactionId"');
  await page.screenshot({ path: testInfo.outputPath("beta-write-deny.png"), fullPage: true });

  const revocation = await runProofStage(page, "revoke-alpha", "revocation");
  await expect(revocation).toContainText('"parentAuthority": "REVOKED"');
  await expect(revocation).toContainText('"delegation": "INVALIDATED"');
  const revokedAction = await runProofStage(page, "beta-read-revoked", "betaReadAfterRevocation");
  await expect(revokedAction).toContainText('"decision": "DENY"');
  await expect(revokedAction).toContainText("PARENT_AUTHORITY_REVOKED");
  await page.screenshot({ path: testInfo.outputPath("authority-revoked.png"), fullPage: true });

  const historyLink = page.getByRole("link", { name: "Open betaReadAfterRevocation transaction" });
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
  expect(receipt.reasonCodes).toContain("PARENT_AUTHORITY_REVOKED");
  expect(receipt.delegationReference).toMatch(/^[0-9a-f-]{36}$/i);
  expect(receipt.parentAuthorityReference).toMatch(/^[0-9a-f-]{36}$/i);
  expect(receipt.decisionDigest).toMatch(/^[a-f0-9]{64}$/);
  expect(receipt.privateKey).toBeUndefined();

  await page.goto("/operational-entities");
  await page.locator("article", { hasText: "Agent Beta" }).getByRole("link", { name: "View persisted trust record" }).click();
  await expect(page.getByRole("heading", { name: "Agent Beta", exact: true })).toBeVisible();
  await expect(page.getByText("INVALIDATED (PARENT AUTHORITY REVOKED)", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("BETA_VERIFIED").first()).toBeVisible();
  await expect(page.getByText("DELEGATED_AUTHORITY_INVALIDATED").first()).toBeVisible();
  await expect(page.getByText("PARENT_AUTHORITY_REVOKED").first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("beta-persisted-state.png"), fullPage: true });

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
