import Link from "next/link";
import { redirect } from "next/navigation";
import { buildWorkflowProviderSignals } from "@/lib/providers";
import { createClient } from "@/lib/supabase/server";
import { loadTrustPostureDashboard } from "@/lib/trust-posture/dashboard";
import { TrustOpsOperatingStack } from "@/components/trustops-operating-stack";

export const dynamic = "force-dynamic";

type Row = Record<string, any>;

function text(value: unknown, fallback = "Not recorded") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value).replaceAll("_", " ");
}

function when(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function stateClass(value: unknown) {
  const state = String(value ?? "").toLowerCase();
  if (/failed|restricted|high|degrad/.test(state)) return "border-red-900 text-red-200";
  if (/review|pending|stale|due|escalat/.test(state)) return "border-amber-900 text-amber-200";
  if (/verified|trusted|fresh|strength/.test(state)) return "border-emerald-900 text-emerald-200";
  return "border-zinc-700 text-zinc-300";
}

function State({ value }: { value: unknown }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs capitalize ${stateClass(value)}`}>
      {text(value)}
    </span>
  );
}

async function rows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  fields: string,
  limit: number,
  orderColumn = "created_at"
) {
  const { data, error } = await supabase
    .from(table)
    .select(fields)
    .order(orderColumn, { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  return error ? [] : data ?? [];
}

export default async function TrustCenterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/trust-center");

  const [snapshot, replaySessions, receipts, governance] = await Promise.all([
    loadTrustPostureDashboard(supabase),
    rows(supabase, "trust_replay_sessions", "id,subject_type,subject_id,replay_summary,generated_by,created_at", 80),
    rows(supabase, "verification_receipts", "id,subject_type,subject_id,verification_status,confidence_level,issued_at,receipt_summary,evidence_snapshot", 80, "issued_at"),
    rows(supabase, "governance_actions", "id,subject_type,subject_id,action_status,assigned_to,resolution_notes,resolved_at,created_at", 80),
  ]);

  const providerEvidence = receipts.flatMap((receipt) =>
    buildWorkflowProviderSignals({
      evidenceSnapshot: (receipt.evidence_snapshot ?? {}) as Record<string, unknown>,
      providerVerificationState: receipt.verification_status,
    }).filter((signal) => signal.providerVerificationState !== "none").map((signal) => ({
      receiptId: String(receipt.id),
      workflowId: String(receipt.subject_id),
      providerName: signal.providerName,
      state: signal.providerVerificationState,
      summary: signal.summary,
      references: signal.evidenceReferences,
      observedAt: receipt.issued_at,
    }))
  );
  const replayBySubject = new Map(
    replaySessions.map((replay) => [String(replay.subject_id), replay])
  );
  const governanceBySubject = new Map<string, Row[]>();
  governance.forEach((action) => {
    const key = String(action.subject_id);
    governanceBySubject.set(key, [...(governanceBySubject.get(key) ?? []), action]);
  });

  const workflows = snapshot.summaries.slice(0, 10).map((item) => {
    const replay = replayBySubject.get(item.id);
    const actions = governanceBySubject.get(item.id) ?? [];
    const latestAction = actions[0];
    const change =
      item.badge === "governance_review"
        ? "Governance intervention"
        : item.badge === "elevated_risk"
          ? "Trust degrading"
          : item.badge === "reverification_due"
            ? "Trust stale"
            : item.badge === "context_shift"
              ? "Workflow transition"
              : replay
                ? "Replay-linked continuity"
                : "Trust strengthening";
    return { ...item, replay, latestAction, change };
  });

  return (
    <main className="min-h-screen bg-[#04070c] px-5 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Governed enterprise intelligence</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
                Operate trust as workflows change.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                TrustOps connects human and non-human identity, runtime posture,
                workflow verification, Authorization Lineage, operational
                evidence, Governance Review and final outcome.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
                Continuous verification shows what changed now. Replay preserves
                the durable enterprise memory of how it changed across people,
                AI agents, service accounts and API actors.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
                Cyber Sentinels preserves operational trust continuity across
                humans, AI agents and enterprise workflows.
              </p>
            </div>
            <State value={snapshot.badge} />
          </div>
          <nav className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link href="/trust-replay" className="brand-primary-action">
              Open Replay Timeline
            </Link>
            <Link href="/dashboard/governance" className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:text-white">
              Open Governance Review
            </Link>
          </nav>
        </section>

        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-5 md:p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">
            TrustOps operating stack
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            Current posture backed by connected operational layers.
          </h2>
          <div className="mt-5">
            <TrustOpsOperatingStack compact />
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Active workflows", workflows.length],
            ["Governance escalations", snapshot.metrics.governanceReviews],
            ["Replay records", replaySessions.length],
            ["Provider signals", providerEvidence.length],
            ["Session anomalies", snapshot.sessionAnomalies.length],
            ["Continuity changes", snapshot.metrics.contextChanges],
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">{String(value)}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Verified workflow outcomes</h2>
                <p className="mt-2 text-sm text-zinc-500">Recorded posture changes across actor identity, execution, authorization, replay and governance continuity.</p>
              </div>
              <p className="text-xs text-zinc-500">{snapshot.posture.label}</p>
            </div>
            <div className="mt-5 grid gap-3">
              {workflows.length ? workflows.map((workflow) => (
                <article key={`${workflow.context}-${workflow.id}`} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-zinc-100">{workflow.subject}</p>
                      <p className="mt-1 text-xs capitalize text-zinc-500">{workflow.context} · {when(workflow.updatedAt)}</p>
                    </div>
                    <State value={workflow.change} />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-zinc-400 md:grid-cols-3">
                    <p>Posture: <span className="text-zinc-200">{workflow.level}</span></p>
                    <p>Governance: <span className="text-zinc-200">{text(workflow.latestAction?.action_status, "No intervention")}</span></p>
                    <p>Replay: <span className="text-zinc-200">{workflow.replay ? "Linked" : "Not yet generated"}</span></p>
                  </div>
                  {workflow.replay ? (
                    <Link href={`/replay/${workflow.replay.id}`} className="mt-4 inline-flex text-sm text-cyan-200 hover:text-white">
                      Open Replay Timeline
                    </Link>
                  ) : null}
                </article>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No active workflow records are available yet.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-6">
            <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold">Trust continuity</h2>
              <div className="mt-4 grid gap-3">
                {snapshot.contextualSignals.map((signal) => (
                  <div key={`${signal.type}-${signal.label}`} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-zinc-200">{signal.label}</p>
                      <State value={signal.status} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">{signal.explanation}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold">Session integrity</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                {snapshot.sessionAnomalies.length
                  ? `${snapshot.sessionAnomalies.length} recorded anomaly indicator(s) require evidence-aware review.`
                  : "No elevated session anomaly is visible in the current records."}
              </p>
              <Link href="/dashboard/session-integrity" className="mt-4 inline-flex text-sm text-cyan-200 hover:text-white">
                Review session evidence
              </Link>
            </section>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 md:p-6">
            <h2 className="text-xl font-semibold">Governance continuity and authorization lineage</h2>
            <p className="mt-2 text-sm text-zinc-500">Reviewer ownership, outcomes and evidence chronology remain connected.</p>
            <div className="mt-5 grid gap-3">
              {governance.length ? governance.slice(0, 8).map((action) => (
                <article key={String(action.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium capitalize text-zinc-100">{text(action.subject_type, "Workflow review")}</p>
                      <p className="mt-1 text-xs text-zinc-500">Workflow {String(action.subject_id).slice(0, 12)}</p>
                    </div>
                    <State value={action.action_status} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{text(action.resolution_notes, "Reviewer action recorded; resolution notes pending.")}</p>
                  <div className="mt-3 grid gap-1 text-xs text-zinc-500 sm:grid-cols-2">
                    <p>Owner: {text(action.assigned_to, "Unassigned")}</p>
                    <p>{when(action.resolved_at ?? action.created_at)}</p>
                  </div>
                </article>
              )) : <p className="text-sm text-zinc-500">No governance action is recorded.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 md:p-6">
            <h2 className="text-xl font-semibold">Provider-backed evidence</h2>
            <p className="mt-2 text-sm text-zinc-500">Normalized provider states linked to receipts and workflow replay.</p>
            <div className="mt-5 grid gap-3">
              {providerEvidence.length ? providerEvidence.slice(0, 8).map((provider, index) => (
                <article key={`${provider.receiptId}-${provider.providerName}-${index}`} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-zinc-100">{provider.providerName}</p>
                    <State value={provider.state} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{provider.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500">
                    <Link href={`/trust/receipt/${provider.receiptId}`} className="text-cyan-200 hover:text-white">Receipt</Link>
                    {replayBySubject.get(provider.workflowId) ? (
                      <Link href={`/replay/${replayBySubject.get(provider.workflowId)?.id}`} className="text-cyan-200 hover:text-white">Replay</Link>
                    ) : null}
                    <span>{when(provider.observedAt)}</span>
                  </div>
                </article>
              )) : <p className="text-sm text-zinc-500">No provider-backed receipt evidence is visible.</p>}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Replayable enterprise memory</h2>
              <p className="mt-2 text-sm text-zinc-500">Actor, workflow, authorization, governed execution and outcomes ordered from recorded evidence—not reduced to activity logs.</p>
            </div>
            <Link href="/trust-replay" className="text-sm text-cyan-200 hover:text-white">Open Replay Timeline</Link>
          </div>
          <div className="mt-5 grid gap-2">
            {snapshot.recentEvents.length ? snapshot.recentEvents.map((event, index) => {
              const replay = replayBySubject.get(String(event.subject_id ?? event.interview_session_id ?? ""));
              return (
                <article key={`${event.posture_source}-${event.id ?? index}`} className="grid gap-2 rounded-lg border border-zinc-800 bg-black p-4 md:grid-cols-[0.55fr_2fr_auto] md:items-center">
                  <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">{text(event.posture_source)}</span>
                  <div>
                    <p className="text-sm font-medium capitalize text-zinc-200">{text(event.posture_label)}</p>
                    <p className="mt-1 text-xs text-zinc-500">{text(event.event_summary ?? event.explanation, "Recorded workflow transition")}</p>
                  </div>
                  <div className="text-xs text-zinc-500">
                    <p>{when(event.created_at)}</p>
                    {replay ? <Link href={`/replay/${replay.id}`} className="mt-1 inline-flex text-cyan-200 hover:text-white">Replay</Link> : null}
                  </div>
                </article>
              );
            }) : <p className="text-sm text-zinc-500">No replay-linked event is available yet.</p>}
          </div>
        </section>

        <p className="mt-7 text-xs leading-5 text-zinc-500">
          Operational posture is derived from authenticated workflow records. It is explainable review context, not surveillance or an automated identity verdict.
        </p>
      </div>
    </main>
  );
}
