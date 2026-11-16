import type { Metadata } from "next";
import { KyaHomepageSection } from "@/components/kya-homepage-section";
import { getPublicRequestLocale } from "@/lib/i18n/request-locale";
import { publicPageAlternates } from "@/lib/i18n/public-locales";
import { publicSocialMetadata } from "@/lib/search/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPublicRequestLocale();
  const title = locale === "es" ? "KYA: identidad y autoridad de agentes de IA | Cyber Sentinels" : "KYA: AI Agent Identity & Authority | Cyber Sentinels";
  const description = locale === "es"
    ? "Cyber Sentinels está desarrollando KYA para conectar la identidad del agente, la autoridad delegada y las decisiones de TENENTE™. Solicita información sobre un piloto."
    : "Cyber Sentinels is developing KYA to connect agent identity, delegated authority and TENENTE™ authority decisions. Enquire about a KYA pilot.";
  const path = locale === "es" ? "/es/platform/kya" : "/platform/kya";
  return { ...publicSocialMetadata(title, description, path, locale), title, description, alternates: publicPageAlternates("/platform/kya", locale) };
}

export default async function KyaPage() {
  const locale = await getPublicRequestLocale();
  return <main lang={locale} className="min-h-screen bg-[#04070c] text-zinc-100"><KyaHomepageSection locale={locale} landing /></main>;
}
