import type { MetadataRoute } from "next";
import { canonicalPublicRoutes } from "@/lib/navigation/route-visibility";
import { RESOURCE_REVIEWED } from "@/lib/search/resources";
import { getPublishedPublicEquivalents } from "@/lib/i18n/public-locales";

const baseUrl = "https://www.cybersentinels.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return canonicalPublicRoutes.flatMap((route) => {
    const equivalents = getPublishedPublicEquivalents(route);
    const englishUrl = `${baseUrl}${route === "/" ? "" : route}`;
    const spanishUrl = equivalents.es ? `${baseUrl}${equivalents.es}` : null;
    const alternates = spanishUrl
      ? { languages: { en: englishUrl, es: spanishUrl, "x-default": englishUrl } }
      : undefined;
    const entry = {
      // Unknown editorial dates are omitted rather than replaced with build time.
      ...(route.startsWith("/resources/agent-security") ? { lastModified: RESOURCE_REVIEWED } : {}),
      changeFrequency: route === "/" ? "weekly" as const : "monthly" as const,
      priority: route === "/" ? 1 : ["/platform", "/solutions", "/trust", "/enterprise", "/developers", "/pricing", "/documents/operational-trust-whitepaper"].includes(route) ? 0.8 : 0.5,
    };

    return [
      { url: englishUrl, ...(alternates ? { alternates } : {}), ...entry },
      ...(spanishUrl && alternates ? [{ url: spanishUrl, alternates, ...entry }] : []),
    ];
  });
}
