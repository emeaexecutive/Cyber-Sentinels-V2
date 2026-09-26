import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { canonicalPublicRoutes } from "../lib/navigation/route-visibility.ts";
import { harness } from "../tests/fixtures/sign-out-session.mjs";

const base = "https://www.cybersentinels.com";
const clean = (s = "") => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
async function pages(dir = "app") {
  const result = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${item.name}`;
    if (item.isDirectory()) result.push(...await pages(path));
    else if (item.name === "page.tsx") result.push(path);
  }
  return result;
}
const h = harness();
const inventory = [];
for (const file of await pages()) {
  const route = "/" + file.split("/").slice(1, -1).filter((part) => !part.startsWith("(")).join("/");
  const source = await readFile(file, "utf8");
  const metadata = source.slice(source.indexOf("export const metadata"));
  const guarded = await h.guard(route.replace(/\[[^\]]+\]/g, "audit-placeholder"));
  inventory.push({ route, file, sitemap: canonicalPublicRoutes.includes(route),
    title: metadata.match(/title:\s*"([^"]+)"/)?.[1] ?? null,
    canonical: metadata.match(/canonical:\s*"([^"]+)"/)?.[1] ?? null,
    client: /^\s*["']use client/.test(source),
    middlewareStatus: guarded.status, middlewareNoindex: guarded.headers.get("x-robots-tag"),
    routeAuth: /getUser\(|requireAdmin|requireUser|requireAuth|requireApi|resolveSessionTenant/.test(source),
    links: [...source.matchAll(/href=["']([^"']+)["']/g)].map((match) => match[1]),
  });
}
await mkdir("artifacts/search", { recursive: true });
await writeFile("artifacts/search/source-inventory.json", JSON.stringify(inventory, null, 2));
console.log(JSON.stringify({ routes: inventory.length, sitemap: inventory.filter((r) => r.sitemap).length,
  publicCandidates: inventory.filter((r) => r.middlewareStatus === 200 && !r.routeAuth).map((r) => ({ route: r.route, sitemap: r.sitemap, title: r.title, client: r.client })) }, null, 2));

if (process.argv.includes("--live")) {
  const results = [];
  const targets = ["/robots.txt", "/sitemap.xml", ...canonicalPublicRoutes];
  async function worker() {
    while (targets.length) {
      const path = targets.shift();
      try {
        const response = await fetch(base + path, { signal: AbortSignal.timeout(20000), redirect: "follow" });
        const html = await response.text();
        const meta = [...html.matchAll(/<meta\s+[^>]*>/g)].map((match) => match[0]);
        results.push({ path, status: response.status, finalUrl: response.url,
          xRobots: response.headers.get("x-robots-tag"), contentType: response.headers.get("content-type"),
          title: clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]),
          canonical: html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1] ?? null,
          h1: [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((match) => clean(match[1])),
          description: meta.find((tag) => /name="description"/.test(tag)) ?? null,
          robots: meta.filter((tag) => /name="(?:robots|googlebot)"/.test(tag)),
          og: meta.filter((tag) => /property="og:/.test(tag)), twitter: meta.filter((tag) => /name="twitter:/.test(tag)),
          jsonLdCount: (html.match(/application\/ld\+json/g) ?? []).length,
          links: [...html.matchAll(/<a\s+[^>]*href="([^"]+)"/g)].map((match) => match[1]),
          bytes: Buffer.byteLength(html),
          ...(path.endsWith(".txt") || path.endsWith(".xml") ? { body: html } : {}),
        });
      } catch (error) { results.push({ path, error: error.name }); }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  await writeFile("artifacts/search/production-baseline.json", JSON.stringify({ observedAt: new Date().toISOString(), results }, null, 2));
  console.log(JSON.stringify(results.map(({ path, status, error, xRobots, canonical, h1, jsonLdCount }) => ({ path, status, error, xRobots, canonical, h1, jsonLdCount })), null, 2));
}
