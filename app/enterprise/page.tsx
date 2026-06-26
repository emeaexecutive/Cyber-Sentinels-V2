import Link from "next/link";

const trustControls = [
  ["Hiring Security", "The hiring funnel is a fraud frontline where fake applicants, proxy interviews and AI-assisted fraud can become enterprise access risk."],
  ["Session Integrity", "Liveness, deepfake risk, injection risk and channel integrity remain separate signals after verification begins."],
  ["Governance Review", "High-risk workflow changes route to named reviewers with ownership, chronology and recorded action."],
  ["Verification Replay", "Replay timelines reconstruct what happened before, during and after a workflow changed state."],
  ["Verification Receipts", "Printable receipts summarize trust state, reviewer decision, verification evidence, replay chronology and workflow outcome."],
];

const coordinationControls = [
  ["Trust state changes", "Identity, session, evidence and reviewer states remain visible as workflows evolve."],
  ["Governance escalation events", "High-risk workflow changes can move into human review with ownership."],
  ["Verification evidence attached", "Receipts, replay and audit references stay connected to the workflow."],
  ["Workflow authenticity status", "Teams can see whether a workflow is verified, elevated risk or awaiting review."],
];

export default function EnterprisePage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Operational Trust Infrastructure
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Enterprise trust coordination for humans, AI agents, and critical workflows.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels connects Hiring Security, Session Integrity,
            Governance Review, Verification Replay and Verification Receipts so
            teams can keep sensitive workflows explainable.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            It protects the decision layer behind critical enterprise actions: the workflow, evidence, reviewer action and trust state that determine whether access, hiring or operational decisions should move forward.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
              View Demo
            </Link>
            <Link href="/enterprise-access" className="rounded-lg border border-cyan-800 px-4 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
              Request Enterprise Access
            </Link>
            <Link href="/enterprise-access?intent=design_partner" className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 hover:text-white">
              Become a Design Partner
            </Link>
            <Link href="/enterprise-access?intent=intro_call" className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 hover:text-white">
              Book Intro Call
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Enterprise workflow</p>
          <h2 className="mt-3 text-2xl font-semibold">What the platform makes reviewable.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {trustControls.map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-sm font-semibold text-zinc-100">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Why operational trust infrastructure now</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Device and communication security are still necessary, but they do not explain whether a workflow stayed trustworthy after verification began.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Synthetic credibility, not just synthetic media, is becoming the attack surface. Enterprise teams need to review who entered a workflow, which evidence supports the decision, who acted and what outcome was recorded.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels helps teams verify which people, sessions and
            evidence can be reviewed across enterprise workflows, with human
            authority preserved.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {coordinationControls.map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-sm font-semibold text-zinc-100">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Pilot conversion path</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Start with one workflow, one reviewer path and one receipt that can
            be discussed with security, talent, compliance and executive
            stakeholders.
          </p>
        </section>
      </div>
    </main>
  );
}
