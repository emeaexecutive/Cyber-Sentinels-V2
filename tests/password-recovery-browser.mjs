import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import React from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { createServer } from "node:http";
import { harness } from "./password-recovery-flow.test.mjs";

test("browser submits the real reset form to the secure completion route and navigates to login", async () => {
  const h = harness();
  await h.begin();
  const bundle = await build({
    stdin: { contents: 'import React from "react"; import {createRoot} from "react-dom/client"; import {ResetPasswordForm} from "./app/account/reset-password/reset-password-form"; createRoot(document.getElementById("root")).render(<ResetPasswordForm/>);',
      resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    plugins: [{ name: "fixture-next-link", setup(builder) {
      builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: 'import React from "react"; export default function Link(props) { return React.createElement("a", props); }', resolveDir: process.cwd() }));
    } }],
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let completionCalls = 0;
    await page.route("http://localhost:3000/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/auth/password-reset/complete") {
        completionCalls++;
        const response = await h.load("app/api/auth/password-reset/complete/route.ts").POST(
          h.request(url.pathname, route.request().postDataJSON()),
        );
        h.apply(response);
        return route.fulfill({ status: response.status, contentType: "application/json", body: await response.text() });
      }
      if (url.pathname === "/form.js") return route.fulfill({ contentType: "application/javascript", body: bundle.outputFiles[0].text });
      if (url.pathname === "/login") return route.fulfill({ contentType: "text/html", body: "<p>Password updated. Sign in with your new password.</p>" });
      return route.fulfill({ contentType: "text/html", body: '<!doctype html><html><body><div id="root"></div><script src="/form.js"></script></body></html>' });
    });
    await page.goto("http://localhost:3000/account/reset-password");
    await page.getByLabel("New password", { exact: true }).fill("fixture-new-password");
    await page.getByLabel("Confirm new password", { exact: true }).fill("fixture-mismatch");
    await page.getByRole("button", { name: "Update password", exact: true }).click();
    await page.getByText("Passwords do not match.", { exact: true }).waitFor();
    assert.equal(completionCalls, 0);
    await page.getByLabel("Confirm new password", { exact: true }).fill("fixture-new-password");
    await page.getByRole("button", { name: "Update password", exact: true }).click();
    await page.waitForURL("http://localhost:3000/login?password_updated=1");
    assert.equal(completionCalls, 1);
    assert.equal(h.jar.has("cyber_password_recovery"), false);
    assert.equal((await h.client().auth.getSession()).data.session, null);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test("email recovery stays in one tab through callback, reset and one login navigation across browser states", async () => {
  const bundle = await build({
    stdin: { contents: 'import React from "react"; import {hydrateRoot} from "react-dom/client"; import {ResetPasswordForm} from "./app/account/reset-password/reset-password-form"; hydrateRoot(document.getElementById("reset-form"), <ResetPasswordForm/>);',
      resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    plugins: [{ name: "fixture-link", setup(builder) {
      builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: 'import React from "react"; export default function Link(props) { return React.createElement("a", props); }', resolveDir: process.cwd() }));
    } }],
  });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const state of ["fresh", "signed-out", "authenticated", "stale-cookie", "expired-link", "consumed-link"]) {
      let origin = "http://localhost:3000";
      const h = harness();
      if (["signed-out", "authenticated", "consumed-link"].includes(state)) {
        await h.client().auth.signInWithPassword({ email: "fixture@example.test", password: "fixture-password" });
        if (state === "signed-out") await h.client().auth.signOut({ scope: "local" });
      }
      if (state === "stale-cookie") h.jar.set("cyber_password_recovery", "stale-marker");
      await h.issueRecovery();
      if (state === "expired-link") h.rejectCode("expired");
      if (state === "consumed-link") {
        const consumed = await h.load("lib/auth/callback-handler.ts").handleAuthCallback(new Request(origin + "/auth/callback?code=fixture-code"),
          { createClient: async (headers) => h.client(headers), captureOperationalIssue() {} });
        h.apply(consumed);
      }
      const context = await browser.newContext();
      const page = await context.newPage();
      const navigations = [];
      const documents = [];
      const errors = [];
      let exchanges = 0;
      let completions = 0;
      page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) navigations.push(new URL(frame.url()).pathname); });
      page.on("pageerror", (error) => errors.push(error.message));
      const handleRoute = async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/favicon.ico") return route.fulfill({ status: 204, body: "" });
        if (route.request().isNavigationRequest()) documents.push(url.pathname);
        const redirect = (destination) => route.fulfill({ status: 302, headers: { location: destination, "cache-control": "no-store" }, body: "" });
        // Only the email transport/provider verification redirect is synthetic.
        // The callback, middleware, server page, form and completion handler are real.
        if (url.pathname === "/email/recovery") return redirect(origin + "/auth/v1/verify");
        if (url.pathname === "/auth/v1/verify") return redirect(origin + "/auth/callback?code=fixture-code&utm_source=email");
        if (url.pathname === "/auth/callback") {
          exchanges++;
          const response = await h.load("lib/auth/callback-handler.ts").handleAuthCallback(new Request(url),
            { createClient: async (headers) => h.client(headers), captureOperationalIssue() {} });
          h.apply(response);
          return redirect(response.headers.get("location"));
        }
        if (url.pathname === "/form.js") return route.fulfill({ contentType: "application/javascript", body: bundle.outputFiles[0].text });
        if (url.pathname === "/api/auth/password-reset/complete") {
          completions++;
          const response = await h.load("app/api/auth/password-reset/complete/route.ts").POST(h.request(url.pathname, route.request().postDataJSON()));
          h.apply(response);
          return route.fulfill({ status: response.status, contentType: "application/json", body: await response.text() });
        }
        const guard = await h.guard(url.pathname + url.search);
        if (guard.headers.has("location")) return redirect(guard.headers.get("location"));
        if (url.pathname === "/login") return route.fulfill({ contentType: "text/html", body: '<h1>Sign in</h1><p>Request a new reset link if your email link expired.</p>' });
        assert.equal(url.pathname, "/account/reset-password", `unexpected page in ${state}`);
        const serverPage = await h.load("app/account/reset-password/page.tsx").default();
        const html = renderToStaticMarkup(serverPage);
        const form = renderToString(React.createElement(h.load("app/account/reset-password/reset-password-form.tsx").ResetPasswordForm));
        const active = html.includes("Set a new password");
        const rootLayout = renderToStaticMarkup(await h.load("app/layout.tsx").default({ children: serverPage }));
        assert.doesNotMatch(rootLayout, /data-enterprise-shell/, state);
        return route.fulfill({ contentType: "text/html", body: active
          ? `<!doctype html><html><body><div id="reset-form">${form}</div><script src="/form.js"></script></body></html>`
          : `<!doctype html><html><body>${html}</body></html>` });
      };
      const server = createServer((request, response) => { void (async () => {
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const body = Buffer.concat(chunks).toString();
        await handleRoute({
          request: () => ({ url: () => origin + request.url, isNavigationRequest: () => request.headers["sec-fetch-dest"] === "document",
            postDataJSON: () => JSON.parse(body) }),
          fulfill: async ({ status = 200, headers = {}, contentType, body: content = "" }) => {
            response.writeHead(status, { ...headers, ...(contentType ? { "content-type": contentType } : {}) });
            response.end(content);
          },
        });
      })().catch((error) => { errors.push(error.message); response.writeHead(500); response.end("Fixture failed"); }); });
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      origin = `http://127.0.0.1:${server.address().port}`;
      try {
        await page.goto(origin + "/email/recovery");
        if (["expired-link", "consumed-link"].includes(state)) {
          await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
          assert.deepEqual(navigations, ["/login"], state);
          assert.equal(await page.getByLabel("New password", { exact: true }).count(), 0);
        } else {
          await page.getByRole("heading", { name: "Set a new password", exact: true }).waitFor();
          await page.getByLabel("New password", { exact: true }).fill("fixture-new-password");
          await page.getByLabel("Confirm new password", { exact: true }).fill("fixture-new-password");
          assert.deepEqual(navigations, ["/account/reset-password"], state);
          await page.screenshot({ path: `artifacts/recovery-${state}.png` });
          await page.getByRole("button", { name: "Update password", exact: true }).click();
          await page.waitForURL(origin + "/login?password_updated=1");
          assert.deepEqual(navigations, ["/account/reset-password", "/login"], state);
          assert.equal(completions, 1);
          assert.equal((await h.client().auth.getSession()).data.session, null);
          assert.equal(h.jar.has("cyber_password_recovery"), false);
        }
        assert.equal(exchanges, 1, state);
        assert.equal(context.pages().length, 1, state);
        assert.ok(documents.every((pathname) => ["/email/recovery", "/auth/v1/verify", "/auth/callback", "/account/reset-password", "/login"].includes(pathname)), state);
        assert.deepEqual(errors, [], state);
      } finally {
        await context.close();
        await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
      }
    }
  } finally { await browser.close(); }
});
