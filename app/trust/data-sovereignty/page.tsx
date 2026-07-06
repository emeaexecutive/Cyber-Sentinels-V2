import Link from "next/link";

const sovereigntyStates = [
  ["AI Training", "Disabled", "Provider policy does not permit customer workflow data to be used for training."],
  ["External Retention", "Disabled", "External retention is not permitted by the default enterprise provider posture."],
  ["Enterprise Data Ownership", "Enabled", "Operational data, workflow memory and trust records remain under enterprise control."],
  ["Governance Audit Trail", "Enabled", "Provider policy, classification, redaction, usage and overrides remain auditable."],
  ["Restricted Data Egress", "Protected", "Restricted operational data is blocked from external AI-provider processing."],
];

const classifications = [
  ["Public", "Approved public material may be processed under governed provider policy."],
  ["Internal", "Internal workflow context requires redaction and auditable provider use."],
  ["Confidential", "External processing requires verified enterprise provider controls."],
  ["Regulated", "External processing requires verified enterprise controls and workflow-specific governance."],
  ["Restricted", "Data remains inside governed enterprise boundaries and cannot be sent to an external AI provider."],
];

export default function DataSovereigntyPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Enterprise AI sovereignty</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Enterprise control over data, workflows and durable operational memory.
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-8 text-zinc-200">
            Cyber Sentinels helps enterprises use AI without surrendering their
            data, workflows, identity signals or operational IP.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Governed orchestration keeps provider use subordinate to enterprise
            classification, redaction, retention and audit policy. Provider
            choice remains replaceable while enterprise policy and evidence
            continuity remain stable.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Enterprise-controlled AI operations preserve the same authorization,
            governance and replay contract across provider changes, so operational
            accountability does not become provider-dependent.
          </p>
          <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-cyan-200">
            The enterprise controls the trust record.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/enterprise-access" className="brand-primary-action brand-action-large text-sm">
              Discuss Enterprise Controls
            </Link>
            <Link href="/verification-replay" className="brand-secondary-action brand-action-large text-sm">
              Review Operational Memory
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">Default enterprise posture</p>
          <h2 className="mt-3 text-2xl font-semibold">Control is explicit and fail-closed.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {sovereigntyStates.map(([label, state, explanation]) => (
              <article key={label} className="operational-card min-w-0 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                <p className="mt-3 text-lg font-semibold text-emerald-200">{state}</p>
                <p className="mt-3 text-xs leading-5 text-zinc-500">{explanation}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 operational-panel p-6">
          <p className="operational-eyebrow">Restricted-data controls</p>
          <h2 className="mt-3 text-2xl font-semibold">Classification governs provider access.</h2>
          <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-5">
            {classifications.map(([classification, explanation]) => (
              <article key={classification} className="min-w-0 bg-black p-4">
                <h3 className="font-semibold text-zinc-100">{classification}</h3>
                <p className="mt-3 text-xs leading-5 text-zinc-500">{explanation}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Customer-owned memory", "Replayable enterprise memory remains part of the customer-controlled trust record, not provider-owned training material or activity history."],
            ["Provider-agnostic governance", "Provider selection can change while classification, redaction, audit and evidence-continuity policy remains stable."],
            ["Governed provider orchestration", "AI interactions remain attached to workflow classification, provider-policy decisions, authorization and governance history."],
          ].map(([title, explanation]) => (
            <article key={title} className="operational-card p-5">
              <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{explanation}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm leading-7 text-zinc-400">
            These controls describe Cyber Sentinels application policy and
            enforcement. Provider-specific contractual, regional and retention
            guarantees must be verified before confidential or regulated data is
            approved for external processing.
          </p>
        </section>
      </div>
    </main>
  );
}
