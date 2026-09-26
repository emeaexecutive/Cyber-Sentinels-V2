import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { harness } from "./fixtures/sign-out-session.mjs";

const h = harness();
const { canonicalPublicRoutes, redirectedPublicRoutes, protectedRoutePrefixes, internalRoutePrefixes } = h.load("lib/navigation/route-visibility.ts");
const { securityResources, RESOURCE_ROOT } = h.load("lib/search/resources.ts");
const { organizationGraph, softwareGraph, serializeJsonLd, SITE_URL } = h.load("lib/search/metadata.ts");
const articleModule = h.load("app/resources/agent-security/[slug]/page.tsx");
const hubModule = h.load("app/resources/agent-security/page.tsx");
const asArray = (value) => Array.isArray(value) ? value : [value];
const graph = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap((match) => { const data = JSON.parse(match[1]); return data["@graph"] ?? [data]; });

test("sitemap includes only deliberate public owners, with stable editorial dates", () => {
  const entries = h.load("app/sitemap.ts").default();
  assert.equal(entries.length, new Set(entries.map((entry) => entry.url)).size);
  assert.deepEqual(entries.map((entry) => entry.url), canonicalPublicRoutes.map((route) => SITE_URL + (route === "/" ? "" : route)));
  for (const entry of entries) {
    assert.equal(entry.lastModified, entry.url.includes(RESOURCE_ROOT) ? "2026-09-25" : undefined);
    assert.doesNotMatch(entry.url, /\/api\/|\/admin|\/account|\/dashboard|\/trust-center|\/operational-entities/);
  }
});

