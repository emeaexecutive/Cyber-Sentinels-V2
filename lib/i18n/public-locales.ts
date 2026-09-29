import type { Metadata } from "next";
import { canonicalPublicRoutes } from "@/lib/navigation/route-visibility";

export const PUBLIC_SOURCE_LOCALE = "en" as const;
export const publicLocales = {
  en: { languageTag: "en", openGraphLocale: "en_GB", plannedPathPrefix: "", contentStatus: "PUBLISHED" },
  es: { languageTag: "es", openGraphLocale: "es_ES", plannedPathPrefix: "/es", contentStatus: "PENDING" },
} as const;

export type PublicLocale = keyof typeof publicLocales;
type CanonicalPublicPath = (typeof canonicalPublicRoutes)[number];

// Add an entry only with its reviewed translation, real route and translated metadata.
// The locale registry alone must never publish a URL or advertise a language alternative.
const publishedSpanishPages: Readonly<Partial<Record<CanonicalPublicPath, `/es${string}`>>> = {};
const canonicalPaths: ReadonlySet<string> = new Set(canonicalPublicRoutes);

export function getPublishedPublicEquivalents(sourcePath: string): Partial<Record<PublicLocale, string>> {
  if (!canonicalPaths.has(sourcePath)) return {};
  const spanishPath = publishedSpanishPages[sourcePath as CanonicalPublicPath];
  return {
    en: sourcePath,
    ...(spanishPath ? { es: spanishPath } : {}),
  };
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
    ...(Object.keys(equivalents).length > 1 ? { languages: equivalents } : {}),
  };
}
