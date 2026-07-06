import Link from "next/link";
import { TrustOpsOperatingStack } from "@/components/trustops-operating-stack";

const replayPath = [
  ["Actor", "Human, agent or service account"],
  ["Authority", "Purpose, scope and accountable owner"],
  ["Evidence", "Source-linked operational context"],
  ["Trust change", "Posture evolution over time"],
  ["Governance", "Review, intervention and rationale"],
  ["Outcome", "Governed result and unresolved conditions"],
  ["Memory", "Replay retained under enterprise policy"],
];

const buyerOutcomes = [
  [
    "Know who and what is acting",
    "Verify human identity, register AI agents and preserve the authority behind every action.",
  ],
  [
    "See trust change over time",
    "Keep identity, session integrity, evidence and authorization connected throughout the workflow.",
  ],
  [
    "Review and explain outcomes",
    "Give governance teams a replayable chronology of what changed, who intervened and why the outcome followed.",
  ],
];

const governedActors = [
  [
    "Humans",
    "Identity and session evidence remain connected to the work being performed.",
  ],
  [
    "AI agents",
    "Ownership, purpose, permissions and revocation stay visible and reviewable.",
  ],
  [
    "Enterprise workflows",
    "Evidence, governance and outcomes remain connected from entry to completion.",
  ],
];

const operatingSystemModel = [
  ["Memory", "Replay retains the evidence-backed chronology behind every material outcome."],
  ["State", "Persistent Trust Posture explains what is currently reliable and why."],
  ["Control", "Governed execution keeps authority, intervention and decisions accountable."],
  ["Ownership", "Enterprise AI sovereignty keeps memory, data and provider policy under customer control."],
];

export default function Home() {
  return (
    <main className="operational-shell min-h-screen text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pt-16 md:px-8 md:pb-24 md:pt-24">
        <div className="max-w-5xl">
          <p className="operational-eyebrow">TrustOps operating system</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.06] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Govern operational trust across humans, AI agents and enterprise workflows.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-200 sm:text-xl sm:leading-9">
            Keep humans, AI agents, non-human identities and consequential
            workflows accountable as trust changes.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
            Cyber Sentinels connects replayable operational memory, governed
            execution, Authorization Lineage, evidence continuity, Persistent
            Trust Posture and enterprise AI sovereignty into one accountable
            operating model.
          </p>
        </div>

        <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Link
            href="/enterprise-access"
            className="brand-primary-action brand-action-large text-center text-sm"
          >
            Request Enterprise Access
          </Link>
          <Link
            href="/verification-replay"
            className="brand-secondary-action brand-action-large text-center text-sm"
          >
            Explore Verification Replay
          </Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8 md:py-16">
          <div className="max-w-3xl">
            <p className="operational-eyebrow">One operating model</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
              Memory, state, control and enterprise ownership.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              An operating system here means connected, reviewable trust context
              across existing enterprise workflows—not autonomous judgment or a
              replacement for accountable systems of record.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {operatingSystemModel.map(([title, copy]) => (
              <article key={title} className="operational-card p-5">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8 md:py-16">
          <div className="max-w-3xl">
            <p className="operational-eyebrow">What Cyber Sentinels does</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
              Keep trust connected to the workflow.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              Built for enterprises governing consequential work across people,
              AI agents and the systems they use together.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {buyerOutcomes.map(([title, copy]) => (
              <article key={title} className="operational-card p-5">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <div className="max-w-3xl">
          <p className="operational-eyebrow">Verification replay</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
            One chronology. Every material trust change.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-300">
            Replay preserves the evidence, authorization changes, trust-state
            evolution and governance actions behind an outcome. It turns
            workflow history into reviewable operational memory.
          </p>
        </div>
        <div className="mt-8 grid overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-7">
          {replayPath.map(([title, copy], index) => (
            <article key={title} className="min-w-0 bg-black p-4">
              <p className="text-xs font-semibold text-cyan-200">
                0{index + 1}
              </p>
              <h3 className="mt-2 text-sm font-semibold leading-6 text-zinc-100">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{copy}</p>
            </article>
          ))}
        </div>
        <Link
          href="/verification-replay"
          className="mt-8 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100"
        >
          See how verification replay works →
        </Link>
      </section>

      <section className="border-t border-zinc-800 bg-zinc-950/60">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
          <p className="operational-eyebrow">TrustOps operating stack</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight text-white md:text-4xl">
            Eight connected layers. One accountable workflow record.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Identity, runtime integrity, authority, evidence and governance stay
            connected. Replay preserves the chronology; Persistent Trust
            Posture explains the current state.
          </p>
          <div className="mt-8">
            <TrustOpsOperatingStack compact />
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
          <p className="operational-eyebrow">Continuous trust</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight text-white md:text-4xl">
            Trust is not a moment. It is a continuous operational state.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            A single check cannot explain a changing workflow. Cyber Sentinels
            keeps identity, authority, evidence and governance connected as
            human and machine activity unfolds.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-zinc-300">
            {["Escalate", "Decay", "Recover", "Re-verify"].map((state, index) => (
              <span key={state} className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-1.5">
                <span className="font-mono text-cyan-300">{String(index + 1).padStart(2, "0")}</span>
                {state}
              </span>
            ))}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {governedActors.map(([title, copy]) => (
              <article key={title} className="operational-card p-5">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
