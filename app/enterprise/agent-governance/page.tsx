import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Agent Governance | Cyber Sentinels",
  description: "Govern agent purpose, delegated authority, runtime change and accountable ownership.",
  alternates: { canonical: "/enterprise/agent-governance" },
};

const agentProblems = [
  ["Unclear ownership", "Teams need to know which human or business owner is accountable when an agent acts."],
  ["Scope drift", "Delegated access can expand beyond the purpose a workflow was approved for."],
  ["Risky tool use", "Credential sweeps, sensitive-data discovery and unexpected outbound actions need governed review context."],
  ["Investigation gaps", "Agent activity is difficult to explain later when evidence, authority and outcome records are split across tools."],
];

const outcomes = [
  "Keep agent ownership and declared purpose visible.",
  "Review sensitive actions before relying on the result.",
  "Escalate runtime risk without claiming unsupported autonomous threat attribution.",
  "Preserve a replayable record for security, compliance and operations.",
];

export default function EnterpriseAgentGovernancePage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">AI Agent Governance</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-6xl">
            Govern agent activity after access is granted.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels helps enterprises understand whether AI agents acted within approved purpose, authority and workflow expectations before sensitive work continues.
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-2">
          {agentProblems.map(([title, copy]) => (
            <article key={title} className="operational-card p-5">
              <h2 className="font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="operational-eyebrow">Buyer outcomes</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {outcomes.map((outcome) => (
              <div key={outcome} className="rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-300">
                {outcome}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold">Need the operating model?</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
              Platform owns Runtime Trust and Governance. Trust Center owns Replay and AI Sovereignty.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/platform" className="brand-primary-action">Platform</Link>
            <Link href="/trust" className="brand-secondary-action">Trust Center</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
