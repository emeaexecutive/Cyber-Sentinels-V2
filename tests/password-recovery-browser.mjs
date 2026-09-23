import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
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
