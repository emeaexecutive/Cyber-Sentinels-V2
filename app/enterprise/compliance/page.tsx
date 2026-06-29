import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compliance Readiness | Cyber Sentinels",
  description:
    "Compliance-oriented operational reporting, evidence continuity and governance defensibility.",
};

type Row = Record<string, unknown>;

async function fetchRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  limit = 20
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  return error ? [] : data ?? [];
}

function value(row: Row, keys: string[], fallback = "Not recorded") {
  const match = keys.map((key) => row[key]).find((item) => item !== null && item !== undefined && String(item).trim());
  return match === undefined ? fallback : String(match);
}

function formatDate(input: unknown) {
  if (!input) return "Not recorded";
  const date = new Date(String(input));
  return Number.isNaN(date.getTime())
    ? String(input)
    : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

const reportCoverage = [
  ["Audit review", "Event chronology and actor context support scoped review."],
  ["Governance review", "Reviewer attribution, ownership and resolution remain visible."],
  ["Operational traceability", "Workflow events connect policy triggers, actions and outcomes."],
  ["Evidence continuity", "Evidence references preserve provenance without exposing records publicly."],
  ["Replay linkage", "Reports can point authorized reviewers to canonical chronology."],
  ["Workflow defensibility", "Trust posture history explains what changed and why."],
];

const reportingContract = [
  ["Export summary", "Scope, generated time, trust posture and known limitations."],
  ["Workflow chronology", "Ordered evidence, policy, governance and resolution events."],
  ["Governance attribution", "Reviewer, owner, action, rationale and completion time."],
  ["Evidence references", "Stable identifiers and source classes, subject to access controls."],
  ["Trust posture history", "Explainable transitions rather than a single opaque score."],
];

export default async function EnterpriseCompliancePage() {
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, { path: "/enterprise/compliance" });

  const [auditLogs, governanceActions, replaySessions, evidenceChains, receipts] =
    await Promise.all([
      fetchRows(supabase, "audit_logs"),
      fetchRows(supabase, "governance_actions"),
      fetchRows(supabase, "trust_replay_sessions"),
      fetchRows(supabase, "evidence_chains"),
      fetchRows(supabase, "verification_receipts"),
    ]);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-10 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid-bg rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Compliance-Oriented Readiness
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold md:text-6xl">
            Evidence that can be reviewed, replayed and defended.
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-zinc-200">
            Cyber Sentinels coordinates provider-backed verification signals,
            governance review, replayable evidence and workflow trust posture.
            This view assesses reporting coverage—not regulatory certification.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/compliance-export" className="brand-primary-action brand-action-large text-sm">
              Open Report Exports
            </Link>
            <Link href="/enterprise/auditability" className="brand-secondary-action brand-action-large text-sm">
              Inspect Auditability
            </Link>
            <Link href="/enterprise/readiness" className="brand-secondary-action brand-action-large text-sm">
              Deployment Readiness
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Audit events", auditLogs.length],
            ["Governance actions", governanceActions.length],
            ["Replay sessions", replaySessions.length],
            ["Evidence chains", evidenceChains.length],
            ["Receipts", receipts.length],
          ].map(([label, count]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{count}</p>
              <p className="mt-2 text-xs text-zinc-500">Authorized query window</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reportCoverage.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Reporting contract
          </p>
          <h2 className="mt-3 text-3xl font-semibold">Readable evidence before decorative compliance.</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="px-3 py-3 font-medium">Report element</th>
                  <th className="px-3 py-3 font-medium">Required content</th>
                  <th className="px-3 py-3 font-medium">Boundary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {reportingContract.map(([label, detail]) => (
                  <tr key={label}>
                    <td className="px-3 py-4 font-semibold text-zinc-200">{label}</td>
                    <td className="px-3 py-4 text-zinc-400">{detail}</td>
                    <td className="px-3 py-4 text-zinc-500">Only retained, authorized evidence is included.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Governance attribution</h2>
            <div className="mt-5 grid gap-3">
              {governanceActions.length ? governanceActions.slice(0, 6).map((action, index) => (
                <div key={value(action, ["id"], String(index))} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold capitalize text-zinc-200">
                      {value(action, ["action_status", "action_type"], "Governance action").replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-zinc-500">{formatDate(action.resolved_at ?? action.created_at)}</p>
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-zinc-400">
                    <p>Reviewer: {value(action, ["reviewer_name", "reviewer_email"])}</p>
                    <p>Owner: {value(action, ["assigned_to", "owner_name"])}</p>
                    <p>Workflow: {value(action, ["subject_id", "workflow_id"])}</p>
                    <p>Resolution: {value(action, ["resolution_notes"], "Pending or not recorded")}</p>
                  </div>
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No governance actions are available in the authorized evidence window.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Operational chronology</h2>
            <div className="mt-5 grid gap-3">
              {auditLogs.length ? auditLogs.slice(0, 8).map((event, index) => (
                <div key={value(event, ["id"], String(index))} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold capitalize text-zinc-200">
                      {value(event, ["event_type"], "Audit event").replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-zinc-500">{formatDate(event.created_at)}</p>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    Actor: {value(event, ["actor", "actor_id"])}
                  </p>
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No audit events are available in the authorized evidence window.
                </p>
              )}
            </div>
          </article>
        </section>

        <section className="mt-8 rounded-lg border border-amber-950 bg-amber-950/10 p-5">
          <h2 className="font-semibold text-amber-100">Compliance boundary</h2>
          <p className="mt-2 max-w-5xl text-sm leading-7 text-zinc-400">
            These controls support audit preparation, operational governance and
            evidence review. They do not constitute legal advice, regulatory
            certification, a guarantee of compliance or proof that every
            deployment control has been independently validated.
          </p>
        </section>
      </div>
    </main>
  );
}
