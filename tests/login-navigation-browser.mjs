import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { chromium } from "@playwright/test";

let browser;
let script;
let css;

before(async () => {
  const bundle = await build({
    stdin: {
      contents: `
        import React, { useEffect } from "react";
        import { createRoot } from "react-dom/client";
        import LoginPage from "./app/login/page";
        import { GlobalNavigation } from "./components/global-navigation";
        function App() {
          useEffect(() => { window.__fixtureMounted = true; }, []);
          return <>
            <GlobalNavigation accessLevel={window.__fixture.protected ? "user" : "public"} />
            {window.__fixture.protected
              ? <main data-protected-fixture><h1>Authenticated fixture workspace</h1></main>
              : <LoginPage />}
          </>;
        }
        createRoot(document.getElementById("root")).render(<App />);
      `,
      resolveDir: process.cwd(), loader: "tsx",
    },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    // Turnstile is outside this navigation test; the real component remains bundled.
    define: {
      "process.env.NODE_ENV": '"test"',
      "process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY": '""',
      "process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH": '"false"',
    },
    plugins: [{ name: "login-fixture-boundaries", setup(builder) {
      builder.onResolve({ filter: /^next\/(link|navigation)$/ }, (args) => ({ path: args.path, namespace: "fixture" }));
      builder.onResolve({ filter: /^@\/lib\/supabase\/client$/ }, () => ({ path: "auth-client", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => {
        let contents;
        if (path === "next/link") {
          contents = 'import React from "react"; export default function Link({ prefetch, replace, scroll, ...props }) { return React.createElement("a", props); }';
        } else if (path === "next/navigation") {
          contents = `
            function navigate(method, path) {
              const calls = JSON.parse(sessionStorage.getItem("fixture-router-calls") || "[]");
              calls.push({ method, path });
              sessionStorage.setItem("fixture-router-calls", JSON.stringify(calls));
              history[method === "push" ? "pushState" : "replaceState"]({}, "", path);
            }
            const router = { push: (path) => navigate("push", path), replace: (path) => navigate("replace", path) };
            export const useRouter = () => router;
            export const usePathname = () => window.location.pathname;
          `;
        } else {
          contents = `
            const user = { id: "fixture-user", email: "fixture@example.test" };
            const claims = { data: { claims: { sub: user.id, amr: [{ method: "password" }] } }, error: null };
            const auth = {
              getUser: async () => {
                window.__authCalls.push("getUser");
                return { data: { user: window.__fixture.authenticated ? user : null }, error: null };
              },
              getClaims: async () => {
                window.__authCalls.push("getClaims");
                if (window.__fixture.delayClaims) return new Promise((resolve) => {
                  window.__releaseClaims = () => resolve(claims);
                });
                return claims;
              },
              signInWithPassword: async () => {
                window.__authCalls.push("signInWithPassword");
                const response = await fetch("/__fixture/authenticate", { method: "POST" });
                if (!response.ok) throw new Error("Fixture sign-in failed");
                return { data: { user }, error: null };
              },
            };
            export const createClient = () => ({ auth });
          `;
        }
        return { contents, resolveDir: process.cwd() };
      });
    } }],
  });
  script = bundle.outputFiles[0].text;
  css = (await postcss([tailwindcss({
    content: ["./app/login/page.tsx", "./components/global-navigation.tsx"], theme: {}, plugins: [],
  })]).process(await readFile("app/globals.css", "utf8"), { from: "app/globals.css" })).css;
  browser = await chromium.launch({ headless: true });
});

after(async () => { await browser?.close(); });

async function withFixture(options, run) {
  const documentRequests = [];
  const replayEvents = [];
  const errors = [];
  let authenticationCalls = 0;
  let releaseResponse;
  let markResponsePending;
  const responsePending = new Promise((resolve) => { markResponsePending = resolve; });
  function respondAtBoundary(boundary, respond) {
    if (options.delayResponse === boundary) {
      releaseResponse = respond;
      markResponsePending();
      return;
    }
    respond();
  }
  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url, "http://fixture.test");
      const send = (type, body) => {
        res.setHeader("Content-Type", type);
        res.setHeader("Cache-Control", "no-store");
        res.end(body);
      };
      if (url.pathname === "/fixture.js") return send("application/javascript", script);
      if (url.pathname === "/style.css") return send("text/css", css);
      if (url.pathname === "/favicon.ico") { res.statusCode = 204; return res.end(); }
      if (url.pathname === "/__fixture/authenticate") {
        assert.equal(req.method, "POST");
        authenticationCalls++;
        return respondAtBoundary("authentication", () => {
          res.setHeader("Set-Cookie", "fixture_authenticated=1; Path=/; HttpOnly; SameSite=Lax");
          send("application/json", '{"ok":true}');
        });
      }
      if (url.pathname === "/api/auth/replay-event") {
        assert.equal(req.method, "POST");
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
          try {
            replayEvents.push(JSON.parse(body));
            respondAtBoundary("replay-event", () => send("application/json", '{"ok":true}'));
          }
          catch (error) { errors.push(error.message); res.statusCode = 500; res.end("Fixture failed"); }
        });
        return;
      }
      assert.ok(["/login", "/operational-entities"].includes(url.pathname), `Unexpected route ${url.pathname}`);
      const authenticated = Boolean(options.authenticated || req.headers.cookie?.includes("fixture_authenticated=1"));
      const protectedPage = url.pathname === "/operational-entities";
      if (protectedPage && !authenticated) {
        res.writeHead(303, { location: "/login", "cache-control": "no-store" });
        return res.end();
      }
      documentRequests.push({ path: url.pathname + url.search, destination: req.headers["sec-fetch-dest"], authenticated });
      const fixture = { authenticated, protected: protectedPage, delayClaims: Boolean(options.delayClaims), documentId: documentRequests.length };
      return send("text/html", `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script>window.__fixture=${JSON.stringify(fixture)};window.__authCalls=[];</script><script src="/fixture.js"></script></body></html>`);
    } catch (error) {
      errors.push(error.message);
      res.statusCode = 500;
      res.end("Fixture failed");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ viewport: { width: options.width ?? 1440, height: 900 } });
  let openedPages = 0;
  context.on("page", () => { openedPages++; });
  await context.addInitScript(() => {
    // Retain every protected render across document navigation, including transient ones.
    new MutationObserver(() => {
      if (!document.querySelector("[data-protected-fixture]")) return;
      const seen = JSON.parse(sessionStorage.getItem("fixture-protected-renders") || "[]");
      if (!seen.includes(location.pathname)) seen.push(location.pathname);
      sessionStorage.setItem("fixture-protected-renders", JSON.stringify(seen));
    }).observe(document, { childList: true, subtree: true });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  const navigations = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations.push(new URL(frame.url()).pathname);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await context.route("**/*", (route) => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    errors.push("Unexpected external network request");
    return route.abort();
  });
  const fixture = {
    page, origin, documentRequests, replayEvents, navigations,
    waitForPendingResponse: async () => {
      let timeout;
      try {
        await Promise.race([responsePending, new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Expected delayed fixture response did not start")), 5_000);
        })]);
      } finally { clearTimeout(timeout); }
    },
    authenticationCalls: () => authenticationCalls,
    releaseResponse: () => {
      assert.equal(typeof releaseResponse, "function", "the chosen response must be pending before release");
      releaseResponse();
      releaseResponse = undefined;
    },
  };
  try {
    await run(fixture);
    assert.equal(openedPages, 1, "application navigation must not open another tab");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
  }
}

