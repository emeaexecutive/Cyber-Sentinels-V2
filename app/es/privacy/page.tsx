import { publicPageAlternates } from "@/lib/i18n/public-locales";
import { publicSocialMetadata } from "@/lib/search/metadata";
import { PrivacyPageContent } from "@/src/components/consent/PrivacyPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  ...publicSocialMetadata("Privacidad y preferencias de confianza | Cyber Sentinels", "Información sobre identificadores de cuenta, flujos gobernados, preferencias de consentimiento y controles de privacidad.", "/privacy"),
  title: "Privacidad y preferencias de confianza | Cyber Sentinels",
  description: "Información sobre identificadores de cuenta, flujos gobernados, preferencias de consentimiento y controles de privacidad.",
  alternates: publicPageAlternates("/privacy", "es"),
};

export default function Page() {
  return <PrivacyPageContent locale="es" />;
}