test("preview noindex and the whitepaper HTTP canonical survive production header selection", async () => {
  const config = (await import("../next.config.mjs")).default;
  const previous = process.env.VERCEL_ENV;
  try {
    for (const environment of ["preview", "production"]) {
      process.env.VERCEL_ENV = environment;
      const headers = await config.headers();
      const global = headers.find((entry) => entry.source === "/:path*").headers;
      assert.equal(global.some((header) => header.key === "X-Robots-Tag" && header.value.includes("noindex")), environment === "preview");
      const pdf = headers.find((entry) => entry.source.endsWith(".pdf"));
      assert.equal(pdf.headers.find((header) => header.key === "Link").value, `<${SITE_URL}/documents/operational-trust-whitepaper>; rel="canonical"`);
    }
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
});

test("every search crawler gets private exclusions; training policy is separate; redirects remain crawlable", () => {
  const robots = h.load("app/robots.ts").default();
  assert.equal(existsSync("public/robots.txt"), false);
  assert.equal(robots.sitemap, SITE_URL + "/sitemap.xml");
  const search = robots.rules.find((rule) => asArray(rule.userAgent).includes("OAI-SearchBot"));
  for (const agent of ["*", "Googlebot", "bingbot", "Claude-SearchBot", "PerplexityBot", "Google-Extended"]) assert.ok(search.userAgent.includes(agent));
  for (const prefix of ["/api/", "/account/", "/auth/", "/operational-entities", ...protectedRoutePrefixes, ...internalRoutePrefixes]) assert.ok(search.disallow.includes(prefix), prefix);
  for (const { route } of redirectedPublicRoutes) assert.ok(search.allow.includes(route + "$"));
  for (const route of canonicalPublicRoutes) assert.equal(search.disallow.some((prefix) => route.startsWith(prefix)), false, route);
  for (const agent of ["GPTBot", "ClaudeBot"]) assert.equal(robots.rules.find((rule) => asArray(rule.userAgent).includes(agent)).disallow, "/");
});

test("public resources stay anonymous; private sessions and API boundaries retain denial and noindex", async () => {
  for (const path of [RESOURCE_ROOT, ...securityResources.map(({ slug }) => `${RESOURCE_ROOT}/${slug}`)]) {
    const response = await h.guard(path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-robots-tag"), null, path);
  }
  for (const path of ["/dashboard", "/workspace", "/admin", "/back-office", "/trust-replay"]) {
    const response = await h.guard(path);
    assert.equal(response.status, 307, path);
    assert.match(response.headers.get("x-robots-tag"), /noindex/, path);
    assert.equal(new URL(response.headers.get("location")).pathname, "/login", path);
  }
  // This surface authenticates inside its Server Component, before loading entities.
  const entityPage = readFileSync("app/operational-entities/page.tsx", "utf8");
  assert.match(entityPage, /if \(!user\) redirect\("\/login\?next=\/operational-entities"\)/);
  assert.ok(entityPage.indexOf("if (!user) redirect", entityPage.indexOf("export default")) < entityPage.indexOf("entities = await loadOperationalEntities"));
  for (const path of ["/api/admin/health", "/api/v1/agents", "/login", "/account/reset-password", "/agent-passport", "/operational-entities"]) {
    assert.match((await h.guard(path)).headers.get("x-robots-tag"), /noindex/, path);
  }
  assert.equal(h.calls.length, 0, "anonymous crawling must not contact Auth");
});

test("finite resource routes have unique canonical/social metadata and server-rendered answers", async () => {
  assert.equal(articleModule.dynamicParams, false);
  assert.deepEqual(articleModule.generateStaticParams(), securityResources.map(({ slug }) => ({ slug })));
  const titles = new Set();
  for (const resource of securityResources) {
    const props = { params: Promise.resolve({ slug: resource.slug }) };
    const metadata = await articleModule.generateMetadata(props);
    const url = `${SITE_URL}${RESOURCE_ROOT}/${resource.slug}`;
    assert.equal(metadata.alternates.canonical, `${RESOURCE_ROOT}/${resource.slug}`);
    assert.equal(metadata.openGraph.url, url);
    assert.equal(metadata.twitter.title, metadata.title);
    titles.add(metadata.title);
    const html = renderToStaticMarkup(await articleModule.default(props));
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
    assert.ok(html.includes(resource.answer.replaceAll("&", "&amp;")));
    for (const section of resource.sections) assert.ok(html.includes(`id="${section.id}"`));
    const nodes = graph(html);
    const article = nodes.find((node) => node["@type"] === "TechArticle");
    assert.equal(article.headline, resource.title);
    assert.equal(article.url, url);
    assert.deepEqual(article.citation, resource.sources.map(({ href }) => href));
    assert.equal(article.dateModified, "2026-09-25");
    const breadcrumbs = nodes.find((node) => node["@type"] === "BreadcrumbList").itemListElement;
    assert.deepEqual(breadcrumbs.map(({ position }) => position), [1, 2, 3]);
    assert.equal(breadcrumbs.at(-1).item, url);
  }
  assert.equal(titles.size, securityResources.length);
  await assert.rejects(articleModule.generateMetadata({ params: Promise.resolve({ slug: "invented-resource" }) }), /404/);
});

test("entity graph references resolve without invented people, ratings or offers; JSON-LD is script-safe", async () => {
  const nodes = [...organizationGraph["@graph"], softwareGraph, ...graph(renderToStaticMarkup(React.createElement(hubModule.default)))];
  for (const resource of securityResources) nodes.push(...graph(renderToStaticMarkup(await articleModule.default({ params: Promise.resolve({ slug: resource.slug }) }))));
  const ids = new Set(nodes.map((node) => node["@id"]));
  function check(value) {
    if (!value || typeof value !== "object") return;
    if (Object.keys(value).length === 1 && value["@id"]) assert.ok(ids.has(value["@id"]), value["@id"]);
    for (const nested of Object.values(value)) check(nested);
  }
  check(nodes);
  assert.doesNotMatch(JSON.stringify(nodes), /aggregateRating|sameAs|"Person"|"offers"/);
  const unsafe = { text: "</script><script>alert(1)</script>" };
  assert.equal(serializeJsonLd(unsafe).includes("<"), false);
  assert.deepEqual(JSON.parse(serializeJsonLd(unsafe)), unsafe);
});

test("resource links have explicit destinations; provider qualification and five trust facets remain distinct", () => {
  const { conceptDestinations } = h.load("lib/search/resources.ts");
  for (const href of [...conceptDestinations.map(([, href]) => href), ...securityResources.flatMap((resource) => resource.related.map((link) => link.href))]) {
    const [route, fragment] = href.split("#");
    assert.ok(canonicalPublicRoutes.includes(route), href);
    if (fragment) {
      const article = securityResources.find(({ slug }) => route === `${RESOURCE_ROOT}/${slug}`);
      if (article) assert.ok(article.sections.some(({ id }) => id === fragment), href);
      else assert.ok(readFileSync(`app${route}/page.tsx`, "utf8").includes(`id="${fragment}"`), href);
    }
  }
  const text = JSON.stringify(securityResources);
  for (const phrase of ["TRANSACTION_VERIFIED", "IDENTITY_VERIFIED", "AUTHORITY_VERIFIED", "CONTENT_INTERACTION_RISK", "EXECUTION_AUTHORIZED", "BLOCKED_EXTERNAL", "IMPLEMENTED NOT EXERCISED"]) assert.ok(text.includes(phrase), phrase);
  assert.doesNotMatch(text, /production[- ]qualified|certified by|guaranteed compliance/i);
});