async function settleRendering(page) {
  await page.waitForFunction(() => window.__fixtureMounted === true);
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
}

async function assertStayedOnLogin({ page, documentRequests, navigations }, expectedSearch) {
  await settleRendering(page);
  assert.equal(new URL(page.url()).pathname, "/login");
  assert.equal(new URL(page.url()).search, expectedSearch);
  assert.deepEqual(documentRequests.map(({ path }) => path), [`/login${expectedSearch}`]);
  assert.deepEqual(navigations, ["/login"]);
  assert.equal(await page.locator("[data-protected-fixture]").count(), 0);
  assert.deepEqual(await page.evaluate(() => JSON.parse(sessionStorage.getItem("fixture-protected-renders") || "[]")), []);
  assert.deepEqual(await page.evaluate(() => JSON.parse(sessionStorage.getItem("fixture-router-calls") || "[]")), []);
}

for (const scenario of [
  { search: "?mode=forgot-password", button: "Send reset link" },
  { search: "?error=recovery_link_invalid", button: "Send reset link", message: "Reset link expired or invalid. Request a new password reset email." },
  { search: "?error=verification_failed", button: "Sign in", message: "We could not complete email verification. Please request a new link or sign in with your password." },
  { search: "?password_updated=1", button: "Sign in", message: "Password updated successfully. Sign in with your new password." },
]) {
  test(`existing authenticated browser stays on /login${scenario.search}`, async () => {
    await withFixture({ authenticated: true }, async (fixture) => {
      await fixture.page.goto(`${fixture.origin}/login${scenario.search}`);
      await fixture.page.getByRole("button", { name: scenario.button, exact: true }).waitFor({ state: "visible" });
      if (scenario.message) await fixture.page.getByText(scenario.message, { exact: true }).waitFor({ state: "visible" });
      await assertStayedOnLogin(fixture, scenario.search);
      assert.deepEqual(await fixture.page.evaluate(() => window.__authCalls), [], "recovery and completion screens must not start session restoration");
      assert.deepEqual(fixture.replayEvents, []);
    });
  });
}

