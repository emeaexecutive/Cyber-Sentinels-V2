import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Operational Trust Intelligence™ | Cyber Sentinels",
  description:
    "Cyber Sentinels helps teams decide whether an AI agent or human has authority to act, preserve the evidence behind the decision, and replay what happened later.",
  alternates: { canonical: "/" },
};

const flowSteps = [
  { title: "01 IDENTITY", detail: "Who or what is acting?" },
  { title: "02 AUTHORITY", detail: "What authority has actually been granted?" },
  { title: "03 ACTION", detail: "What is being requested now?" },
  { title: "04 DECISION", detail: "ALLOW / REVIEW / DENY" },
  { title: "05 EVIDENCE", detail: "Keep the proof and Replay trail." },
];

const trustedContexts = [
  {
    title: "AI agent",
    example: "Can this agent approve this €20,000 payment?",
  },
  {
    title: "Data",
    example: "Can this agent export these customer records?",
  },
  {
    title: "Infrastructure",
    example: "Can this agent change this Production configuration?",
  },
  {
    title: "Human",
    example: "Can this person approve this action for this organisation?",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#04070c] text-zinc-100">
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="max-w-3xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-cyan-300">Cyber Sentinels</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Before an AI agent acts, prove it has the authority to do so.
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300 sm:text-xl">
              Cyber Sentinels checks who or what is acting, what it is trying to do, and whether it has authority under the current policy.
            </p>
            <p className="mt-4 text-base leading-8 text-zinc-400">
              ALLOW · REVIEW · DENY
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              Every decision keeps the evidence needed for audit and Replay.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/enterprise-access?intent=design_partner" className="brand-primary-action brand-action-large">
                Request a demo
              </Link>
              <Link href="/developers" className="brand-secondary-action brand-action-large">
                Explore the API
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-[#070b12] p-4 shadow-2xl shadow-black/50 sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-zinc-500">Operational decision</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Finance Copilot</h2>
              </div>
              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm font-semibold text-red-300">
                DENY
              </span>
            </div>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="rounded-xl border border-zinc-800 bg-black/60 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Actor</dt>
                <dd className="mt-2 text-base font-semibold text-white">AI Agent</dd>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/60 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Requested action</dt>
                <dd className="mt-2 text-base font-semibold text-white">Approve €20,000 payment</dd>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-black/60 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Identity</dt>
                  <dd className="mt-2 text-base font-semibold text-cyan-300">VERIFIED</dd>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/60 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Authority</dt>
                  <dd className="mt-2 text-base font-semibold text-zinc-200">Maximum €10,000</dd>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/60 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Policy</dt>
                <dd className="mt-2 text-base font-semibold text-zinc-200">Amount exceeds delegated authority</dd>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-black/60 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Evidence</dt>
                  <dd className="mt-2 text-base font-semibold text-zinc-200">STORED</dd>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/60 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Receipt</dt>
                  <dd className="mt-2 text-base font-semibold text-zinc-200">CREATED</dd>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/60 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Replay</dt>
                  <dd className="mt-2 text-base font-semibold text-zinc-200">AVAILABLE</dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-cyan-300">Core flow</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {flowSteps.map((step, index) => (
              <article key={`${step.title}-${index}`} className="rounded-xl border border-zinc-800 bg-[#070b12] p-5">
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-zinc-400">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-3xl">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-cyan-300">Trusted to do what?</p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Trust is contextual to the action.
          </h2>
          <p className="mt-4 text-base leading-8 text-zinc-400">
            Cyber Sentinels asks whether the actor has the authority to perform the requested action under the current policy, not whether it is universally trustworthy.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {trustedContexts.map((item) => (
            <article key={item.title} className="rounded-xl border border-zinc-800 bg-[#070b12] p-5">
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-7 text-zinc-400">{item.example}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-[#070b12]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-cyan-300">Product clarity</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Decision, proof and Replay.</h2>
              <p className="mt-4 text-base leading-8 text-zinc-400">
                Stop unauthorized AI actions. Require human review when authority is uncertain. Keep the evidence behind every decision and reconstruct what happened later.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-xl border border-zinc-800 bg-black/70 p-5">
                <p className="text-lg font-semibold text-white">DECIDE</p>
                <p className="mt-2 text-sm leading-7 text-zinc-400">Determine whether the requested action should be ALLOW, REVIEW or DENY.</p>
              </article>
              <article className="rounded-xl border border-zinc-800 bg-black/70 p-5">
                <p className="text-lg font-semibold text-white">PROVE</p>
                <p className="mt-2 text-sm leading-7 text-zinc-400">Preserve the authority, policy and evidence behind the decision.</p>
              </article>
              <article className="rounded-xl border border-zinc-800 bg-black/70 p-5">
                <p className="text-lg font-semibold text-white">REPLAY</p>
                <p className="mt-2 text-sm leading-7 text-zinc-400">Reconstruct what happened, why it happened and who had authority.</p>
              </article>
            </div>
          </div>

          <div className="mt-10 rounded-xl border border-zinc-800 bg-black/70 p-5">
            <p className="text-sm leading-8 text-zinc-400">
              <span className="font-semibold text-white">Operational Trust Infrastructure</span> is the category. <span className="font-semibold text-white">Operational Trust Intelligence</span> remains the long-term intelligence layer.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
