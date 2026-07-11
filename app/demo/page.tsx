import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";

const demoSequence = [
  "Identity",
  "Authority",
  "Runtime",
  "Decision",
  "Replay",
  "Governance",
  "Trust Memory\u2122",
  "Evidence Graph",
  "Outcome",
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Guided Enterprise Demo"
          title="Follow one decision from identity to provable outcome."
          bullets={["See identity and authority established before execution.", "Watch runtime change trigger an explainable decision.", "Follow ownership through governance and Replay.", "Close with Trust Memory\u2122, Evidence Graph and outcome proof."]}
          primary={{ href: "/demo/trust-execution-flow", label: "Start Guided Demo" }}
          secondary={{ href: "/enterprise-access?intent=demo", label: "Request Enterprise Demo" }}
        />

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <Link href="/demo/trust-execution-flow" className="rounded-lg border border-cyan-800 bg-zinc-950 p-6 hover:border-cyan-400">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">TrustOps execution</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Humans, agents and approvals</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">Follow a governed workflow through runtime evidence, provider degradation, trust calculation, queueing, replay and governance hooks.</p>
          </Link>
          <Link href="/demo/hiring-attack" className="rounded-lg border border-zinc-700 bg-zinc-950 p-6 hover:border-cyan-400">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">90-second walkthrough</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Enterprise Access / Hiring Security</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">Follow a simulated candidate from intake through a Session Integrity anomaly, governance escalation, replay evidence, Verification Receipt and workflow outcome.</p>
          </Link>
          <Link href="/demo/session-integrity" className="rounded-lg border border-zinc-700 bg-zinc-950 p-6 hover:border-cyan-400">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">90-second walkthrough</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Session Integrity</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">See why verification alone is insufficient when channel evidence, authorization context and session risk change after entry.</p>
          </Link>
        </section>

        <section className="mt-12 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Demo sequence</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">One operational story.</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3 lg:grid-cols-9">
            {demoSequence.map((step, index) => (
              <div key={step} className="border-t border-zinc-700 pt-4">
                <p className="text-xs font-semibold text-cyan-200">{index + 1}</p>
                <p className="mt-2 text-sm font-semibold leading-5 text-zinc-100">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 flex flex-wrap items-center justify-between gap-5 rounded-lg border border-zinc-800 bg-black p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Replayable proof</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Event. Evidence. Trust change. Governance. Outcome.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/trust#trust-memory" className="brand-secondary-action">Trust Memory\u2122</Link>
            <Link href="/trust" className="brand-secondary-action">Trust Center</Link>
            <Link href="/platform" className="brand-primary-action">TrustOps Platform</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
