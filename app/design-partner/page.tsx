import Link from "next/link";
import { EvidenceDisclaimer } from "@/components/evidence-disclaimer";

const risks = [
  ["Fake applicants", "Convincing profiles can enter hiring workflows before evidence, identity context and interview behavior line up."],
  ["Proxy interviews", "The person in the interview may not match the candidate context the team believes it is reviewing."],
  ["Stolen identities", "Identity evidence can be reused or misrepresented while the session itself still needs review."],
  ["AI-assisted fraud", "Generated answers, synthetic media and automated coaching can make a workflow look cleaner than it is."],
  ["Injected sessions", "A verified entry point does not guarantee the camera, audio or screen channel remains trustworthy."],
];

const proof = [
  ["Operational auditability", "Evidence, flags, decisions and audit references stay connected to the workflow."],
  ["Replay timelines", "Teams can reconstruct what happened in the order it happened."],
  ["Verification receipts", "A portable receipt summarizes evidence, review state, session integrity and replay access."],
  ["Governance chronology", "Reviewer actions, escalations and unresolved decisions are visible."],
  ["Session integrity review", "Liveness, deepfake risk, injection risk and identity confidence remain separate signals."],
];

const pilotObjectives = [
  "Test one real Hiring Security and Session Integrity workflow.",
  "Validate which provider evidence is useful, missing or requires escalation.",
  "Review the replay and verification receipt with security, talent and compliance stakeholders.",
  "Provide operational feedback on ownership, policy language and evidence requirements.",
];

export default function DesignPartnerPage() {
  return (
    <main className="min-h-screen bg-[#04070c] text-white">
      <section className="border-b border-zinc-900 px-6 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Design Partner Program</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            Build operational trust workflows with serious enterprise teams.
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300">
            Trust changed quietly. AI changed identity risk, and verification alone is no longer enough for workflows where hiring access, sensitive systems and human review matter.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels is for security, talent, risk and governance teams that need Verification Evidence, Session Integrity, Replay Evidence and Verification Receipts instead of unsupported trust claims.
          </p>
          <EvidenceDisclaimer className="mt-6 max-w-3xl" />
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/enterprise-access?intent=pilot" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
              Request Enterprise Access
            </Link>
            <Link href="/enterprise-access?intent=intro_call" className="rounded-lg border border-cyan-800 px-5 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
              Book Intro Call
            </Link>
            <Link href="/demo" className="rounded-lg border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-400">
              View Demo
            </Link>
            <Link href="/enterprise-access?intent=design_partner" className="rounded-lg border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-400">
              Become a Design Partner
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:px-8">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Hiring security wedge</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-semibold">Practical risks design partners can help validate.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {risks.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-14 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Enterprise proof</p>
            <h2 className="mt-4 text-3xl font-semibold">Evidence that can survive a review meeting.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              The pilot shows how a workflow moves from verification setup to Governance Review, Replay Evidence and trust receipts without becoming an opaque decision product.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {proof.map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:px-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Pilot objectives</p>
          <h2 className="mt-4 text-3xl font-semibold">A short path to first operational value.</h2>
          <div className="mt-6 grid gap-3">
            {pilotObjectives.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-lg border border-zinc-800 bg-black p-4">
                <span className="text-sm font-semibold text-cyan-200">0{index + 1}</span>
                <p className="text-sm leading-6 text-zinc-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Who should apply</p>
          <h2 className="mt-4 text-2xl font-semibold">Teams with real review pressure.</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-300">
            Ideal design partners are reviewing remote hiring workflows, sensitive verification workflows or AI-assisted operations where evidence, escalation and auditability already matter.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-lg border border-cyan-800 px-4 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
              View Demo
            </Link>
            <Link href="/enterprise-access?intent=design_partner" className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
              Become a Design Partner
            </Link>
            <Link href="/enterprise-access?intent=intro_call" className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 hover:border-zinc-400">
              Book Intro Call
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
