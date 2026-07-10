import Link from "next/link";
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

        <section className="mt-8 overflow-hidden rounded-lg border border-zinc-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Workflow</th>
                  <th className="px-4 py-3">Change</th>
                  <th className="px-4 py-3">Evidence</th>
                  <th className="px-4 py-3">Replay</th>
                  <th className="px-4 py-3">Governance</th>
                  <th className="px-4 py-3">Reviewed Impact</th>
                  <th className="px-4 py-3">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-black">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-4">
                      <p className="font-medium text-zinc-100">{event.actor_id}</p>
                      <p className="mt-1 text-xs text-zinc-500">{event.actor_type.replace("_", " ")}</p>
                    </td>
                    <td className="px-4 py-4 text-zinc-400">{event.workflow_id}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2 py-1 text-xs ${tone[event.trust_change]}`}>
                        {event.trust_change.replace("_", " ")} {event.trust_delta > 0 ? "+" : ""}{event.trust_delta}
                      </span>
                      <p className="mt-2 max-w-xs text-xs leading-5 text-zinc-500">{event.reason}</p>
                    </td>
                    <td className="px-4 py-4 text-zinc-400">{event.evidence_refs.length}</td>
                    <td className="px-4 py-4">
                      {event.replay_refs[0] ? (
                        <Link href={event.replay_refs[0]} className="text-cyan-200 hover:text-cyan-100">
                          Replay
                        </Link>
                      ) : (
                        <span className="text-zinc-600">None</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-zinc-400">{event.governance_refs[0] ?? "None"}</td>
                    <td className="px-4 py-4 text-zinc-400">{event.reviewed_outcome_ref ?? "No review outcome"}</td>
                    <td className="px-4 py-4 text-zinc-400">
                      {event.confidence_before} to {event.confidence_after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
