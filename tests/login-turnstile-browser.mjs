import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createServer } from "node:http";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

let browser;
let script;

before(async () => {
  const bundle = await build({
    stdin: {
      contents: `
        import React, { useEffect, useState } from "react";
        import { createRoot } from "react-dom/client";
        import LoginPage from "./app/login/page";
        import { TurnstileField } from "./components/turnstile-field";
        function WidgetFixture() {
          const [visible, setVisible] = useState(true);
          useEffect(() => { window.__unmountWidget = () => setVisible(false); }, []);
          return visible ? <TurnstileField siteKey="fixture-public-key"
            onTokenChange={(value) => window.__events.push({ type: "token", value })}
            onErrorChange={(value) => window.__events.push({ type: "error", value })} /> : <p>Widget removed</p>;
        }
        createRoot(document.getElementById("root")).render(
          window.__protected
            ? <main data-protected-fixture><h1>Authenticated fixture workspace</h1></main>
            : location.pathname === "/widget" ? <WidgetFixture /> : <LoginPage />
        );
      `,
      resolveDir: process.cwd(), loader: "tsx",
    },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY": '"fixture-public-key"',
      "process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH": '"false"',
    },
    plugins: [{ name: "turnstile-fixture-boundaries", setup(builder) {
      builder.onResolve({ filter: /^next\/(link|navigation)$/ }, ({ path }) => ({ path, namespace: "fixture" }));
      builder.onResolve({ filter: /^@\/lib\/supabase\/client$/ }, () => ({ path: "auth-client", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
        resolveDir: process.cwd(),
        contents: path === "next/link"
          ? 'import React from "react"; export default function Link(props) { return React.createElement("a", props); }'
          : path === "next/navigation"
            ? 'const router = { push: () => { throw new Error("Unexpected navigation"); } }; export const useRouter = () => router;'
            : `export const createClient = () => ({ auth: {
                getUser: async () => ({ data: { user: null }, error: null }),
                signInWithPassword: async (input) => {
                  window.__authCalls++;
                  if (window.__authSuccess) {
                    const response = await fetch("/__fixture/sign-in", {
                      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
                    });
                    if (!response.ok) throw new Error("Mock authentication failed");
                    return { data: { user: { id: "fixture-user" } }, error: null };
                  }
                  return { data: { user: null }, error: new Error("Invalid login credentials") };
                },
              } });`,
      }));
    } }],
  });
  script = bundle.outputFiles[0].text;
  browser = await chromium.launch({ headless: true });
});

after(async () => { await browser?.close(); });

// Only external boundaries are simulated. The actual LoginPage and TurnstileField
// are bundled above; no real challenge, account, token, or provider is contacted.
const providerScript = `
  window.__installTurnstile = () => {
    window.turnstile = {
      render: (_container, options) => {
        window.__widgets.push(options);
        return "fixture-widget-" + window.__widgets.length;
      },
      reset: (id) => { window.__resets.push(id); },
      remove: (id) => { window.__removes.push(id); },
    };
  };
  if (!window.__delayApi) window.__installTurnstile();
`;

async function withFixture(options, run) {
  const errors = [];
  const requests = [];
  const documents = [];
  const authenticationRequests = [];
  const protectedRequests = [];
  const sequence = [];
  let verification = { status: 400, body: { ok: false, code: "INVALID_TOKEN" } };
  const server = createServer((req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.url === "/fixture.js") {
      res.setHeader("Content-Type", "application/javascript");
      return res.end(script);
    }
    if (req.url === "/favicon.ico") { res.statusCode = 204; return res.end(); }
    if (req.url === "/__fixture/sign-in" || req.url === "/api/auth/replay-event") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        if (req.url === "/__fixture/sign-in") {
          authenticationRequests.push(JSON.parse(body));
          sequence.push("mock-authentication");
          res.setHeader("Set-Cookie", "fixture_authenticated=1; Path=/; HttpOnly; SameSite=Lax");
        } else {
          sequence.push(`replay:${JSON.parse(body).event_type}`);
        }
        res.setHeader("Content-Type", "application/json");
        res.end('{"ok":true}');
      });
      return;
    }
    documents.push(req.url);
    const protectedPage = req.url === "/operational-entities";
    const authenticated = Boolean(req.headers.cookie?.includes("fixture_authenticated=1"));
    if (protectedPage) {
      sequence.push("protected-document");
      protectedRequests.push({ authenticated, destination: req.headers["sec-fetch-dest"] });
    }
    res.setHeader("Content-Type", "text/html");
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script>
      window.__delayApi=${Boolean(options.delayApi)};
      window.__authSuccess=${Boolean(options.authSuccess)};window.__protected=${protectedPage && authenticated};
      window.__widgets=[];window.__resets=[];window.__removes=[];window.__events=[];window.__authCalls=0;
      </script><script src="/fixture.js"></script></body></html>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ viewport: options.viewport ?? { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(5_000);
  page.on("pageerror", (error) => errors.push(error.message));
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.href === "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit") {
      return route.fulfill({ contentType: "application/javascript", body: providerScript });
    }
    if (url.origin === origin && ["/api/auth/turnstile", "/api/auth/password-reset/request"].includes(url.pathname)) {
      requests.push(route.request().postDataJSON());
      sequence.push("mock-verification");
      if (verification.transportFailure) return route.abort("failed");
      return route.fulfill({ status: verification.status, contentType: "application/json", body: JSON.stringify(verification.body) });
    }
    if (url.origin === origin) return route.continue();
    errors.push(`Unexpected external request: ${url.origin}`);
    return route.abort();
  });
  try {
    if (options.clock) await page.clock.install();
    await page.goto(`${origin}${options.path ?? "/login"}`);
    if (options.delayApi) {
      await page.locator('[data-turnstile-script-loaded="true"]').waitFor({ state: "attached" });
    } else {
      await page.waitForFunction(() => window.__widgets.length === 1);
      await settle(page);
    }
    await run({ page, requests, authenticationRequests, protectedRequests, sequence, setVerification: (value) => { verification = value; } });
    assert.deepEqual(documents, options.expectedDocuments ?? [options.path ?? "/login"], "only the expected full documents may be requested");
    assert.equal(context.pages().length, 1, "authentication must not open another tab");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
  }
}

