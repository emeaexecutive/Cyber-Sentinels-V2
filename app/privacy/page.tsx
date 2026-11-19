import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";
import { PrivacyPageContent } from "@/src/components/consent/PrivacyPageContent";

export const metadata: Metadata = {
  ...publicSocialMetadata("Privacy | Cyber Sentinels", "Cyber Sentinels privacy information, consent controls and trust preferences.", "/privacy"),
  title: "Privacy | Cyber Sentinels",
  description: "Cyber Sentinels privacy information, consent controls and trust preferences.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <PrivacyPageContent />;
}
