import Link from "next/link";
import { DecisionSummary } from "@/components/executive-summary";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { reviewedOutcomesToTrustMemoryEvents } from "@/lib/governance/reviewed-outcomes";
import { createClient } from "@/lib/supabase/server";
import { buildTrustMemorySnapshot, demoTrustMemoryEvents } from "@/lib/trust-memory/trust-memory";
import { loadValidationCases, runValidationBenchmark } from "@/lib/validation/benchmark-harness";

export const dynamic = "force-dynamic";

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

function memoryState(change: string) {
  if (["recovered", "restored"].includes(change)) return "Trust restored";
  if (change === "decayed") return "Trust decayed";
  if (["escalated", "insufficient_evidence"].includes(change)) return "Trust challenged";
  if (["decreased", "blocked"].includes(change)) return "Trust lost";
  if (change === "increased") return "Trust gained";
  return "Trust confirmed";
}

export default async function AdminTrustMemoryPage() {
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, { path: "/admin/trust-memory" });

  const cases = await loadValidationCases();
  const benchmark = await runValidationBenchmark({ cases });
  const reviewedEvents = reviewedOutcomesToTrustMemoryEvents(benchmark.reviewedOutcomes);
  const snapshot = buildTrustMemorySnapshot([...reviewedEvents, ...demoTrustMemoryEvents]);
  const events = snapshot.events.slice(0, 20);
  const reviewedImpact = events.filter((event) => event.reviewed_outcome_ref).length;
  const evidenceCount = events.reduce((total, event) => total + event.evidence_refs.length, 0);

  return (
    <main className="operational-shell min-h-screen px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="operational-panel p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <h1 className="mt-4 text-4xl font-semibold">Trust Memory Alpha</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">
            Trust Memory records how trust changed across actors, workflows, evidence,
            replay and governance review. Raw evidence remains outside this view.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/demo/trust-memory" className="brand-secondary-action brand-action-large text-sm">
              Open demo
            </Link>
            <Link href="/api/trust-memory" className="brand-secondary-action brand-action-large text-sm">
              View API
            </Link>
          </div>
        </section>

        <div className="mt-6">
          <DecisionSummary items={[
            { label: "Current posture", value: events.length ? memoryState(events[0].trust_change) : "No trust change recorded" },
            { label: "Current risks", value: `${events.filter((event) => ["decreased", "decayed", "escalated", "blocked"].includes(event.trust_change)).length} challenged or adverse change(s)` },
            { label: "Recommended action", value: events.some((event) => !event.reviewed_outcome_ref) ? "Review unconfirmed trust changes" : "Continue outcome monitoring" },
            { label: "Evidence available", value: `${evidenceCount} linked reference(s)` },
            { label: "Confidence", value: "Memory deltas are explainable history, not autonomous certainty" },
            { label: "Responsible owner", value: "Governance reviewer" },
          ]} />
        </div>

        <section className="mt-8 grid gap-3 md:grid-cols-4">
          {[
            ["Memory events", events.length],
            ["Actors affected", new Set(events.map((event) => event.actor_id)).size],
            ["Workflows affected", new Set(events.map((event) => event.workflow_id)).size],
            ["Reviewed impacts", reviewedImpact],
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <article className="operational-panel p-5">
            <p className="operational-eyebrow">Evidence coverage</p>
            <h2 className="mt-2 text-2xl font-semibold">{evidenceCount} references</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              The admin view shows counts and links only. Sensitive raw evidence stays in protected evidence and replay systems.
            </p>
          </article>
          <article className="operational-panel p-5">
            <p className="operational-eyebrow">Confidence movement</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {events.length ? `${events[0].confidence_before} to ${events[0].confidence_after}` : "No movement"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Confidence changes are explainable memory deltas, not autonomous ML claims.
            </p>
          </article>
          <article className="operational-panel p-5">
            <p className="operational-eyebrow">Boundary</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{snapshot.boundary}</p>
          </article>
        </section>

        <section className="mt-8 border-l border-zinc-800 pl-5">
          {events.map((event, index) => (
            <article key={event.id} className="relative pb-6">
              <span className="absolute -left-[1.52rem] top-1 h-3 w-3 rounded-full border border-cyan-500 bg-black" />
              <div className="rounded-lg border border-zinc-800 bg-black p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Decision event {index + 1}</p>
                    <h2 className="mt-2 text-lg font-semibold text-zinc-100">{event.explanation.summary}</h2>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${tone[event.trust_change]}`}>{memoryState(event.trust_change)}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{event.reason}</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
                  <span>{event.evidence_refs.length} evidence reference(s)</span>
                  <span>{event.reviewed_outcome_ref ? "Human reviewed" : "Governance context retained"}</span>
                  {event.replay_refs[0] ? <Link href={event.replay_refs[0]} className="text-cyan-200 hover:text-white">Open Replay</Link> : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
