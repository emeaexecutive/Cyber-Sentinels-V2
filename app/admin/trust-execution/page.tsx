import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { buildPlatformHealth, buildTrustDecisionMetrics } from "@/lib/core/platform-health";
import { getRecentTrustEvents } from "@/lib/events/event-bus";
import { getGovernanceQueueSnapshot } from "@/lib/governance/governance-queue";
import { getRuntimeProfileSnapshot, recordRuntimeProfile } from "@/lib/performance/runtime-profiler";
import { orchestrateProviders } from "@/lib/providers/provider-orchestrator";
import { getReplayQueueDiagnostics, pendingReplayJobs } from "@/lib/replay/replay-writer";
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

function formatLatency(value: number | null) {
  return value === null ? "Awaiting data" : `${value}ms`;
}

export default async function TrustExecutionAdminPage() {
  const dashboardStarted = Date.now();
  const supabase = await createClient();
  const authorizationStarted = Date.now();
  const access = await checkAdminAccess(supabase);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login?next=/admin/trust-execution");
    redirect("/back-office?denied=1");
  }
  await requireAdminPageAccess(supabase, { path: "/admin/trust-execution" });
  recordRuntimeProfile({
    stage: "authorization_latency",
    latencyMs: Date.now() - authorizationStarted,
    ok: true,
    degraded: false,
    metadata: { label: "admin trust execution authorization" },
  });
  const queryStarted = Date.now();
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error: decisionQueryError } = await supabase
    .from("trust_timeline_events")
    .select("id,event_type,event_title,event_summary,subject_id,severity,metadata,created_at")
    .in("event_type", [
      "trust_workflow_allow",
      "trust_workflow_review",
      "trust_workflow_step_up",
      "trust_workflow_escalate",
      "trust_workflow_block",
    ])
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false })
    .limit(1000)
    .returns<ReplayRow[]>();
  recordRuntimeProfile({
    stage: "database_query_latency",
    latencyMs: Date.now() - queryStarted,
    ok: !decisionQueryError,
    degraded: Boolean(decisionQueryError),
    metadata: { label: "trust_timeline_events 24 hour decision query", row_count: data?.length ?? 0 },
  });
  const rows = data ?? [];
  const providerSnapshot = await orchestrateProviders({ timeoutMs: 200 });
  const recentRuntimeEvents = getRecentTrustEvents(12);
  const governanceQueue = getGovernanceQueueSnapshot(8);
  const runtimeProfile = getRuntimeProfileSnapshot(providerSnapshot);
  const decisionMetrics = buildTrustDecisionMetrics(rows);
  const replayDiagnostics = getReplayQueueDiagnostics();
  const providerDegraded = providerSnapshot.filter((provider) => provider.state !== "Live").length;
  const providerMaxLatency = providerSnapshot.length
    ? Math.max(...providerSnapshot.map((provider) => provider.latency_ms))
    : 0;
  const summary = [
    ["Decisions / 24h", decisionMetrics.total],
    ["Allow", decisionMetrics.allow],
    ["Review", decisionMetrics.review],
    ["Escalate", decisionMetrics.escalate],
    ["Block", decisionMetrics.block],
    ["Evidence preserved", rows.filter((row) => row.metadata?.evidence_preserved === true).length],
    ["Replay writes queued", pendingReplayJobs()],
  ];
  recordRuntimeProfile({
    stage: "dashboard_latency",
    latencyMs: Date.now() - dashboardStarted,
    ok: !decisionQueryError,
    degraded: Boolean(decisionQueryError),
    metadata: { label: "trust execution dashboard server load" },
  });
  const platformHealth = buildPlatformHealth({ providerSnapshot, authConfigured: true });
  const providerIssueCount = platformHealth.providers.filter((provider) => ["degraded", "offline"].includes(provider.state)).length;
  const missingCredentialCount = platformHealth.providers.filter((provider) => provider.state === "awaiting_credentials").length;
  const configurationIssues = [
    ...(decisionQueryError ? ["Trust decision metrics query failed; counts are incomplete."] : []),
    ...(platformHealth.build.version ? [] : ["Build version environment metadata is unavailable."]),
    ...(platformHealth.build.deploymentTimestamp ? [] : ["Deployment timestamp environment metadata is unavailable."]),
    ...platformHealth.platformHealth.blockers,
  ];
  const trendMax = Math.max(1, ...decisionMetrics.perHour.map((bucket) => bucket.total));

  return (
    <main className="operational-shell min-h-screen px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="operational-panel p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">Platform Health</p>
          <h1 className="mt-2 text-4xl font-semibold">Platform Health & Trust Execution</h1>
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

        <section className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Health", platformHealth.applicationStatus, `Build ${platformHealth.build.version ?? "unavailable"}; deployed ${platformHealth.build.deploymentTimestamp ?? "unavailable"}.`],
            ["Risk", `${providerIssueCount + platformHealth.queues.failedJobs} active issue(s)`, `${providerIssueCount} provider issue(s); ${platformHealth.queues.failedJobs} failed replay job(s).`],
            ["Actions", configurationIssues.length || missingCredentialCount ? "Operator review required" : "No immediate configuration action", `${configurationIssues.length} configuration issue(s); ${missingCredentialCount} provider(s) awaiting credentials.`],
            ["Evidence", `${decisionMetrics.total} retained decision(s)`, `${runtimeProfile.slowestOperations.length} runtime sample(s); ${rows.length} decision record(s) in the 24-hour window.`],
          ].map(([label, value, detail]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">{label}</p>
              <p className="mt-2 text-lg font-semibold capitalize text-zinc-100">{value}</p>
              <p className="mt-3 text-xs leading-5 text-zinc-500">{detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="operational-eyebrow">Enterprise support diagnostics</p>
          <h2 className="mt-2 text-2xl font-semibold">Configuration and job health</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Configuration issues", configurationIssues.length, configurationIssues[0] ?? "No configuration issue detected in this snapshot."],
              ["Provider issues", providerIssueCount, "Configured provider limitations remain visible below."],
              ["Missing credentials", missingCredentialCount, "Only configure providers approved for this deployment."],
              ["Failed jobs", replayDiagnostics.failed, replayDiagnostics.boundary],
              ["Retry queue", replayDiagnostics.retryQueued, replayDiagnostics.retryQueued ? "Operator review is required before retry." : "No replay retry is queued in this process."],
            ].map(([label, value, detail]) => (
              <article key={String(label)} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
                <p className="mt-3 text-xs leading-5 text-zinc-600">{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          {summary.map(([label, value]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="operational-eyebrow">Decision trend</p>
          <h2 className="mt-2 text-2xl font-semibold">Decisions per hour</h2>
          <div className="mt-5 grid grid-cols-6 gap-2 md:grid-cols-12 xl:grid-cols-24">
            {decisionMetrics.perHour.map((bucket) => (
              <div key={bucket.hour} className="flex min-h-28 flex-col justify-end rounded border border-zinc-800 bg-black p-2" title={`${bucket.hour}: ${bucket.total} decision(s)`}>
                <div className="rounded-sm bg-cyan-400/70" style={{ height: `${Math.max(bucket.total ? 8 : 1, (bucket.total / trendMax) * 72)}px` }} />
                <p className="mt-2 text-center text-[10px] text-zinc-600">{new Date(bucket.hour).getUTCHours().toString().padStart(2, "0")}</p>
                <p className="text-center text-xs font-semibold text-zinc-300">{bucket.total}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-500">{decisionMetrics.limitation}</p>
        </section>

        <details className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-200">
            Expand engineering details: latency samples, provider orchestration, queues, runtime events and decision records
          </summary>

        <section className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["Dashboard load", formatLatency(platformHealth.latency.dashboardLoad.value), platformHealth.latency.dashboardLoad.sampleCount],
            ["Provider latency", formatLatency(platformHealth.latency.provider.value), platformHealth.latency.provider.sampleCount],
            ["Replay write time", formatLatency(platformHealth.latency.replayWrite.value), platformHealth.latency.replayWrite.sampleCount],
            ["Decision latency", formatLatency(platformHealth.latency.trustDecision.value), platformHealth.latency.trustDecision.sampleCount],
            ["Authorization latency", formatLatency(platformHealth.latency.authorization.value), platformHealth.latency.authorization.sampleCount],
            ["Largest database query", platformHealth.latency.largestDatabaseQuery.value === null ? "Awaiting data" : `${platformHealth.latency.largestDatabaseQuery.label ?? "Database query"} (${platformHealth.latency.largestDatabaseQuery.value}ms)`, platformHealth.latency.largestDatabaseQuery.sampleCount],
          ].map(([label, value, sampleCount]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-zinc-100">{value}</p>
              <p className="mt-2 text-xs text-zinc-600">{sampleCount} in-process sample(s)</p>
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
                <p className="mt-2 text-xl font-semibold text-zinc-100">{formatLatency(value)}</p>
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
        </details>
      </div>
    </main>
  );
}
