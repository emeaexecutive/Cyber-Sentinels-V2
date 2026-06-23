import Link from "next/link";
import { PrivateBetaBadge, PrivateBetaNotice } from "@/components/private-beta";

const priorities = [
  ["Hiring Security", "Spot fake applicants, proxy interviews, stolen identities, AI-assisted interview fraud and enterprise access risk before they become operational incidents."],
  ["Session Integrity", "Separate identity checks from liveness, deepfake risk, injection risk and channel changes during the session."],
  ["Governance Review", "Route flags to accountable human review with evidence, chronology and clear next actions."],
  ["Verification Workflows", "Preserve who verified what, what changed, and which evidence was used."],
  ["Audit Trails", "Keep replay evidence, verification receipts and audit history available for security, talent and compliance teams."],
];

const workflow = [
  "Verify identity",
  "Inspect session flags",
  "Review evidence",
  "Record governance action",
  "Issue receipt and replay",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#05070b] text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 md:px-8 md:pb-24 md:pt-20">
        <div className="flex flex-wrap items-center gap-3">
          <PrivateBetaBadge />
          <span className="rounded-full border border-cyan-400/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Enterprise pilot ready</span>
        </div>

        <div className="mt-12 max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Operational Trust Infrastructure for AI-era workflows.</p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] text-white md:text-6xl">
            Cyber Sentinels protects hiring and verification workflows when AI changes who can be trusted.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-200">
            Identity verification is no longer enough. Synthetic applicants, proxy interviews and injected session feeds can pass through workflows that were built for a simpler world.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">
            Cyber Sentinels combines verification workflows, session integrity, governance review, replay evidence, audit trails and verification receipts so enterprise teams can see what happened and decide what happens next.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/enterprise-access" className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-200">Request Enterprise Access</Link>
          <Link href="/demo" className="rounded-md border border-zinc-500 px-5 py-3 text-sm font-semibold text-white hover:border-zinc-200">View Demo</Link>
          <Link href="/demo/hiring-attack" className="rounded-md border border-cyan-800 px-5 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-400">Hiring Security Demo</Link>
          <Link href="/demo/session-integrity" className="rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-400">Session Integrity Demo</Link>
        </div>
        <PrivateBetaNotice className="mt-7 max-w-3xl" />
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-[0.85fr_1.15fr] md:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">Why now</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-white">AI changed trust quietly.</h2>
            <p className="mt-4 leading-7 text-zinc-200">
              The risk is not only whether someone passed a check at the start. It is whether identity, presence, media and session context stay trustworthy as the workflow continues.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {priorities.map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">Enterprise workflow</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">A clear path from flag to review to receipt.</h2>
            </div>
            <Link href="/enterprise/pilot" className="rounded-md border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-zinc-300">Pilot Structure</Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {workflow.map((step, index) => (
              <div key={step} className="border-t border-zinc-700 pt-4">
                <p className="text-xs font-semibold text-cyan-200">0{index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}