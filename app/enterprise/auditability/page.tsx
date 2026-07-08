import Link from "next/link";
import { TrustTransparencyReportView } from "@/components/trust-transparency-report";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { replayEngine } from "@/lib/core/replay-engine";
import {
  loadWorkflowTrust,
  validReference,
} from "@/lib/operational-trust/api";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = Record<string, any>;
type PageProps = {
  searchParams?: Promise<{
    workflow_id?: string;
    subject_type?: string;
  }>;
};

async function fetchRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  return error ? [] : data ?? [];
}

function formatDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

export default async function EnterpriseAuditabilityPage({
  searchParams,
}: PageProps) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, {
    path: "/enterprise/auditability",
  });
  const [auditLogs, governanceActions, replaySessions, evidenceChains] =
    await Promise.all([
      fetchRows(supabase, "audit_logs", 80),
      fetchRows(supabase, "governance_actions", 80),
      fetchRows(supabase, "trust_replay_sessions", 50),
      fetchRows(supabase, "evidence_chains", 80),
    ]);
  const workflowId = String(query.workflow_id ?? "").trim();
  const subjectType = String(query.subject_type ?? "workflow").trim();
  const trust =
    workflowId && validReference(workflowId)
      ? await loadWorkflowTrust(supabase, workflowId, subjectType).catch(() => null)
      : null;
  const report = trust ? replayEngine.buildReplayTransparencyReport(trust).report : null;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Enterprise Auditability
          </p>
          <h1 className="mt-3 max-w-5xl text-4xl font-semibold md:text-5xl">
            Audit-ready trust workflows.
          </h1>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-zinc-200">
            Review operational evidence, governance ownership, replay continuity and resolution history in a defensible enterprise audit trail.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/trust/transparency" className="brand-primary-action brand-action-large text-sm">
              Trust Transparency
            </Link>
            <Link href="/trust-replay" className="brand-secondary-action brand-action-large text-sm">
              Canonical Replay
            </Link>
            <Link href="/compliance-export" className="brand-secondary-action brand-action-large text-sm">
              Compliance Reports
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Audit events", auditLogs.length],
            ["Governance actions", governanceActions.length],
            ["Replay sessions", replaySessions.length],
            ["Evidence chains", evidenceChains.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5 print:hidden">
          <form className="grid gap-4 md:grid-cols-[1fr_2fr_auto]" action="/enterprise/auditability">
            <label className="grid gap-2 text-sm text-zinc-400">
              Subject type
              <select name="subject_type" defaultValue={subjectType} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100">
                <option value="workflow">Workflow</option>
                <option value="passport">Passport</option>
                <option value="agent">Intelligent system</option>
                <option value="interview_session">Interview session</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-zinc-400">
              Workflow or subject reference
              <input name="workflow_id" defaultValue={workflowId} placeholder="Enter an accessible record reference" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100" />
            </label>
            <button className="self-end rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200">
              Build Audit View
            </button>
          </form>
        </section>

        {report ? (
          <section className="mt-8">
            <TrustTransparencyReportView report={report} />
          </section>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Governance Defensibility</h2>
            <div className="mt-5 grid gap-3">
              {governanceActions.length ? (
                governanceActions.slice(0, 10).map((action, index) => (
                  <article key={String(action.id ?? index)} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="font-semibold capitalize text-zinc-100">
                        {String(action.action_status ?? action.action_type ?? "governance action").replaceAll("_", " ")}
                      </h3>
                      <span className="text-xs text-zinc-500">{formatDate(action.resolved_at ?? action.created_at)}</span>
                    </div>
                    <div className="mt-3 grid gap-1 text-sm leading-6 text-zinc-400">
                      <p>Reviewer: {action.reviewer_name ?? action.reviewer_email ?? "Not recorded"}</p>
                      <p>Owner: {action.assigned_to ?? action.owner_name ?? "Not recorded"}</p>
                      <p>Workflow: {action.subject_id ?? action.workflow_id ?? "Not recorded"}</p>
                      <p>Resolution: {action.resolution_notes ?? "Pending or not recorded"}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No governance actions are available in the authorized evidence window.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent Audit History</h2>
            <div className="mt-5 grid gap-3">
              {auditLogs.length ? (
                auditLogs.slice(0, 12).map((event, index) => (
                  <article key={String(event.id ?? index)} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="font-semibold text-zinc-100">
                        {String(event.event_type ?? "audit event").replaceAll("_", " ")}
                      </h3>
                      <span className="text-xs text-zinc-500">{formatDate(event.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">
                      Actor: {event.actor ?? "Not recorded"}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No audit events are available in the authorized evidence window.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