test("a delayed getClaims result cannot override clicking Forgot password", async () => {
  await withFixture({ authenticated: true, delayClaims: true }, async (fixture) => {
    const { page } = fixture;
    await page.goto(`${fixture.origin}/login`);
    await page.waitForFunction(() => typeof window.__releaseClaims === "function");
    await page.getByRole("button", { name: "Forgot password?", exact: true }).click();
    await page.getByRole("button", { name: "Send reset link", exact: true }).waitFor({ state: "visible" });
    await page.evaluate(() => window.__releaseClaims());
    await assertStayedOnLogin(fixture, "");
    assert.deepEqual(await page.evaluate(() => window.__authCalls), ["getUser", "getClaims"]);
    assert.deepEqual(fixture.replayEvents, [], "invalidated restoration must not record or dispatch a restoration");
  });
});

for (const scenario of [
  { boundary: "replay-event", endpoint: "/api/auth/replay-event", events: ["login"] },
  { boundary: "authentication", endpoint: "/__fixture/authenticate", events: [] },
]) {
  test(`a delayed password-login ${scenario.boundary} response cannot override Forgot password`, { timeout: 20_000 }, async () => {
    await withFixture({ delayResponse: scenario.boundary }, async (fixture) => {
      const { page } = fixture;
      await page.goto(`${fixture.origin}/login`);
      await settleRendering(page);
      await page.getByLabel("Email", { exact: true }).fill("fixture@example.test");
      await page.getByPlaceholder("Password", { exact: true }).fill("fixture-password");
      await page.getByRole("button", { name: "Sign in", exact: true }).click({ noWaitAfter: true });
      await fixture.waitForPendingResponse();
      await page.getByRole("button", { name: "Forgot password?", exact: true }).click();
      const resetButton = page.getByRole("button", { name: "Send reset link", exact: true });
      await resetButton.waitFor({ state: "visible" });
      assert.equal(await resetButton.isEnabled(), true, "changing mode must release the previous action's loading state");
      const completed = page.waitForResponse((response) => new URL(response.url()).pathname === scenario.endpoint);
      fixture.releaseResponse();
      // The login handler awaits response headers, without consuming the replay-event body.
      await completed;
      await assertStayedOnLogin(fixture, "");
      await page.getByRole("heading", { name: "Reset your password", exact: true }).waitFor({ state: "visible" });
      assert.equal(await resetButton.isEnabled(), true);
      assert.equal(fixture.authenticationCalls(), 1);
      assert.deepEqual(fixture.replayEvents.map(({ event_type }) => event_type), scenario.events);
      assert.deepEqual(await page.evaluate(() => window.__authCalls), ["getUser", "signInWithPassword"]);
    });
  });
}