async function settle(page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
}

async function issueToken(page, token = "fixture-fresh-token") {
  await page.evaluate((value) => window.__widgets.at(-1).callback(value), token);
  await settle(page);
}

async function fillLogin(page) {
  await page.getByLabel("Email", { exact: true }).fill("fixture@example.test");
  await page.getByPlaceholder("Password", { exact: true }).fill("fixture-password");
}

for (const width of [1440, 390]) {
  test(`real login completes password sign-in with mocked Turnstile/authentication at ${width}px`, async () => {
    await withFixture({
      authSuccess: true, viewport: { width, height: 844 }, expectedDocuments: ["/login", "/operational-entities"],
    }, async ({ page, requests, authenticationRequests, protectedRequests, sequence, setVerification }) => {
      setVerification({ status: 200, body: { ok: true } });
      await fillLogin(page);
      await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
      await expect(page.locator("[data-protected-fixture]")).toHaveCount(0);
      assert.deepEqual(authenticationRequests, []);
      await issueToken(page, "fixture-success-token");
      await page.evaluate(() => { window.__loginDocumentMarker = true; });
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Authenticated fixture workspace", exact: true })).toBeVisible();
      assert.equal(new URL(page.url()).pathname, "/operational-entities");
      assert.equal(await page.evaluate(() => window.__loginDocumentMarker), undefined, "authentication must load a new document");
      assert.equal(await page.evaluate(() => window.innerWidth), width);
      assert.deepEqual(requests, [{ turnstileToken: "fixture-success-token" }]);
      assert.deepEqual(authenticationRequests, [{ email: "fixture@example.test", password: "fixture-password" }]);
      assert.deepEqual(protectedRequests, [{ authenticated: true, destination: "document" }]);
      assert.deepEqual(sequence, ["mock-verification", "mock-authentication", "replay:login", "protected-document"]);
    });
  });
}

test("a fresh challenge clears the previous security banner and enables login", async () => {
  await withFixture({}, async ({ page, requests }) => {
    const signIn = page.getByRole("button", { name: "Sign in", exact: true });
    await expect(signIn).toBeDisabled();
    await page.evaluate(() => window.__widgets[0]["error-callback"]("200500"));
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(signIn).toBeDisabled();
    await issueToken(page);
    await expect(signIn).toBeEnabled();
    await expect(page.getByRole("alert")).toHaveCount(0);
    assert.deepEqual(requests, []);
    assert.equal(await page.evaluate(() => window.__authCalls), 0);
  });
});

test("login displays controlled actionable messages for mapped widget failures", async () => {
  await withFixture({}, async ({ page }) => {
    for (const [code, message] of [
      ["110100", "The security check is not configured correctly. Please contact support."],
      ["110200", "The security check is not authorised for this site. Please contact support."],
      ["200500", "The security check could not connect. Check blockers or your network, then reload."],
      ["untrusted-provider-detail", "Security check failed. Please refresh the page and try again."],
    ]) {
      await page.evaluate((value) => window.__widgets[0]["error-callback"](value), code);
      await expect(page.getByRole("alert")).toHaveText(message);
      await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
    }
  });
});

