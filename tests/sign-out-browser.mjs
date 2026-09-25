import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { chromium } from "@playwright/test";
import { harness } from "./fixtures/sign-out-session.mjs";

test("desktop/mobile real navigation posts logout; Back is denied; password login works again", async () => {
  const bundle = await build({
    stdin: { contents: 'import React from "react"; import {createRoot} from "react-dom/client"; import {GlobalNavigation} from "./components/global-navigation"; createRoot(document.getElementById("root")).render(<GlobalNavigation accessLevel="user"/>);',
      resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    plugins: [{ name: "fixture-next", setup(builder) {
      builder.onResolve({ filter: /^next\/(link|navigation)$/ }, (args) => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({ contents: args.path.endsWith("link")
        ? 'import React from "react"; export default function Link(props) { return React.createElement("a", props); }'
        : 'export const usePathname = () => window.location.pathname;', resolveDir: process.cwd() }));
    } }],
  });
  const css = await postcss([tailwindcss({ content: ["./components/global-navigation.tsx"], theme: {}, plugins: [] })])
    .process(await readFile("app/globals.css", "utf8"), { from: "app/globals.css" });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1280, 390]) {
      const h = harness();
      const login = () => h.client().auth.signInWithPassword({ email: "fixture@example.test", password: "fixture-password" });
      assert.equal((await login()).error, null);
      const page = await browser.newPage({ viewport: { width, height: 850 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const server = createServer((req, res) => { void (async () => {
        const url = new URL(req.url, "http://localhost");
        const send = (type, body) => { res.setHeader("Content-Type", type); res.end(body); };
        if (url.pathname === "/nav.js") return send("application/javascript", bundle.outputFiles[0].text);
        if (url.pathname === "/style.css") return send("text/css", css.css);
        if (url.pathname === "/api/auth/logout") {
          assert.equal(req.method, "POST");
          const response = await h.load("app/api/auth/logout/route.ts").POST(h.request(url.pathname, {}));
          h.apply(response);
          res.writeHead(response.status, { location: new URL(response.headers.get("location")).pathname, "cache-control": "no-store" });
          return res.end();
        }
        if (url.pathname === "/login") return send("text/html", "<h1>Sign in</h1>");
        const guarded = await h.guard(url.pathname);
        if (guarded.headers.has("location")) {
          const location = new URL(guarded.headers.get("location"));
          res.writeHead(guarded.status, { location: location.pathname + location.search });
          return res.end();
        }
        res.setHeader("Cache-Control", "no-store");
        return send("text/html", '<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/nav.js"></script></body></html>');
      })().catch((error) => { errors.push(error.message); res.statusCode = 500; res.end("Fixture failed"); }); });
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const origin = `http://127.0.0.1:${server.address().port}`;
      try {
      await page.goto(`${origin}/dashboard`);
      const button = page.getByRole("button", { name: "Sign Out", exact: true });
      await button.waitFor({ state: "visible" });
      const bounds = await button.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
      assert.ok(bounds.height >= 44);
      await page.evaluate(() => {
        localStorage.setItem("cyber_sentinels_session_started_at", "123");
        localStorage.setItem("cyber_sentinels_remember_session", "true");
      });
      await page.screenshot({ path: `artifacts/sign-out-${width}.png` });
      await button.click();
      await page.waitForURL((url) => url.pathname === "/login");
      assert.equal((await h.client().auth.getSession()).data.session, null);
      assert.equal(await page.evaluate(() => localStorage.getItem("cyber_sentinels_session_started_at")), null);
      assert.equal(await page.evaluate(() => localStorage.getItem("cyber_sentinels_remember_session")), "true");
      await page.goBack();
      await page.waitForURL((url) => url.pathname === "/login");
      await page.goto(`${origin}/workspace`);
      await page.waitForURL((url) => url.pathname === "/login");
      assert.equal((await login()).error, null);
      await page.goto(`${origin}/dashboard`);
      await button.waitFor({ state: "visible" });
      assert.deepEqual(errors, []);
      } finally {
        await page.close();
        await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
      }
    }
  } finally { await browser.close(); }
});
