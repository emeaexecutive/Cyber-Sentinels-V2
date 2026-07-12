import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Operational Trust Control Plane | Cyber Sentinels",
  description: "Continuously verify identity, authority, change and governance across human and machine activity.",
  alternates: { canonical: "/" },
};

const trustFlow = [
  ["Observe", "Capture actor, purpose, authority and runtime evidence."],
  ["Authorize", "Evaluate policy and delegated scope before execution."],
  ["Decide", "Allow, block, step up or route accountable review."],
  ["Prove", "Preserve evidence, Replay and Trust Memory\u2122."],
];

const entityTypes = [
  ["Humans", "Employees, customers, reviewers and accountable owners."],
  ["AI agents", "Delegated software actors operating under declared purpose."],
  ["Machine identities", "Services, workloads, credentials and automated systems."],
  ["Regulated workflows", "Consequential processes that require evidence and review."],
];

const capabilities = [
  ["Trust Engine", "Evaluate identity, evidence, authority and policy."],
  ["Runtime Trust", "Detect material change while work is in progress."],
  ["Authorization & Enforcement", "Apply external, pre-execution controls."],
  ["Replay & Evidence", "Reconstruct decisions from connected proof."],
  ["Governance", "Assign review, escalation and intervention."],
  ["Trust Memory\u2122", "Retain how trust evolved across outcomes."],
];

const solutionExamples = [
  ["AI Agent Governance", "Keep agent purpose, scope and accountable ownership visible.", "/enterprise/agent-governance"],
  ["Regulated Workflows", "Preserve evidence and review across consequential operations.", "/solutions#regulated-workflows"],
  ["Live Session Trust", "Respond when identity or channel risk changes after entry.", "/solutions#live-session-trust"],
];

export default function Home() {
  return (
    <main className="operational-shell min-h-screen text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24">
        <p className="operational-eyebrow">Enterprise operational trust</p>
        <h1 className="mt-5 max-w-5xl text-4xl font-semibold leading-tight text-white md:text-6xl">
          The operational trust control plane for humans, AI agents, machine identities and regulated workflows.
        </h1>
        <p className="mt-6 max-w-4xl text-lg leading-8 text-zinc-300 md:text-xl">
          Continuously verify who or what acted, under whose authority, what changed, and why each action was allowed, reviewed or blocked.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/enterprise-access?intent=demo" className="brand-primary-action brand-action-large">Request Demo</Link>
          <Link href="/platform" className="brand-secondary-action brand-action-large">Explore Platform</Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-[0.8fr_1.2fr] md:px-8 md:py-18">
          <div>
            <p className="operational-eyebrow">The enterprise problem</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Systems record events. They rarely preserve why an action remained trustworthy.</h2>
          </div>
          <p className="max-w-3xl text-base leading-8 text-zinc-300">
            Identity, delegated authority, provider evidence and risk can change while work is underway. Security, risk, compliance and operations need one accountable decision record without replacing the systems that already run the workflow.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <p className="operational-eyebrow">The operational trust flow</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">From changing context to a governed, replayable outcome.</h2>
        <ol className="mt-8 grid gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800 md:grid-cols-4">
          {trustFlow.map(([title, copy], index) => (
            <li key={title} className="bg-black p-5">
              <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8">
          <p className="operational-eyebrow">Four entity types</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">One trust model across human and machine activity.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {entityTypes.map(([title, copy]) => (
              <article key={title} className="border-l border-cyan-900 pl-5">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <p className="operational-eyebrow">Core platform capabilities</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Controls that connect authority, evidence and accountability.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map(([title, copy]) => (
            <article key={title} className="operational-card p-5">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </div>
        <Link href="/platform" className="mt-7 inline-flex text-sm font-semibold text-cyan-200 hover:text-white">See how the platform works →</Link>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8">
          <p className="operational-eyebrow">Representative solutions</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Start where trust failure carries the greatest cost.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {solutionExamples.map(([title, copy, href]) => (
              <Link key={title} href={href} className="operational-card block p-5 hover:border-cyan-800">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
                <span className="mt-5 inline-flex text-sm font-semibold text-cyan-200">Explore solution →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-2 md:px-8">
        <div>
          <p className="operational-eyebrow">Trust and evidence differentiation</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Proof without unsupported certainty.</h2>
        </div>
        <div>
          <p className="text-base leading-8 text-zinc-300">
            Cyber Sentinels keeps measured, estimated, provider-supplied and human-reviewed evidence distinct. Replay proves the chronology; Trust Memory\u2122 records how trust changed and why later decisions should learn from governed outcomes.
          </p>
          <Link href="/trust" className="mt-6 inline-flex brand-secondary-action">Explore Trust Center</Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-[1.2fr_0.8fr] md:px-8">
          <div>
            <p className="operational-eyebrow">Enterprise readiness</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Adopt beside existing systems, one governed workflow at a time.</h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-300">Pilot-scoped deployment, security review, compliance evidence, data-residency boundaries and named support keep adoption controlled and procurement-ready.</p>
          </div>
          <div className="flex items-center md:justify-end">
            <Link href="/enterprise" className="brand-secondary-action brand-action-large">Enterprise Readiness</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center md:px-8 md:py-20">
        <p className="operational-eyebrow">A clear next step</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold text-white md:text-4xl">Choose one consequential workflow. Make every trust decision explainable.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-zinc-300">See the control plane with your security, risk, compliance and operations stakeholders.</p>
        <Link href="/enterprise-access?intent=demo" className="mt-7 inline-flex brand-primary-action brand-action-large">Request Demo</Link>
      </section>
    </main>
  );
}
