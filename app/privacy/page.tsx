import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";
import { PrivacyPageContent } from "@/src/components/consent/PrivacyPageContent";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  ...publicSocialMetadata("Privacy | Cyber Sentinels", "Cyber Sentinels privacy information, consent controls and trust preferences.", "/privacy"),
  title: "Privacy | Cyber Sentinels",
  description: "Publication status: this page is under review; an approved version has not been published.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <PrivacyPageContent />;
}
