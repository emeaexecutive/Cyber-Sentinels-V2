import Link from "next/link";
import { EvidenceDisclaimer } from "@/components/evidence-disclaimer";

const marketShifts = [
  ["Synthetic credibility", "Generated profiles, reused identity evidence and manipulated sessions can reach high-value workflows before fragmented controls expose the mismatch."],
  ["Point-in-time verification", "An identity check at entry does not explain whether the live session, authorization context or evidence remained trustworthy."],
  ["Governance fragmentation", "Provider results, review notes, decisions and audit evidence often sit in separate systems, weakening operational accountability."],
  ["Agent and NHI accountability", "AI agents, service accounts and API actors can execute consequential work while ownership, delegated authority and replay remain fragmented."],
];

const moat = [
  ["Operational memory", "Each governed workflow adds replayable chronology, authorization history and evidence relationships that improve continuity."],
  ["Unified trust model", "Humans, AI agents, non-human identities and workflows share one posture, governance and replay model."],
  ["Governance embeddedness", "Reviewer ownership, escalation policy and operational accountability become part of how consequential work runs."],
  ["Cross-workflow continuity", "A common evidence and authorization language can extend from one validated workflow into adjacent enterprise operations."],
];

const boundaries = [
  "No hidden behavioral monitoring.",
  "No universal score about a person.",
  "No automatic claim that media or identity is perfectly real or fake.",
  "No autonomous approval outside declared authority.",
  "No replacement of accountable human review.",
];

export default function InvestorPage() {
  return (
    <main className="min-h-screen bg-[#04070c] text-white">
      <section className="border-b border-zinc-900 px-6 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Investor overview
          </p>
          <h1 className="mt-5 max-w-5xl text-4xl font-semibold leading-tight md:text-6xl">
            Operational trust for intelligent systems.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-200">
            Cyber Sentinels is the operational trust infrastructure layer for
            humans, AI agents and enterprise workflows—connecting persistent
            posture, governed execution and replayable operational memory.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            The initial wedge is Hiring Security and Session Integrity: workflows where synthetic
            applicants, proxy interviews and injected sessions create immediate enterprise risk.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-200">
            Cyber Sentinels helps enterprises understand, govern and verify
            operational trust across humans, AI agents and workflows.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Enterprise AI sovereignty keeps provider choice, data policy,
            workflow memory and operational IP under customer control.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo/hiring-attack" className="brand-primary-action brand-action-large text-sm">
              View Demo
            </Link>
            <Link href="/enterprise-access?intent=design_partner" className="brand-secondary-action brand-action-large text-sm">
              Become a Design Partner
            </Link>
            <Link href="/enterprise-access?intent=intro_call" className="rounded-lg border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-zinc-400">
              Book Intro Call
            </Link>
          </div>
          <EvidenceDisclaimer className="mt-7 max-w-3xl" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Market problem</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold">Enterprise decisions now depend on evidence that changes mid-workflow.</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {marketShifts.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-300">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-14 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Why now</p>
            <h2 className="mt-3 text-3xl font-semibold">TrustOps is becoming an enterprise infrastructure category.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              Remote hiring, synthetic media and automated operations increase the distance between
              a credential checked at entry and the person, session or system acting later.
              Persistent posture, governed execution and replayable memory close
              that continuity gap across human and machine activity.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Wedge</p>
            <h2 className="mt-3 text-3xl font-semibold">Hiring Security + Session Integrity</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              Start with a painful, legible workflow: candidate intake, provider verification,
              live-session anomaly, governance escalation, replay, receipt and updated trust posture.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Defensibility</p>
        <h2 className="mt-3 text-3xl font-semibold">The moat is the operational memory around the decision.</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
          Defensibility compounds through retained continuity and enterprise
          operating practice—not through unsupported claims of proprietary AI
          certainty.
        </p>
        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {moat.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-300">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-14 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Provider orchestration</p>
            <h2 className="mt-3 text-3xl font-semibold">Integrate evidence without outsourcing the decision.</h2>
          </div>
          <div className="grid gap-3 text-sm leading-7 text-zinc-300">
            <p className="rounded-lg border border-zinc-800 bg-black p-4">
              Provider adapters normalize verification state, assurance context, evidence references and failure conditions into the workflow chronology.
            </p>
            <p className="rounded-lg border border-zinc-800 bg-black p-4">
              Pending, missing and failed providers stay visible. Governance—not a provider confidence value—determines the final workflow outcome.
            </p>
            <p className="rounded-lg border border-zinc-800 bg-black p-4">
              The platform can add providers over time while preserving one replay, receipt and review model for the enterprise.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:px-8 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Ethical boundaries</p>
          <h2 className="mt-3 text-3xl font-semibold">Accountable evidence, not synthetic certainty.</h2>
          <div className="mt-6 grid gap-3">
            {boundaries.map((boundary) => (
              <p key={boundary} className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300">{boundary}</p>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-cyan-950 bg-black p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Design partner motion</p>
          <h2 className="mt-3 text-3xl font-semibold">Prove the workflow with serious operators.</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-300">
            Pilot one hiring workflow, validate provider evidence, review the replay and receipt,
            then use operational feedback to refine policy, ownership and evidence requirements.
          </p>
          <Link href="/design-partner" className="mt-6 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
            Review Design Partner Program
          </Link>
        </div>
      </section>
    </main>
  );
}
