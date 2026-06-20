import Link from "next/link";
import { PrivateBetaBadge, PrivateBetaNotice } from "@/components/private-beta";

const quietBreaks = [
  ["AI impersonation", "A voice, face or conversation can look human without a human being present."],
  ["Synthetic identities", "Profiles and credentials can be assembled faster than teams can verify their origin."],
  ["Autonomous systems", "AI agents can act across workflows before ownership and authority are clear."],
  ["Hiring fraud", "Identity, interview presence and evidence can separate inside a high-stakes decision."],
  ["Operational trust collapse", "Evidence, review and accountability become fragmented when organizations need them most."],
];

const enterpriseClarity = [
  ["What we protect", "Hiring workflows, workforce identity, sensitive enterprise decisions and AI-agent activity."],
  ["Who it is for", "Security, talent, risk, compliance and operations teams responsible for decisions that must stand up to scrutiny."],
  ["Why verification is not enough", "Identity is one signal. Trust also depends on provenance, behaviour, authority, evidence, governance and time."],
];

const workflow = ["Verify the identity", "Review the evidence", "Govern the decision", "Retain the audit trail", "Replay what happened"];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#05070b] text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14 md:px-8 md:pb-28 md:pt-20">
        <div className="flex flex-wrap items-center gap-3">
          <PrivateBetaBadge />
          <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Enterprise Trust
          </span>
        </div>

        <div className="mt-14 max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
            Operational Trust Infrastructure for AI-era workflows.
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.04] tracking-[-0.035em] text-white md:text-7xl">
            Trust was once assumed. Now it has to be governed.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-zinc-300">
            Cyber Sentinels helps enterprises verify people and AI agents,
            examine evidence, govern high-stakes decisions and preserve an
            audit-ready record of what happened.
          </p>
        </div>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/enterprise-access" className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200">
            Explore Enterprise Access
          </Link>
          <Link href="/about/mission" className="rounded-md border border-zinc-600 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-300">
            Why We Exist
          </Link>
        </div>
        <PrivateBetaNotice className="mt-8 max-w-3xl" />
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/65">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-8 md:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Why we exist</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.025em] text-white md:text-5xl">Trust broke quietly.</h2>
            <p className="mt-5 text-base leading-8 text-zinc-300">
              The systems enterprises relied on were built for a world where
              identity, presence and action usually belonged to the same person.
              AI changed that assumption—and trust became an operational problem.
            </p>
          </div>
          <div className="mt-10 grid gap-x-8 gap-y-7 md:grid-cols-2 lg:grid-cols-5">
            {quietBreaks.map(([title, copy]) => (
              <article key={title} className="border-t border-zinc-700 pt-4">
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:px-8 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Enterprise clarity</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.025em] text-white">Identity can be verified. Trust still has to be earned.</h2>
            <p className="mt-5 text-base leading-8 text-zinc-300">
              Cyber Sentinels is the governance and auditability layer around
              identity verification—not a replacement for it, and never an
              automatic authority over people.
            </p>
          </div>
          <div className="grid gap-4">
            {enterpriseClarity.map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-zinc-300">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-8 md:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">From signal to accountability</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.025em] text-white">A clear operational chain.</h2>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-5">
            {workflow.map((step, index) => (
              <div key={step} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-semibold text-cyan-200">0{index + 1}</p>
                <p className="mt-3 text-sm font-semibold text-white">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:px-8 md:py-24">
        <div className="flex flex-col items-start justify-between gap-8 border-l-2 border-cyan-300 pl-6 md:flex-row md:items-end md:pl-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">The future of trust</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.025em] text-white">AI assists. Humans decide. The record remains.</h2>
          </div>
          <Link href="/about/future-of-trust" className="shrink-0 rounded-md border border-zinc-600 px-5 py-3 text-sm font-semibold text-white hover:border-zinc-300">
            Read the Manifesto
          </Link>
        </div>
      </section>
    </main>
  );
}
