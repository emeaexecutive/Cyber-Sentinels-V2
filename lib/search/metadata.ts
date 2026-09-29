import type { Metadata } from "next";
import { PUBLIC_SOURCE_LOCALE, publicLocales } from "@/lib/i18n/public-locales";

export const SITE_URL = "https://www.cybersentinels.com";
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const SOFTWARE_ID = `${SITE_URL}/platform#software`;

export function publicSocialMetadata(title: string, description: string, path: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { type: "website", siteName: "Cyber Sentinels", title, description, url: `${SITE_URL}${path === "/" ? "" : path}`, locale: publicLocales[PUBLIC_SOURCE_LOCALE].openGraphLocale },
    twitter: { card: "summary", title, description },
  };
}

export const organizationGraph = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": ORGANIZATION_ID, name: "Cyber Sentinels", url: SITE_URL,
      description: "Cyber Sentinels determines whether an autonomous agent is authorized to act and preserves the evidence explaining why." },
    { "@type": "WebSite", "@id": WEBSITE_ID, name: "Cyber Sentinels", url: SITE_URL,
      publisher: { "@id": ORGANIZATION_ID }, inLanguage: PUBLIC_SOURCE_LOCALE },
  ],
};

export const softwareGraph = {
  "@context": "https://schema.org", "@type": "SoftwareApplication", "@id": SOFTWARE_ID,
  name: "Cyber Sentinels", url: `${SITE_URL}/platform`, applicationCategory: "SecurityApplication",
  operatingSystem: "Web", publisher: { "@id": ORGANIZATION_ID },
  description: "Operational execution trust infrastructure connecting agent identity, authority, policy, decisions, receipts, Replay and Trust Memory.",
};

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