test("verification transport failure discards the submitted token until a fresh challenge succeeds", async () => {
  await withFixture({}, async ({ page, requests, setVerification }) => {
    setVerification({ transportFailure: true });
    await fillLogin(page);
    await issueToken(page, "fixture-possibly-consumed-token");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
    assert.deepEqual(await page.evaluate(() => window.__resets), ["fixture-widget-1"]);
    assert.equal(await page.locator('input[name="cf-turnstile-response"]').inputValue(), "");
    assert.deepEqual(requests, [{ turnstileToken: "fixture-possibly-consumed-token" }]);
    assert.equal(await page.evaluate(() => window.__authCalls), 0);
    setVerification({ status: 200, body: { ok: true } });
    await issueToken(page, "fixture-replacement-token");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("Email or password is incorrect.");
    assert.deepEqual(requests.map(({ turnstileToken }) => turnstileToken), ["fixture-possibly-consumed-token", "fixture-replacement-token"]);
    assert.equal(await page.evaluate(() => window.__authCalls), 1);
  });
});

test("reset's empty callback preserves verification failure until a fresh token arrives", async () => {
  await withFixture({}, async ({ page }) => {
    await fillLogin(page);
    await issueToken(page);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForFunction(() => window.__resets.length === 1);
    await settle(page);
    await expect(page.getByRole("alert")).toHaveText("We couldn't complete the security check. Please try again.");
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
    assert.equal(await page.evaluate(() => window.__authCalls), 0);
    await issueToken(page, "fixture-next-token");
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});

test("reset-email transport failure also discards its potentially consumed challenge", async () => {
  await withFixture({ path: "/login?mode=forgot-password" }, async ({ page, requests, setVerification }) => {
    setVerification({ transportFailure: true });
    await page.getByLabel("Email", { exact: true }).fill("fixture@example.test");
    await issueToken(page, "fixture-reset-email-token");
    await page.getByRole("button", { name: "Send reset link", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("We couldn't send the reset email. Please try again.");
    await expect(page.getByRole("button", { name: "Send reset link", exact: true })).toBeDisabled();
    assert.deepEqual(await page.evaluate(() => window.__resets), ["fixture-widget-1"]);
    assert.equal(await page.locator('input[name="cf-turnstile-response"]').inputValue(), "");
    assert.deepEqual(requests, [{ email: "fixture@example.test", turnstileToken: "fixture-reset-email-token" }]);
    assert.equal(await page.evaluate(() => window.__authCalls), 0);
    await issueToken(page, "fixture-reset-email-replacement");
    await expect(page.getByRole("button", { name: "Send reset link", exact: true })).toBeEnabled();
    await expect(page.getByRole("alert")).toHaveText("We couldn't send the reset email. Please try again.");
  });
});

for (const scenario of [
  { label: "authentication error", status: 200, body: { ok: true }, message: "Email or password is incorrect.", authCalls: 1 },
  { label: "rate limit", status: 429, body: { ok: false }, message: "Too many attempts. Please wait a moment and try again.", authCalls: 0 },
]) {
  test(`fresh tokens preserve an unrelated ${scenario.label}`, async () => {
    await withFixture({}, async ({ page, setVerification }) => {
      setVerification(scenario);
      await fillLogin(page);
      await issueToken(page);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page.getByRole("alert")).toHaveText(scenario.message);
      await issueToken(page, "fixture-following-token");
      await expect(page.getByRole("alert")).toHaveText(scenario.message);
      assert.equal(await page.evaluate(() => window.__authCalls), scenario.authCalls);
    });
  });
}

test("unmount cancels delayed API polling without a late parent error", async () => {
  await withFixture({ path: "/widget", delayApi: true, clock: true }, async ({ page }) => {
    await page.evaluate(() => window.__unmountWidget());
    await expect(page.getByText("Widget removed", { exact: true })).toBeVisible();
    await page.evaluate(() => { window.__events = []; });
    await page.clock.runFor(10_100);
    assert.deepEqual(await page.evaluate(() => window.__events), []);
    assert.deepEqual(await page.evaluate(() => window.__widgets), []);
  });
});

test("callbacks retained by a removed widget cannot publish tokens or errors", async () => {
  await withFixture({ path: "/widget" }, async ({ page }) => {
    await page.evaluate(() => window.__unmountWidget());
    await expect(page.getByText("Widget removed", { exact: true })).toBeVisible();
    await page.evaluate(() => {
      window.__events = [];
      const old = window.__widgets[0];
      old.callback("fixture-late-token");
      old["error-callback"]("110200");
      old["expired-callback"]();
      old["timeout-callback"]();
    });
    await settle(page);
    assert.deepEqual(await page.evaluate(() => window.__events), []);
    assert.deepEqual(await page.evaluate(() => window.__removes), ["fixture-widget-1"]);
  });
});
