import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";
import { publicPageAlternates } from "@/lib/i18n/public-locales";
import { PrivacyPageContent } from "@/src/components/consent/PrivacyPageContent";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  ...publicSocialMetadata("Privacy and Trust Preferences | Cyber Sentinels", "Information about account identifiers, governed workflows, consent settings and privacy controls.", "/privacy"),
  title: "Privacy and Trust Preferences | Cyber Sentinels",
  description: "Information about account identifiers, governed workflows, consent settings and privacy controls.",
  alternates: publicPageAlternates("/privacy"),
};

export default function PrivacyPage() {
  return <PrivacyPageContent />;
}
