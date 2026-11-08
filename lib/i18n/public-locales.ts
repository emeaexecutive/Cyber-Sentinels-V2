import type { Metadata } from "next";
import { canonicalPublicRoutes } from "@/lib/navigation/route-visibility";
import { RESOURCE_ROOT, securityResources } from "@/lib/search/resources";

export const PUBLIC_SOURCE_LOCALE = "en" as const;
export const publicLocales = {
  en: { languageTag: "en", openGraphLocale: "en_GB", contentStatus: "PUBLISHED" },
  es: { languageTag: "es", openGraphLocale: "es_ES", contentStatus: "PARTIAL" },
} as const;

export type PublicLocale = keyof typeof publicLocales;
type CanonicalPublicPath = (typeof canonicalPublicRoutes)[number];

const publishedSpanishPages: Readonly<Partial<Record<CanonicalPublicPath, `/es${string}`>>> = {
  "/": "/es",
  "/platform": "/es/platform",
  "/pricing": "/es/pricing",
  "/help": "/es/help",
  "/enterprise-access": "/es/enterprise-access",
  "/regulatory": "/es/regulatory",
  "/media-centre": "/es/media-centre",
  "/our-people": "/es/our-people",
  "/careers": "/es/careers",
  "/accessibility": "/es/accessibility",
  "/privacy": "/es/privacy",
  "/terms": "/es/terms",
  "/cookies": "/es/cookies",
  "/legal": "/es/legal",
  "/modern-slavery": "/es/modern-slavery",
  "/security": "/es/security",
  "/solutions": "/es/solutions",
  "/trust": "/es/trust",
  "/trust/data-sovereignty": "/es/trust/data-sovereignty",
  "/verification-replay": "/es/verification-replay",
  "/enterprise": "/es/enterprise",
  "/enterprise/agent-governance": "/es/enterprise/agent-governance",
  "/enterprise/buyer-documentation": "/es/enterprise/buyer-documentation",
  "/enterprise/hiring-security": "/es/enterprise/hiring-security",
  "/enterprise/pilot": "/es/enterprise/pilot",
  "/enterprise/pilot-checklist": "/es/enterprise/pilot-checklist",
  "/developers": "/es/developers",
  "/developers/docs": "/es/developers/docs",
  "/developers/authentication": "/es/developers/authentication",
  "/developers/api-reference": "/es/developers/api-reference",
  "/developers/quickstart": "/es/developers/quickstart",
  "/governance": "/es/governance",
  "/resources/agent-security": "/es/resources/agent-security",
  "/resources/agent-security/agent-authorization": "/es/resources/agent-security/agent-authorization",
  "/resources/agent-security/mcp-tool-authorization": "/es/resources/agent-security/mcp-tool-authorization",
  "/resources/agent-security/synthetic-interaction-trust": "/es/resources/agent-security/synthetic-interaction-trust",
  "/documents": "/es/documents",
  "/documents/operational-trust-whitepaper": "/es/documents/operational-trust-whitepaper",
  "/methodology": "/es/methodology",
  "/journal": "/es/journal",
  "/about": "/es/about",
  "/about/mission": "/es/about/mission",
};
const canonicalPaths: ReadonlySet<string> = new Set(canonicalPublicRoutes);
const publishedEnglishResourcePaths = new Set(
  securityResources.map(({ slug }) => `${RESOURCE_ROOT}/${slug}`),
);
const englishOnlyFallbackPaths = new Set([
  "/login",
  "/demo",
  "/verify/candidate",
  "/verify/session",
  "/dashboard/governance",
  "/trust-replay",
  "/verification-receipts",
  "/knowledge-base",
  "/privacy/preferences",
  "/privacy/consent-history",
]);
const spanishSources = new Map<string, string>();
for (const [source, translated] of Object.entries(publishedSpanishPages)) {
  if (translated) spanishSources.set(translated, source);
}

export function getPublishedPublicEquivalents(sourcePath: string): Partial<Record<PublicLocale, string>> {
  if (!canonicalPaths.has(sourcePath)) return {};
  const spanishPath = publishedSpanishPages[sourcePath as CanonicalPublicPath];
  return {
    en: sourcePath,
    ...(spanishPath ? { es: spanishPath } : {}),
  };
}

export function getSpanishSourcePath(pathname: string) {
  if (pathname === "/es" || pathname === "/es/") return "/";
  return spanishSources.get(pathname) ?? null;
}

export function isPublishedSpanishPath(pathname: string) {
  return pathname === "/es" || pathname === "/es/" || spanishSources.has(pathname);
}

export function publicEnglishFallbackHref(candidate: string | null | undefined) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return "/";
  const parsed = new URL(candidate, "https://public.invalid");
  if (
    parsed.origin !== "https://public.invalid" ||
    (!canonicalPaths.has(parsed.pathname) &&
      !englishOnlyFallbackPaths.has(parsed.pathname) &&
      !publishedEnglishResourcePaths.has(parsed.pathname))
  ) return "/";
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function resolveSpanishRequestPath(pathname: string):
  | { kind: "translated"; sourcePath: string }
  | { kind: "unavailable"; sourcePath: string }
  | { kind: "unavailable-page" }
  | { kind: "unknown" } {
  if (pathname === "/es/unavailable") return { kind: "unavailable-page" };
  if (pathname === "/es" || pathname === "/es/") return { kind: "translated", sourcePath: "/" };
  if (!pathname.startsWith("/es/")) return { kind: "unknown" };

  const sourcePath = pathname.slice(3);
  if (getPublishedPublicEquivalents(sourcePath).es) return { kind: "translated", sourcePath };
  if (
    canonicalPaths.has(sourcePath) ||
    englishOnlyFallbackPaths.has(sourcePath) ||
    publishedEnglishResourcePaths.has(sourcePath)
  ) return { kind: "unavailable", sourcePath };
  return { kind: "unknown" };
}

export function localizedPublicHref(href: string, locale: PublicLocale) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const parsed = new URL(href, "https://public.invalid");
  if (parsed.origin !== "https://public.invalid") return href;

  if (parsed.pathname === "/es/unavailable") {
    return locale === "en" ? publicEnglishFallbackHref(parsed.searchParams.get("path")) : href;
  }
  const sourcePath = getSpanishSourcePath(parsed.pathname) ?? parsed.pathname;
  if (locale === "en") return `${sourcePath}${parsed.search}${parsed.hash}`;

  const translatedPath = getPublishedPublicEquivalents(sourcePath).es;
  if (translatedPath) return `${translatedPath}${parsed.search}${parsed.hash}`;

  return `/es/unavailable?path=${encodeURIComponent(`${sourcePath}${parsed.search}${parsed.hash}`)}`;
}

export function publicPageAlternates(
  sourcePath: string,
  locale: PublicLocale = PUBLIC_SOURCE_LOCALE,
): NonNullable<Metadata["alternates"]> {
  const equivalents = getPublishedPublicEquivalents(sourcePath);
  const canonical = Object.hasOwn(equivalents, locale) ? equivalents[locale] : undefined;
  if (!canonical) throw new Error("Public page translation is not published.");

  return {
    canonical,
    ...(Object.keys(equivalents).length > 1 ? { languages: { ...equivalents, "x-default": sourcePath } } : {}),
  };
}
