import { expect, test } from "@playwright/test";

test("capability governance and inter-agent conflict are readable and responsive", async ({ page }, testInfo) => {
  await page.goto("/operational-entities/release-proof");
  await expect(page.getByRole("heading", { name: "Operational Entity capability and authority-conflict UX", exact: true })).toBeVisible();

  const consentDialog = page.getByRole("dialog", { name: "Your Privacy. Your Trust." });
  if (await consentDialog.isVisible()) {
    await consentDialog.getByRole("button", { name: "Reject Optional" }).click();
    await expect(consentDialog).toBeHidden();
  }

  await expect(page.getByTestId("proof-model-current")).toContainText("Current");
  await expect(page.getByTestId("proof-model-current")).toContainText("Open Weight · descriptive only");
  await expect(page.getByTestId("proof-model-hosted-missing")).toContainText("Provider reputation does not substitute for evidence.");
  await expect(page.getByTestId("proof-model-reauthorization")).toContainText("Reauthorization Required");
  await expect(page.getByTestId("proof-agents-compatible")).toContainText("Beta and Gamma access the same resource, but their authorized actions are compatible.");
  await expect(page.getByTestId("proof-agents-review")).toContainText("Beta and Gamma have incompatible objectives affecting the same protected resource.");
  await expect(page.getByTestId("proof-agents-deny")).toContainText("The requested action cannot proceed under the current authority and policy.");
  await expect(page.getByTestId("proof-agents-unknown")).toContainText("Cyber Sentinels does not currently have sufficient evidence to establish whether these authorities are compatible.");
  await expect(page.getByRole("link", { name: "View evidence", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "View authority lineage", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Replay", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "View transaction", exact: true }).first()).toBeVisible();
  await expect(page.getByTestId("proof-trust-memory")).toContainText("INTER AGENT CONFLICT FIRST OBSERVED");
  await expect(page.getByTestId("proof-immutable-transaction")).toContainText("Immutable REVIEW decision");
  if (process.env.E2E_EXPECTED_RELEASE_SHA) await expect(page.getByTestId("proof-release-head")).toContainText(process.env.E2E_EXPECTED_RELEASE_SHA);

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasHorizontalOverflow).toBe(false);
  const firstEvidenceLink = page.getByRole("link", { name: "View evidence", exact: true }).first();
  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press("Tab");
    if ((await page.evaluate(() => document.activeElement?.textContent?.trim())) === "View evidence") break;
  }
  expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe("View evidence");
  const focusedOutline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(focusedOutline).not.toBe("none");
  await firstEvidenceLink.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe("View authority lineage");

  const savedPreferencesNotice = page.getByRole("status").filter({ hasText: "Privacy choice" });
  if (await savedPreferencesNotice.isVisible()) {
    await savedPreferencesNotice.getByRole("button", { name: "Dismiss saved preferences notification" }).click();
    await expect(savedPreferencesNotice).toBeHidden();
  }
  await page.addStyleTag({ content: "header.sticky { position: static !important; } nextjs-portal { display: none !important; }" });

  const proofName = testInfo.project.name;
  await page.getByTestId("proof-model-current").screenshot({ path: testInfo.outputPath(`${proofName}-model-governance-current.png`) });
  await page.getByTestId("proof-model-reauthorization").screenshot({ path: testInfo.outputPath(`${proofName}-model-governance-reauthorization.png`) });
  await page.getByTestId("proof-agents-compatible").screenshot({ path: testInfo.outputPath(`${proofName}-agents-compatible.png`) });
  await page.getByTestId("proof-agents-review").screenshot({ path: testInfo.outputPath(`${proofName}-agents-review.png`) });
  await page.getByTestId("proof-agents-deny").screenshot({ path: testInfo.outputPath(`${proofName}-agents-deny.png`) });
  await page.getByTestId("proof-evidence-lineage").screenshot({ path: testInfo.outputPath(`${proofName}-evidence-lineage.png`) });
  await page.getByTestId("proof-replay").screenshot({ path: testInfo.outputPath(`${proofName}-replay.png`) });
  await page.getByTestId("proof-trust-memory").screenshot({ path: testInfo.outputPath(`${proofName}-trust-memory.png`) });
  await page.getByTestId("proof-immutable-transaction").screenshot({ path: testInfo.outputPath(`${proofName}-immutable-transaction.png`) });
});
