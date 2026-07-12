import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";

export const dynamic = "force-dynamic";

const hiringProblems = [
  ["Synthetic applicant risk", "Candidate evidence, profile context and reviewer notes can become inconsistent as the process advances."],
  ["Proxy interviews", "The person present in a session may not match the verified candidate context or expected workflow history."],
  ["Session manipulation", "Generated answers, coached presence or altered media can create review signals that need careful human evaluation."],
  ["Decision defensibility", "People, security and legal teams need one shared record of what was reviewed before a hiring outcome moves forward."],
];

const outcomes = [
  "Keep identity, interview context, review notes and receipts connected.",
  "Escalate unresolved risk without making unsupported detection claims.",
  "Give reviewers a replayable case history when hiring confidence changes.",
  "Preserve a clearer audit trail for security, legal and talent stakeholders.",
];

const lifecycleTemplates = ["Hiring", "AI Agent", "Vendor", "Executive", "Machine Identity", "Financial Workflow", "Healthcare", "Government"];

export default function HiringSecurityPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Hiring Lifecycle Template"
          title="Apply Continuous Trust Lifecycle infrastructure to consequential hiring decisions."
          bullets={["Surface synthetic applicant, proxy interview and session-integrity risk.", "Keep hiring judgment with accountable human reviewers.", "Connect evidence, review rationale and the final outcome.", "Replay what changed when a decision is challenged."]}
          primary={{ href: "/enterprise-access?intent=demo", label: "Request Enterprise Demo" }}
          secondary={{ href: "/demo/hiring-attack", label: "View Guided Scenario" }}
        />

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="operational-eyebrow">One template, not the platform identity</p>
          <h2 className="mt-2 text-2xl font-semibold">Hiring Security is one governed lifecycle.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            The same Enterprise Trust Infrastructure governs evidence, decisions, replay and Trust Memory™ across human and machine workflows.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {lifecycleTemplates.map((template) => (
              <span key={template} className={`rounded-full border px-3 py-1 text-xs ${template === "Hiring" ? "border-cyan-800 text-cyan-100" : "border-zinc-800 text-zinc-400"}`}>
                {template}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-2">
          {hiringProblems.map(([title, body]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">
            Buyer outcomes
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {outcomes.map((outcome) => (
              <div key={outcome} className="rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-300">
                {outcome}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Need the underlying model?</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Platform explains Runtime Trust and Governance. Trust Center explains Replay and evidence boundaries.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/platform" className="brand-secondary-action">Platform</Link>
            <Link href="/trust" className="brand-secondary-action">Trust Center</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
