// Read-only public Production checks. No credentials, email requests or auth writes.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const origin = "https://www.cybersentinels.com";
const output = "artifacts/auth-production";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const observations = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const target of [
    { path: "/login", heading: "Sign in" },
    { path: "/account/reset-password", heading: "Reset link expired or invalid" },
    { path: "/resources/agent-security", heading: "AI agent security and authorization resources" },
  ]) {
    const response = await page.goto(origin + target.path, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200, target.path);
    if (target.path.startsWith("/resources")) await page.getByRole("heading", { level: 1 }).waitFor();
    else await page.getByRole("heading", { name: target.heading, exact: true }).waitFor();
    if (target.path.includes("reset-password")) assert.equal(await page.getByLabel("New password", { exact: true }).count(), 0);
    const consent = page.getByRole("button", { name: "Reject Optional", exact: true });
    if (await consent.isVisible()) await consent.click();
    await page.screenshot({ path: `${output}/${target.path.split("/").at(-1)}-1440.png`, fullPage: true });
    observations.push({ path: target.path, status: response.status(), finalPath: new URL(page.url()).pathname });
  }
  for (const path of ["/dashboard", "/workspace", "/admin", "/operational-entities", "/back-office"]) {
    const response = await context.request.get(origin + path, { maxRedirects: 0 });
    assert.ok([303, 307, 308, 401, 403].includes(response.status()), `anonymous protection: ${path}`);
    assert.match(response.headers()["x-robots-tag"] ?? "", /noindex/);
    observations.push({ path, status: response.status(), privateNoindex: true });
  }
  const navigation = [];
  page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) navigation.push(new URL(frame.url()).pathname); });
  await page.goto(origin + "/auth/callback?next=%2Faccount%2Freset-password&utm_source=release-smoke", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Reset your password", exact: true }).waitFor();
  await page.evaluate(async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); });
  assert.equal(new URL(page.url()).pathname, "/login");
  assert.deepEqual(navigation, ["/login"]);
  assert.equal(context.pages().length, 1);
  observations.push({ path: "/auth/callback (missing code)", navigation, tabs: context.pages().length });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + "/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
  await page.screenshot({ path: `${output}/login-390.png`, fullPage: true });
  assert.deepEqual(errors, []);
  await context.close();
  const result = { observedAt: new Date().toISOString(), origin, status: "PASS", observations,
    authenticatedLogout: "NOT EXERCISED", realEmailRecovery: "MANUAL PROOF REQUIRED", authenticatedBackoffice: "NOT EXERCISED" };
  await writeFile(`${output}/result.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
