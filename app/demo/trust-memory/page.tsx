import Link from "next/link";
import { buildTrustMemorySnapshot, demoTrustMemoryEvents } from "@/lib/trust-memory/trust-memory";

const flow = [
  ["Human or AI agent enters workflow", "Identity and authority are recorded before action."],
  ["Initial trust posture calculated", "The actor starts from a bounded confidence state."],
  ["Runtime signal changes trust", "Scope drift, session integrity or provider state changes the posture."],
  ["Governance review occurs", "A human reviewer can confirm, override, restore or block."],
  ["Reviewed outcome is recorded", "False positives and false negatives become calibration evidence."],
  ["Trust Memory updates future confidence", "Future decisions can reference prior reviewed outcomes."],
  ["Replay shows the full history", "Replay preserves the event chain; Trust Memory explains trust evolution."],
];

const tone: Record<string, string> = {
  increased: "border-emerald-800 text-emerald-200",
  recovered: "border-emerald-800 text-emerald-200",
  restored: "border-cyan-800 text-cyan-200",
  decreased: "border-amber-800 text-amber-200",
  decayed: "border-amber-800 text-amber-200",
  escalated: "border-orange-800 text-orange-200",
  blocked: "border-red-900 text-red-200",
  insufficient_evidence: "border-zinc-700 text-zinc-300",
};

export default function DemoTrustMemoryPage() {
  const snapshot = buildTrustMemorySnapshot(demoTrustMemoryEvents);

  return (
    <main className="operational-shell min-h-screen px-6 py-10 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Trust Memory demo</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Replay shows what happened. Trust Memory shows how trust evolved.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            This demo follows one enterprise workflow across a human reviewer,
            an AI agent, a machine identity, runtime signals, governance review
            and a reviewed outcome. It is an explainability foundation, not an
            autonomous learning claim.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/trust-replay" className="brand-primary-action brand-action-large text-sm">
              View Replay
            </Link>
            <Link href="/admin/trust-memory" className="brand-secondary-action brand-action-large text-sm">
              Open Admin Memory
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 lg:grid-cols-7">
          {flow.map(([title, detail], index) => (
            <article key={title} className="min-w-0 bg-black p-4">
              <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
              <h2 className="mt-2 text-sm font-semibold text-zinc-100">{title}</h2>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          {snapshot.summaries.map((summary) => (
            <article key={`${summary.actor_type}:${summary.actor_id}`} className="operational-panel p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{summary.actor_type.replace("_", " ")}</p>
              <h2 className="mt-2 text-xl font-semibold">{summary.actor_id}</h2>
              <div className="mt-4 grid gap-3 text-sm text-zinc-400">
                <p>Workflow: {summary.workflow_id}</p>
                <p>Latest state: {summary.latest_state}</p>
                <p>Net trust delta: {summary.net_trust_delta > 0 ? "+" : ""}{summary.net_trust_delta}</p>
                <p>Reviewed outcome impact: {summary.reviewed_outcome_impacts}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4">
          {snapshot.events.map((event) => (
            <article key={event.id} className="operational-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{event.event_kind.replaceAll("_", " ")}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{event.actor_id}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">{event.explanation.summary}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-sm ${tone[event.trust_change]}`}>
                  {event.trust_change.replace("_", " ")} {event.trust_delta > 0 ? "+" : ""}{event.trust_delta}
                </span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {[
                  ["Before", event.trust_state_before],
                  ["After", event.trust_state_after],
                  ["Confidence", `${event.confidence_before} -> ${event.confidence_after}`],
                  ["Evidence refs", event.evidence_refs.length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-100">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-zinc-500">{event.reason}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