test("a cancelled reset response cannot unlock or overwrite a newer login", { timeout: 20_000 }, async () => {
  await withFixture({ delayResponse: "authentication" }, async (fixture) => {
    const { page } = fixture;
    let releaseReset;
    const resetPending = new Promise((resolve) => {
      page.route("**/api/auth/password-reset/request", (route) => {
        releaseReset = () => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, message: "Old reset request completed" }) });
        resolve();
      });
    });
    await page.goto(`${fixture.origin}/login?mode=forgot-password`);
    await page.getByLabel("Email", { exact: true }).fill("fixture@example.test");
    await page.getByRole("button", { name: "Send reset link", exact: true }).click();
    await resetPending;
    await page.getByRole("button", { name: "Back to sign in", exact: true }).click();
    await page.getByPlaceholder("Password", { exact: true }).fill("fixture-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click({ noWaitAfter: true });
    await fixture.waitForPendingResponse();
    await releaseReset();
    await settleRendering(page);
    assert.equal(await page.getByText("Old reset request completed", { exact: true }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Signing in...", exact: true }).isDisabled(), true, "the current login must remain locked");
    assert.equal(fixture.authenticationCalls(), 1);
    fixture.releaseResponse();
    await page.waitForURL(`${fixture.origin}/operational-entities`);
    await page.getByRole("button", { name: "Sign Out", exact: true }).waitFor();
    assert.deepEqual(fixture.navigations, ["/login", "/operational-entities"]);
  });
});

for (const width of [1440, 768, 390]) {
  test(`password login requests a fresh authenticated document with visible Sign Out at ${width}px`, async () => {
    await withFixture({ width }, async (fixture) => {
      const { page } = fixture;
      await page.goto(`${fixture.origin}/login`);
      await settleRendering(page);
      const initialDocument = await page.evaluate(() => {
        window.__loginDocumentMarker = true;
        return window.__fixture.documentId;
      });
      assert.equal(await page.getByRole("button", { name: "Sign Out", exact: true }).count(), 0);
      await page.getByLabel("Email", { exact: true }).fill("fixture@example.test");
      await page.getByPlaceholder("Password", { exact: true }).fill("fixture-password");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.waitForURL(`${fixture.origin}/operational-entities`);
      const button = page.getByRole("button", { name: "Sign Out", exact: true });
      await button.waitFor({ state: "visible" });
      await settleRendering(page);
      const bounds = await button.boundingBox();
      assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width, "Sign Out must fit the viewport without opening a menu");
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 900);
      assert.ok(bounds.height >= 44);
      assert.equal(await page.evaluate(() => window.__loginDocumentMarker), undefined, "a fresh document must replace the login document");
      assert.notEqual(await page.evaluate(() => window.__fixture.documentId), initialDocument);
      assert.deepEqual(fixture.documentRequests.map(({ path, destination, authenticated }) => ({ path, destination, authenticated })), [
        { path: "/login", destination: "document", authenticated: false },
        { path: "/operational-entities", destination: "document", authenticated: true },
      ]);
      assert.deepEqual(fixture.navigations, ["/login", "/operational-entities"]);
      assert.equal(fixture.authenticationCalls(), 1);
      assert.deepEqual(fixture.replayEvents.map(({ event_type }) => event_type), ["login"]);
      assert.deepEqual(await page.evaluate(() => JSON.parse(sessionStorage.getItem("fixture-router-calls") || "[]")), [], "password login must not rely on a stale SPA shell");
      assert.deepEqual(await page.evaluate(() => JSON.parse(sessionStorage.getItem("fixture-protected-renders") || "[]")), ["/operational-entities"]);
    });
  });
}
