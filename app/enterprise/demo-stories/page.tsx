import Link from "next/link";
import { PrivateBetaBadge } from "@/components/private-beta";

const stories = [
  {
    title: "Hiring Security & Interview Integrity",
    problem:
      "Hiring teams face synthetic trust attacks, weak candidate provenance, manipulated interview presence and scattered review records.",
    workflow:
      "Cyber Sentinels organizes candidate provenance, recruiter verification, interview integrity signals, evidence, human review and receipts into one explainable hiring workflow.",
    flow:
      "A recruiter opens a hiring security case, attaches interview evidence, reviews candidate and recruiter context, escalates unresolved signals, records the decision and issues a receipt for later review.",
    matters:
      "The enterprise can defend the hiring decision with an evidence chain and replayable timeline instead of relying on a binary detector or fragmented notes.",
  },
  {
    title: "Operational Trust & Governance",
    problem:
      "Enterprise trust decisions often live across tickets, dashboards, files and chat threads, making it hard to explain what happened or why a workflow was approved.",
    workflow:
      "Cyber Sentinels turns trust work into a governed operational flow: case, evidence, signals, governance action, audit log, timeline, receipt and replay.",
    flow:
      "An operator creates a trust case, adds supporting evidence, reviews unresolved signals, requests more evidence, records a human governance action and preserves the decision path.",
    matters:
      "Teams get operational memory for trust decisions, clearer accountability and a calmer path from uncertainty to reviewable action.",
  },
  {
    title: "AI Agent Governance",
    problem:
      "AI agents are beginning to act inside workflows, but enterprises need to know who owns the agent, what it was allowed to do and how its activity was reviewed.",
    workflow:
      "Cyber Sentinels links agent identity, operating context, permissions, evidence, human governance and replayable activity records.",
    flow:
      "A team registers an agent, links it to an owner and workspace, reviews a sensitive action, records human approval or escalation and preserves a receipt for the workflow.",
    matters:
      "AI-assisted operations become explainable and governable. AI can summarize and surface gaps, while humans remain responsible for decisions.",
  },
];

const labels = ["Problem", "Cyber Sentinels workflow", "Example flow", "Why it matters"];

export default function EnterpriseDemoStoriesPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Enterprise Demo Stories
          </p>
          <PrivateBetaBadge className="mt-4" />
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold md:text-6xl">
            Founder-ready narratives for operational trust workflows.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">
            Use these stories to keep enterprise demos clear: start with the
            operational problem, show the Cyber Sentinels workflow, walk through
            one example flow and close on enterprise value.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/enterprise/walkthrough" className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">
              Enterprise Walkthrough
            </Link>
            <Link href="/enterprise/hiring-security" className="rounded-lg border border-cyan-800 px-4 py-3 text-sm text-cyan-100">
              Hiring Security
            </Link>
            <Link href="/demo" className="rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300">
              Guided Demo
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-5">
          {stories.map((story, index) => {
            const values = [story.problem, story.workflow, story.flow, story.matters];

            return (
              <article key={story.title} className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-zinc-100">
                  {story.title}
                </h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {labels.map((label, labelIndex) => (
                    <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
                        {label}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">
                        {values[labelIndex]}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
