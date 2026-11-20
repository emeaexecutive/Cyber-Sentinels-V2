import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";
import { publicPageAlternates } from "@/lib/i18n/public-locales";
import { PrivacyPageContent } from "@/src/components/consent/PrivacyPageContent";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  ...publicSocialMetadata("Privacy | Cyber Sentinels", "Publication status: this page is under review; an approved version has not been published.", "/privacy"),
  title: "Privacy | Cyber Sentinels",
  description: "Publication status: this page is under review; an approved version has not been published.",
  alternates: publicPageAlternates("/privacy"),
};

export default function PrivacyPage() {
  return <PrivacyPageContent />;
}
