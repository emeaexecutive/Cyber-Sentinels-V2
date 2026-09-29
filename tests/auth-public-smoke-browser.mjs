import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import test from "node:test";
import { chromium } from "@playwright/test";
import { runAuthPublicSmoke, trackDocumentNavigations, verifyProtectedRoute } from "../tools/release/auth-public-smoke.mjs";

async function fixture(run, options = {}) {
  const methods = [];
  const server = createServer((req, res) => {
    methods.push(req.method);
    const url = new URL(req.url, "http://localhost");
    res.setHeader("Content-Type", "text/html");
    res.setHeader("x-robots-tag", "noindex, nofollow");
    const html = (body) => res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${body}`);
    if (url.pathname === "/login") return html(`<h1>${url.search ? "Reset your password" : "Sign in"}</h1><button>Sign in</button><script>history.replaceState({}, '', location.href)</script>`);
    if (url.pathname === "/account/reset-password") return html("<h1>Reset link expired or invalid</h1>");
    if (url.pathname === "/resources/agent-security") return html("<h1>Agent security resources</h1>");
    if (url.pathname === "/operational-entities") {
      const protectedBody = options.leak ? "<h1>Every consequential entity and action is grounded in one canonical runtime.</h1>" : "";
      return html(`${protectedBody}<!-- NEXT_REDIRECT;replace;/login?next=/operational-entities;307; --><script>location.replace('/login')</script>`);
    }
    if (url.pathname === "/unprotected") return html("<h1>Accidentally public</h1>");
    res.writeHead(307, { location: options.external ? "https://example.test/login" : url.pathname === "/auth/callback" ? "/login?error=recovery_link_invalid" : "/login" });
    res.end();
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try { await run(origin, methods); }
  finally { await new Promise((done) => { server.close(done); server.closeAllConnections(); }); }
}

test("public smoke accepts safe streamed redirects and preserves callback evidence after mobile navigation", async () => {
  const output = await mkdtemp(join(tmpdir(), "cyber-auth-smoke-"));
  try {
    await fixture(async (origin, methods) => {
      const result = await runAuthPublicSmoke({ origin, output, screenshots: false });
      assert.equal(result.status, "PASS");
      assert.equal(result.observations.find((item) => item.path === "/operational-entities").streamedRedirect, true);
      assert.deepEqual(result.observations.find((item) => item.path.includes("missing code")).navigation, ["/login"]);
      assert.equal(result.observations.at(-1).signInControlFits, true);
      assert.equal(result.authenticatedLogout, "MANUAL AUTHENTICATED PROOF REQUIRED");
      assert.ok(methods.length > 0 && methods.every((method) => method === "GET"), "smoke must not mutate auth or request email");
    });
  } finally {
    assert.ok(resolve(output).startsWith(`${resolve(tmpdir())}${sep}cyber-auth-smoke-`));
    await rm(output, { recursive: true, force: true });
  }
});

test("document tracker ignores history-only changes but detects real repeat document loads", async () => {
  await fixture(async (origin) => {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const tracker = await trackDocumentNavigations(page);
      await page.goto(origin + "/login");
      const saved = tracker.snapshot();
      await page.evaluate(() => history.replaceState({}, "", location.href));
      assert.deepEqual(tracker.snapshot(), ["/login"]);
      await page.reload();
      assert.deepEqual(tracker.snapshot(), ["/login", "/login"]);
      assert.deepEqual(saved, ["/login"], "retained evidence must not mutate with later navigation");
      await tracker.stop();
    } finally { await browser.close(); }
  });
});

test("protected-route checks reject leaked content, ordinary public pages and off-origin redirects", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await fixture(async (origin) => {
      await assert.rejects(verifyProtectedRoute(page, origin, "/operational-entities"), /protected content must not precede/);
      await assert.rejects(verifyProtectedRoute(page, origin, "/unprotected"), /anonymous protection/);
    }, { leak: true });
    await fixture(async (origin) => {
      await assert.rejects(verifyProtectedRoute(page, origin, "/dashboard"), /same origin/);
    }, { external: true });
  } finally { await browser.close(); }
});
