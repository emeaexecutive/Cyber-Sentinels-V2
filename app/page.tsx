import Link from "next/link";
import { ShieldCheck, Fingerprint, Bot, FileCheck2, Activity } from "lucide-react";
import { WaitlistForm } from "@/components/waitlist-form";
import { TrustCard } from "@/components/trust-card";

const cards = [
  { icon: Fingerprint, title: "Verified Human", text: "Proof-of-human checks for high-risk digital workflows and executive access." },
  { icon: Bot, title: "Verified Agent", text: "Agent passports for AI tools, bots and autonomous operators before permission is granted." },
  { icon: FileCheck2, title: "Verified Content", text: "Content provenance, deepfake risk signals and audit-ready evidence trails." },
  { icon: Activity, title: "Trust Graph", text: "A live map of humans, agents, permissions, events and trust relationships." }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-sentinel-black text-sentinel-white grid-bg">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <nav className="flex items-center justify-between border-b border-sentinel-line pb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-sentinel-line bg-white/5 p-2 shadow-glow">
              <ShieldCheck className="h-6 w-6 text-sentinel-green" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-wide">Cyber Sentinels</p>
              <p className="text-xs uppercase tracking-[0.35em] text-sentinel-muted">AI Trust Infrastructure</p>
            </div>
          </div>
          <Link href="/dashboard" className="rounded-full border border-sentinel-line px-5 py-2 text-sm text-sentinel-white hover:bg-white/10">
            View demo dashboard
          </Link>
        </nav>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-sentinel-line bg-white/5 px-4 py-2 text-sm text-sentinel-green">
              Proof before permission
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-tight md:text-7xl">
              The trust layer for the AI internet.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-sentinel-muted">
              Cyber Sentinels verifies humans, autonomous agents and synthetic content before access is granted. Built for deepfake defence, agent identity, provenance and audit-ready AI governance.
            </p>
            <div className="mt-8 max-w-xl">
              <WaitlistForm />
            </div>
          </div>

          <div className="rounded-[2rem] border border-sentinel-line bg-sentinel-panel/80 p-6 shadow-glow backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.25em] text-sentinel-muted">Live Trust Passport</p>
              <span className="rounded-full bg-sentinel-green/10 px-3 py-1 text-xs text-sentinel-green">Verified</span>
            </div>
            <div className="space-y-4">
              <TrustCard label="Subject" value="Autonomous Research Agent" />
              <TrustCard label="Passport Type" value="Verified Agent" />
              <TrustCard label="Trust Score" value="92 / 100" highlight />
              <TrustCard label="Risk Flags" value="0 active" />
              <TrustCard label="Audit Trail" value="18 signed events" />
            </div>
          </div>
        </div>

        <section className="grid gap-4 pb-12 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((item) => (
            <div key={item.title} className="rounded-3xl border border-sentinel-line bg-white/[0.03] p-5">
              <item.icon className="mb-4 h-7 w-7 text-sentinel-green" />
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-sentinel-muted">{item.text}</p>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}
