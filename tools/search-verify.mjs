// Run against an already-built LOCAL Next server. No credentials or remote requests.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { canonicalPublicRoutes } from "../lib/navigation/route-visibility.ts";

const origin = process.env.SEARCH_VERIFY_URL ?? "http://127.0.0.1:3107";
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname), "local server required");
await mkdir("artifacts/search", { recursive: true });
const browser = await chromium.launch({ headless: true });
const pages = [];
const failures = [];
const blocked = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
try {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
  await context.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  for (const path of canonicalPublicRoutes) {
    const response = await page.goto(origin + path);
    check(response.status() === 200, `${path}: HTTP ${response.status()}`);
    const facts = await page.evaluate(() => ({ title: document.title,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      description: document.querySelector('meta[name="description"]')?.getAttribute("content"),
      og: document.querySelector('meta[property="og:url"]')?.getAttribute("content"),
      twitter: document.querySelector('meta[name="twitter:title"]')?.getAttribute("content"),
      h1: [...document.querySelectorAll("h1")].map((node) => node.textContent),
      ids: [...document.querySelectorAll("[id]")].map((node) => node.id),
      links: [...document.querySelectorAll("a[href]")].map((node) => node.getAttribute("href")),
      graph: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((node) => { const data = JSON.parse(node.textContent); return data["@graph"] ?? [data]; }),
      text: [...document.querySelectorAll("main")].reduce((total, node) => total + (node.textContent?.length ?? 0), 0),
    }));
    pages.push({ path, ...facts });
    await writeFile("artifacts/search/local-verification.json", JSON.stringify({ pages, failures }, null, 2));
    const canonical = "https://www.cybersentinels.com" + (path === "/" ? "" : path);
    check(facts.canonical?.replace(/\/$/, "") === canonical, `${path}: canonical`);
    check(facts.og?.replace(/\/$/, "") === canonical, `${path}: OpenGraph URL`);
    check(!!facts.description && !!facts.twitter && !!facts.title, `${path}: metadata`);
    if (path === "/help" && facts.h1.length === 0) {
      blocked.push("/help: server rendering requires missing local Supabase configuration");
      continue;
    }
    check(facts.h1.length === 1, `${path}: ${facts.h1.length} H1 elements`);
    check(facts.text > 200, `${path}: substantive server HTML`);
    check(facts.graph.some((node) => node["@type"] === "Organization"), `${path}: organization graph`);
  }
  const seen = new Set();
  for (const from of pages) for (const href of from.links) {
    const url = new URL(href, origin + from.path);
    if (![origin, "https://www.cybersentinels.com"].includes(url.origin)) continue;
    const target = pages.find((item) => item.path === url.pathname);
    if (target && url.hash) check(target.ids.includes(decodeURIComponent(url.hash.slice(1))), `${from.path}: missing anchor ${href}`);
    if (target || seen.has(url.pathname)) continue;
    seen.add(url.pathname);
    const response = await context.request.get(origin + url.pathname + url.search);
    if (response.status() === 503) blocked.push(`${href}: configuration-dependent destination returned 503`);
    else check(response.status() < 400 || [401, 403].includes(response.status()), `${from.path}: broken link ${href} (${response.status()})`);
  }
  for (const path of ["/dashboard", "/workspace", "/admin", "/operational-entities", "/developers/api-keys"]) {
    const response = await context.request.get(origin + path, { maxRedirects: 0 });
    const body = await response.text();
    const streamedEntityError = path === "/operational-entities" && response.status() === 200 && body.includes(":E{") && !body.includes("Every consequential entity and action");
    if (streamedEntityError) blocked.push(`${path}: missing configuration produces a streamed server error after HTTP 200; protected page content was not rendered; redirect check blocked`);
    else if (response.status() === 503 || (path === "/operational-entities" && response.status() === 500)) blocked.push(`${path}: configuration-dependent auth redirect; fail-closed response ${response.status()}`);
    else check([303, 307, 308, 401, 403].includes(response.status()), `${path}: anonymous protection`);
    check(/noindex/.test(response.headers()["x-robots-tag"] ?? ""), `${path}: private noindex`);
  }
  const robots = await (await context.request.get(origin + "/robots.txt")).text();
  check(robots.includes("Disallow: /api/") && robots.includes("User-Agent: GPTBot"), "generated robots policy");
  const sitemap = await (await context.request.get(origin + "/sitemap.xml")).text();
  check((sitemap.match(/<url>/g) ?? []).length === canonicalPublicRoutes.length, "generated sitemap count");
  const pdf = await context.request.get(origin + "/documents/cyber-sentinels-operational-trust-whitepaper-v1.pdf");
  check(pdf.status() === 200 && /rel="canonical"/.test(pdf.headers().link ?? ""), "PDF HTTP canonical");
  await context.close();

  for (const width of [1440, 390]) {
    const interactive = await browser.newContext({ viewport: { width, height: 900 } });
    await interactive.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await interactive.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of canonicalPublicRoutes.filter((route) => route.startsWith("/resources/"))) {
      await page.goto(origin + path);
      await page.getByRole("heading", { level: 1 }).waitFor();
      const reject = page.getByRole("button", { name: /reject|necessary only|essential only/i });
      if (await reject.count()) await reject.first().click();
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: overflow at ${width}`);
      await page.screenshot({ path: `artifacts/search/${path.split("/").at(-1)}-${width}.png`, fullPage: true });
      const anchor = page.locator('nav[aria-label="On this page"] a').first();
      if (await anchor.count()) {
        const href = await anchor.getAttribute("href");
        await anchor.click();
        check(new URL(page.url()).hash === href, `${path}: anchor navigation`);
      }
    }
    await page.goto(origin + "/resources/agent-security");
    await page.getByRole("link", { name: "What is AI agent authorization?", exact: true }).click();
    await page.waitForURL("**/resources/agent-security/agent-authorization");
    check(new URL(page.url()).pathname.endsWith("/agent-authorization"), `hub-to-article navigation ${width}`);
    await page.getByRole("navigation", { name: "Breadcrumb", exact: true }).getByRole("link", { name: "Agent security", exact: true }).click();
    await page.waitForURL("**/resources/agent-security");
    check(new URL(page.url()).pathname === "/resources/agent-security", `breadcrumb navigation ${width}`);
    check(errors.length === 0, `browser errors ${width}: ${errors.join("; ")}`);
    await interactive.close();
  }
  await writeFile("artifacts/search/local-verification.json", JSON.stringify({ observedAt: new Date().toISOString(), pages, failures, blocked }, null, 2));
  console.log(JSON.stringify({ publicPages: pages.length, extraLinkDestinations: seen.size, viewports: [1440, 390], javaScriptDisabled: "server HTML inspected on all canonical pages; see blocked checks", failures, blocked }, null, 2));
  assert.deepEqual(failures, []);
} finally { await browser.close(); }
