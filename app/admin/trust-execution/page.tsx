import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { getRecentTrustEvents } from "@/lib/events/event-bus";
import { getGovernanceQueueSnapshot } from "@/lib/governance/governance-queue";
import { getRuntimeProfileSnapshot } from "@/lib/performance/runtime-profiler";
import { orchestrateProviders } from "@/lib/providers/provider-orchestrator";
import { pendingReplayJobs } from "@/lib/replay/replay-writer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ReplayRow = {
  id: string;
  event_type: string | null;
  event_title: string | null;
  event_summary: string | null;
  subject_id: string | null;
  severity: string | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
};

export default async function TrustExecutionAdminPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login?next=/admin/trust-execution");
    redirect("/back-office?denied=1");
  }
  await requireAdminPageAccess(supabase, { path: "/admin/trust-execution" });
  const { data } = await supabase
    .from("trust_timeline_events")
    .select("id,event_type,event_title,event_summary,subject_id,severity,metadata,created_at")
    .ilike("event_type", "%trust_workflow%")
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<ReplayRow[]>();
  const rows = data ?? [];
  const providerSnapshot = await orchestrateProviders({ timeoutMs: 200 });
  const recentRuntimeEvents = getRecentTrustEvents(12);
  const governanceQueue = getGovernanceQueueSnapshot(8);
  const runtimeProfile = getRuntimeProfileSnapshot(providerSnapshot);
  const providerDegraded = providerSnapshot.filter((provider) => provider.state !== "Live").length;
  const providerMaxLatency = providerSnapshot.length
    ? Math.max(...providerSnapshot.map((provider) => provider.latency_ms))
    : 0;
  const count = (needle: string) => rows.filter((row) => String(row.metadata?.decision ?? row.event_type).includes(needle)).length;
  const summary = [
    ["Recent trust decisions", rows.length],
    ["Allowed actions", count("allow")],
    ["Blocked actions", count("block")],
    ["Escalations", count("escalate")],
    ["Step-up requests", count("step_up")],
    ["Evidence preserved", rows.filter((row) => row.metadata?.evidence_preserved === true).length],
    ["Replay writes queued", pendingReplayJobs()],
  ];

  return (
    <main className="operational-shell min-h-screen px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="operational-panel p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <h1 className="mt-4 text-4xl font-semibold">Trust Execution Monitor</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">
            Monitor algorithm results, workflow execution, evidence preservation,
            replay links and detection source labels. Empty rows mean no retained
            execution events are visible, not that no risk exists.
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-500">
            Each retained decision should identify who or what acted, under whose authority,
            what resource was touched, why the action was allowed, reviewed or blocked,
            and which replay evidence exists.
          </p>
          <Link href="/demo/trust-execution-flow" className="mt-5 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100">
            Open execution demo
          </Link>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          {summary.map(([label, value]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Slowest provider", runtimeProfile.slowestProvider ? `${runtimeProfile.slowestProvider.label} (${runtimeProfile.slowestProvider.latencyMs}ms)` : "No provider sample"],
            ["Slowest workflow stage", runtimeProfile.slowestWorkflowStage ? `${runtimeProfile.slowestWorkflowStage.stage.replaceAll("_", " ")} (${runtimeProfile.slowestWorkflowStage.latencyMs}ms)` : "No stage sample"],
            ["Timeouts / failures", `${runtimeProfile.timeoutCount} timeout(s), ${runtimeProfile.failedProviderCount} failed provider(s)`],
            ["Avg decision time", `${runtimeProfile.averageDecisionTimeMs}ms avg / cache ${runtimeProfile.cache.hits}:${runtimeProfile.cache.misses}`],
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-zinc-100">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <article className="operational-panel p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="operational-eyebrow">Provider orchestration</p>
                <h2 className="mt-2 text-2xl font-semibold">Latency and degradation</h2>
              </div>
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                {providerDegraded} degraded / max {providerMaxLatency}ms
              </span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {providerSnapshot.slice(0, 6).map((provider) => (
                <div key={provider.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-zinc-100">{provider.name}</p>
                    <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">{provider.state}</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">{provider.latency_ms}ms latency · weight {provider.weight}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{provider.limitations[0]}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="operational-panel p-5">
            <p className="operational-eyebrow">Async governance</p>
            <h2 className="mt-2 text-2xl font-semibold">Non-blocking queues</h2>
            <div className="mt-5 space-y-3">
              {(governanceQueue.length ? governanceQueue : [
                { id: "empty-review", queue: "review", subject_id: "No pending review job", decision: "review", reason: "Queue is empty in this runtime.", evidence_refs: [] },
              ]).map((job) => (
                <div key={job.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm font-semibold text-zinc-100">{job.queue}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{job.reason}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-8 operational-panel p-5">
          <p className="operational-eyebrow">Runtime profiling</p>
          <h2 className="mt-2 text-2xl font-semibold">Execution-stage latency</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Object.entries(runtimeProfile.stageAverages).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label.replace(/([A-Z])/g, " $1")}</p>
                <p className="mt-2 text-xl font-semibold text-zinc-100">{value}ms</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-500">{runtimeProfile.boundary}</p>
        </section>

        <section className="mt-8 operational-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="operational-eyebrow">Runtime event stream</p>
              <h2 className="mt-2 text-2xl font-semibold">Staged trust updates</h2>
            </div>
            <span className="rounded-full border border-cyan-900 px-3 py-1 text-xs text-cyan-200">in-process snapshot</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(recentRuntimeEvents.length ? recentRuntimeEvents : [
              { id: "placeholder-signal", name: "signal.received", created_at: "awaiting runtime event", payload: { state: "No live event retained in this process." } },
              { id: "placeholder-provider", name: "provider.timeout", created_at: "awaiting runtime event", payload: { state: "Provider timeouts are isolated from the decision path." } },
              { id: "placeholder-replay", name: "replay.created", created_at: "awaiting runtime event", payload: { state: "Replay writes are append-only when generated." } },
            ]).map((event) => (
              <div key={event.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="font-mono text-xs text-cyan-300">{event.name}</p>
                <p className="mt-2 text-xs text-zinc-500">{event.created_at}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{JSON.stringify(event.payload)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-lg border border-zinc-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Sources</th>
                  <th className="px-4 py-3">Authority</th>
                  <th className="px-4 py-3">Replay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-black">
                {rows.length ? rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-4 font-medium text-zinc-100">{String(row.metadata?.decision ?? row.event_title ?? "decision")}</td>
                    <td className="px-4 py-4 text-zinc-400">{String(row.metadata?.action_executed ?? row.event_summary ?? "not recorded")}</td>
                    <td className="px-4 py-4 text-zinc-400">{String(row.metadata?.confidence_band ?? "not recorded")}</td>
                    <td className="px-4 py-4 text-zinc-400">{Array.isArray(row.metadata?.source_labels) ? row.metadata.source_labels.join(", ") : "not recorded"}</td>
                    <td className="px-4 py-4 text-zinc-400">{String(row.metadata?.authority_actor ?? row.metadata?.actor_id ?? "not recorded")}</td>
                    <td className="px-4 py-4">
                      <Link href={`/trust-replay?subject_id=${encodeURIComponent(row.subject_id ?? "")}`} className="text-cyan-200 hover:text-cyan-100">
                        View Replay
                      </Link>
                    </td>
                  </tr>
                )) : (
                  <tr><td className="px-4 py-6 text-zinc-500" colSpan={6}>No trust execution events retained yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
