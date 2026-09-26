import type { Metadata } from "next";

export const SITE_URL = "https://www.cybersentinels.com";
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const SOFTWARE_ID = `${SITE_URL}/platform#software`;

export function publicSocialMetadata(title: string, description: string, path: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { type: "website", siteName: "Cyber Sentinels", title, description, url: `${SITE_URL}${path === "/" ? "" : path}`, locale: "en_GB" },
    twitter: { card: "summary", title, description },
  };
}

export const organizationGraph = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": ORGANIZATION_ID, name: "Cyber Sentinels", url: SITE_URL,
      description: "Cyber Sentinels determines whether an autonomous agent is authorized to act and preserves the evidence explaining why." },
    { "@type": "WebSite", "@id": WEBSITE_ID, name: "Cyber Sentinels", url: SITE_URL,
      publisher: { "@id": ORGANIZATION_ID }, inLanguage: "en" },
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
