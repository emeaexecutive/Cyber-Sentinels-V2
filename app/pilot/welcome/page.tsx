import Link from "next/link";
import { PrivateBetaBadge, PrivateBetaNotice } from "@/components/private-beta";

const protections = [
  ["Hiring Security", "Synthetic applicants, proxy interviews, stolen identities and AI-assisted interview fraud become reviewable workflows instead of scattered signals."],
  ["Session Integrity", "Identity, liveness, deepfake risk, injection risk, device context and channel changes stay separate so reviewers can see what changed."],
  ["Governance Review", "Human reviewers own escalation, evidence requests, approvals, rejections and unresolved actions."],
  ["Replay Evidence", "Replay timelines reconstruct evidence, flags, governance actions, audit events and receipts in order."],
  ["Verification Receipts", "Receipts summarize what was checked, what remains pending, who reviewed it and where replay context is available."],
];

const pilotPath = [
  "Start with the guided demo narrative.",
  "Create or review a pilot workspace.",
  "Upload evidence and inspect active flags.",
  "Route unresolved risk to governance review.",
  "Open replay and export the verification receipt.",
];

export default function PilotWelcomePage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <PrivateBetaBadge />
            <span className="rounded-full border border-cyan-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
              Enterprise Pilot
            </span>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            Welcome to Cyber Sentinels pilot onboarding.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels protects high-risk enterprise workflows where identity, session context, evidence and governance need to stay explainable. The pilot focuses on hiring security, session integrity, governance review, replay evidence and verification receipts.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/pilot/getting-started" className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
              Start onboarding
            </Link>
            <Link href="/demo" className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-400">
              Open demo flow
            </Link>
            <Link href="/enterprise/pilot-setup" className="rounded-lg border border-cyan-800 px-4 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
              Pilot setup
            </Link>
          </div>
          <PrivateBetaNotice className="mt-6 max-w-3xl" />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {protections.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Pilot rhythm</p>
          <h2 className="mt-3 text-3xl font-semibold">One walkthrough, one workflow, one receipt.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {pilotPath.map((step, index) => (
              <div key={step} className="border-t border-zinc-700 pt-4">
                <p className="text-xs text-cyan-200">0{index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-black p-5">
          <div>
            <h2 className="text-xl font-semibold">Need help during the pilot?</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Use the help flow for onboarding questions, support routing and governance review explanations.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/help" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400">
              Help centre
            </Link>
            <Link href="/enterprise-access" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:border-cyan-400">
              Contact pilot team
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}