import Link from "next/link";

const controls = [
  ["Agent identity", "Every agent remains linked to an accountable owner, declared purpose, provider/model context and operating status."],
  ["Authority lineage", "Delegated authority, constraints, expiry and revocation status remain visible before consequential action is trusted."],
  ["Permission boundaries", "Runtime action is compared against declared scope, accessed resources and policy expectations."],
  ["Credential exposure risk", "Credential and API-key exposure patterns are treated as heuristic runtime evidence, not confirmed compromise."],
  ["Action replay", "Agent, owner, authority, intent, resource, risk, decision and governance action remain reconstructable."],
  ["Kill-switch status", "Review, recommendation and placeholder activation states remain visible without claiming runtime control that is not integrated."],
];

const riskExamples = [
  "credential sweeps",
  "sensitive-data discovery",
  "risky tool use",
  "unauthorized access attempts",
  "unexpected outbound action",
  "workflow abuse",
];

export default function EnterpriseAgentGovernancePage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Agentic Threat Runtime Control</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-6xl">
            Govern what AI agents do after they receive access.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels verifies who or what acted, under whose authority,
            what was accessed, and why the action was allowed, reviewed or blocked.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            AI agents can now act across systems. Risk includes credential sweeps,
            sensitive-data discovery, risky tool use, unauthorized access and
            workflow abuse. Cyber Sentinels governs identity, authority,
            permissions, runtime behavior, replay and escalation without claiming
            autonomous ransomware detection.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels gives enterprises control over AI providers,
            operational memory, identity signals and workflow evidence.
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {controls.map(([title, copy]) => (
            <article key={title} className="operational-card p-5">
              <h2 className="font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="operational-eyebrow">Reviewable runtime events</p>
          <h2 className="mt-3 text-2xl font-semibold">Agent behavior remains explainable and replayable.</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {riskExamples.map((risk) => (
              <span key={risk} className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-300">
                {risk}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-zinc-500">
            These events are source-labelled as Heuristic Baseline or Runtime
            Intelligence unless a live provider supplies evidence. They support
            governance review and replay, not standalone threat attribution.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold">Runtime control for regulated workflows</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
              Use agent runtime posture alongside session integrity, provenance,
              provider status, reviewed outcomes and governance queues before
              sensitive actions continue.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/agents" className="brand-primary-action">Agent Registry</Link>
            <Link href="/dashboard/agent-risk" className="brand-secondary-action">Agent Risk</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
