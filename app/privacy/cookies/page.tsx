import { ConsentCookieCatalogue } from "@/src/components/consent/ConsentCookieCatalogue";
import { publicPageAlternates } from "@/lib/i18n/public-locales";
import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  ...publicSocialMetadata("Cookie and Tracker Catalogue | Cyber Sentinels", "Cookie and tracker categories, providers, purposes, storage and retention.", "/privacy/cookies"),
  title: "Cookie and Tracker Catalogue | Cyber Sentinels",
  description: "Cookie and tracker categories, providers, purposes, storage and retention.",
  alternates: publicPageAlternates("/privacy/cookies"),
};

export default function PrivacyCookiesPage() {
  return <ConsentCookieCatalogue locale="en" />;
}
