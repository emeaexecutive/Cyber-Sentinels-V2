import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server.js";
import { harness } from "./fixtures/sign-out-session.mjs";

const h = harness();
const {
  PUBLIC_SOURCE_LOCALE,
  publicLocales,
  getPublishedPublicEquivalents,
  getSpanishSourcePath,
  isPublishedSpanishPath,
  localizedPublicHref,
  publicEnglishFallbackHref,
  publicPageAlternates,
  resolveSpanishRequestPath,
} = h.load("lib/i18n/public-locales.ts");
const { canonicalPublicRoutes } = h.load("lib/navigation/route-visibility.ts");
const { securityResources, RESOURCE_ROOT } = h.load("lib/search/resources.ts");
const { organizationGraph } = h.load("lib/search/metadata.ts");
const articleModule = h.load("app/resources/agent-security/[slug]/page.tsx");
const hubModule = h.load("app/resources/agent-security/page.tsx");

test("locale foundation preserves English canonicals and advertises only published Spanish pages", () => {
  assert.equal(PUBLIC_SOURCE_LOCALE, "en");
  assert.deepEqual(Object.keys(publicLocales), ["en", "es"]);
  assert.equal(publicLocales.es.contentStatus, "PARTIAL");
  assert.deepEqual(organizationGraph["@graph"][1].inLanguage, ["en", "es"]);
  const translated = new Map(canonicalPublicRoutes.map(path => [path, `/es${path === "/" ? "" : path}`]));
  for (const path of canonicalPublicRoutes) {
    const spanishPath = translated.get(path);
    assert.deepEqual(getPublishedPublicEquivalents(path), {
      en: path,
      ...(spanishPath ? { es: spanishPath } : {}),
    });
    assert.deepEqual(publicPageAlternates(path), {
      canonical: path,
      ...(spanishPath ? { languages: { en: path, es: spanishPath, "x-default": path } } : {}),
    });
    if (spanishPath) {
      assert.deepEqual(publicPageAlternates(path, "es"), {
        canonical: spanishPath,
        languages: { en: path, es: spanishPath, "x-default": path },
      });
    } else {
      assert.throws(() => publicPageAlternates(path, "es"), /not published/);
    }
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

test("Spanish URLs resolve only reviewed routes and unavailable pages keep a safe English fallback", () => {
  assert.deepEqual(resolveSpanishRequestPath("/es"), { kind: "translated", sourcePath: "/" });
  assert.deepEqual(resolveSpanishRequestPath("/es/platform"), { kind: "translated", sourcePath: "/platform" });
  assert.deepEqual(resolveSpanishRequestPath("/es/demo"), { kind: "unavailable", sourcePath: "/demo" });
  assert.deepEqual(
    resolveSpanishRequestPath("/es/resources/agent-security/agent-authorization"),
    { kind: "translated", sourcePath: "/resources/agent-security/agent-authorization" },
  );
  assert.deepEqual(resolveSpanishRequestPath("/es/privacy/preferences"), {
    kind: "unavailable",
    sourcePath: "/privacy/preferences",
  });
  assert.deepEqual(resolveSpanishRequestPath("/es/unavailable"), { kind: "unavailable-page" });
  assert.deepEqual(resolveSpanishRequestPath("/es/not-a-page"), { kind: "unknown" });
  assert.equal(getSpanishSourcePath("/es/pricing"), "/pricing");
  assert.equal(isPublishedSpanishPath("/es/pricing"), true);
  assert.equal(isPublishedSpanishPath("/es/solutions"), true);
  assert.equal(localizedPublicHref("/platform?source=nav#execution", "es"), "/es/platform?source=nav#execution");
  assert.equal(localizedPublicHref("/es/platform?source=nav#execution", "en"), "/platform?source=nav#execution");
  assert.equal(
    localizedPublicHref("/solutions?source=nav", "es"),
    "/es/solutions?source=nav",
  );
  assert.equal(localizedPublicHref("/es/unavailable?path=%2Fsolutions", "en"), "/solutions");
  assert.equal(localizedPublicHref("https://example.com", "es"), "https://example.com");
  assert.equal(publicEnglishFallbackHref("/knowledge-base?query=security"), "/knowledge-base?query=security");
  assert.equal(publicEnglishFallbackHref("/privacy/preferences"), "/privacy/preferences");
  assert.equal(
    publicEnglishFallbackHref("/resources/agent-security/agent-authorization"),
    "/resources/agent-security/agent-authorization",
  );
  assert.equal(publicEnglishFallbackHref("/resources/agent-security/not-published"), "/");
  assert.equal(publicEnglishFallbackHref("//evil.example/path"), "/");
  assert.equal(publicEnglishFallbackHref("/api/admin"), "/");
});

test("middleware selects real Spanish routes without bypassing existing public-route checks", async () => {
  const translated = await h.guard("/es/platform", {
    "x-public-locale": "en",
    "x-public-source-path": "/admin",
  });
  assert.equal(translated.headers.get("x-middleware-rewrite"), null);
  assert.equal(translated.headers.get("x-middleware-request-x-public-locale"), "es");
  assert.equal(translated.headers.get("x-middleware-request-x-public-source-path"), "/platform");

  const unavailable = await h.guard("/es/demo?source=nav");
  const destination = new URL(unavailable.headers.get("location"));
  assert.equal(destination.pathname, "/es/unavailable");
  assert.equal(destination.searchParams.get("path"), "/demo?source=nav");
  assert.equal(unavailable.status, 307);
  assert.equal((await h.guard(destination.pathname + destination.search)).headers.get("x-middleware-request-x-public-locale"), "es");
  assert.equal(unavailable.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");

  const protectedPath = await h.guard("/dashboard");
  assert.equal(protectedPath.status, 307);
  assert.equal(new URL(protectedPath.headers.get("location")).pathname, "/login");

  const english = await h.guard("/platform", {
    "x-public-locale": "es",
    "x-public-source-path": "/admin",
  });
  assert.equal(english.headers.get("x-middleware-request-x-public-locale"), "en");
  assert.equal(english.headers.get("x-middleware-request-x-public-source-path"), null);

  const spoofedLocale = new NextRequest("http://localhost:3000/platform", {
    headers: { "x-public-locale": "es", "x-public-source-path": "/admin" },
  });
  await h.load("middleware.ts").middleware(spoofedLocale);
  assert.equal(spoofedLocale.headers.get("x-public-locale"), null);
  assert.equal(spoofedLocale.headers.get("x-public-source-path"), null);
});

test("an unsupported locale cannot silently fall back to English metadata", () => {
  for (const locale of ["fr", "en-US", "EN", "", "__proto__", "constructor"]) {
    assert.throws(() => publicPageAlternates("/platform", locale), /not published/, locale);
  }
  const equivalents = getPublishedPublicEquivalents("/platform");
  const expectedSpanishMetadata = publicPageAlternates("/platform", "es");
  equivalents.es = "/es/unreviewed";
  assert.deepEqual(publicPageAlternates("/platform", "es"), expectedSpanishMetadata);
});

test("resource metadata keeps English URLs and social locale with reciprocal Spanish alternates", async () => {
  assert.equal(hubModule.metadata.alternates.canonical, RESOURCE_ROOT);
  assert.equal(hubModule.metadata.alternates.languages.es, `/es${RESOURCE_ROOT}`);
  assert.equal(hubModule.metadata.openGraph.locale, "en_GB");
  assert.deepEqual(articleModule.generateStaticParams(), securityResources.map(({ slug }) => ({ slug })));
  for (const resource of securityResources) {
    const metadata = await articleModule.generateMetadata({ params: Promise.resolve({ slug: resource.slug }) });
    assert.equal(metadata.alternates.canonical, `${RESOURCE_ROOT}/${resource.slug}`);
    assert.equal(metadata.alternates.languages.es, `/es${RESOURCE_ROOT}/${resource.slug}`);
    assert.equal(metadata.description, resource.description);
    assert.equal(metadata.openGraph.locale, "en_GB");
  }
  const sitemap = h.load("app/sitemap.ts").default();
  assert.equal(sitemap.length, 90);
  assert.equal(sitemap.some(({ url }) => new URL(url).pathname === "/es/platform"), true);
  assert.equal(sitemap.some(({ url }) => new URL(url).pathname === "/es/solutions"), true);
});
