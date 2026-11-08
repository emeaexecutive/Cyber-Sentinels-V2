import { publicPageAlternates } from "@/lib/i18n/public-locales";
import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  ...publicSocialMetadata("Privacy | Cyber Sentinels", "Cyber Sentinels privacy information, consent controls and trust preferences.", "/privacy"),
  title: "Privacy | Cyber Sentinels",
  description: "Cyber Sentinels privacy information, consent controls and trust preferences.",
  alternates: publicPageAlternates("/privacy"),
};

export default function PrivacyPage() {
  return <main className="min-h-screen bg-[#04070c] px-6 py-16 text-white"><div className="mx-auto max-w-3xl">
    <h1 className="text-4xl font-semibold">Privacy information and preferences</h1>
    <p className="mt-5 leading-7 text-zinc-300">The privacy notice is under review. An approved version has not been published.</p>
    <nav aria-label="Privacy controls" className="mt-8 flex flex-wrap gap-6">
      <Link href="/privacy/preferences" className="text-cyan-200 underline">Manage privacy preferences</Link>
      <Link href="/privacy/cookies" className="text-cyan-200 underline">Cookie catalogue</Link>
      <Link href="/contact" className="text-cyan-200 underline">Contact Cyber Sentinels</Link>
    </nav>
  </div></main>;
}
