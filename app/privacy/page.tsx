import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy | Cyber Sentinels",
  description: "Cyber Sentinels privacy information, consent controls and trust preferences.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <main className="min-h-screen bg-[#04070c] px-6 py-16 text-white"><div className="mx-auto max-w-5xl"><p className="text-sm uppercase tracking-[0.18em] text-cyan-300">Enterprise Trust Consent Manager™</p><h1 className="mt-4 text-4xl font-semibold">Privacy and Trust Preferences</h1><p className="mt-5 max-w-3xl text-base leading-7 text-zinc-300">Cyber Sentinels uses essential technologies for secure service delivery. Optional Functional, Analytics, AI Improvements and Marketing technologies remain under your control. This system provides auditable preference evidence; it is not a legal certification or universal compliance guarantee.</p><div className="mt-8 grid gap-4 sm:grid-cols-3">{[["/privacy/preferences","Manage Trust Preferences","Review or change every optional category."],["/privacy/cookies","Cookie & Tracker Catalogue","See providers, purposes, storage and retention."],["/privacy/consent-history","Consent Timeline™","Review append-only Consent Receipts™."]].map(([href,title,body])=><Link key={href} href={href} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 hover:border-cyan-800"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm text-zinc-400">{body}</p></Link>)}</div><section className="mt-10 grid gap-5 rounded-xl border border-zinc-800 bg-black p-6"><h2 className="text-2xl font-semibold">Privacy principles</h2><p className="text-sm leading-7 text-zinc-400">Account identifiers, governed workflow evidence and audit records are processed only for documented service purposes. Full IP addresses, raw authentication secrets, unrestricted device fingerprints and unnecessary user-agent strings are not stored in consent records. Retention and rights handling remain subject to customer policy, contracts and applicable review.</p><p className="text-sm text-zinc-400">Privacy requests: privacy@cybersentinels.ai · Security reports: security@cybersentinels.ai</p></section></div></main>;
}
