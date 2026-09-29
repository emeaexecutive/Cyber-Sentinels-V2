// Read-only public checks. No credentials, email requests or auth writes.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const productionOrigin = "https://www.cybersentinels.com";
const protectedHeading = "Every consequential entity and action is grounded in one canonical runtime.";

export async function trackDocumentNavigations(page) {
  const documents = [];
  const session = await page.context().newCDPSession(page);
  await session.send("Page.enable");
  // Playwright's framenavigated also includes Next.js history.replaceState.
  // CDP counts committed documents, excluding history-only events.
  session.on("Page.frameNavigated", ({ frame }) => {
    if (!frame.parentId) documents.push(new URL(frame.url).pathname);
  });
  return { snapshot: () => [...documents], stop: () => session.detach() };
}

export async function verifyProtectedRoute(page, origin, path) {
  const response = await page.context().request.get(origin + path, { maxRedirects: 0 });
  assert.match(response.headers()["x-robots-tag"] ?? "", /noindex/, `private indexing: ${path}`);
  const result = { path, status: response.status(), privateNoindex: true };
  if (path === "/operational-entities" && response.status() === 200) {
    const body = await response.text();
    assert.ok(body.includes("NEXT_REDIRECT;replace;/login?next=/operational-entities;307;"), "a streamed response must contain the expected login redirect");
    assert.ok(!body.includes(protectedHeading), "protected content must not precede a streamed redirect");
    await page.goto(origin + path, { waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.origin === origin && url.pathname === "/login");
    await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
    return { ...result, streamedRedirect: true, browserFinalPath: "/login", protectedContentPresent: false };
  }
  assert.ok([303, 307, 308, 401, 403].includes(response.status()), `anonymous protection: ${path}`);
  if ([303, 307, 308].includes(response.status())) {
    const target = new URL(response.headers().location ?? "", origin);
    assert.equal(target.origin, origin, "auth redirect must remain on the same origin");
    assert.equal(target.pathname, "/login", "anonymous requests must reach login");
  }
  return result;
}

export async function runAuthPublicSmoke({ origin = productionOrigin, output = "artifacts/auth-production", screenshots = true } = {}) {
  const url = new URL(origin);
  assert.ok(origin === productionOrigin || (["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && url.protocol === "http:"), "use the fixed Production origin or a local test fixture");
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const observations = [];
  const artifactWarnings = [];
  async function capture(page, name) {
    if (!screenshots) return;
    try {
      await page.screenshot({ path: `${output}/${name}.png`, fullPage: false, animations: "disabled" });
    } catch {
      artifactWarnings.push({ path: `${output}/${name}.png`, reason: "Chromium screenshot capture failed; DOM assertions remain separate." });
    }
  }
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const target of [
      { path: "/login", heading: "Sign in" },
      { path: "/account/reset-password", heading: "Reset link expired or invalid" },
      { path: "/resources/agent-security" },
    ]) {
      const response = await page.goto(origin + target.path, { waitUntil: "domcontentloaded" });
      assert.equal(response.status(), 200, target.path);
      await page.getByRole("heading", target.heading ? { name: target.heading, exact: true } : { level: 1 }).waitFor();
      if (target.path.includes("reset-password")) assert.equal(await page.getByLabel("New password", { exact: true }).count(), 0);
      const consent = page.getByRole("button", { name: "Reject Optional", exact: true });
      if (await consent.isVisible()) await consent.click();
      await capture(page, `${target.path.split("/").at(-1)}-1440`);
      observations.push({ path: target.path, status: response.status(), finalPath: new URL(page.url()).pathname });
    }
    for (const path of ["/dashboard", "/workspace", "/admin", "/operational-entities", "/back-office"]) {
      observations.push(await verifyProtectedRoute(page, origin, path));
    }
    const tracker = await trackDocumentNavigations(page);
    await page.goto(origin + "/auth/callback?next=%2Faccount%2Freset-password&utm_source=release-smoke", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Reset your password", exact: true }).waitFor();
    await page.evaluate(async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); });
    assert.equal(new URL(page.url()).pathname, "/login");
    const navigation = tracker.snapshot();
    assert.deepEqual(navigation, ["/login"]);
    assert.equal(context.pages().length, 1);
    await tracker.stop();
    observations.push({ path: "/auth/callback (missing code)", navigation, tabs: context.pages().length });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/login", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
    const bounds = await page.getByRole("button", { name: "Sign in", exact: true }).boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390, "Sign in must fit the mobile viewport");
    await capture(page, "login-390");
    observations.push({ path: "/login", viewport: 390, signInControlFits: true });
    assert.deepEqual(errors, []);
    await context.close();
    const result = { observedAt: new Date().toISOString(), origin, status: artifactWarnings.length ? "PASS_WITH_ARTIFACT_WARNINGS" : "PASS", observations, artifactWarnings,
      authenticatedLogout: "MANUAL AUTHENTICATED PROOF REQUIRED", realEmailRecovery: "MANUAL PROOF REQUIRED", authenticatedBackoffice: "MANUAL AUTHENTICATED PROOF REQUIRED" };
    await writeFile(`${output}/result.json`, JSON.stringify(result, null, 2));
    return result;
  } finally { await browser.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await runAuthPublicSmoke(), null, 2));
}
