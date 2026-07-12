import type { Metadata } from "next";
import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";
import { TrustOpsOperatingStack } from "@/components/trustops-operating-stack";

const canonicalConcepts = [
  ["Authority Control", "Verifies declared purpose, delegated scope, accountable ownership and policy before consequential execution."],
  ["Evidence Relationships", "Connects actors, authority, provider evidence, runtime changes, decisions and outcomes without flattening source boundaries."],
];

const engines = [
  ["trust-engine", "Trust Decision Intelligence", "Evaluates identity, authority, evidence and confidence boundaries."],
  ["runtime-engine", "Continuous Trust Monitoring", "Observes execution state, permission scope and provider availability."],
  ["replay-engine", "Decision Replay", "Preserves the chronology as operational memory."],
  ["governance-engine", "Human Governance", "Routes accountable review, escalation and intervention."],
  ["validation-engine", "Validation Readiness", "Keeps benchmark, reviewed-sample and calibration evidence explicit."],
];

const executionContract = [
  ["Enter", "Record the actor, workflow purpose and accountable owner."],
  ["Authorize", "Confirm scope and preserve grants, changes and revocations."],
  ["Execute", "Attach runtime context and evidence as work advances."],
  ["Govern", "Escalate material trust changes to named reviewers."],
  ["Remember", "Close with a replayable outcome retained under policy."],
];

export default function PlatformPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <ExecutiveSummary
          eyebrow="Platform"
          title="Turn changing identity, authority and runtime risk into an accountable enterprise decision."
          bullets={["Trust Decision Intelligence evaluates evidence and authority.", "Continuous Trust Monitoring detects material change during execution.", "Governance assigns the next action to a responsible owner.", "Replay and Trust Memory\u2122 preserve proof of the outcome."]}
          primary={{ href: "/enterprise-access?intent=demo", label: "Request Enterprise Demo" }}
          secondary={{ href: "/trust", label: "Read Trust Framework" }}
        />

        <section className="mt-8 grid gap-3 md:grid-cols-2">
          {canonicalConcepts.map(([title, copy]) => (
            <article id={title === "Authority Control" ? "authorization-gateway" : "evidence-graph"} key={title} className="scroll-mt-28 operational-card p-5">
              <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 operational-panel p-6">
          <p className="operational-eyebrow">Governed execution contract</p>
          <h2 className="mt-3 text-2xl font-semibold">
            Continuity from actor entry to retained outcome.
          </h2>
          <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-5">
            {executionContract.map(([title, copy], index) => (
              <article key={title} className="min-w-0 bg-black p-4">
                <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 operational-panel p-6">
          <p className="operational-eyebrow">Decision capabilities</p>
          <h2 className="mt-3 text-2xl font-semibold">One operating model for accountable decisions.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {engines.map(([id, title, copy], index) => (
              <article id={id} key={title} className="scroll-mt-28 operational-card p-4">
                <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">TrustOps operating stack</p>
          <h2 className="mt-3 text-2xl font-semibold">The canonical platform layer model.</h2>
          <div className="mt-6">
            <TrustOpsOperatingStack />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/trust#trust-memory" className="brand-secondary-action">Trust Memory\u2122</Link>
            <Link href="/trust" className="brand-secondary-action">Trust Center</Link>
            <Link href="/developers" className="brand-secondary-action">Developers</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
export const metadata: Metadata = {
  title: "Platform | Cyber Sentinels",
  description: "Architecture for operational trust, authorization, enforcement, evidence, governance and Trust Memory.",
  alternates: { canonical: "/platform" },
};
