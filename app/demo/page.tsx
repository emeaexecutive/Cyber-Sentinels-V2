import Link from "next/link";
import { PrivateBetaNotice } from "@/components/private-beta";

const risks = [
  ["Synthetic applicants", "Generated profiles and incomplete provenance can enter hiring workflows that were built for a more verifiable world."],
  ["AI impersonation", "Voice, face and conversation can appear human without reliable evidence of who controls the session."],
  ["Injected video feeds", "Identity can be verified at entry while the interview channel changes later."],
  ["Governance failures", "Flags without ownership, evidence or human review become operational risk."],
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="border-b border-zinc-800 pb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Enterprise Demo</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight md:text-6xl">
            Organizations can no longer confidently verify who or what is entering critical workflows.
          </h1>
          <p className="mt-6 max-w-3xl leading-8 text-zinc-400">
            See how Cyber Sentinels connects verification workflows, session integrity,
            evidence, flags, human review, audit trails, receipts and replay.
          </p>
          <PrivateBetaNotice className="mt-5 max-w-3xl" />
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <Link href="/demo/hiring-attack" className="rounded-lg border border-cyan-900 bg-zinc-950 p-6 hover:border-cyan-500">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">90-second walkthrough</p>
            <h2 className="mt-3 text-2xl font-semibold">Hiring Attack</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">Follow a synthetic candidate from intake through injection-risk detection, governance escalation, session block and receipt.</p>
            <p className="mt-5 text-sm font-semibold text-cyan-200">Start demo</p>
          </Link>
          <Link href="/demo/session-integrity" className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 hover:border-cyan-500">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">90-second walkthrough</p>
            <h2 className="mt-3 text-2xl font-semibold">Session Integrity</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">See why identity verification alone is insufficient when channel evidence and session risk change after entry.</p>
            <p className="mt-5 text-sm font-semibold text-cyan-200">Start demo</p>
          </Link>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {risks.map(([title, copy]) => (
            <article key={title} className="border-t border-zinc-700 pt-4">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 flex flex-wrap items-center justify-between gap-5 rounded-lg border border-zinc-800 bg-black p-6">
          <div>
            <h2 className="text-xl font-semibold">Ready to test the operational workflow?</h2>
            <p className="mt-2 text-sm text-zinc-400">Use sample-only pilot data or request a private enterprise walkthrough.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/demo-lab" className="rounded-md border border-zinc-700 px-4 py-2 text-sm">Seed Demo Data</Link>
            <Link href="/enterprise-access" className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black">Request Enterprise Access</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
