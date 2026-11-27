import { ConsentCookieCatalogue } from "@/src/components/consent/ConsentCookieCatalogue";
import { publicPageAlternates } from "@/lib/i18n/public-locales";
import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  ...publicSocialMetadata("Catálogo de cookies y rastreadores | Cyber Sentinels", "Categorías de cookies y rastreadores, proveedores, finalidades, almacenamiento y conservación.", "/privacy/cookies"),
  title: "Catálogo de cookies y rastreadores | Cyber Sentinels",
  description: "Categorías de cookies y rastreadores, proveedores, finalidades, almacenamiento y conservación.",
  alternates: publicPageAlternates("/privacy/cookies", "es"),
};

export default function PrivacyCookiesPage() {
  return <ConsentCookieCatalogue locale="es" />;
}
