import Link from "next/link";
import { TrustOpsOperatingStack } from "@/components/trustops-operating-stack";

const continuityPath = [
  ["Actor", "A human, AI agent, service account or API actor enters with accountable ownership."],
  ["Workflow", "Purpose, runtime context and the operation being performed remain attached."],
  ["Evidence", "Provider and workflow evidence stays connected to source, time and decision context."],
  ["Authorization", "Delegated scope, grants, changes and revocations retain accountable lineage."],
  ["Governance", "Material changes route to named reviewers with rationale and recorded action."],
  ["Posture", "Trust evolves, decays, escalates, recovers and re-verifies as context changes."],
  ["Replay", "The final outcome remains part of durable enterprise memory."],
];

const operatingModels = [
  ["Fintech and banking", "Preserve actor, authority, evidence and dual-control decisions across payments, accounts and exceptions."],
  ["Insurance and claims", "Connect intake evidence, automation, adjuster review, policy exceptions and resolution."],
  ["Healthcare", "Retain identity, delegated access, regulated handoffs and accountable approvals."],
  ["Onboarding and vendor access", "Keep third-party identity, API access, evidence, exceptions and approval continuity together."],
  ["Hiring", "Link identity, session integrity, reviewer action and receipts without automating rejection."],
  ["AI-assisted operations", "Keep agent ownership, delegated scope, runtime evidence, intervention and outcome attributable."],
];

export default function TrustFabricPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Enterprise Trust Fabric</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Continuous trust across every operational handoff.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-200">
            Cyber Sentinels is trust infrastructure for humans, AI agents,
            machine identities and regulated workflows.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            The Trust Fabric keeps identity, runtime context, authorization,
            evidence, governance, posture and outcome connected as work moves
            across people and systems.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/verification-replay" className="brand-primary-action brand-action-large text-sm">
              Experience Replay
            </Link>
            <Link href="/platform" className="brand-secondary-action brand-action-large text-sm">
              Review the Platform
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">One fabric, eight layers</p>
          <h2 className="mt-3 max-w-3xl text-2xl font-semibold">
            A shared operating model for trust continuity.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            These layers contribute to one governed operational record. They are
            not separate products or hidden scoring systems.
          </p>
          <div className="mt-6">
            <TrustOpsOperatingStack compact />
          </div>
        </section>

        <section className="mt-8 operational-panel p-6">
          <p className="operational-eyebrow">Continuity path</p>
          <h2 className="mt-3 text-2xl font-semibold">
            Replay binds the fabric into durable operational memory.
          </h2>
          <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-4">
            {continuityPath.map(([title, copy], index) => (
              <article key={title} className="min-w-0 bg-black p-4">
                <p className="font-mono text-xs text-cyan-300">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">Vertical operating models</p>
          <h2 className="mt-3 max-w-3xl text-2xl font-semibold">
            The workflow changes. The accountability chain remains.
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {operatingModels.map(([title, copy]) => (
              <article key={title} className="operational-card p-5">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Enterprise-controlled continuity</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            Customer-owned operational memory, restricted data, provider
            orchestration and workflow IP remain governed by enterprise policy.
            Provider choice can change without breaking authorization history,
            evidence continuity, governance chronology or the accountable
            operational record.
          </p>
        </section>
      </div>
    </main>
  );
}
