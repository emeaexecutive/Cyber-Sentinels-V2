import Link from "next/link";
import { PrivateBetaBadge } from "@/components/private-beta";

const stories = [
  {
    title: "Workflow A: Enterprise AI Agent",
    problem:
      "Enterprises need to know which AI agent acted, who owns it, what authority it had and how its runtime behavior was governed.",
    workflow:
      "Cyber Sentinels registers the agent, links accountable ownership, records delegated authority, monitors runtime behavior, updates trust posture and preserves replay plus governance evidence.",
    flow:
      "Register -> Assign Owner -> Assign Authority -> Runtime Monitoring -> Trust Score -> Replay Timeline -> Governance Decision.",
    matters:
      "AI-agent activity becomes attributable, reviewable and revocable without pretending the platform controls every external runtime.",
    href: "/demo/agent-tracking-flow",
  },
  {
    title: "Workflow B: Human Identity",
    problem:
      "Human verification is not enough when session integrity, authority and evidence can change after entry.",
    workflow:
      "Cyber Sentinels connects identity verification, session integrity, continuous trust, replay, evidence and final decision into one governed record.",
    flow:
      "Verification -> Session Integrity -> Continuous Trust -> Replay -> Evidence -> Decision.",
    matters:
      "CIOs and CISOs can see whether trust stayed reliable through the workflow, not only whether an entry check passed.",
    href: "/demo/session-integrity",
  },
  {
    title: "Workflow C: Executive Deepfake",
    problem:
      "Executive impersonation requires media provenance, provider analysis, governance and reportable evidence without overstating detection certainty.",
    workflow:
      "Cyber Sentinels captures submitted media, collects evidence, records provider analysis state, evaluates trust, routes governance and produces a report.",
    flow:
      "Media Submitted -> Evidence Collection -> Provider Analysis -> Trust Engine -> Governance -> Report.",
    matters:
      "Security and executive teams receive a clear trust report with limitations, provider state and reviewer accountability.",
    href: "/verification-replay",
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
                <div className="mt-5">
                  <Link href={story.href} className="brand-primary-action brand-action-large text-sm">
                    Open demo path
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
