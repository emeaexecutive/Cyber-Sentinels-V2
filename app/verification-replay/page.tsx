import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";

const replayFlow = [
  ["01", "Actor", "The human, AI agent, service account or API actor is recorded with accountable ownership."],
  ["02", "Workflow", "The operation, purpose and runtime context remain attached to the chronology."],
  ["03", "Evidence", "Provider, workflow and integrity evidence remains connected to its source."],
  ["04", "Authorization", "Delegated scope, grants, changes and revocations retain their lineage."],
  ["05", "Trust change", "Every posture transition stays connected to evidence, authority and review rationale."],
  ["06", "Governance", "Named review, intervention and approval actions remain attributable."],
  ["07", "Outcome", "The governed result and receipt close the chronology without claiming certainty."],
];

const buyerQuestions = [
  ["Who acted?", "Human, agent and service-account activity remains connected to accountable ownership and authority."],
  ["What changed?", "A time-ordered record shows the workflow event and resulting trust-state transition."],
  ["Why did trust change?", "Each posture transition retains the signal, evidence or governance rationale that caused it."],
  ["What evidence existed?", "Provider and workflow evidence remains linked to source, time and operational context."],
  ["What governance occurred?", "Reviewers, approvals and interventions remain attributable through authorization lineage."],
  ["What outcome resulted?", "The governed decision, unresolved conditions and receipt close the record."],
];

const memoryProperties = [
  ["Durable", "The chronology remains reviewable after a runtime session or provider interaction ends."],
  ["Enterprise-owned", "Retention, access and permitted use remain governed by customer policy."],
  ["Authorization-aware", "Every material action retains the authority and accountable ownership under which it occurred."],
  ["Outcome-complete", "Resolved conditions, unresolved flags and the governed result remain attached to the record."],
];

const scaleControls = [
  ["Bounded reads", "Operational views load deterministic windows while preserving continuation state for deeper history."],
  ["Stable chronology", "Timestamp and record identity provide repeatable ordering when events arrive together or out of order."],
  ["Policy retention", "Retention duration, access and export remain controlled by enterprise policy and regulatory need."],
  ["Provider continuity", "Normalized evidence references preserve the accountability chain when providers or orchestration paths change."],
];

export default function VerificationReplayPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Replay"
          title="How can an AI agent action be replayed for audit?"
          bullets={["Replay reconstructs the recorded chronology of an agent action: actor, authority, policy, evidence, decision and observed outcome. It explains the record; it does not execute the action again or prove an unobserved external effect.", "Keep evidence linked to its source and decision context.", "See named governance actions and unresolved conditions.", "Use the chronology as proof without exposing raw customer records."]}
          primary={{ href: "/enterprise-access?intent=demo", label: "Request Enterprise Demo" }}
          secondary={{ href: "/trust#trust-memory", label: "Read Trust Framework" }}
        />

        <section id="action-receipts" className="mt-8 scroll-mt-28 rounded-lg border border-zinc-800 bg-black p-6">
          <h2 className="text-2xl font-semibold">What should an AI agent action receipt contain?</h2>
          <p className="mt-4 max-w-4xl leading-8 text-zinc-300">An action receipt is a minimized record of the authorization decision. Preserve the actor and accountable owner, action, purpose, target scope, authority and delegation references, policy/version, decision reasons, timestamp and integrity digest. Keep execution attempts and observed outcomes distinct from authorization.</p>
          <p className="mt-4 max-w-4xl leading-8 text-zinc-400">Cyber Sentinels receipts are digested decision projections, not advertised as signed proof of execution or regulatory compliance. A provider observation, a client assertion and a canonical decision retain different provenance. Do not publish secrets, raw customer evidence or unnecessary provider payloads.</p>
          <p className="mt-4 leading-8 text-zinc-400">A previous ALLOW remains historical evidence. <Link href="/resources/agent-security/agent-authorization#runtime-authority" className="text-cyan-200 underline">Changed authority requires current evaluation</Link>. Read the <Link href="/developers/api-reference" className="text-cyan-200 underline">public receipt and Replay API contract</Link> or explore <Link href="/trust#trust-memory" className="text-cyan-200 underline">Trust Memory</Link>.</p>
        </section>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            Canonical chronology
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            From accountable actor to retained outcome.
          </h2>
          <div className="mt-6 grid overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-7">
            {replayFlow.map(([step, title, copy], index) => (
              <article
                key={title}
                className={`min-w-0 bg-black p-5 ${index === replayFlow.length - 1 ? "ring-1 ring-inset ring-cyan-900" : ""}`}
              >
                <p className="font-mono text-xs text-cyan-300">{step}</p>
                <h2 className="mt-3 text-lg font-semibold text-zinc-100">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            Enterprise memory properties
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            Built to preserve continuity, not just activity.
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {memoryProperties.map(([title, copy]) => (
              <article key={title} className="min-w-0 rounded-lg border border-zinc-800 bg-black p-4">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            Resilient by design
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            Long-lived memory without an unbounded operational view.
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {scaleControls.map(([title, copy]) => (
              <article key={title} className="min-w-0 rounded-lg border border-zinc-800 bg-black p-4">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            Buyer value
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            One replay answers six operational questions.
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {buyerQuestions.map(([question, answer]) => (
              <article key={question} className="min-w-0 rounded-lg border border-zinc-800 bg-black p-4">
                <h3 className="text-sm font-semibold text-zinc-100">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Durable enterprise memory, protected evidence</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Public visitors can understand the replay model here. Case-level
            timelines, subjects and reviewer notes require sign-in because they
            contain operational trust data. Retention follows enterprise policy;
            Replay is customer-owned operational memory, not a provider-owned
            activity log.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/replay/demo?scenario=proxy-candidate-interview" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100">
              Experience Replay
            </Link>
            <Link href="/trust-replay" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
              Open protected replay
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
export const metadata: Metadata = {
  ...publicSocialMetadata("Verification Replay | Cyber Sentinels", "Reconstruct actor, authority, evidence, change, governance and outcome chronology.", "/verification-replay"),
  title: "Verification Replay | Cyber Sentinels",
  description: "Reconstruct actor, authority, evidence, change, governance and outcome chronology.",
  alternates: { canonical: "/verification-replay" },
};
