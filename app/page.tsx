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
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
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
              <Link href="/enterprise-access?intent=demo" className="brand-primary-action brand-action-large">
                Request a demo
              </Link>
              <Link href="/developers/docs" className="brand-secondary-action brand-action-large">
                Explore the API
              </Link>
            </div>
          </div>

          <aside aria-label="Illustrative authority decision" className="min-w-0 rounded-2xl border border-zinc-800 bg-[#070b12] p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">Illustrative example · AI agent</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Finance Copilot</h2>
            <div className="mt-6 divide-y divide-zinc-800 text-sm">
              <dl className="pb-4">
                <dt className="text-zinc-400">Requested action</dt>
                <dd className="mt-1 text-xl font-semibold text-white">Approve €20,000 payment</dd>
              </dl>
              <div className="grid grid-cols-2 gap-4 py-4">
                <dl><dt className="text-zinc-400">Identity</dt><dd className="mt-1 font-semibold text-cyan-300">VERIFIED</dd></dl>
                <dl><dt className="text-zinc-400">Authority</dt><dd className="mt-1 font-semibold text-white">Maximum €10,000</dd></dl>
              </div>
              <div className="flex items-start justify-between gap-4 py-4">
                <dl><dt className="text-zinc-400">Policy decision</dt><dd className="mt-1 max-w-64 leading-6 text-zinc-200">Policy limit exceeded. Amount exceeds delegated authority.</dd></dl>
                <span className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-1.5 font-semibold text-red-300">DENY</span>
              </div>
            </div>
            <p className="border-t border-zinc-800 pt-4 text-sm font-semibold text-white">Identity is not authority.</p>
            <p className="mt-2 text-xs leading-6 text-zinc-400">Evidence stored <span aria-hidden="true">·</span> Receipt created <span aria-hidden="true">·</span> Replay available</p>
          </aside>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-cyan-300">V1 · Core flow</p>
          <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Check authority. Preserve the decision.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">Before the action: verify identity, confirm authority and evaluate policy. ALLOW / REVIEW / DENY records the decision.</p>
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

      <section className="border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-cyan-300">V2 foundation · Staging qualified</p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">The decision is only the beginning.</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-400">An ALLOW records permission, not proof of execution. V2 connects the original decision to evidence of what happened next, while keeping that decision intact.</p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">After the action: preserve execution evidence, outcomes, interventions and incident history. Prove it with evidence, a receipt and Replay. Remember it with Trust Memory.</p>
          <ol aria-label="Operational evidence flow" className="mt-8 grid gap-0 border-y border-zinc-800 sm:grid-cols-5">
            {["Decision", "Execution evidence", "Outcome", "Incident", "Replay"].map((step, index) => (
              <li key={step} className="flex items-baseline gap-3 px-2 py-4 text-sm font-medium text-zinc-200">
                <span className="font-mono text-xs text-cyan-300">0{index + 1}</span>{step}
              </li>
            ))}
          </ol>
          <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-12">
            <article>
              <h3 className="text-xl font-semibold text-white">When something goes wrong, reconstruct what actually happened.</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-200">Original authority → agent → actions → controls → outcome → intervention → remediation.</p>
              <p className="mt-3 text-sm leading-7 text-zinc-400">Bring observations, outcomes, interventions and remediation into one incident chronology. Export the linked evidence with its integrity digest, contradictions and gaps visible.</p>
              <p className="mt-3 text-sm leading-7 text-zinc-400">Provider, runtime and destination outcomes remain distinct. Shared context connects providers without turning correlation into attribution. Missing context stays unknown.</p>
            </article>
            <article>
              <h3 className="text-xl font-semibold text-white">Trust doesn&apos;t reset with each API call.</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">Trust Memory retains evidence around identities, authority, actions and outcomes so later decisions can be understood in context.</p>
              <p className="mt-3 text-sm leading-7 text-zinc-400">Follow the original transaction into outcome review, incident evidence and Replay. A later failure or contradictory outcome adds to the record; it does not rewrite the original ALLOW.</p>
              <p className="mt-3 text-sm leading-7 text-zinc-400">This foundation is qualified in Staging. Production promotion is pending. Purpose interpretation remains partial; broader intelligence is future work.</p>
            </article>
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
