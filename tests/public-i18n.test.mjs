import assert from "node:assert/strict";
import test from "node:test";
import { harness } from "./fixtures/sign-out-session.mjs";

const h = harness();
const { PUBLIC_SOURCE_LOCALE, publicLocales, getPublishedPublicEquivalents, publicPageAlternates } = h.load("lib/i18n/public-locales.ts");
const { canonicalPublicRoutes } = h.load("lib/navigation/route-visibility.ts");
const { securityResources, RESOURCE_ROOT } = h.load("lib/search/resources.ts");
const articleModule = h.load("app/resources/agent-security/[slug]/page.tsx");
const hubModule = h.load("app/resources/agent-security/page.tsx");

test("locale foundation preserves every English canonical and advertises no unpublished translation", () => {
  assert.equal(PUBLIC_SOURCE_LOCALE, "en");
  assert.deepEqual(Object.keys(publicLocales), ["en", "es"]);
  assert.equal(publicLocales.es.contentStatus, "PENDING");
  for (const path of canonicalPublicRoutes) {
    assert.deepEqual(getPublishedPublicEquivalents(path), { en: path });
    assert.deepEqual(publicPageAlternates(path), { canonical: path });
    assert.throws(() => publicPageAlternates(path, "es"), /not published/);
  }
});

test("locale lookup does not manufacture equivalents for private, missing, redirected or malformed paths", () => {
  for (const path of [
    "/es", "/es/platform", "/es/resources/agent-security", "/en/platform", "/fr/platform",
    "/login", "/auth/callback", "/account/reset-password", "/dashboard", "/api/v1/agents",
    "/about-us", "/not-a-page", "/platform?lang=es", "/platform#execution-trust",
    "/platform/", "/PLATFORM", "//example.com/platform", "https://example.com/platform",
  ]) {
    assert.deepEqual(getPublishedPublicEquivalents(path), {}, path);
    assert.throws(() => publicPageAlternates(path), /not published/, path);
  }
});

test("an unpublished locale cannot silently fall back to English metadata", () => {
  for (const locale of ["es", "fr", "en-US", "EN", "", "__proto__", "constructor"]) {
    assert.throws(() => publicPageAlternates("/platform", locale), /not published/, locale);
  }
  const equivalents = getPublishedPublicEquivalents("/platform");
  equivalents.es = "/es/platform";
  assert.throws(() => publicPageAlternates("/platform", "es"), /not published/);
});

test("resource metadata keeps current English URLs, text and social locale without hreflang", async () => {
  assert.equal(hubModule.metadata.alternates.canonical, RESOURCE_ROOT);
  assert.equal(hubModule.metadata.alternates.languages, undefined);
  assert.equal(hubModule.metadata.openGraph.locale, "en_GB");
  assert.deepEqual(articleModule.generateStaticParams(), securityResources.map(({ slug }) => ({ slug })));
  for (const resource of securityResources) {
    const metadata = await articleModule.generateMetadata({ params: Promise.resolve({ slug: resource.slug }) });
    assert.deepEqual(metadata.alternates, { canonical: `${RESOURCE_ROOT}/${resource.slug}` });
    assert.equal(metadata.description, resource.description);
    assert.equal(metadata.openGraph.locale, "en_GB");
  }
  const sitemap = h.load("app/sitemap.ts").default();
  assert.equal(sitemap.length, 42);
  assert.equal(sitemap.some(({ url }) => new URL(url).pathname.startsWith("/es")), false);
});
