import { ConsentCookieCatalogue } from "@/src/components/consent/ConsentCookieCatalogue";
import { publicPageAlternates } from "@/lib/i18n/public-locales";
import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  ...publicSocialMetadata("Cookies y preferencias | Cyber Sentinels", "Categorías de cookies y rastreadores, proveedores, finalidades, almacenamiento y conservación.", "/cookies"),
  title: "Cookies y preferencias | Cyber Sentinels",
  description: "Categorías de cookies y rastreadores, proveedores, finalidades, almacenamiento y conservación.",
  alternates: publicPageAlternates("/cookies", "es"),
};

export default function CookiesPage() {
  return <ConsentCookieCatalogue locale="es" />;
}
