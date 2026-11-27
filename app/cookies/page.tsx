import { publicPageAlternates } from "@/lib/i18n/public-locales";
import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";
import { ConsentCookieCatalogue } from "@/src/components/consent/ConsentCookieCatalogue";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  ...publicSocialMetadata("Cookies and Preferences | Cyber Sentinels", "Cookie and tracker categories, providers, purposes, storage and retention.", "/cookies"),
  title: "Cookies and Preferences | Cyber Sentinels",
  description: "Cookie and tracker categories, providers, purposes, storage and retention.",
  alternates: publicPageAlternates("/cookies"),
};

export default function CookiesPage() {
  return <ConsentCookieCatalogue locale="en" />;
}
