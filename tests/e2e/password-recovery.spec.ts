import { expect, test } from "@playwright/test";

async function settleConsent(page: import("@playwright/test").Page) {
  const rejectOptional = page.getByRole("button", { name: "Reject Optional", exact: true });
  if (await rejectOptional.isVisible().catch(() => false)) await rejectOptional.click();
}

test.describe("password recovery UX", () => {
  test("shows the simplified sign-in and forgot-password flow", async ({ page }, testInfo) => {
    await page.goto("/login");
    await settleConsent(page);

    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true }).last()).toBeVisible();
    await expect(page.getByRole("button", { name: "Forgot password?", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Use magic link", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeVisible();
    await expect(page.getByText("Trusted session restored", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("login.png"), fullPage: true });

    await page.getByRole("button", { name: "Forgot password?", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Reset your password", exact: true })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("forgot-password.png"), fullPage: true });
  });

  test("rejects direct reset-page access without a verified recovery session", async ({ page }, testInfo) => {
    await page.goto("/account/reset-password");
    await settleConsent(page);

    await expect(page.getByRole("heading", { name: /invalid|expired/i })).toBeVisible();
    await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /request a new reset link/i })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("guarded-reset.png"), fullPage: true });

    await page.goto("/reset-password");
    await expect(page).toHaveURL(/\/account\/reset-password$/);
    await expect(page.getByRole("heading", { name: /invalid|expired/i })).toBeVisible();
  });
});
