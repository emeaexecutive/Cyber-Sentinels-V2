import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";

const structure = [
  ["Onboarding", "Confirm pilot scope, users, sample data, review owners and the first workflow to show."],
  ["Verification setup", "Create the workspace, first case and evidence expectations for hiring or session integrity review."],
  ["Governance review", "Route unresolved risk to a named reviewer with evidence, context and open actions."],
  ["Replay evidence", "Use replay timelines to show what happened before, during and after the session changed."],
  ["Trust receipts", "Export a receipt that summarizes evidence, session integrity, governance outcome and replay access."],
  ["Admin workflows", "Use readiness, runtime validation and pilot overview surfaces before live walkthroughs."],
];

const outcomes = [
  "A documented workflow from intake to review.",
  "Clear separation of identity, liveness, deepfake risk and injection risk.",
  "A governance chronology that names what is pending or resolved.",
  "A replay timeline for audit and executive review.",
  "A verification receipt that can be printed or saved as PDF.",
];

export default function EnterprisePilotPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Enterprise Pilot"
          title="Prove one accountable decision workflow before expanding."
          bullets={["Select one consequential workflow and responsible owner.", "Agree identity, authority and evidence boundaries.", "Exercise runtime change, governance, Replay and receipt.", "Close with measurable acceptance evidence and next-step ownership."]}
          primary={{ href: "/enterprise-access?intent=pilot", label: "Start Pilot" }}
          secondary={{ href: "/demo", label: "View Guided Demo" }}
        />

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {structure.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-300">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Pilot outcomes</p>
            <h2 className="mt-3 text-3xl font-semibold">What a successful pilot should produce.</h2>
            <div className="mt-6 grid gap-3">
              {outcomes.map((item) => (
                <p key={item} className="rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-300">
                  {item}
                </p>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-zinc-800 bg-black p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Enterprise proof</p>
            <h2 className="mt-3 text-3xl font-semibold">Show the review path, not a magic score.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              The pilot keeps Verification Evidence, Governance Review, Replay Evidence and Session Integrity visible for practical conversations about fake applicants, proxy interviews and injected sessions.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/enterprise-access?intent=pilot" className="brand-primary-action brand-action-large text-sm">Start Pilot</Link>
              <Link href="/trust" className="brand-secondary-action brand-action-large text-sm">Read Trust Framework</Link>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
